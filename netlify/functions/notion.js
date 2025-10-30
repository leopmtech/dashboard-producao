'use strict'

const { Client } = require('@notionhq/client');
const { rowToOrder, summarize, groupByClient, extractUniqueContentTypes } = require('../../server/notionAdapter');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function getEnv(name, fallbackName) {
  return process.env[name] || process.env[fallbackName];
}

function buildNotionClient() {
  const token = getEnv('NOTION_TOKEN', 'REACT_APP_NOTION_TOKEN');
  const dbId = getEnv('NOTION_DATABASE_ID', 'REACT_APP_NOTION_DATABASE_ID');
  const missing = [];
  if (!token) missing.push('NOTION_TOKEN');
  if (!dbId) missing.push('NOTION_DATABASE_ID');
  if (missing.length) {
    const error = new Error(`Variáveis ausentes: ${missing.join(', ')}`);
    error.code = 'ENV_VARS_MISSING';
    throw error;
  }
  return { client: new Client({ auth: token }), databaseId: dbId };
}

async function fetchAllFromDatabase(notion, databaseId) {
  if (!notion || !notion.databases || typeof notion.databases.query !== 'function') {
    const err = new Error('Notion client inválido: databases.query indisponível');
    err.code = 'CLIENT_BAD_SHAPE';
    throw err;
  }
  const pages = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function fetchNotionData(notion, databaseId) {
  if (!databaseId) {
    const err = new Error('NOTION_DATABASE_ID não configurado');
    err.code = 'NO_DB_ID';
    throw err;
  }

  if (!notion || !notion.databases || typeof notion.databases.query !== 'function') {
    const err = new Error('Notion client inválido: databases.query indisponível');
    err.code = 'CLIENT_BAD_SHAPE';
    throw err;
  }

  const results = [];
  let hasMore = true;
  let startCursor = undefined;
  let pageCount = 0;

  while (hasMore && pageCount < 50) {
    pageCount += 1;
    let response;
    try {
      // Tentativa com ordenação pelo campo "Data de entrega"
      response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100,
        sorts: [{ property: 'Data de entrega', direction: 'descending' }]
      });
    } catch (err) {
      // Fallback: sem sorts (caso o campo não exista ou a permissão não permita sort)
      response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100
      });
    }
    results.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return results;
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    const { client: notion, databaseId: defaultDb } = buildNotionClient();
    const params = event.queryStringParameters || {};
    const route = params.route || 'orders';
    let databaseId = params.dbName ? null : defaultDb;

    // opcional: permitir busca por nome via dbName
    if (params.dbName) {
      const res = await notion.search({ query: params.dbName, filter: { property: 'object', value: 'database' } });
      databaseId = res.results?.[0]?.id || databaseId;
    }

    if (route === 'health') {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ status: 'ok', service: 'notion-api', timestamp: new Date().toISOString(), database: databaseId ? 'configured' : 'not-configured' })
      };
    }

    if (route === 'records') {
      const pages = await fetchAllFromDatabase(notion, databaseId);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(pages) };
    }

    if (route === 'orders' || route === 'orders-debug') {
      const results = await fetchNotionData(notion, databaseId || defaultDb);
      if (route === 'orders-debug') {
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ count: results.length }) };
      }

      const orders = results.map(rowToOrder);
      const summary = summarize(orders);
      const clientsData = groupByClient(orders);
      const contentTypes = extractUniqueContentTypes(orders);

      const payload = {
        totalSheets: 1,
        loadedAt: new Date().toISOString(),
        sheetName: 'notion',
        originalOrders: orders,
        metrics: summary,
        contentTypes,
        visaoGeral: clientsData,
        visaoGeral2024: clientsData.filter(c => c['2024'] > 0),
        diarios: clientsData,
        diarios2024: clientsData.filter(c => c['2024'] > 0),
        semanais: clientsData,
        semanais2024: clientsData.filter(c => c['2024'] > 0),
        mensais: clientsData,
        mensais2024: clientsData.filter(c => c['2024'] > 0),
        especiais: clientsData,
        especiais2024: clientsData.filter(c => c['2024'] > 0),
        diagnosticos: clientsData,
        diagnosticos2024: clientsData.filter(c => c['2024'] > 0),
        design: clientsData,
      };

      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(payload) };
    }

    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Route not found' }) };
  } catch (error) {
    const status = (error && (error.status || (error.code === 'NO_DB_ID' ? 400 : (error.code === 'ENV_VARS_MISSING' ? 400 : 500)))) || 500;
    return {
      statusCode: status,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: error.message, code: error.code })
    };
  }
};


