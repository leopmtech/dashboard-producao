// src/services/notionService.js
class NotionService {
  constructor() {
    this.cache = null;
    this.cacheAt = 0;
    this.ttl = 60 * 1000; // 60s de cache simples no cliente
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
}
export default new NotionService();
