#!/usr/bin/env node
require('dotenv').config({ path: '.env' });
const { Client } = require('../../server/node_modules/@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const ARG_CLIENT = (() => {
  const arg = process.argv.find(a => a.startsWith('--client='));
  return arg ? arg.substring('--client='.length) : 'in.Pacto';
})();

function getText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return (prop.title || []).map(t => t.plain_text).join('').trim();
  if (prop.type === 'rich_text') return (prop.rich_text || []).map(t => t.plain_text).join('').trim();
  if (Array.isArray(prop)) return prop.map(x => x?.plain_text || '').join('').trim();
  return '';
}

function getMultiSelect(prop) {
  if (!prop) return [];
  if (prop.type === 'multi_select') return (prop.multi_select || []).map(x => x.name);
  if (prop.type === 'select') return prop.select ? [prop.select.name] : [];
  return [];
}

function getDate(prop) {
  if (!prop || prop.type !== 'date' || !prop.date) return null;
  const s = prop.date.start || prop.date.end;
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

async function fetchAll(databaseId) {
  const results = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({ database_id: databaseId, page_size: 100, start_cursor: cursor });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

(async () => {
  if (!DATABASE_ID) {
    console.error('NOTION_DATABASE_ID ausente.');
    process.exit(1);
  }
  const pages = await fetchAll(DATABASE_ID);
  let totalInPacto = 0;
  let total2024 = 0;
  let total2025 = 0;
  let semData = 0;
  const target = ARG_CLIENT.toLowerCase();
  for (const p of pages) {
    const props = p.properties || {};
    const clientes = getMultiSelect(props['Cliente']);
    if (!clientes.map(c => c.toLowerCase()).includes(target)) continue;
    totalInPacto++;
    const d = getDate(props['Data de entrega']) || getDate(props['Data de Entrega']) || null;
    if (!d) { semData++; continue; }
    const y = d.getFullYear();
    if (y === 2024) total2024++;
    else if (y === 2025) total2025++;
  }
  console.log(`${ARG_CLIENT} - Contagem direta do Notion`);
  console.log(`  Total (todas as páginas): ${totalInPacto}`);
  console.log(`  Com data de entrega 2024: ${total2024}`);
  console.log(`  Com data de entrega 2025: ${total2025}`);
  console.log(`  Sem data de entrega: ${semData}`);
})();


