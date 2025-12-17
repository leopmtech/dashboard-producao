#!/usr/bin/env node
/**
 * Resumo mensal de clientes únicos atendidos (Notion)
 *
 * Regras:
 * - Agrupa por mês/ano usando "Data de início"
 * - Conta clientes únicos por mês (se um cliente tem várias páginas no mês, conta 1)
 * - Se uma página tiver múltiplos clientes (multi_select / string com vírgula), conta cada cliente
 *
 * Uso:
 *   node src/scripts/clientesAtendidosPorMesNotion.js
 *
 * Requer:
 *   NOTION_TOKEN
 *   NOTION_DATABASE_ID
 */
require('dotenv').config({ path: '.env' });

// Nota: o Notion passou a suportar "databases com múltiplos data sources".
// A v5.x do SDK lida com isso via `databases.retrieve` + `dataSources.query`.
const { Client } = require('@notionhq/client');
const { rowToOrder } = require('../../server/notionAdapter');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

// Período fixo solicitado
const RANGE_START = new Date('2025-09-01T00:00:00.000Z');
const RANGE_END = new Date(TODAY); // Dezembro/2025 até hoje (data atual do ambiente)

function isoDateOnly(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function monthKeyFromDate(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function labelPtBrFromMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[m - 1]}/${y}`;
}

function isValidClientName(name) {
  const s = String(name || '').trim();
  if (!s) return false;
  const low = s.toLowerCase();
  if (low === '-' || low === '—') return false;
  if (low === 'cliente não informado' || low === 'cliente nao informado' || low === 'nao informado' || low === 'não informado') return false;
  return true;
}

function normalizeClientsFromOrder(order) {
  const arr = Array.isArray(order?.clientesArray) ? order.clientesArray : [];
  const fallback = String(order?.cliente || order?.cliente1 || '').trim();
  const raw = arr.length ? arr : (fallback ? fallback.split(',') : []);
  const out = [];
  for (const c of raw) {
    const name = String(c || '').trim();
    if (isValidClientName(name)) out.push(name);
  }
  return [...new Set(out)];
}

async function fetchAllFromDataSourceWithDateFilter(notion, dataSourceId, start, end) {
  const results = [];
  let cursor = undefined;

  const filter = {
    property: 'Data de início',
    date: {
      on_or_after: isoDateOnly(start),
      on_or_before: isoDateOnly(end),
    },
  };

  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
      filter,
      sorts: [{ property: 'Data de início', direction: 'ascending' }],
    });
    results.push(...(res.results || []));
    cursor = res.has_more ? res.next_cursor : undefined;
    if (cursor) await new Promise(r => setTimeout(r, 120));
  } while (cursor);

  return results;
}

function initMonthBuckets() {
  // Garantir que os 4 meses existam mesmo que zerados
  return new Map([
    ['2025-09', new Set()],
    ['2025-10', new Set()],
    ['2025-11', new Set()],
    ['2025-12', new Set()],
  ]);
}

(async () => {
  if (!NOTION_TOKEN || !DATABASE_ID) {
    console.error('❌ Variáveis ausentes. Configure NOTION_TOKEN e NOTION_DATABASE_ID (ex.: em .env).');
    process.exit(1);
  }

  const notion = new Client({ auth: NOTION_TOKEN });

  const db = await notion.databases.retrieve({ database_id: DATABASE_ID });
  const dataSources = Array.isArray(db?.data_sources) ? db.data_sources : [];
  if (dataSources.length === 0) {
    throw new Error('Database não retornou data_sources. Verifique o NOTION_DATABASE_ID e permissões.');
  }

  const pages = [];
  let skippedDataSources = 0;
  for (const ds of dataSources) {
    const dsId = ds?.id;
    if (!dsId) continue;
    // Alguns databases podem ter data sources "novos" / vazios sem o schema esperado.
    // Para evitar erro de query/sort, validamos se a propriedade existe.
    const dsMeta = await notion.dataSources.retrieve({ data_source_id: dsId });
    const propNames = Object.keys(dsMeta?.properties || {});
    const hasStartDate = propNames.includes('Data de início');
    const hasClient = propNames.includes('Cliente');
    if (!hasStartDate || !hasClient) {
      skippedDataSources++;
      continue;
    }

    const dsPages = await fetchAllFromDataSourceWithDateFilter(notion, dsId, RANGE_START, RANGE_END);
    pages.push(...dsPages);
  }

  if (pages.length === 0) {
    throw new Error(`Nenhuma página encontrada. Data sources ignorados: ${skippedDataSources}/${dataSources.length}.`);
  }
  const monthToClients = initMonthBuckets();

  let ignoredNoStartDate = 0;
  let ignoredOutOfScope = 0;

  for (const page of pages) {
    const order = rowToOrder(page);
    const d = order?.dataInicioDate;
    if (!d) {
      ignoredNoStartDate++;
      continue;
    }
    if (d < new Date('2025-09-01') || d > RANGE_END) {
      ignoredOutOfScope++;
      continue;
    }
    const key = monthKeyFromDate(d);
    if (!monthToClients.has(key)) continue; // só set/out/nov/dez

    const clients = normalizeClientsFromOrder(order);
    const set = monthToClients.get(key);
    clients.forEach(c => set.add(c));
  }

  const rows = Array.from(monthToClients.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, set]) => ({
      mesAno: labelPtBrFromMonthKey(key),
      totalClientesUnicos: set.size,
      _key: key,
    }));

  // Saída no formato solicitado
  for (const r of rows) {
    const suffix = r._key === '2025-12' ? ' (até o momento)' : '';
    console.log(`- ${r.mesAno}${suffix}: ${r.totalClientesUnicos} clientes atendidos`);
  }

  console.log('\nTabela de apoio');
  console.table(rows.map(r => ({
    'Mês/Ano': r.mesAno + (r._key === '2025-12' ? ' (até o momento)' : ''),
    'Total de clientes únicos atendidos': r.totalClientesUnicos,
  })));

  if (ignoredNoStartDate || ignoredOutOfScope) {
    console.log('\nDiagnóstico');
    console.log(`- Ignorados sem "Data de início": ${ignoredNoStartDate}`);
    console.log(`- Ignorados fora do escopo: ${ignoredOutOfScope}`);
    console.log(`- Total de páginas retornadas do Notion (já filtradas por Data de início): ${pages.length}`);
  }
})().catch((err) => {
  console.error('❌ Falha ao gerar resumo:', err?.message || err);
  process.exit(1);
});

