'use strict'

// Importações com tratamento de erro
let Client, rowToOrder, summarize, groupByClient, extractUniqueContentTypes;

try {
  const notionClient = require('@notionhq/client');
  Client = notionClient.Client;
} catch (err) {
  console.error('❌ Erro ao importar @notionhq/client:', err);
  Client = null;
}

try {
  const adapter = require('../../server/notionAdapter');
  rowToOrder = adapter.rowToOrder;
  summarize = adapter.summarize;
  groupByClient = adapter.groupByClient;
  extractUniqueContentTypes = adapter.extractUniqueContentTypes;
} catch (err) {
  console.error('❌ Erro ao importar notionAdapter:', err);
  // Funções fallback básicas
  rowToOrder = (row) => row;
  summarize = (orders) => ({ total: orders.length });
  groupByClient = (orders) => [];
  extractUniqueContentTypes = (orders) => [];
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function getEnv(name, fallbackName) {
  return process.env[name] || process.env[fallbackName];
}

// ✅ Função melhorada para formatar e validar Database ID
function formatDatabaseId(dbId) {
  if (!dbId) {
    console.warn('⚠️ [DB ID] Database ID is null or undefined');
    return null;
  }
  
  // Converter para string e remover espaços
  let cleanId = String(dbId).trim();
  
  // Remover qualquer caractere que não seja alfanumérico ou hífen
  cleanId = cleanId.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Se está vazio após limpeza, retorna null
  if (cleanId.length === 0) {
    console.warn('⚠️ [DB ID] Database ID is empty after cleaning');
    return null;
  }
  
  // Remover hífens para contar apenas caracteres alfanuméricos
  const withoutDashes = cleanId.replace(/-/g, '');
  
  // UUID do Notion deve ter exatamente 32 caracteres hexadecimais
  if (withoutDashes.length !== 32) {
    console.error(`❌ [DB ID] Invalid length: ${withoutDashes.length} (expected 32)`);
    return null;
  }
  
  // Verificar se são caracteres hexadecimais válidos
  if (!/^[0-9a-fA-F]{32}$/.test(withoutDashes)) {
    console.error('❌ [DB ID] Contains invalid hexadecimal characters');
    return null;
  }
  
  // Se não tem hífens e tem 32 caracteres, adiciona no formato UUID (8-4-4-4-12)
  if (!cleanId.includes('-')) {
    const formatted = `${withoutDashes.slice(0, 8)}-${withoutDashes.slice(8, 12)}-${withoutDashes.slice(12, 16)}-${withoutDashes.slice(16, 20)}-${withoutDashes.slice(20, 32)}`;
    console.log('✅ [DB ID] Formatted without dashes:', formatted.substring(0, 8) + '...');
    return formatted;
  }
  
  // Se já tem hífens, verifica se está no formato correto (deve ter 36 caracteres com hífens)
  if (cleanId.includes('-') && cleanId.length === 36) {
    // Verificar formato UUID: 8-4-4-4-12
    const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidPattern.test(cleanId)) {
      console.log('✅ [DB ID] Already properly formatted:', cleanId.substring(0, 8) + '...');
      return cleanId;
    } else {
      // Formato incorreto, reformatar
      const formatted = `${withoutDashes.slice(0, 8)}-${withoutDashes.slice(8, 12)}-${withoutDashes.slice(12, 16)}-${withoutDashes.slice(16, 20)}-${withoutDashes.slice(20, 32)}`;
      console.log('⚠️ [DB ID] Reformatted incorrect UUID:', formatted.substring(0, 8) + '...');
      return formatted;
    }
  }
  
  // Se tem hífens mas formato incorreto, tenta reformatar
  if (cleanId.includes('-') && withoutDashes.length === 32) {
    const formatted = `${withoutDashes.slice(0, 8)}-${withoutDashes.slice(8, 12)}-${withoutDashes.slice(12, 16)}-${withoutDashes.slice(16, 20)}-${withoutDashes.slice(20, 32)}`;
    console.log('⚠️ [DB ID] Reformatted with incorrect dash positions:', formatted.substring(0, 8) + '...');
    return formatted;
  }
  
  console.warn('⚠️ [DB ID] Could not format, returning as-is:', cleanId.substring(0, 8) + '...');
  return cleanId;
}

// Alias para compatibilidade
function sanitizeDatabaseId(dbId) {
  return formatDatabaseId(dbId);
}

function buildNotionClient() {
  console.log('🔍 [BUILD CLIENT] Starting client build...');
  
  const token = getEnv('NOTION_TOKEN', 'REACT_APP_NOTION_TOKEN');
  const dbId = getEnv('NOTION_DATABASE_ID', 'REACT_APP_NOTION_DATABASE_ID');
  
  const missing = [];
  if (!token) {
    missing.push('NOTION_TOKEN');
    console.error('❌ [BUILD CLIENT] NOTION_TOKEN is missing');
  } else {
    console.log('✅ [BUILD CLIENT] NOTION_TOKEN exists:', token.substring(0, 10) + '...');
  }
  
  if (!dbId) {
    missing.push('NOTION_DATABASE_ID');
    console.error('❌ [BUILD CLIENT] NOTION_DATABASE_ID is missing');
  } else {
    console.log('🔍 [BUILD CLIENT] Raw Database ID:', dbId.substring(0, 8) + '...' + dbId.substring(dbId.length - 4));
    console.log('🔍 [BUILD CLIENT] Database ID length:', dbId.length);
  }
  
  if (missing.length) {
    const error = new Error(`Variáveis ausentes: ${missing.join(', ')}`);
    error.code = 'ENV_VARS_MISSING';
    throw error;
  }
  
  const sanitizedDbId = formatDatabaseId(dbId);
  if (!sanitizedDbId) {
    console.error('❌ [BUILD CLIENT] Database ID formatting failed');
    const error = new Error(`NOTION_DATABASE_ID inválido: formato incorreto. ID recebido: ${dbId.substring(0, 20)}...`);
    error.code = 'INVALID_DB_ID';
    throw error;
  }
  
  console.log('✅ [BUILD CLIENT] Formatted Database ID:', sanitizedDbId.substring(0, 8) + '...');
  console.log('✅ [BUILD CLIENT] Formatted Database ID length:', sanitizedDbId.length);
  
  let client = null;
  try {
    client = new Client({ auth: token, notionVersion: '2025-09-03' });
    console.log('✅ [BUILD CLIENT] Notion Client created successfully');
  } catch (err) {
    console.error('❌ [BUILD CLIENT] Failed to create Notion Client:', err);
    throw err;
  }
  
  return { client, token, databaseId: sanitizedDbId };
}

async function fetchAllFromDatabase({ client, token }, databaseId) {
  if (!databaseId || typeof databaseId !== 'string' || databaseId.trim().length === 0) {
    throw new Error('databaseId inválido ou vazio');
  }
  const pages = [];
  let cursor = undefined;
  do {
    let res;
    if (client && client.databases && typeof client.databases.query === 'function') {
      res = await client.databases.query({ database_id: databaseId, start_cursor: cursor, page_size: 100 });
    } else {
      const body = JSON.stringify({ start_cursor: cursor, page_size: 100 });
      const sanitizedId = databaseId.trim();
      const resp = await fetch(`https://api.notion.com/v1/databases/${sanitizedId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2025-09-03',
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
  console.log('🔍 [FETCH] Starting fetchNotionData...');
  if (!databaseId || typeof databaseId !== 'string' || databaseId.trim().length === 0) {
    const err = new Error('NOTION_DATABASE_ID não configurado ou inválido');
    err.code = 'NO_DB_ID';
    throw err;
  }
  const sanitizedId = databaseId.trim();
  console.log('🔍 [FETCH] Database ID sanitized:', `${sanitizedId.substring(0, 8)}...`);
  console.log('🔍 [FETCH] Client available:', !!client);
  console.log('🔍 [FETCH] Token available:', !!token);

  const results = [];
  let hasMore = true;
  let startCursor = undefined;
  let pageCount = 0;

  while (hasMore && pageCount < 50) {
    pageCount += 1;
    console.log(`🔍 [FETCH] Fetching page ${pageCount}...`);
    let response;
    if (client && client.databases && typeof client.databases.query === 'function') {
      console.log('🔍 [FETCH] Using Notion Client SDK...');
      try {
        console.log('🔍 [FETCH] Attempting query with sort...');
        response = await client.databases.query({
          database_id: sanitizedId,
          start_cursor: startCursor,
          page_size: 100,
          sorts: [{ property: 'Data de entrega', direction: 'descending' }]
        });
        console.log('✅ [FETCH] Query successful with sort');
      } catch (sortError) {
        console.warn('⚠️ [FETCH] Query with sort failed, trying without sort:', sortError.message);
        response = await client.databases.query({ database_id: sanitizedId, start_cursor: startCursor, page_size: 100 });
        console.log('✅ [FETCH] Query successful without sort');
      }
    } else {
      console.log('🔍 [FETCH] Using REST API fallback...');
      // Fallback via REST
      const body = startCursor
        ? { start_cursor: startCursor, page_size: 100 }
        : { page_size: 100 };
      // Tentar com sorts, depois sem
      console.log('🔍 [FETCH] Attempting REST query with sort...');
      let resp = await fetch(`https://api.notion.com/v1/databases/${sanitizedId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2025-09-03',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...body, sorts: [{ property: 'Data de entrega', direction: 'descending' }] })
      });
      if (!resp.ok) {
        console.warn('⚠️ [FETCH] REST query with sort failed, trying without sort...');
        resp = await fetch(`https://api.notion.com/v1/databases/${sanitizedId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2025-09-03',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      }
      if (!resp.ok) {
        const txt = await resp.text();
        console.error('❌ [FETCH] REST query failed:', {
          status: resp.status,
          statusText: resp.statusText,
          body: txt.substring(0, 500)
        });
        const err = new Error(`HTTP ${resp.status}: ${txt}`);
        err.code = 'HTTP_QUERY_FAILED';
        throw err;
      }
      response = await resp.json();
      console.log('✅ [FETCH] REST query successful');
    }
    
    console.log(`✅ [FETCH] Page ${pageCount} fetched:`, {
      results_count: response.results?.length || 0,
      has_more: response.has_more,
      next_cursor: response.next_cursor ? 'present' : 'none'
    });
    
    results.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  console.log('✅ [FETCH] All pages fetched:', {
    total_results: results.length,
    total_pages: pageCount
  });
  return results;
}

exports.handler = async (event, context) => {
  // Garantir que sempre retornamos JSON, mesmo em caso de erro não esperado
  const safeHandler = async () => {
    console.log('🔍 [NOTION] ========== Starting function ==========');
    console.log('🔍 [NOTION] HTTP Method:', event.httpMethod);
    console.log('🔍 [NOTION] Query params:', JSON.stringify(event.queryStringParameters || {}));
    console.log('🔍 [NOTION] Headers:', JSON.stringify(event.headers || {}));
    
    if (event.httpMethod === 'OPTIONS') {
      console.log('🔍 [NOTION] OPTIONS request - returning CORS headers');
      return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    // Verificar se Client está disponível
    if (!Client) {
      console.error('❌ [NOTION] @notionhq/client não está disponível');
      throw new Error('@notionhq/client não está disponível. Verifique as dependências.');
    }
    console.log('✅ [NOTION] @notionhq/client disponível');

    try {
      console.log('🔍 [NOTION] Building Notion client...');
      const notionCtx = buildNotionClient();
      console.log('✅ [NOTION] Client built successfully');
      console.log('🔍 [NOTION] Database ID:', notionCtx.databaseId ? `${notionCtx.databaseId.substring(0, 8)}...` : 'NOT SET');
      console.log('🔍 [NOTION] Database ID full length:', notionCtx.databaseId ? notionCtx.databaseId.length : 0);
      console.log('🔍 [NOTION] Token exists:', !!notionCtx.token);
      console.log('🔍 [NOTION] Client available:', !!notionCtx.client);
      
      // ✅ TESTAR ACESSO AO BANCO ANTES DE FAZER QUERIES
      if (notionCtx.client && notionCtx.databaseId) {
        console.log('🔍 [NOTION] Testing database access...');
        try {
          const dbInfo = await notionCtx.client.databases.retrieve({
            database_id: notionCtx.databaseId
          });
          console.log('✅ [NOTION] Database exists and is accessible');
          console.log('📊 [NOTION] Database title:', dbInfo.title?.[0]?.plain_text || 'No title');
          console.log('📊 [NOTION] Database ID verified:', dbInfo.id.substring(0, 8) + '...');
        } catch (retrieveError) {
          console.error('❌ [NOTION] Database retrieve failed:', retrieveError.message);
          console.error('❌ [NOTION] Error code:', retrieveError.code);
          console.error('❌ [NOTION] Error status:', retrieveError.status);
          console.error('❌ [NOTION] Error body:', retrieveError.body);
          
          return {
            statusCode: 400,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              success: false,
              error: `Database not accessible: ${retrieveError.message}`,
              code: retrieveError.code || 'DATABASE_ACCESS_ERROR',
              databaseId: notionCtx.databaseId.substring(0, 8) + '...',
              details: retrieveError.body || 'No additional details',
              suggestion: 'Verify that: 1) Database ID is correct, 2) Integration has access to the database, 3) Database is shared with your integration'
            })
          };
        }
      }
      
      const params = event.queryStringParameters || {};
      const route = params.route || 'orders';
      console.log('🔍 [NOTION] Route:', route);
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
                  'Notion-Version': '2025-09-03',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query: params.dbName, filter: { property: 'object', value: 'database' } })
              });
              if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`HTTP ${resp.status} on search: ${txt}`);
              }
              return await resp.json();
            })();
        const foundId = res.results?.[0]?.id;
        databaseId = foundId ? sanitizeDatabaseId(foundId) : databaseId;
        if (!databaseId) {
          throw new Error('Database não encontrado ou ID inválido');
        }
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
        console.log('🔍 [NOTION] Fetching data from database...');
        console.log('🔍 [NOTION] Using database ID:', databaseId || notionCtx.databaseId);
        
        const results = await fetchNotionData(notionCtx, databaseId || notionCtx.databaseId);
        console.log('✅ [NOTION] Raw results fetched:', {
          count: results.length,
          first_item_id: results[0]?.id || 'N/A',
          first_item_has_properties: !!results[0]?.properties,
          first_item_property_keys: results[0]?.properties ? Object.keys(results[0].properties) : []
        });
        
        if (route === 'orders-debug') {
          console.log('🔍 [NOTION] Debug mode - returning count only');
          return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ count: results.length }) };
        }

        console.log('🔍 [NOTION] Processing results with rowToOrder...');
        const orders = results.map((page, index) => {
          try {
            const order = rowToOrder(page);
            if (index < 3) {
              console.log(`🔍 [NOTION] Processed order ${index + 1}:`, {
                id: order.id,
                cliente: order.cliente1 || order.cliente,
                tipoDemanda: order.tipoDemanda,
                dataEntrega: order.dataEntrega,
                status: order.status
              });
            }
            return order;
          } catch (err) {
            console.error(`❌ [NOTION] Error processing page ${index} (${page.id}):`, err.message);
            return null;
          }
        }).filter(Boolean);
        
        console.log('✅ [NOTION] Orders processed:', {
          total: orders.length,
          withCliente: orders.filter(o => o.cliente1 || o.cliente).length,
          withTipoDemanda: orders.filter(o => o.tipoDemanda).length,
          sample_order: orders[0] || null
        });
        
        console.log('🔍 [NOTION] Generating summary...');
        const summary = summarize(orders);
        console.log('✅ [NOTION] Summary generated:', summary);
        
        console.log('🔍 [NOTION] Grouping by client...');
        const clientsData = groupByClient(orders);
        console.log('✅ [NOTION] Clients data:', {
          total_clients: clientsData.length,
          sample_client: clientsData[0] || null
        });
        
        console.log('🔍 [NOTION] Extracting content types...');
        const contentTypes = extractUniqueContentTypes(orders);
        console.log('✅ [NOTION] Content types:', contentTypes);

        console.log('🔍 [NOTION] Building final payload...');
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

        console.log('✅ [NOTION] Payload built:', {
          originalOrders_count: payload.originalOrders.length,
          metrics: payload.metrics,
          visaoGeral_count: payload.visaoGeral.length,
          contentTypes_count: payload.contentTypes.length
        });
        console.log('🔍 [NOTION] ========== Function completed successfully ==========');

        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(payload) };
      }

      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Route not found' }) };
    } catch (error) {
      console.error('❌ [NOTION] ========== ERROR OCCURRED ==========');
      console.error('❌ [NOTION] Error message:', error.message);
      console.error('❌ [NOTION] Error code:', error.code);
      console.error('❌ [NOTION] Error status:', error.status);
      console.error('❌ [NOTION] Error body:', error.body);
      console.error('❌ [NOTION] Error stack:', error.stack);
      console.error('❌ [NOTION] Full error object:', JSON.stringify({
        message: error.message,
        code: error.code,
        status: error.status,
        body: error.body,
        name: error.name
      }, null, 2));
      
      let status = 500;
      if (error.code === 'NO_DB_ID' || error.code === 'ENV_VARS_MISSING' || error.code === 'INVALID_DB_ID') {
        status = 400;
      } else if (error.status) {
        status = error.status;
      } else if (error.code === 'HTTP_QUERY_FAILED') {
        status = 400;
      }
      const errorMessage = error.message || 'Erro desconhecido';
      const errorCode = error.code || 'UNKNOWN_ERROR';
      
      return {
        statusCode: status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ 
          success: false, 
          error: errorMessage, 
          code: errorCode,
          details: error.body || 'No additional details',
          debug: {
            timestamp: new Date().toISOString(),
            api_version: '2025-09-03'
          }
        })
      };
    }
  };

  // Wrapper externo para capturar qualquer erro não esperado
  try {
    return await safeHandler();
  } catch (unexpectedError) {
    console.error('❌ Erro inesperado no handler:', unexpectedError);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        success: false, 
        error: unexpectedError.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? unexpectedError.stack : undefined
      })
    };
  }
};


