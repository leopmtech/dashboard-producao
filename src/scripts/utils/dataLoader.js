/**
 * @fileoverview Utilitário para carregamento de dados
 * @description Carrega dados do Notion e Google Sheets com tratamento de erros
 */

import { analysisConfig } from '../../config/analysisConfig.js';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url, options = {}, maxRetries = 5, baseDelayMs = 500) {
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

export class DataLoader {
  constructor(config = analysisConfig) {
    this.config = config;
  }

  /**
   * Carrega dados do Notion
   * @returns {Promise<Object>} Dados do Notion
   */
  async carregarNotion() {
    try {
      console.log('📊 Carregando dados do Notion...');
      const { token, endpointQuery } = this.config.credentials.notion;

      const body = { page_size: 100 };
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      };

      let hasMore = true;
      let nextCursor = undefined;
      const pages = [];

      while (hasMore) {
        const res = await fetchWithRetry(endpointQuery, {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, start_cursor: nextCursor })
        });
        const json = await res.json();
        const results = json?.results || [];
        pages.push(...results);
        hasMore = Boolean(json?.has_more);
        nextCursor = json?.next_cursor;
        // respeitar rate limit ~3 rps
        await sleep(350);
      }

      const orders = pages.map(page => {
        const props = page.properties || {};
        const read = (name) => props[name];
        const textFrom = (p) => {
          if (!p) return '';
          if (p.type === 'title') return (p.title?.map(t => t.plain_text).join(' ') || '').trim();
          if (p.type === 'rich_text') return (p.rich_text?.map(t => t.plain_text).join(' ') || '').trim();
          if (p.type === 'url') return p.url || '';
          if (p.type === 'number') return p.number;
          if (p.type === 'select') return p.select?.name || '';
          if (p.type === 'multi_select') return (p.multi_select || []).map(o => o.name).join(', ');
          if (p.type === 'people') return (p.people || []).map(pe => pe.name || pe.id).join(', ');
          if (p.type === 'checkbox') return p.checkbox;
          if (p.type === 'date') return p.date?.start || '';
          return '';
        };

        return {
          id: page.id,
          titulo: textFrom(read('Título')),
          tipoDemanda: textFrom(read('Tipo de demanda')),
          cliente: textFrom(read('Cliente')),
          dataEntrega: textFrom(read('Data de entrega')),
          criadoPor: textFrom(read('Criado por')),
          concluido: textFrom(read('Concluído')),
          quemExecuta: textFrom(read('Quem executa')),
          ordemServico: textFrom(read('Ordem de serviço'))
        };
      });

      console.log(`✅ Notion carregado: ${orders.length} registros`);
      return {
        success: true,
        data: orders,
        metadata: {
          totalRegistros: orders.length,
          loadedAt: new Date().toISOString(),
          source: 'notion'
        }
      };
    } catch (error) {
      console.error('❌ Erro ao carregar Notion:', error.message);
      return {
        success: false,
        data: [],
        error: error.message,
        metadata: {
          totalRegistros: 0,
          loadedAt: new Date().toISOString(),
          source: 'notion'
        }
      };
    }
  }

  /**
   * Carrega dados do Google Sheets
   * @returns {Promise<Object>} Dados do Google Sheets
   */
  async carregarSheets() {
    try {
      console.log('📊 Carregando dados do Google Sheets...');
      const { endpoint } = this.config.credentials.sheets;
      const res = await fetchWithRetry(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.performance.timeoutMs)
      });
      const json = await res.json();
      const values = json?.values || [];
      const headers = values[0] || [];
      const rows = values.slice(1);

      const records = rows.map(row => {
        const obj = {};
        headers.forEach((h, idx) => { obj[String(h).trim()] = row[idx]; });
        // normalizações comuns
        return {
          id: obj['ID'] || obj['id'] || undefined,
          ordemServico: obj['Ordem de serviço'] || obj['Ordem de Servico'] || obj['OS'] || obj['ordemServico'],
          cliente1: obj['Cliente1'] || obj['Cliente 1'] || obj['cliente1'] || obj['Cliente'],
          cliente2: obj['Cliente2'] || obj['Cliente 2'] || obj['cliente2'],
          cliente: obj['Cliente'] || obj['cliente'],
          tipoDemanda: obj['Tipo de demanda'] || obj['tipoDemanda'] || obj['Tipo'],
          criadoPor: obj['Criado por'] || obj['criador'] || obj['Autor'],
          dataEntrega: obj['Data de entrega'] || obj['Entrega'] || obj['dataEntrega'],
          status: obj['Status'] || obj['status'],
          quemExecuta: obj['Quem executa'] || obj['Executor'] || obj['quemExecuta']
        };
      });

      console.log(`✅ Sheets carregado: ${records.length} registros`);
      return {
        success: true,
        data: records,
        metadata: {
          totalRegistros: records.length,
          loadedAt: new Date().toISOString(),
          source: 'sheets'
        }
      };
    } catch (error) {
      console.error('❌ Erro ao carregar Sheets:', error.message);
      return {
        success: false,
        data: [],
        error: error.message,
        metadata: {
          totalRegistros: 0,
          loadedAt: new Date().toISOString(),
          source: 'sheets'
        }
      };
    }
  }

  /**
   * Carrega ambos os datasets
   * @returns {Promise<Object>} Objeto com dados do Notion e Sheets
   */
  async carregarTodos() {
    console.log('🔄 Carregando todos os datasets...');
    
    const [notionResult, sheetsResult] = await Promise.all([
      this.carregarNotion(),
      this.carregarSheets()
    ]);

    return {
      notion: notionResult,
      sheets: sheetsResult,
      sucessoTotal: notionResult.success && sheetsResult.success
    };
  }
}

export default DataLoader;

