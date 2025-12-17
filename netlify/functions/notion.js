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

// ✅ IMPORTANTE: Database usa múltiplas fontes de dados, REQUER versão 2025-09-03
const NOTION_API_VERSION = '2025-09-03';
const DEBUG_NOTION = process.env.DEBUG_NOTION === 'true';

function dlog(...args) {
  if (DEBUG_NOTION) console.log(...args);
}

function getEnv(name, fallbackName) {
  const value = process.env[name] || process.env[fallbackName];
  if (!value) return null;
  
  // ✅ FIX: Limpeza mais robusta do token para evitar caracteres invisíveis
  let cleaned = String(value)
    // Remove BOM (Byte Order Mark) que pode vir de arquivos UTF-8
    .replace(/^\uFEFF/, '')
    // Remove espaços em branco no início e fim
    .trim()
    // Remove quebras de linha (Windows e Unix)
    .replace(/[\r\n]+/g, '')
    // Remove tabulações
    .replace(/\t/g, '')
    // Remove caracteres de controle invisíveis
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove espaços em branco Unicode não-ASCII
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, '');
  
  // Log se houve diferença (para diagnóstico)
  if (cleaned !== value) {
    console.warn(`⚠️ [ENV] Token/value for ${name} was cleaned (original length: ${value.length}, cleaned length: ${cleaned.length})`);
  }
  
  return cleaned || null;
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
  dlog('🔍 [BUILD CLIENT] Starting client build...');
  
  // ✅ Aceitar múltiplos nomes para o token (muitos ambientes usam NOTION_API_KEY)
  const rawToken =
    getEnv('NOTION_TOKEN') ||
    getEnv('NOTION_API_KEY') ||
    getEnv('REACT_APP_NOTION_TOKEN');
  const token = rawToken ? String(rawToken).trim() : null;
  const dbId = getEnv('NOTION_DATABASE_ID', 'REACT_APP_NOTION_DATABASE_ID');
  
  const missing = [];
  if (!token) {
    missing.push('NOTION_TOKEN');
    console.error('❌ [BUILD CLIENT] NOTION_TOKEN is missing');
  } else {
    dlog('✅ [BUILD CLIENT] NOTION_TOKEN exists');
    dlog('🔍 [BUILD CLIENT] Token length:', token.length);
    dlog('🔍 [BUILD CLIENT] Token first 20 chars:', token.substring(0, 20));
    dlog('🔍 [BUILD CLIENT] Token last 10 chars:', '...' + token.substring(token.length - 10));
    // Verificar se há espaços ou caracteres inválidos
    if (token.includes(' ') || token.includes('\n') || token.includes('\r')) {
      console.warn('⚠️ [BUILD CLIENT] Token contains whitespace or newlines - trimming');
    }
  }
  
  if (missing.length) {
    const error = new Error(`Variáveis ausentes: ${missing.join(', ')}`);
    error.code = 'ENV_VARS_MISSING';
    throw error;
  }
  
  // ✅ DB ID é opcional: algumas rotas podem receber `dbId` via querystring.
  // Mantemos validação quando há um ID configurado, mas não falhamos caso não exista.
  let sanitizedDbId = null;
  if (dbId) {
    dlog('🔍 [BUILD CLIENT] Raw Database ID:', dbId.substring(0, 8) + '...' + dbId.substring(dbId.length - 4));
    dlog('🔍 [BUILD CLIENT] Database ID length:', dbId.length);
    sanitizedDbId = formatDatabaseId(dbId);
    if (!sanitizedDbId) {
      console.error('❌ [BUILD CLIENT] Database ID formatting failed');
      const error = new Error(`NOTION_DATABASE_ID inválido: formato incorreto. ID recebido: ${dbId.substring(0, 20)}...`);
      error.code = 'INVALID_DB_ID';
      throw error;
    }
    dlog('✅ [BUILD CLIENT] Formatted Database ID:', sanitizedDbId.substring(0, 8) + '...');
    dlog('✅ [BUILD CLIENT] Formatted Database ID length:', sanitizedDbId.length);
  } else {
    console.warn('⚠️ [BUILD CLIENT] NOTION_DATABASE_ID ausente no env; esperando dbId via query quando necessário.');
  }
  
  // Garantir que o token está limpo antes de usar
  const cleanToken = token ? String(token).trim() : null;
  if (!cleanToken) {
    throw new Error('Token não pode ser vazio após limpeza');
  }
  
  let client = null;
  try {
    // ✅ IMPORTANTE: Database usa múltiplas fontes de dados, REQUER versão 2025-09-03
    client = new Client({ auth: cleanToken, notionVersion: '2025-09-03' });
    dlog('✅ [BUILD CLIENT] Notion Client created successfully (using 2025-09-03 for multi-source databases)');
  } catch (err) {
    console.error('❌ [BUILD CLIENT] Failed to create Notion Client:', err);
    dlog('❌ [BUILD CLIENT] Token used (first 20):', cleanToken.substring(0, 20));
    throw err;
  }
  
  return { client, token: cleanToken, databaseId: sanitizedDbId };
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
          'Notion-Version': NOTION_API_VERSION,
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

// ✅ Função para obter o data source ID de um database multi-source
async function getDataSourceId(token, databaseId) {
  console.log('🔍 [DATA SOURCE] Fetching data sources for database...');
  const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    }
  });
  
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to get database info: HTTP ${resp.status}: ${txt}`);
  }
  
  const dbInfo = await resp.json();
  console.log('📊 [DATA SOURCE] Database info retrieved');
  
  // Verificar se tem data_sources (API 2025-09-03)
  if (dbInfo.data_sources && dbInfo.data_sources.length > 0) {
    const dataSourceId = dbInfo.data_sources[0].id;
    console.log('✅ [DATA SOURCE] Found data source ID:', dataSourceId.substring(0, 8) + '...');
    console.log('📊 [DATA SOURCE] Total data sources:', dbInfo.data_sources.length);
    console.log('📊 [DATA SOURCE] Data source name:', dbInfo.data_sources[0].name || 'Unnamed');
    return dataSourceId;
  }
  
  // Se não tem data_sources, é um database single-source (compatibilidade)
  console.log('⚠️ [DATA SOURCE] No data_sources found - single source database');
  return null;
}

// ✅ Função para obter TODOS os data sources (multi-source)
async function getAllDataSources(token, databaseId) {
  dlog('🔍 [DATA SOURCE] Fetching ALL data sources for database...');
  const resp = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    }
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to get database info: HTTP ${resp.status}: ${txt}`);
  }

  const dbInfo = await resp.json();
  const sources = Array.isArray(dbInfo.data_sources) ? dbInfo.data_sources : [];

  dlog('📊 [DATA SOURCE] Total data sources:', sources.length);
  return sources
    .filter(ds => ds && ds.id)
    .map(ds => ({ id: ds.id, name: ds.name || 'Unnamed' }));
}

async function fetchNotionData({ client, token }, databaseId) {
  dlog('🔍 [FETCH] Starting fetchNotionData...');
  if (!databaseId || typeof databaseId !== 'string' || databaseId.trim().length === 0) {
    const err = new Error('NOTION_DATABASE_ID não configurado ou inválido');
    err.code = 'NO_DB_ID';
    throw err;
  }
  const sanitizedId = databaseId.trim();
  dlog('🔍 [FETCH] Database ID sanitized:', `${sanitizedId.substring(0, 8)}...`);
  dlog('🔍 [FETCH] Client available:', !!client);
  dlog('🔍 [FETCH] Token available:', !!token);
  
  // ✅ Importante (Notion 2025-09-03 + multi-source):
  // databases/{id}/query retorna "invalid_request_url" para este tipo de database.
  // Portanto, consultamos diretamente TODOS os data_sources e fazemos merge.
  const results = [];
  const sources = await getAllDataSources(token, sanitizedId);
  if (!sources.length) {
    console.warn('⚠️ [FETCH] No data_sources available; returning empty results.');
    return [];
  }

  const byId = new Map();
  for (const src of sources) {
    dlog('🔍 [FETCH][DS] Querying data source:', src.name, src.id.substring(0, 8) + '...');
    let hasMore = true;
    let startCursor = undefined;
    let pageCount = 0;
    try {
      while (hasMore && pageCount < 100) {
        pageCount += 1;
        let response;
        if (client && client.dataSources && typeof client.dataSources.query === 'function') {
          response = await client.dataSources.query({
            data_source_id: src.id,
            start_cursor: startCursor,
            page_size: 100
          });
        } else {
          const endpoint = `https://api.notion.com/v1/data_sources/${src.id}/query`;
          const body = startCursor ? { start_cursor: startCursor, page_size: 100 } : { page_size: 100 };
          const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Notion-Version': NOTION_API_VERSION,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });
          if (!resp.ok) {
            const txt = await resp.text();
            const err = new Error(`HTTP ${resp.status}: ${txt}`);
            err.code = 'HTTP_QUERY_FAILED';
            throw err;
          }
          response = await resp.json();
        }
        for (const page of (response.results || [])) {
          if (page && page.id && !byId.has(page.id)) byId.set(page.id, page);
        }
        hasMore = !!response.has_more;
        startCursor = response.next_cursor;
        dlog(`✅ [FETCH][DS:${src.name}] Page ${pageCount}:`, { results_count: response.results?.length || 0, has_more: hasMore });
      }
    } catch (dsErr) {
      // ✅ Não derrubar a função inteira se um data source falhar
      console.warn(`⚠️ [FETCH][DS] Failed for data source "${src.name}":`, dsErr.message);
    }
  }

  results.push(...byId.values());

  console.log('✅ [FETCH] All pages fetched:', {
    total_results: results.length,
    total_sources: sources.length
  });
  return results;
}

async function fetchOrdersPage({ client, token }, databaseId, sourceId, startCursor, pageSize = 100) {
  if (!sourceId) {
    const err = new Error('sourceId é obrigatório para orders-page (multi-source database)');
    err.code = 'MISSING_SOURCE_ID';
    throw err;
  }

  let response;
  if (client && client.dataSources && typeof client.dataSources.query === 'function') {
    response = await client.dataSources.query({
      data_source_id: sourceId,
      start_cursor: startCursor || undefined,
      page_size: pageSize
    });
  } else {
    const endpoint = `https://api.notion.com/v1/data_sources/${sourceId}/query`;
    const body = startCursor ? { start_cursor: startCursor, page_size: pageSize } : { page_size: pageSize };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const txt = await resp.text();
      const err = new Error(`HTTP ${resp.status}: ${txt}`);
      err.code = 'HTTP_QUERY_FAILED';
      throw err;
    }
    response = await resp.json();
  }

  const pages = response.results || [];
  const orders = pages.map(rowToOrder).filter(Boolean);
  return {
    orders,
    has_more: !!response.has_more,
    next_cursor: response.next_cursor || null
  };
}

exports.handler = async (event, context) => {
  // Garantir que sempre retornamos JSON, mesmo em caso de erro não esperado
  const safeHandler = async () => {
    // Logs detalhados só quando DEBUG_NOTION=true
    dlog('🔍 [NOTION] ========== Starting function ==========');
    dlog('🔍 [NOTION] HTTP Method:', event.httpMethod);
    dlog('🔍 [NOTION] Query params:', JSON.stringify(event.queryStringParameters || {}));
    
    if (event.httpMethod === 'OPTIONS') {
      dlog('🔍 [NOTION] OPTIONS request - returning CORS headers');
      return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    // Verificar se Client está disponível
    if (!Client) {
      console.error('❌ [NOTION] @notionhq/client não está disponível');
      throw new Error('@notionhq/client não está disponível. Verifique as dependências.');
    }
    dlog('✅ [NOTION] @notionhq/client disponível');

    try {
      dlog('🔍 [NOTION] Building Notion client...');
      const notionCtx = buildNotionClient();
      dlog('✅ [NOTION] Client built successfully');
      
      const params = event.queryStringParameters || {};
      const route = params.route || 'orders';
      dlog('🔍 [NOTION] Route:', route);
      // ✅ Permitir `dbId` explícito via query (sem depender de env)
      const dbIdParam = params.dbId || params.databaseId || null;
      let databaseId = dbIdParam ? sanitizeDatabaseId(dbIdParam) : (params.dbName ? null : notionCtx.databaseId);
      if (dbIdParam && !databaseId) {
        throw new Error('dbId fornecido é inválido (formato incorreto).');
      }

      // opcional: permitir busca por nome via dbName
      if (params.dbName) {
        const res = notionCtx.client && notionCtx.client.search
          ? await notionCtx.client.search({ query: params.dbName, filter: { property: 'object', value: 'database' } })
          : await (async () => {
              const resp = await fetch('https://api.notion.com/v1/search', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${notionCtx.token}`,
                  'Notion-Version': NOTION_API_VERSION,
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
      
      // ✅ Se após todos os fallbacks não temos databaseId, falhar com mensagem clara
      if (!databaseId) {
        const err = new Error('NOTION_DATABASE_ID não configurado e nenhum dbId foi fornecido.');
        err.code = 'NO_DB_ID';
        throw err;
      }

      if (route === 'health') {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ status: 'ok', service: 'notion-api', timestamp: new Date().toISOString(), database: databaseId ? 'configured' : 'not-configured' })
        };
      }

      // ✅ Retorna lista de data sources (necessário para paginação no frontend)
      if (route === 'orders-sources') {
        const dbId = databaseId || notionCtx.databaseId;
        const sources = await getAllDataSources(notionCtx.token, dbId);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            databaseId: dbId,
            sources
          })
        };
      }

      // ✅ Paginação: retorna UMA página já normalizada (evita timeout de 30s)
      if (route === 'orders-page') {
        const dbId = databaseId || notionCtx.databaseId;
        const sourceId = params.sourceId;
        const cursor = params.cursor || null;
        const pageSize = params.pageSize ? Math.min(100, Math.max(1, parseInt(params.pageSize, 10))) : 100;
        const page = await fetchOrdersPage(notionCtx, dbId, sourceId, cursor, pageSize);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            sourceId,
            cursor,
            pageSize,
            ...page
          })
        };
      }

      if (route === 'records') {
        const pages = await fetchAllFromDatabase(notionCtx, databaseId);
        return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(pages) };
      }

      if (route === 'orders' || route === 'orders-debug') {
        console.log('🔍 [NOTION] Fetching data from database...');
        
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
            // Evitar logs muito verbosos (pode causar timeout)
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
        dlog('✅ [NOTION] Content types:', contentTypes);

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
        dlog('🔍 [NOTION] ========== Function completed successfully ==========');

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
            api_version: '2025-09-03 (required for multi-source databases)'
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


