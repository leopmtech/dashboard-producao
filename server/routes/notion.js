// server/routes/notion.js
const express = require('express');
const router = express.Router();
const { Client } = require('@notionhq/client');
const { rowToOrder, summarize, groupByClient, extractUniqueContentTypes } = require('../notionAdapter');

// ===== Config & safety checks (dotenv is loaded in server/index.js) =====
const DB_ID = process.env.NOTION_DATABASE_ID;

function assertRequiredEnv() {
  const missing = [];
  if (!process.env.NOTION_TOKEN) missing.push('NOTION_TOKEN');
  if (!process.env.NOTION_DATABASE_ID) missing.push('NOTION_DATABASE_ID');
  if (missing.length > 0) {
    const message = `Variáveis ausentes: ${missing.join(', ')}`;
    const error = new Error(message);
    error.code = 'ENV_VARS_MISSING';
    throw error;
  }
}

function buildNotionClient() {
  assertRequiredEnv();
  // Debug leve para diagnosticar ambiente sem expor segredo inteiro
  console.log('[ENV] NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'configured' : 'missing');
  console.log('[ENV] NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID ? 'configured' : 'missing');
  return new Client({ auth: process.env.NOTION_TOKEN });
}

let notion = null;
try {
  notion = buildNotionClient();
} catch (e) {
  // Adiamos a falha para as rotas retornarem erro claro
  console.warn('⚠️  Configuração do Notion incompleta:', e.message);
}

async function findDatabaseByName(name) {
  const res = await notion.search({ query: name, filter: { property: 'object', value: 'database' } });
  return res.results?.[0]?.id || null;
}

async function fetchAllFromDatabase(databaseId) {
  const pages = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// ===== Robust fetch with specific error handling =====
async function fetchNotionData(databaseId) {
  try {
    if (!notion) {
      notion = buildNotionClient();
    }

    if (!databaseId) {
      throw Object.assign(new Error('NOTION_DATABASE_ID não configurado'), { code: 'NO_DB_ID', status: 400 });
    }

    console.log('📊 [NOTION] Iniciando coleta com paginação segura...');
    const results = [];
    let hasMore = true;
    let startCursor = undefined;
    let pageCount = 0;

    while (hasMore && pageCount < 50) {
      pageCount += 1;
      console.log(`📄 [NOTION] Página ${pageCount}...`);
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: startCursor,
        page_size: 100,
        sorts: [
          { property: 'Data de entrega', direction: 'descending' }
        ]
      });
      results.push(...response.results);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
      if (hasMore) await new Promise(r => setTimeout(r, 100));
    }

    return { success: true, results };
  } catch (error) {
    // Tratamento específico 401 (unauthorized)
    const isUnauthorized = error?.status === 401 || error?.code === 'unauthorized' || /unauthorized|invalid token|401/i.test(error?.message || '');
    if (isUnauthorized) {
      console.error('❌ [NOTION] Token inválido (401). Verifique NOTION_TOKEN.');
      return {
        success: false,
        status: 401,
        error: 'API token is invalid (401). Verifique NOTION_TOKEN e permissões do integration.'
      };
    }

    // Erros de configuração
    if (error?.code === 'ENV_VARS_MISSING' || error?.code === 'NO_DB_ID') {
      return { success: false, status: 400, error: error.message };
    }

    console.error('❌ [NOTION] Erro inesperado:', error);
    return { success: false, status: 500, error: error.message };
  }
}

// ROTA PRINCIPAL - /api/notion/orders
router.get('/orders', async (req, res) => {
  // ✅ AUMENTAR TIMEOUT PARA 5 MINUTOS
  req.setTimeout(300000);
  res.setTimeout(300000);

  try {
    console.log('📊 [NOTION API] Carregando todos os registros...');

    let databaseId = DB_ID;
    if (!databaseId && req.query.dbName) {
      databaseId = await findDatabaseByName(req.query.dbName);
      if (!databaseId) return res.status(400).json({ error: 'Database não encontrada por nome' });
    }

    const fetchResult = await fetchNotionData(databaseId);
    if (!fetchResult.success) {
      const status = fetchResult.status || 500;
      return res.status(status).json({ success: false, error: fetchResult.error });
    }

    console.log(`✅ [NOTION API] Total carregado: ${fetchResult.results.length} registros`);

    const orders = fetchResult.results.map(rowToOrder);

    const summary = summarize(orders);
    const clientsData = groupByClient(orders);
    const contentTypes = extractUniqueContentTypes(orders);

    const dashboardData = {
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
    
    console.log(`✅ [API] ${orders.length} registros carregados do Notion`);
    res.json(dashboardData);
    
  } catch (error) {
    console.error('❌ [API] Erro ao carregar dados do Notion:', error);
    console.error('❌ [API] Stack trace:', error.stack);
    console.error('❌ [API] Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      NOTION_TOKEN: process.env.NOTION_TOKEN ? 'configured' : 'missing',
      NOTION_DATABASE_ID: DB_ID ? 'configured' : 'missing'
    });
    res.status(500).json({
      success: false,
      error: error.message,
      source: 'notion',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ROTA PARA REGISTROS SIMPLES - /api/notion/records
router.get('/records', async (req, res) => {
  try {
    console.log('📊 [API] Recebida requisição para /api/notion/records');
    
    let databaseId = DB_ID;
    if (!databaseId && req.query.dbName) {
      databaseId = await findDatabaseByName(req.query.dbName);
    }
    if (!databaseId) return res.status(400).json({ error: 'NOTION_DATABASE_ID não configurado' });

    const pages = await fetchAllFromDatabase(databaseId);
    res.json(pages);
    
  } catch (error) {
    console.error('❌ [API] Erro:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ROTA DE HEALTH CHECK - /api/notion/health
router.get('/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      service: 'notion-api',
      timestamp: new Date().toISOString(),
      database: DB_ID ? 'configured' : 'not-configured'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// ROTA DE DEBUG TEMPORÁRIA - /api/notion/orders/debug
router.get('/orders/debug', async (req, res) => {
  try {
    console.log('🔍 [DEBUG] Iniciando busca no Notion...');
    console.log('🔍 [DEBUG] NOTION_TOKEN:', process.env.NOTION_TOKEN ? 'configurado' : 'MISSING');
    console.log('🔍 [DEBUG] DATABASE_ID:', process.env.NOTION_DATABASE_ID);

    if (!notion) {
      notion = buildNotionClient();
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    console.log('✅ [DEBUG] Resposta recebida, resultados:', response.results.length);
    res.json(response.results);

  } catch (error) {
    console.error('❌ [DEBUG] Erro detalhado:', {
      message: error.message,
      code: error.code,
      status: error.status,
      body: error.body
    });

    res.status(400).json({ 
      error: error.message,
      code: error.code 
    });
  }
});

module.exports = router;

