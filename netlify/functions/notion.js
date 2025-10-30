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
  let client = null;
  try {
    client = new Client({ auth: token });
  } catch (_) {}
  return { client, token, databaseId: dbId };
}

async function fetchAllFromDatabase({ client, token }, databaseId) {
  const pages = [];
  let cursor = undefined;
  do {
    let res;
    if (client && client.databases && typeof client.databases.query === 'function') {
      res = await client.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 });
    } else {
      const body = JSON.stringify({ start_cursor: cursor, page_size: 100 });
      const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body
      });
      if (!resp.ok) {
        const txt = await resp.text();
        const err = new Error(`HTTP ${resp.status}: ${txt}`);
        err.code = 'HTTP_QUERY_FAILED';
        throw err;
      }
      res = await resp.json();
    }
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

async function fetchNotionData({ client, token }, databaseId) {
  if (!databaseId) {
    const err = new Error('NOTION_DATABASE_ID não configurado');
    err.code = 'NO_DB_ID';
    throw err;
  }

  const results = [];
  let hasMore = true;
  let startCursor = undefined;
  let pageCount = 0;

  while (hasMore && pageCount < 50) {
    pageCount += 1;
    let response;
    if (client && client.databases && typeof client.databases.query === 'function') {
      try {
        response = await client.databases.query({
          database_id: databaseId,
          start_cursor: startCursor,
          page_size: 100,
          sorts: [{ property: 'Data de entrega', direction: 'descending' }]
        });
      } catch (_) {
        response = await client.databases.query({ database_id: databaseId, start_cursor: startCursor, page_size: 100 });
      }
    } else {
      // Fallback via REST
      const body = startCursor
        ? { start_cursor: startCursor, page_size: 100 }
        : { page_size: 100 };
      // Tentar com sorts, depois sem
      let resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...body, sorts: [{ property: 'Data de entrega', direction: 'descending' }] })
      });
      if (!resp.ok) {
        resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }
      if (!resp.ok) {
        const txt = await resp.text();
        const err = new Error(`HTTP ${resp.status}: ${txt}`);
        err.code = 'HTTP_QUERY_FAILED';
        throw err;
      }
      response = await resp.json();
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
    const notionCtx = buildNotionClient();
    const params = event.queryStringParameters || {};
    const route = params.route || 'orders';
    let databaseId = params.dbName ? null : notionCtx.databaseId;

    // opcional: permitir busca por nome via dbName
    if (params.dbName) {
      const res = notionCtx.client && notionCtx.client.search
        ? await notionCtx.client.search({ query: params.dbName, filter: { property: 'object', value: 'database' } })
        : await (async () => {
            const resp = await fetch('https://api.notion.com/v1/search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${notionCtx.token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query: params.dbName, filter: { property: 'object', value: 'database' } })
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status} on search`);
            return await resp.json();
          })();
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
      const pages = await fetchAllFromDatabase(notionCtx, databaseId);
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(pages) };
    }

    if (route === 'orders' || route === 'orders-debug') {
      const results = await fetchNotionData(notionCtx, databaseId || notionCtx.databaseId);
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


