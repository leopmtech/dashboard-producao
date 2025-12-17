// src/services/notionService.js
class NotionService {
  constructor() {
    this.cache = null;
    this.cacheAt = 0;
    this.ttl = 60 * 1000; // 60s de cache simples no cliente
    this._ordersCache = new Map(); // key: dbId -> { data, at }
    this._inFlight = new Map(); // key: dbId -> Promise
  }

  async getDashboardData({ dbName } = {}) {
    const now = Date.now();
    if (this.cache && now - this.cacheAt < this.ttl) {
      return this.cache;
    }

    // Se você ainda não setou NOTION_DATABASE_ID no server/.env,
    // pode passar ?dbName=MinhaBase pelo frontend:
    const qsParts = [];
    qsParts.push('route=orders');
    if (dbName) qsParts.push(`dbName=${encodeURIComponent(dbName)}`);
    const qs = qsParts.length ? `?${qsParts.join('&')}` : '';
    const res = await fetch(`/.netlify/functions/notion${qs}`);

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      let details = {};
      try { details = JSON.parse(raw); } catch (_) {}
      const code = details.code ? ` code=${details.code}` : '';
      const msg = details.error || raw || 'unknown error';
      throw new Error(`Notion API error [${res.status}]${code}: ${msg}`);
    }

    const json = await res.json();
    this.cache = json;
    this.cacheAt = now;
    return json;
  }

  /**
   * Busca TODAS as demandas (orders) diretamente de um database do Notion,
   * usando as rotas paginadas `orders-sources` + `orders-page`.
   *
   * @param {Object} params
   * @param {string} params.dbId - Database ID (32 hex) com ou sem hífens
   * @param {boolean} params.useCache - Se deve usar cache curto
   * @param {number} params.ttlMs - TTL do cache (ms)
   */
  async getOrdersFromDatabase({ dbId, useCache = true, ttlMs = 15_000 } = {}) {
    const key = String(dbId || '').trim();
    if (!key) throw new Error('dbId é obrigatório para buscar orders do Notion.');

    const now = Date.now();
    const cached = this._ordersCache.get(key);
    if (useCache && cached && now - cached.at < ttlMs) {
      return cached.data;
    }

    if (this._inFlight.has(key)) {
      return await this._inFlight.get(key);
    }

    const task = (async () => {
      // 1) Data sources
      const sourcesResp = await fetch(`/.netlify/functions/notion?route=orders-sources&dbId=${encodeURIComponent(key)}`);
      if (!sourcesResp.ok) {
        const raw = await sourcesResp.text().catch(() => '');
        throw new Error(`Notion orders-sources falhou [${sourcesResp.status}]: ${raw.substring(0, 200)}`);
      }
      const sourcesJson = await sourcesResp.json();
      const sources = Array.isArray(sourcesJson.sources) ? sourcesJson.sources : [];
      if (!sources.length) {
        const empty = [];
        this._ordersCache.set(key, { data: empty, at: Date.now() });
        return empty;
      }

      // 2) Páginas por data source
      const all = [];
      for (const src of sources) {
        let cursor = null;
        let safety = 0;
        do {
          safety += 1;
          if (safety > 500) throw new Error(`Limite de paginação excedido para sourceId=${src.id}`);

          const url =
            `/.netlify/functions/notion?route=orders-page&dbId=${encodeURIComponent(key)}` +
            `&sourceId=${encodeURIComponent(src.id)}` +
            (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '') +
            `&pageSize=100`;

          const pageResp = await fetch(url);
          if (!pageResp.ok) {
            const raw = await pageResp.text().catch(() => '');
            throw new Error(`Notion orders-page falhou [${pageResp.status}] (sourceId=${src.id}): ${raw.substring(0, 200)}`);
          }
          const pageJson = await pageResp.json();
          const orders = Array.isArray(pageJson.orders) ? pageJson.orders : [];
          all.push(...orders.map((o) => ({ ...o, _sourceId: src.id, _sourceName: src.name || 'Unnamed' })));
          cursor = pageJson.next_cursor || null;
        } while (cursor);
      }

      // 3) Deduplicar por id
      const seen = new Set();
      const deduped = [];
      for (const o of all) {
        const id = o?.id || o?._id || o?.orderId || JSON.stringify(o);
        if (seen.has(id)) continue;
        seen.add(id);
        deduped.push(o);
      }

      this._ordersCache.set(key, { data: deduped, at: Date.now() });
      return deduped;
    })();

    this._inFlight.set(key, task);
    try {
      return await task;
    } finally {
      this._inFlight.delete(key);
    }
  }
}
export default new NotionService();
