#!/usr/bin/env node
/*
  Reconcile client counts between raw Notion pages and dashboard rules.

  Usage examples:
    node src/scripts/reconcileClientCounts.js --clients="Alema,in.Pacto" --year=2025
    node src/scripts/reconcileClientCounts.js --clients="Alema,in.Pacto" --allYears

  Env required:
    NOTION_TOKEN, NOTION_DATABASE_ID
*/

const { Client } = require('@notionhq/client');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (const a of args) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2]; else if (a === '--allYears') out.allYears = true;
  }
  return out;
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function fetchAllPages(notion, databaseId) {
  const pages = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
    await sleep(150);
  } while (cursor);
  return pages;
}

function getRichText(prop) {
  if (!prop || prop.type !== 'rich_text') return '';
  return (prop.rich_text || []).map(t => t.plain_text).join(' ').trim();
}

function getTitle(prop) {
  if (!prop || prop.type !== 'title') return '';
  return (prop.title || []).map(t => t.plain_text).join(' ').trim();
}

function getSelect(prop) {
  if (!prop) return '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'multi_select') return (prop.multi_select || []).map(s => s.name);
  return '';
}

function normalizeNames(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  return String(val).split(/[,;&\/]|\se\s|\sE\s/).map(v => v.trim()).filter(Boolean);
}

function isRecurring(tipo) {
  if (!tipo) return false;
  const t = String(tipo).toLowerCase();
  return (
    t.includes('diário') || t.includes('diario') ||
    t.includes('semanal') ||
    t.includes('mensal') ||
    t.includes('relatório') || t.includes('relatorio')
  );
}

function isCompleted(statusRaw, flags) {
  const s = String(statusRaw || '');
  return (
    flags?.concluida === 'YES' || flags?.concluido === 'YES' || flags?.concluída === 'YES' || flags?.concluido === true ||
    s === 'Concluído' || s === 'Concluido' || s === 'CONCLUÍDO' || s === 'CONCLUIDO' ||
    s === 'concluído' || s === 'concluido' || s === 'FINALIZADO' || s === 'finalizado' ||
    s === 'COMPLETO' || s === 'completo' || s === 'DONE' || s === 'done'
  );
}

function parseDeliveryDate(props) {
  const candidates = [
    props['Data de entrega'], props['Data de Entrega'], props['Data de Entrege'],
    props.dataEntregaDate, props.dataEntrega, props.DataEntrega, props.data_entrega
  ].filter(Boolean);
  for (const val of candidates) {
    if (typeof val === 'string' && val.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [dd, mm, yyyy] = val.split('/').map(n=>parseInt(n,10));
      return new Date(yyyy, mm-1, dd);
    }
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      const base = val.slice(0,10);
      const [yyyy, mm, dd] = base.split('-').map(n=>parseInt(n,10));
      return new Date(yyyy, mm-1, dd);
    }
    const d = new Date(val);
    if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

async function main() {
  const { clients = '', year, allYears } = parseArgs();
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    console.error('Missing NOTION_TOKEN or NOTION_DATABASE_ID');
    process.exit(1);
  }
  const targetClients = clients.split(',').map(s => s.trim()).filter(Boolean);
  if (targetClients.length === 0) {
    console.error('Provide --clients="ClientA,ClientB"');
    process.exit(1);
  }

  const notion = new Client({ auth: process.env.NOTION_TOKEN });
  const pages = await fetchAllPages(notion, process.env.NOTION_DATABASE_ID);

  const mapped = pages.map(p => {
    const props = p.properties || {};
    const title = getTitle(props['Ordem de Serviço'] || props['Ordem de serviço'] || props['Título'] || props['Name'] || props['Title']);
    const cliente = getSelect(props['Cliente']); // multi_select
    const tipoDemanda = getSelect(props['Tipo de Demanda']) || getRichText(props['Tipo de Demanda']) || getRichText(props['tipoDemanda']);
    const status = getSelect(props['Status']) || getRichText(props['Status']) || getRichText(props['status']);
    const dataEntrega = parseDeliveryDate({
      'Data de entrega': props['Data de entrega']?.date?.start || getRichText(props['Data de entrega']),
      'Data de Entrega': props['Data de Entrega']?.date?.start || getRichText(props['Data de Entrega']),
      'Data de Entrege': props['Data de Entrege']?.date?.start || getRichText(props['Data de Entrege'])
    });
    return {
      id: p.id,
      title,
      clientes: normalizeNames(cliente),
      tipoDemanda,
      status,
      dataEntrega
    };
  });

  // Base: páginas que contêm pelo menos um dos clientes
  const base = mapped.filter(m => m.clientes.some(c => targetClients.includes(c)));

  // Cálculo: aplicar mesmas regras do dashboard
  const included = [];
  const excluded = [];
  for (const m of base) {
    const reason = [];
    if (!m.dataEntrega) reason.push('sem_data_entrega');
    if (isRecurring(m.tipoDemanda)) reason.push('recorrente');
    if (isCompleted(m.status, {})) reason.push('concluida');
    if (year && !allYears) {
      if (!m.dataEntrega || m.dataEntrega.getFullYear() !== parseInt(year,10)) reason.push('fora_do_ano');
    }
    if (reason.length === 0) included.push(m); else excluded.push({ ...m, reason: reason.join('|') });
  }

  const summary = {
    clients: targetClients,
    year: allYears ? 'all' : (year || 'all'),
    base_count: base.length,
    included_count: included.length,
    excluded_count: excluded.length,
  };

  console.log('=== RECONCILIATION SUMMARY ===');
  console.log(summary);
  console.log('\n-- BASE IDS --');
  console.log(base.map(x => x.id).join('\n'));
  console.log('\n-- INCLUDED IDS --');
  console.log(included.map(x => x.id).join('\n'));
  console.log('\n-- EXCLUDED WITH REASON --');
  excluded.forEach(e => {
    console.log(`${e.id}\t${e.reason}\t${e.title || ''}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


