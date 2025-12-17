/**
 * @fileoverview Descoberta automática de schemas Notion e Google Sheets
 */

import { analysisConfig } from '../config/analysisConfig.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export class SchemaDiscovery {
  constructor(config = analysisConfig) {
    this.config = config;
    this.reportsDir = this.config.output?.reportsDir || 'src/reports';
  }

  async fetchWithRetry(url, options = {}, maxRetries = 5, baseDelayMs = 500) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (res.status === 429) {
          const delay = Math.min(5000, baseDelayMs * Math.pow(2, attempt));
          await sleep(delay);
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        return res;
      } catch (e) {
        if (attempt === maxRetries) throw e;
        const delay = Math.min(5000, baseDelayMs * Math.pow(2, attempt));
        await sleep(delay);
      }
    }
  }

  inferNotionPropertyType(prop) {
    if (!prop || !prop.type) return 'unknown';
    return prop.type;
  }

  async discoverNotionSchema() {
    const { token, endpointRetrieve } = this.config.credentials.notion;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json'
    };

    const res = await this.fetchWithRetry(endpointRetrieve, { method: 'GET', headers });
    const json = await res.json();

    const properties = json?.properties || {};
    const fields = Object.entries(properties).map(([name, def]) => ({
      name,
      type: this.inferNotionPropertyType(def),
      raw: def
    }));

    return { fields, raw: json };
  }

  normalizeHeader(header) {
    return String(header || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  async discoverSheetsSchema() {
    const { endpoint } = this.config.credentials.sheets;
    const res = await this.fetchWithRetry(`${endpoint}`);
    const json = await res.json();

    const values = json?.values || [];
    const headers = (values[0] || []).map(h => ({ name: String(h), normalized: this.normalizeHeader(h) }));
    return { columns: headers, raw: json };
  }

  suggestMappings(notionFields, sheetColumns) {
    const suggestions = [];
    const score = (a, b) => {
      const an = a.name?.toLowerCase();
      const bn = (b.normalized || b.name || '').toLowerCase();
      if (!an || !bn) return 0;
      if (an === bn) return 1;
      const aliases = [
        ['titulo', 'título', 'title'],
        ['cliente', 'cliente1', 'cliente 1'],
        ['cliente2', 'cliente 2'],
        ['ordemservico', 'ordem de servico', 'os', 'ordem de serviço'],
        ['dataentrega', 'data de entrega', 'entrega'],
        ['criadopor', 'criador', 'autor'],
        ['quemeexecuta', 'quem executa', 'executor']
      ];
      const canon = s => s.replace(/[^a-z0-9]/g, '');
      const ac = canon(an);
      const bc = canon(bn);
      if (ac === bc) return 0.9;
      if (aliases.some(group => group.includes(ac) && group.includes(bc))) return 0.88;
      return 0;
    };

    for (const nf of notionFields) {
      let best = { column: null, score: 0 };
      for (const sc of sheetColumns) {
        const scScore = score(nf, sc);
        if (scScore > best.score) best = { column: sc, score: scScore };
      }
      if (best.column && best.score >= 0.75) {
        suggestions.push({ notion: nf.name, sheet: best.column.name, confidence: Number(best.score.toFixed(2)) });
      }
    }

    return suggestions;
  }

  async discoverAll() {
    const notion = await this.discoverNotionSchema();
    const sheets = await this.discoverSheetsSchema();
    const mappings = this.suggestMappings(notion.fields, sheets.columns);
    return { notion, sheets, mappings, timestamp: new Date().toISOString() };
  }
}

export default SchemaDiscovery;


