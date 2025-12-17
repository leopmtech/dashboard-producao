// ==========================================
// src/hooks/useDashboardData.js - CORRIGIDO COM MARCAÇÃO DE FONTES
// ==========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import notionService from '../services/notionService';
import dataSourceService from '../services/dataSourceService';
import { DataProcessingService } from '../services/dataProcessingService';
import { MOCK_NOTION_DATA, shouldUseMockData, useProductionData, simulateNetworkDelay } from '../services/mockData';

// --- Helpers de merge --- //
const sumSafe = (a = 0, b = 0) => (Number(a) || 0) + (Number(b) || 0);

// ✅ Função para obter base URL da API com fallback inteligente
const getApiBase = () => {
  if (process.env.NODE_ENV === 'development') {
    // Se já estamos na porta 8888 (Netlify dev), usar URL relativa
    if (window.location.port === '8888' || window.location.hostname === 'localhost' && window.location.port === '') {
      return '';
    }
    // Caso contrário, tentar localhost:8888 primeiro
    return 'http://localhost:8888';
  }
  // Produção: usar URL relativa
  return '';
};

// ✅ Função para lidar com interferência de extensões do Chrome
// Algumas extensões interceptam/alteram window.fetch e quebram a request.
// Para rotas locais de funções, preferimos XHR direto.
const xhrRequest = (url, options = {}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = options.method || 'GET';

    xhr.open(method, url, true);

    // Set headers if provided
    if (options.headers) {
      Object.keys(options.headers).forEach((key) => {
        xhr.setRequestHeader(key, options.headers[key]);
      });
    }

    xhr.onload = () => {
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        url: xhr.responseURL,
        headers: {
          get: (name) => xhr.getResponseHeader(name),
          entries: () => {
            const headers = {};
            const headerStr = xhr.getAllResponseHeaders();
            if (headerStr) {
              headerStr.trim().split('\r\n').forEach((line) => {
                const parts = line.split(': ');
                if (parts.length === 2) headers[parts[0].toLowerCase()] = parts[1];
              });
            }
            return Object.entries(headers);
          }
        },
        text: () => Promise.resolve(xhr.responseText),
        json: () => {
          try {
            return Promise.resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            return Promise.reject(new Error('Invalid JSON response'));
          }
        }
      };
      resolve(response);
    };

    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timeout'));
    if (options.timeout) xhr.timeout = options.timeout;

    xhr.send(options.body || null);
  });

const fetchWithFallback = async (url, options = {}) => {
  const isFunctionsRoute = typeof url === 'string' && url.includes('/.netlify/functions/');

  // ✅ Evita o fetch interceptado por extensão nas funções locais
  if (isFunctionsRoute) {
    return await xhrRequest(url, options);
  }

  try {
    return await fetch(url, options);
  } catch (error) {
    // Fallback para XHR caso alguma extensão quebre fetch
    if (error?.message && (
      error.message.includes('chrome-extension') ||
      error.message.includes('Failed to fetch') ||
      error.name === 'TypeError'
    )) {
      console.warn('⚠️ [FETCH] Fetch falhou (possível interferência de extensão). Usando XHR fallback...');
      return await xhrRequest(url, options);
    }
    throw error;
  }
};

// ✅ Função para carregar dados de produção do site real do Netlify
const loadProductionData = async () => {
  // URL base: usar site real em desenvolvimento forçado, ou URL relativa em produção real
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? '' 
    : 'https://dash-producao.netlify.app';
  
  const url = `${baseUrl}/.netlify/functions/notion?route=orders`;
  console.log('🌐 [PRODUCTION] Loading from:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔍 [PRODUCTION] Response status:', response.status);
    console.log('🔍 [PRODUCTION] Response headers:', [...response.headers.entries()]);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/html')) {
      throw new Error('Received HTML instead of JSON - Netlify function not found or not deployed');
    }
    
    const data = await response.json();
    console.log('✅ [PRODUCTION] Real data loaded:', data.originalOrders?.length || 0, 'records');
    console.log('✅ [PRODUCTION] Data preview:', {
      hasOriginalOrders: !!data.originalOrders,
      ordersCount: data.originalOrders?.length || 0,
      hasMetrics: !!data.metrics,
      hasVisaoGeral: !!data.visaoGeral
    });
    
    return data;
    
  } catch (error) {
    console.error('❌ [PRODUCTION] Failed to load from deployed site:', error.message);
    console.log('🔄 [PRODUCTION] Falling back to mock data due to error');
    
    // Return mock data as fallback
    return MOCK_NOTION_DATA;
  }
};

// ✅ Função para verificar se deve usar produção
const shouldUseProduction = () => {
  // ✅ Em desenvolvimento, NÃO honrar force-production via localStorage
  // (isso costuma ficar preso e quebra o fluxo quando a API local falha).
  const forceProduction =
    (process.env.NODE_ENV === 'production' && localStorage.getItem('force-production') === 'true') ||
    window.location.search.includes('force-production=true');
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Se estiver no site real do Netlify, sempre usar produção
  const isOnNetlifySite = window.location.hostname.includes('netlify.app');
  
  const finalDecision = isProduction || forceProduction || isOnNetlifySite;
  
  console.log('🔍 [MODE CHECK]', {
    forceProduction,
    isProduction,
    isOnNetlifySite,
    hostname: window.location.hostname,
    finalDecision
  });
  
  return finalDecision;
};

// ✅ Função para fazer requisição com retry e fallback para produção
const fetchWithRetryAndFallback = async (route = 'orders', maxRetries = 1) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const productionUrl = 'https://dash-producao.netlify.app';
  const forceProduction = shouldUseProduction();
  
  // URLs para tentar (em ordem de prioridade)
  const urlsToTry = [];
  
  if (isDevelopment) {
    // ✅ Em desenvolvimento, priorizar URL relativa:
    // - Se estiver em http://localhost:8888 → é mesma origem e funciona
    // - Se estiver em http://localhost:3000 → CRA proxy (package.json "proxy") encaminha para :8888
    urlsToTry.push(`/.netlify/functions/notion?route=${route}`);
    // ✅ Fallback para produção (última tentativa) para evitar cair em mock desnecessariamente
    urlsToTry.push(`${productionUrl}/.netlify/functions/notion?route=${route}`);
    console.log('🔧 [DEV] Tentando local → relativo → deployado');
  } else if (forceProduction) {
    // Modo produção forçado: usar site real
    urlsToTry.push(`${productionUrl}/.netlify/functions/notion?route=${route}`);
    urlsToTry.push(`/.netlify/functions/notion?route=${route}`);
  } else {
    // Produção: usar URL relativa primeiro, depois site real
    urlsToTry.push(`/.netlify/functions/notion?route=${route}`);
    urlsToTry.push(`${productionUrl}/.netlify/functions/notion?route=${route}`);
  }
  
  let lastError = null;
  
  for (let i = 0; i < urlsToTry.length; i++) {
    const url = urlsToTry[i];
    const isLastAttempt = i === urlsToTry.length - 1;
    
    try {
      console.log(`🔍 [FETCH] Tentativa ${i + 1}/${urlsToTry.length}: ${url}`);
      
      const response = await fetchWithFallback(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Se a resposta foi recebida (mesmo que com erro HTTP), considerar sucesso na conexão
      if (response.status === 200) {
        console.log(`✅ [FETCH] Sucesso na tentativa ${i + 1} com URL: ${url}`);
        return response;
      }
      
      // Se não for 200 mas não for erro de conexão, ainda é uma resposta válida
      if (response.status >= 400 && response.status < 500) {
        console.warn(`⚠️ [FETCH] Resposta HTTP ${response.status} de ${url}`);
        return response; // Retornar mesmo assim para tratamento de erro adequado
      }
      
    } catch (error) {
      lastError = error;
      const isConnectionError = 
        error.message.includes('Failed to fetch') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('Network error') ||
        error.name === 'TypeError';
      
      if (isConnectionError) {
        console.warn(`⚠️ [FETCH] Erro de conexão na tentativa ${i + 1}: ${error.message}`);
        
        if (!isLastAttempt) {
          console.log(`🔄 [FETCH] Tentando próxima URL...`);
          continue;
        }
      }
      
      // Se não for erro de conexão ou é a última tentativa, propagar erro
      if (!isLastAttempt && !isConnectionError) {
        throw error;
      }
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  const errorMessage = isDevelopment
    ? `Não foi possível conectar à API. Verifique se o Netlify Dev está rodando (npm start). Erro: ${lastError?.message || 'Unknown error'}`
    : `Erro ao conectar com a API: ${lastError?.message || 'Unknown error'}`;
  
  throw new Error(errorMessage);
};

// ✅ NOVA FUNÇÃO: Prepara dados de tendência com todos os 12 meses
const prepareTrendData = (rawData, currentYear = new Date().getFullYear()) => {
  const allMonths = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const monthsMap = {
    'janeiro': 'Janeiro', 'fevereiro': 'Fevereiro', 'marco': 'Março', 'março': 'Março',
    'abril': 'Abril', 'maio': 'Maio', 'junho': 'Junho', 'julho': 'Julho',
    'agosto': 'Agosto', 'setembro': 'Setembro', 'outubro': 'Outubro',
    'novembro': 'Novembro', 'dezembro': 'Dezembro'
  };

  // Processar dados de visaoGeral para criar dados mensais
  const monthlyTotals = {};
  
  if (rawData && rawData.visaoGeral && Array.isArray(rawData.visaoGeral)) {
    // Inicializar todos os meses com 0
    allMonths.forEach(month => {
      monthlyTotals[month] = 0;
    });

    // Somar os valores de todos os clientes por mês
    rawData.visaoGeral.forEach(cliente => {
      Object.keys(monthsMap).forEach(key => {
        if (cliente[key] && typeof cliente[key] === 'number') {
          const monthName = monthsMap[key];
          monthlyTotals[monthName] += cliente[key];
        }
      });
    });
  } else {
    // Se não há dados, inicializar todos com 0
    allMonths.forEach(month => {
      monthlyTotals[month] = 0;
    });
  }

  // Criar estrutura final com todos os 12 meses
  const fullYearData = allMonths.map((month, index) => {
    const monthNumber = index + 1;
    const current = monthlyTotals[month] || 0;

    return {
      month,
      monthNumber,
      current,
      previous: 0, // Será calculado abaixo
      growth: 0,   // Será calculado abaixo
      date: `${currentYear}-${monthNumber.toString().padStart(2, '0')}-01`
    };
  });

  // Calcular comparações com mês anterior
  fullYearData.forEach((item, index) => {
    if (index > 0) {
      const previousMonth = fullYearData[index - 1];
      item.previous = previousMonth.current;
      
      // Calcular crescimento percentual
      if (previousMonth.current > 0) {
        item.growth = ((item.current - previousMonth.current) / previousMonth.current) * 100;
      } else {
        item.growth = item.current > 0 ? 100 : 0;
      }
    } else {
      // Para janeiro, não há mês anterior no ano atual
      item.previous = 0;
      item.growth = 0;
    }
  });

  console.log('📊 [TREND] Dados de tendência processados:', {
    totalMeses: fullYearData.length,
    mesesComDados: fullYearData.filter(m => m.current > 0).length,
    primeiros5: fullYearData.slice(0, 5).map(m => ({ mes: m.month, valor: m.current }))
  });

  return fullYearData;
};

// Soma por cliente e meses (janeiro...dezembro), mantendo totais/coerência
function mergeClientsArrays(a = [], b = []) {
  const map = new Map();

  const push = (item) => {
    if (!item || !item.cliente) return;
    const key = String(item.cliente).trim();
    const prev = map.get(key) || {
      cliente: key,
      total: 0,
      concluidos: 0,
      pendentes: 0,
      atrasados: 0,
      '2024': 0,
      '2025': 0,
      janeiro: 0, fevereiro: 0, marco: 0, abril: 0, maio: 0, junho: 0,
      julho: 0, agosto: 0, setembro: 0, outubro: 0, novembro: 0, dezembro: 0
    };

    const next = {
      ...prev,
      total: sumSafe(prev.total, item.total),
      concluidos: sumSafe(prev.concluidos, item.concluidos),
      pendentes: sumSafe(prev.pendentes, item.pendentes),
      atrasados: sumSafe(prev.atrasados, item.atrasados),
      '2024': sumSafe(prev['2024'], item['2024']),
      '2025': sumSafe(prev['2025'], item['2025']),
      janeiro: sumSafe(prev.janeiro, item.janeiro),
      fevereiro: sumSafe(prev.fevereiro, item.fevereiro),
      marco: sumSafe(prev.marco, item.marco),
      abril: sumSafe(prev.abril, item.abril),
      maio: sumSafe(prev.maio, item.maio),
      junho: sumSafe(prev.junho, item.junho),
      julho: sumSafe(prev.julho, item.julho),
      agosto: sumSafe(prev.agosto, item.agosto),
      setembro: sumSafe(prev.setembro, item.setembro),
      outubro: sumSafe(prev.outubro, item.outubro),
      novembro: sumSafe(prev.novembro, item.novembro),
      dezembro: sumSafe(prev.dezembro, item.dezembro),
    };

    map.set(key, next);
  };

  a.forEach(push);
  b.forEach(push);

  return Array.from(map.values());
}

// ✅ FUNÇÃO PARA DEBUGGAR CAMPOS DO NOTION
function debugNotionFields(notionArray) {
  if (!Array.isArray(notionArray) || notionArray.length === 0) return;
  console.log('🔍 [NOTION DEBUG] Analisando campos disponíveis...');
  const sample = notionArray.slice(0, 10);
  sample.forEach((record, index) => {
    const allKeys = Object.keys(record || {});
    const clientFields = allKeys.filter(key =>
      key.toLowerCase().includes('client') || key.toLowerCase().includes('cliente')
    );
    console.log(`🔍 [NOTION DEBUG] Registro ${index}:`, {
      totalCampos: allKeys.length,
      camposCliente: clientFields,
      valoresCliente: clientFields.reduce((acc, field) => {
        acc[field] = record[field];
        return acc;
      }, {})
    });
  });
}

// ✅ FUNÇÃO PARA VERIFICAR ESPECIFICAMENTE O CAMPO "Cliente"
function debugNotionClientField(notionArray) {
  if (!Array.isArray(notionArray) || notionArray.length === 0) return;
  console.log('🔍 [NOTION CLIENTE] Analisando campo "Cliente" especificamente...');

  const analise = {
    totalRegistros: notionArray.length,
    comCampoCliente: 0,
    semCampoCliente: 0,
    valoresUnicos: new Set(),
    valoresVazios: 0,
    valoresNulos: 0,
    amostraValores: []
  };

  notionArray.forEach((record, index) => {
    const valorCliente = record?.Cliente;

    if (valorCliente === null || valorCliente === undefined) {
      analise.valoresNulos++;
      analise.semCampoCliente++;
    } else if (typeof valorCliente === 'string' && valorCliente.trim() === '') {
      analise.valoresVazios++;
      analise.semCampoCliente++;
    } else if (typeof valorCliente === 'string' && valorCliente.trim().length > 0) {
      analise.comCampoCliente++;
      analise.valoresUnicos.add(valorCliente.trim());

      if (analise.amostraValores.length < 20) {
        analise.amostraValores.push({
          index,
          valor: valorCliente.trim(),
          contemMultiplos: valorCliente.includes(',') || valorCliente.includes('/')
        });
      }
    } else {
      analise.semCampoCliente++;
    }
  });

  console.log('🔍 [NOTION CLIENTE] Análise do campo "Cliente":');
  console.log(`  📊 Total de registros: ${analise.totalRegistros}`);
  console.log(`  ✅ Com campo Cliente preenchido: ${analise.comCampoCliente}`);
  console.log(`  ❌ Sem campo Cliente: ${analise.semCampoCliente}`);
  console.log(`  📊 Valores únicos detectados: ${analise.valoresUnicos.size}`);
  console.log(`  🔍 Taxa de preenchimento: ${((analise.comCampoCliente / analise.totalRegistros) * 100).toFixed(1)}%`);

  console.log('📋 [AMOSTRA] Primeiros 20 valores do campo "Cliente":');
  analise.amostraValores.forEach(item => {
    console.log(`  ${item.index}: "${item.valor}" ${item.contemMultiplos ? '🔀 (múltiplos)' : ''}`);
  });

  console.log('📋 [VALORES ÚNICOS] Todos os valores únicos detectados:');
  console.log(Array.from(analise.valoresUnicos).sort());

  return analise;
}

// Unifica contentTypes no formato { id, label, value } com dedupe e normalização
function dedupeContentTypes(listA = [], listB = []) {
  console.log('🔗 [MERGE] Consolidando tipos de conteúdo...');
  console.log('🔗 [MERGE] Lista A (Notion):', listA.length, 'itens');
  console.log('🔗 [MERGE] Lista B (Sheets):', listB.length, 'itens');
  
  const byId = new Map();
  
  // Função para escolher a melhor versão entre duas strings
  const escolherMelhorVersao = (versaoA, versaoB) => {
    if (!versaoA) return versaoB;
    if (!versaoB) return versaoA;
    
    // Critério 1: Preferir versão com primeira letra maiúscula
    const primeiraLetraA = versaoA.charAt(0);
    const primeiraLetraB = versaoB.charAt(0);
    
    const aTemMaiuscula = primeiraLetraA === primeiraLetraA.toUpperCase();
    const bTemMaiuscula = primeiraLetraB === primeiraLetraB.toUpperCase();
    
    if (aTemMaiuscula && !bTemMaiuscula) return versaoA;
    if (!aTemMaiuscula && bTemMaiuscula) return versaoB;
    
    // Critério 2: Preferir versão com mais palavras capitalizadas
    const palavrasCapitalizadasA = (versaoA.match(/\b[A-Z]/g) || []).length;
    const palavrasCapitalizadasB = (versaoB.match(/\b[A-Z]/g) || []).length;
    
    if (palavrasCapitalizadasA > palavrasCapitalizadasB) return versaoA;
    if (palavrasCapitalizadasB > palavrasCapitalizadasA) return versaoB;
    
    // Critério 3: Preferir versão mais longa (mais completa)
    if (versaoA.length > versaoB.length) return versaoA;
    if (versaoB.length > versaoA.length) return versaoB;
    
    // Se tudo igual, manter a primeira versão
    return versaoA;
  };
  
  const push = (it, fonte) => {
    if (!it) return;
    
    const fallback = String(it.value || it.label || it.id || '').trim();
    if (!fallback) return;
    
    // Gerar ID normalizado (lowercase, sem espaços, sem acentos)
    const idNormalizado = fallback.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9_]/g, '');
    
    if (!idNormalizado) return;
    
    const novoLabel = it.label || it.value || it.id || fallback;
    const novoValue = it.value || it.label || it.id || fallback;
    
    // Se já existe, escolher a melhor versão
    if (byId.has(idNormalizado)) {
      const existente = byId.get(idNormalizado);
      const melhorLabel = escolherMelhorVersao(existente.label, novoLabel);
      const melhorValue = escolherMelhorVersao(existente.value, novoValue);
      
      console.log(`🔄 [MERGE] Conflito resolvido: "${existente.label}" vs "${novoLabel}" → "${melhorLabel}"`);
      
      byId.set(idNormalizado, {
        id: idNormalizado,
        label: melhorLabel,
        value: melhorValue
      });
    } else {
      // Primeiro encontro
      console.log(`➕ [MERGE] Novo tipo (${fonte}): "${novoLabel}"`);
      byId.set(idNormalizado, {
        id: idNormalizado,
        label: novoLabel,
        value: novoValue
      });
    }
  };
  
  // Processar listas (Notion primeiro, depois Sheets para dar prioridade ao Sheets)
  listA.forEach(item => push(item, 'Notion'));
  listB.forEach(item => push(item, 'Sheets'));
  
  const resultado = Array.from(byId.values()).sort((x, y) => 
    x.label.localeCompare(y.label, 'pt-BR')
  );
  
  console.log('🔗 [MERGE] === CONSOLIDAÇÃO FINAL ===');
  console.log(`✅ [MERGE] Tipos únicos consolidados: ${resultado.length}`);
  console.log('🔗 [MERGE] Primeiros 10:', resultado.slice(0, 10).map(r => r.label));
  
  return resultado;
}

// Merge genérico: se ambos são arrays e parecem "mensal por cliente", soma por mês; caso contrário concatena (com dedupe).
const mergeColecaoPorClienteEMes = (baseArr = [], rtArr = []) => {
  const index = new Map();
  const coerce = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  const meses = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const clone = (x) => JSON.parse(JSON.stringify(x));

  for (const item of baseArr) {
    if (!item || !item.cliente) continue;
    index.set(item.cliente, clone(item));
  }
  for (const item of rtArr) {
    if (!item || !item.cliente) continue;
    const curr = index.get(item.cliente) || { cliente: item.cliente };
    for (const m of meses) curr[m] = coerce(curr[m]) + coerce(item[m]);
    if (typeof curr.total === 'number' || typeof item.total === 'number') {
      curr.total = coerce(curr.total) + coerce(item.total);
    }
    if (item.tipo && !curr.tipo) curr.tipo = item.tipo;
    index.set(item.cliente, curr);
  }
  return Array.from(index.values());
};

const mergeColecoes = (sheetsData = {}, notionData = {}) => {
  const result = { ...sheetsData };
  for (const [key, value] of Object.entries(notionData)) {
    if (key === 'lastUpdate' || key === 'type') continue;

    const baseVal = result[key];
    if (Array.isArray(baseVal) && Array.isArray(value)) {
      const pareceMensal = value.some(v => v && typeof v === 'object' && ('cliente' in v));
      if (pareceMensal) {
        result[key] = mergeColecaoPorClienteEMes(baseVal, value);
      } else {
        const seen = new Set(baseVal.map(v => JSON.stringify(v)));
        for (const v of value) {
          const s = JSON.stringify(v);
          if (!seen.has(s)) { baseVal.push(v); seen.add(s); }
        }
        result[key] = baseVal;
      }
    } else if (baseVal === undefined) {
      result[key] = value;
    } else {
      // Conflitos não-array: prioriza Notion (tempo real)
      result[key] = value;
    }
  }
  result.lastUpdate = notionData.lastUpdate || sheetsData.lastUpdate || new Date().toISOString();
  return result;
};

// Deduplicação simples de orders por id (ou hash do conteúdo)
const dedupeOrders = (a = [], b = []) => {
  const keyOf = (o) => o?.id || o?.orderId || JSON.stringify(o);
  const seen = new Set();
  const out = [];
  for (const src of [a, b]) {
    for (const o of (src || [])) {
      const k = keyOf(o);
      if (!seen.has(k)) { seen.add(k); out.push(o); }
    }
  }
  return out;
};

// 🆕 PASSO 2: Função de validação de estrutura de dados
function validateDataStructure(data, source) {
  if (!Array.isArray(data)) {
    console.warn(`⚠️ [DATA VALIDATION] ${source}: dados não são um array`);
    return [];
  }
  
  // Campos obrigatórios (Notion usa cliente1, não cliente)
  const requiredFields = ['cliente1', 'cliente', 'dataEntrega', 'tipoDemanda'];
  const issues = [];
  const fieldCounts = {};
  
  data.forEach((item, index) => {
    // Verificar se pelo menos um campo de cliente existe
    const hasCliente = item.cliente1 || item.cliente || item.Cliente;
    
    if (!hasCliente) {
      issues.push({
        index,
        field: 'cliente (qualquer)',
        item: { 
          id: item.id, 
          source, 
          ordemServico: item.ordemServico,
          availableFields: Object.keys(item)
        }
      });
    }
    
    // Contar campos presentes
    requiredFields.forEach(field => {
      if (item[field]) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }
    });
  });
  
  if (issues.length > 0) {
    console.error(`❌ [DATA VALIDATION] ${source}: ${issues.length} problemas encontrados (primeiros 10):`, issues.slice(0, 10));
    console.warn(`⚠️ [DATA VALIDATION] Total de registros: ${data.length}, Registros sem cliente: ${issues.length}`);
  } else {
    console.log(`✅ [DATA VALIDATION] ${source}: todos os ${data.length} registros têm cliente`);
  }
  
  // Log adicional de distribuição de campos
  console.log(`📊 [DATA VALIDATION] ${source} - Distribuição de campos:`, fieldCounts);
  
  return issues;
}

const useDashboardData = () => {
  // Estados principais
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [uniqueDemandTypes, setUniqueDemandTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // 🆕 Estados para debug - dados intermediários
  const [notionData, setNotionData] = useState(null);
  const [sheetsData, setSheetsData] = useState(null);
  const [consolidatedData, setConsolidatedData] = useState(null);

  // Estado extra para debug de fontes
  const [sourceStatus, setSourceStatus] = useState({
    notionOk: false,
    sheetsOk: false,
    notionClients: 0,
    sheetsClients: 0,
    notionOrders: 0,
    sheetsOrders: 0,
  });

  // Filtros (compatíveis com App.js)
  const [activeFilters, setActiveFilters] = useState({
    periodo: 'ambos',
    tipo: 'geral',
    cliente: 'todos',
    tipoDemandaOriginal: 'todos',
  });
  const [filteredData, setFilteredData] = useState(null);

  // === BUSCA DE DADOS (Notion + Sheets) ===
  const fetchData = useCallback(async (useCache = true) => {
    // ✅ Evitar double-fetch no React StrictMode (dev)
    // e evitar duas cargas simultâneas pesadas.
    if (fetchData._inFlight) {
      return fetchData._inFlight;
    }

    fetchData._inFlight = (async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('📊 [NOTION ONLY] Carregando dados apenas do Notion...');

      // ✅ DETECÇÃO DE MODO DE DESENVOLVIMENTO COM MOCK DATA
      const isProductionMode = shouldUseProduction();
      const forceMockMode = shouldUseMockData();
      let notionData;
      
      // Log da fonte de dados
      console.log('📊 [DATA SOURCE]', {
        mode: isProductionMode ? 'PRODUCTION' : 'DEVELOPMENT',
        usingMock: forceMockMode,
        hostname: window.location.hostname,
        port: window.location.port,
        environment: process.env.NODE_ENV,
        searchParams: window.location.search
      });
      
      if (forceMockMode) {
        console.log('🔧 [MOCK MODE] Mock forçado (force-mock=true).');
        await simulateNetworkDelay(500);
        notionData = MOCK_NOTION_DATA;
      } else {
        // ✅ SEMPRE tentar carregar dados reais primeiro (mesmo no React dev server :3000)
        // Se falhar em desenvolvimento, fazer fallback para mock.
        try {
          console.log('🌐 [API] Tentando carregar dados reais...');

          // ✅ Novo fluxo paginado (evita timeout do Netlify Dev / functions)
          const sourcesResp = await fetchWithRetryAndFallback('orders-sources');
          if (!sourcesResp.ok) {
            const errorText = await sourcesResp.text();
            throw new Error(`Erro na API Notion (orders-sources): ${sourcesResp.status} - ${errorText.substring(0, 200)}`);
          }
          const sourcesJson = await sourcesResp.json();
          const sources = sourcesJson.sources || [];

          if (!Array.isArray(sources) || sources.length === 0) {
            throw new Error('Nenhum data source retornado pelo Notion (orders-sources).');
          }

          console.log('📦 [PAGED] Data sources:', sources.map(s => `${s.name}:${String(s.id).slice(0, 8)}`).join(', '));

          const allOrders = [];
          for (const src of sources) {
            let cursor = null;
            let safety = 0;
            do {
              safety += 1;
              if (safety > 300) throw new Error('Limite de paginação excedido (safety stop).');

              const route = `orders-page&sourceId=${encodeURIComponent(src.id)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}&pageSize=100`;
              const pageResp = await fetchWithRetryAndFallback(route);
              if (!pageResp.ok) {
                const errorText = await pageResp.text();
                throw new Error(`Erro na API Notion (orders-page): ${pageResp.status} - ${errorText.substring(0, 200)}`);
              }
              const pageJson = await pageResp.json();
              const orders = Array.isArray(pageJson.orders) ? pageJson.orders : [];
              allOrders.push(...orders);
              cursor = pageJson.next_cursor || null;

              // Log leve a cada página
              console.log(`📦 [PAGED] ${src.name}: +${orders.length} (total ${allOrders.length}) ${pageJson.has_more ? '…' : 'done'}`);
            } while (cursor);
          }

          // Construir payload no mesmo shape esperado pelo app
          const metrics = DataProcessingService.recalculateMetricsFromOrders
            ? DataProcessingService.recalculateMetricsFromOrders(allOrders)
            : { totalDemandas: allOrders.length };
          const visaoGeral = DataProcessingService.aggregateByClient
            ? DataProcessingService.aggregateByClient(allOrders)
            : [];
          const contentTypes = [...new Set(allOrders.map(o => (o.tipoDemanda || '').trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map(tipo => ({ id: tipo.toLowerCase().replace(/\s+/g, '_'), label: tipo, value: tipo }));

          notionData = {
            totalSheets: 1,
            loadedAt: new Date().toISOString(),
            sheetName: 'notion',
            originalOrders: allOrders,
            metrics,
            contentTypes,
            visaoGeral,
            visaoGeral2024: visaoGeral.filter(c => (c['2024'] || 0) > 0),
            diarios: visaoGeral,
            diarios2024: visaoGeral.filter(c => (c['2024'] || 0) > 0),
            semanais: visaoGeral,
            semanais2024: visaoGeral.filter(c => (c['2024'] || 0) > 0),
            mensais: visaoGeral,
            mensais2024: visaoGeral.filter(c => (c['2024'] || 0) > 0),
            especiais: visaoGeral,
            especiais2024: visaoGeral.filter(c => (c['2024'] || 0) > 0),
            diagnosticos: visaoGeral,
            diagnosticos2024: visaoGeral.filter(c => (c['2024'] || 0) > 0),
            design: visaoGeral,
          };
        } catch (apiErr) {
          if (process.env.NODE_ENV === 'development') {
            // Se force-production estiver ativo, NÃO cair em mock.
            if (isProductionMode) {
              console.error('❌ [API] force-production ativo: não usando mock fallback. Erro:', apiErr?.message || apiErr);
              throw apiErr;
            }

            console.warn('⚠️ [API] Falha ao carregar dados reais em desenvolvimento. Usando mock como fallback.', apiErr?.message || apiErr);
            await simulateNetworkDelay(500);
            notionData = MOCK_NOTION_DATA;
          } else {
            throw apiErr;
          }
        }
        console.log('✅ [PROD] Raw data received:', notionData);
        console.log('✅ [PROD] Data type:', typeof notionData);
        console.log('✅ [PROD] Data structure:', {
          success: notionData.success,
          hasOriginalOrders: !!notionData?.originalOrders,
          ordersCount: notionData?.originalOrders?.length || 0,
          expectedCount: 1616,
          has_data_array: Array.isArray(notionData.data),
          data_count: notionData.data?.length || 0,
          has_metrics: !!notionData.metrics,
          has_visaoGeral: !!notionData.visaoGeral,
          visaoGeral_count: notionData.visaoGeral?.length || 0,
          first_order: notionData?.originalOrders?.[0] || null,
          debug_info: notionData.debug || null
        });
        
        // Log de comparação
        const actualCount = notionData?.originalOrders?.length || 0;
        console.log(`📦 [PROD] Record count: ${actualCount}`);
        
        // Se a resposta tem estrutura diferente (com wrapper success/data)
        if (notionData.success === false) {
          console.error('❌ [PROD] API returned error:', notionData);
          throw new Error(notionData.error || 'API returned error');
        }
        
        // Se a resposta tem wrapper { success, data }
        if (notionData.success === true && notionData.data) {
          console.log('🔍 [PROD] Response has wrapper structure, extracting data...');
          // A estrutura esperada já está em notionData, mas vamos verificar
          if (!notionData.originalOrders && notionData.data) {
            console.warn('⚠️ [PROD] Data structure mismatch - data in wrapper but no originalOrders');
          }
        }
      }
      
      // 🆕 SET DEBUG STATE
      setNotionData(notionData);
      
      // 🆕 PASSO 2: Validar estrutura dos dados do Notion
      validateDataStructure(notionData?.originalOrders || [], 'Notion');
      
      // ❌ REMOVER GOOGLE SHEETS
      let sheetsData = null;
      
      // 🆕 SET DEBUG STATE
      setSheetsData(sheetsData);
      
      // 🆕 PASSO 2: Validar estrutura dos dados do Sheets (se existir)
      if (sheetsData?.originalOrders) {
        validateDataStructure(sheetsData.originalOrders, 'Sheets');
      }

      // 🆕 PASSO 2: Consolidar dados de clientes ANTES da consolidação principal
      console.log('🔄 [CONSOLIDATION] Consolidando dados de clientes...');
      const notionRawDataConsolidated = DataProcessingService.consolidateClientData(notionData?.originalOrders || []);
      const sheetsRawDataConsolidated = sheetsData?.originalOrders 
        ? DataProcessingService.consolidateClientData(sheetsData.originalOrders) 
        : [];

      // 🆕 CONSOLIDAÇÃO COM MARCAÇÃO DE FONTES
      console.log('🔄 [DATA CONSOLIDATION] Aplicando consolidação com marcação de fontes...');
      
      // Preparar dados brutos para consolidação (agora com clientes consolidados)
      const sheetsRawData = sheetsRawDataConsolidated;
      const notionRawData = notionRawDataConsolidated;
      
      console.log('🔍 [DEBUG] Dados brutos para consolidação:', {
        sheetsRawLength: sheetsRawData.length,
        notionRawLength: notionRawData.length,
        sheetsSample: sheetsRawData.slice(0, 2),
        notionSample: notionRawData.slice(0, 2)
      });
      
      // Aplicar consolidação do DataProcessingService
      const consolidatedRawData = DataProcessingService.consolidateAndNormalize(sheetsRawData, notionRawData);
      
      console.log('✅ [CONSOLIDATED RAW] Dados brutos consolidados:', {
        total: consolidatedRawData?.length || 0,
        porFonte: {
          sheets: consolidatedRawData?.filter(item => item._source === 'sheets')?.length || 0,
          notion: consolidatedRawData?.filter(item => item._source === 'notion')?.length || 0
        }
      });

      // Atualiza status de fontes
      setSourceStatus({
        notionOk: !!(notionData && notionData.visaoGeral),
        sheetsOk: !!(sheetsData && sheetsData.visaoGeral),
        notionClients: notionData?.visaoGeral?.length || 0,
        sheetsClients: sheetsData?.visaoGeral?.length || 0,
        notionOrders: notionData?.originalOrders?.length || 0,
        sheetsOrders: sheetsData?.originalOrders?.length || 0,
      });
      
      console.log('🔍 [DEBUG] Status das fontes:', {
        notionOk: !!(notionData && notionData.visaoGeral),
        sheetsOk: !!(sheetsData && sheetsData.visaoGeral),
        notionClients: notionData?.visaoGeral?.length || 0,
        sheetsClients: sheetsData?.visaoGeral?.length || 0,
        notionOrders: notionData?.originalOrders?.length || 0,
        sheetsOrders: sheetsData?.originalOrders?.length || 0,
      });

      if (!notionData && !sheetsData) {
        throw new Error('Falha ao carregar Notion e Google Sheets.');
      }

      // Merge genérico de todas coleções conhecidas
      const baseMerged = mergeColecoes(sheetsData || {}, notionData || {});

      // Mesclar originalOrders com dedupe
      const originalOrdersMerged = dedupeOrders(
        notionData?.originalOrders || [],
        sheetsData?.originalOrders || []
      );

      // 🆕 MARCAR originalOrders COM FONTE
      const originalOrdersMarked = originalOrdersMerged.map((order, index) => ({
        ...order,
        _source: order._source || 'notion', // Notion é a fonte única padrão
        _id: order._id || `order_${index}`,
        _originalIndex: index
      }));

      // 🚫 APLICAR FILTRO DE EXCLUSÃO POR TAGS (ex: "Documentos Internos")
      // Garantir que tarefas com tags de exclusão sejam removidas antes de processar métricas
      const originalOrdersFiltered = DataProcessingService.filterExcludedTasks
        ? DataProcessingService.filterExcludedTasks(originalOrdersMarked)
        : originalOrdersMarked;
      
      if (originalOrdersFiltered.length !== originalOrdersMarked.length) {
        console.log(`🚫 [HOOK] ${originalOrdersMarked.length - originalOrdersFiltered.length} tarefa(s) excluída(s) por tags de exclusão no merge`);
      }

      // Mesclar visaoGeral por cliente somando campos
      const visaoGeralMerged = mergeClientsArrays(
        notionData?.visaoGeral || [],
        sheetsData?.visaoGeral || []
      );

      // 🆕 MARCAR visaoGeral COM FONTE
      const visaoGeralMarked = visaoGeralMerged.map((cliente, index) => ({
        ...cliente,
        _source: 'processed', // Dados processados (merge)
        _id: `client_${index}`,
        _originalIndex: index
      }));

      // Unir contentTypes
      console.log('🔍 [DEBUG] ContentTypes antes do merge:', {
        notionContentTypes: notionData?.contentTypes?.length || 0,
        sheetsContentTypes: sheetsData?.contentTypes?.length || 0,
        notionSample: notionData?.contentTypes?.slice(0, 3) || [],
        sheetsSample: sheetsData?.contentTypes?.slice(0, 3) || []
      });
      
      const contentTypesMerged = dedupeContentTypes(
        notionData?.contentTypes || [],
        sheetsData?.contentTypes || []
      );

      // ✅ PROCESSAR DADOS DE TENDÊNCIA COM TODOS OS 12 MESES
      const trendDataProcessed = prepareTrendData({ visaoGeral: visaoGeralMerged });

      // Montar payload final no shape usado pelo App
      const merged = {
        ...baseMerged, // inclui outras coleções que porventura seu app use
        totalSheets: (notionData ? 1 : 0) + (sheetsData ? 1 : 0),
        loadedAt: new Date().toISOString(),
        sheetName: sheetsData ? 'notion+sheets' : 'notion',
        
        // 🆕 DADOS PRINCIPAIS COM MARCAÇÃO DE FONTE (já filtrados por tags de exclusão)
        originalOrders: originalOrdersFiltered,
        _consolidatedSource: consolidatedRawData, // Para o indicador no App.js
        
        metrics: notionData?.metrics || sheetsData?.metrics || {},
        contentTypes: contentTypesMerged,

        // ✅ ADICIONANDO DADOS DE TENDÊNCIA PROCESSADOS
        trend: trendDataProcessed,

        // Coleções principais padronizadas COM MARCAÇÃO
        visaoGeral: visaoGeralMarked,
        visaoGeral2024: visaoGeralMarked.filter(c => (c['2024'] || 0) > 0),
        diarios: visaoGeralMarked,
        diarios2024: visaoGeralMarked.filter(c => (c['2024'] || 0) > 0),
        semanais: visaoGeralMarked,
        semanais2024: visaoGeralMarked.filter(c => (c['2024'] || 0) > 0),
        mensais: visaoGeralMarked,
        mensais2024: visaoGeralMarked.filter(c => (c['2024'] || 0) > 0),
        especiais: visaoGeralMarked,
        especiais2024: visaoGeralMarked.filter(c => (c['2024'] || 0) > 0),
        diagnosticos: visaoGeralMarked,
        diagnosticos2024: visaoGeralMarked.filter(c => (c['2024'] || 0) > 0),
        design: visaoGeralMarked
      };

      console.log('🎉 [SUCCESS] Dados consolidados e marcados:', {
        consolidatedSource: merged._consolidatedSource?.length || 0,
        originalOrders: merged.originalOrders?.length || 0,
        visaoGeral: merged.visaoGeral?.length || 0,
        fontes: {
          sheets: merged._consolidatedSource?.filter(item => item._source === 'sheets')?.length || 0,
          notion: merged._consolidatedSource?.filter(item => item._source === 'notion')?.length || 0
        }
      });

      setRawData(merged);
      setData(merged);
      
      // 🆕 SET DEBUG STATE
      setConsolidatedData(merged);
      
      // 🆕 PASSO 2: Validar estrutura dos dados consolidados
      validateDataStructure(merged?.originalOrders || [], 'Consolidado');
      
      setUniqueDemandTypes(contentTypesMerged);
      setLastUpdate(new Date());
      setError(null);

    } catch (err) {
      console.error('❌ [ERRO CRÍTICO] Erro ao carregar fontes:', {
        message: err.message,
        stack: err.stack,
        name: err.name,
        cause: err.cause
      });
      
      // Log detalhado para debug
      if (err.message && err.message.includes('JSON')) {
        console.error('❌ [ERRO JSON] Possível problema de parsing JSON. Verifique se o servidor está retornando JSON válido.');
      }
      
      setError(err.message || 'Falha ao carregar dados');
      setData(null);
      setRawData(null);
      setUniqueDemandTypes([]);
    } finally {
      setLoading(false);
      fetchData._inFlight = null;
    }
  })();

  return fetchData._inFlight;
  }, []);

  // Aplicar filtros aos dados
  const applyFilters = useCallback(() => {
    if (!data) {
      setFilteredData(null);
      return;
    }
    try {
      const filtered = DataProcessingService.applyAdvancedFilters
        ? DataProcessingService.applyAdvancedFilters(data, activeFilters)
        : data;
      
      // ✅ REPROCESSAR TREND DATA PARA DADOS FILTRADOS
      if (filtered && filtered.visaoGeral) {
        filtered.trend = prepareTrendData(filtered);
      }
      
      setFilteredData(filtered);
      console.log('🔍 Filtros aplicados:', {
        filtros: activeFilters,
        ordens: filtered?.originalOrders?.length || 0,
        clientes: filtered?.visaoGeral?.length || 0,
        trendMeses: filtered?.trend?.length || 0,
        fonte: data?.sheetName || 'desconhecida',
      });
    } catch (e) {
      console.error('❌ Erro ao aplicar filtros:', e);
      setFilteredData(data);
    }
  }, [data, activeFilters]);

  // Atualizar filtro
  const updateFilter = useCallback((filterType, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev, [filterType]: value };
      if (filterType === 'tipoDemandaOriginal') newFilters.tipo = 'geral';
      console.log('🔧 Atualizando filtro:', { [filterType]: value });
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({
      periodo: 'ambos',
      tipo: 'geral',
      cliente: 'todos',
      tipoDemandaOriginal: 'todos',
    });
  }, []);

  const refreshData = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  const exportData = useCallback(async (format = 'csv') => {
    try {
      console.log('📤 Exportando dados em formato:', format);
      const dataToExport = filteredData || data;
      if (!dataToExport || !dataToExport.visaoGeral) {
        throw new Error('Nenhum dado disponível para exportar');
      }
      const csvData = dataToExport.visaoGeral.map((cliente) => ({
        Cliente: cliente.cliente,
        Total: cliente.total || 0,
        Concluidos: cliente.concluidos || 0,
        Pendentes: cliente.pendentes || 0,
        Atrasados: cliente.atrasados || 0,
        '2024': cliente['2024'] || 0,
        '2025': cliente['2025'] || 0,
        Janeiro: cliente.janeiro || 0,
        Fevereiro: cliente.fevereiro || 0,
        Marco: cliente.marco || 0,
        Abril: cliente.abril || 0,
        Maio: cliente.maio || 0,
        Junho: cliente.junho || 0,
        Julho: cliente.julho || 0,
        Agosto: cliente.agosto || 0,
        Setembro: cliente.setembro || 0,
        Outubro: cliente.outubro || 0,
        Novembro: cliente.novembro || 0,
        Dezembro: cliente.dezembro || 0
      }));

      const header = Object.keys(csvData[0] || {}).join(',');
      const rows = csvData.map((row) => Object.values(row).join(','));
      const csvContent = [header, ...rows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ Dados exportados com sucesso');
    } catch (err) {
      console.error('❌ Erro ao exportar dados:', err);
      throw err;
    }
  }, [data, filteredData]);

  // Efeitos
  useEffect(() => { fetchData(true); }, [fetchData]);
  useEffect(() => { applyFilters(); }, [applyFilters]);

  // ✅ DEBUG: Verificar campos vindos do Notion (amostra)
  useEffect(() => {
    if (notionData && Array.isArray(notionData.originalOrders) && notionData.originalOrders.length > 0) {
      debugNotionFields(notionData.originalOrders);
    }
  }, [notionData]);

  // ✅ DEBUG: Verificar especificamente o campo "Cliente" do Notion
  useEffect(() => {
    if (notionData && Array.isArray(notionData.originalOrders) && notionData.originalOrders.length > 0) {
      debugNotionClientField(notionData.originalOrders);
      console.log('📊 [NOTION ONLY] Carregando dados apenas do Notion...');
    }
  }, [notionData]);

  const hasActiveFilters = Object.entries(activeFilters).some(([k, v]) => {
    const defaults = { periodo: 'ambos', tipo: 'geral', cliente: 'todos', tipoDemandaOriginal: 'todos' };
    return v !== defaults[k];
  });

  const dataToReturn = filteredData || data;

  return {
    data: dataToReturn,
    rawData,
    loading,
    error,
    lastUpdate,

    uniqueDemandTypes,

    activeFilters,
    hasActiveFilters,

    refreshData,
    exportData,
    updateFilter,
    clearFilters,

    // Estatísticas úteis + status das fontes
    stats: {
      totalOrders: data?.originalOrders?.length || 0,
      filteredOrders: dataToReturn?.originalOrders?.length || 0,
      totalClients: data?.visaoGeral?.length || 0,
      filteredClients: dataToReturn?.visaoGeral?.length || 0,
      uniqueTypesCount: uniqueDemandTypes.length,
      fonte: data?.sheetName || 'desconhecida'
    },
    sourceStatus,
    
    // 🆕 DEBUG STATES
    notionData,
    sheetsData,
    consolidatedData
  };
};

export default useDashboardData;