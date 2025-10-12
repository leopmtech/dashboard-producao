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
    const qs = dbName ? `?dbName=${encodeURIComponent(dbName)}` : '';
    const res = await fetch(`/api/notion/orders${qs}`);

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      throw new Error(`Notion API error [${res.status}]: ${errTxt}`);
    }

    const json = await res.json();
    this.cache = json;
    this.cacheAt = now;
    return json;
  }
}
export default new NotionService();
