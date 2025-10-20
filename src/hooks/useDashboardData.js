// ==========================================
// src/hooks/useDashboardData.js - COEXISTÊNCIA NOTION + SHEETS (AJUSTADO)
// ==========================================

import { useState, useEffect, useCallback } from 'react';
import notionService from '../services/notionService';          // ✅ mantém apenas um
import googleSheetsService from '../services/googleSheetsService';
import { DataProcessingService } from '../services/dataProcessingService';

// --- Helpers de merge --- //
const sumSafe = (a = 0, b = 0) => (Number(a) || 0) + (Number(b) || 0);

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

const useDashboardData = () => {
  // Estados principais
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [uniqueDemandTypes, setUniqueDemandTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

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
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Carregando dados: Notion + Google Sheets (coexistência)...');

      // Busca em paralelo
      const [notionRes, sheetsRes] = await Promise.allSettled([
        notionService.getDashboardData(),                // tempo real (via /api/notion/orders)
        googleSheetsService.getDashboardData(useCache)   // histórico (Sheets)
      ]);

      let notionData = (notionRes.status === 'fulfilled') ? notionRes.value : null;
      let sheetsData = (sheetsRes.status === 'fulfilled') ? sheetsRes.value : null;

      // Atualiza status de fontes
      setSourceStatus({
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

      // Mesclar visaoGeral por cliente somando campos
      const visaoGeralMerged = mergeClientsArrays(
        notionData?.visaoGeral || [],
        sheetsData?.visaoGeral || []
      );

      // Unir contentTypes
      const contentTypesMerged = dedupeContentTypes(
        notionData?.contentTypes || [],
        sheetsData?.contentTypes || []
      );

      // Montar payload final no shape usado pelo App
      const merged = {
        ...baseMerged, // inclui outras coleções que porventura seu app use
        totalSheets: (notionData ? 1 : 0) + (sheetsData ? 1 : 0),
        loadedAt: new Date().toISOString(),
        sheetName: 'notion+sheets',
        originalOrders: originalOrdersMerged,
        metrics: notionData?.metrics || sheetsData?.metrics || {},
        contentTypes: contentTypesMerged,

        // Coleções principais padronizadas
        visaoGeral: visaoGeralMerged,
        visaoGeral2024: visaoGeralMerged.filter(c => (c['2024'] || 0) > 0),
        diarios: visaoGeralMerged,
        diarios2024: visaoGeralMerged.filter(c => (c['2024'] || 0) > 0),
        semanais: visaoGeralMerged,
        semanais2024: visaoGeralMerged.filter(c => (c['2024'] || 0) > 0),
        mensais: visaoGeralMerged,
        mensais2024: visaoGeralMerged.filter(c => (c['2024'] || 0) > 0),
        especiais: visaoGeralMerged,
        especiais2024: visaoGeralMerged.filter(c => (c['2024'] || 0) > 0),
        diagnosticos: visaoGeralMerged,
        diagnosticos2024: visaoGeralMerged.filter(c => (c['2024'] || 0) > 0),
        design: visaoGeralMerged
      };

      setRawData(merged);
      setData(merged);
      setUniqueDemandTypes(contentTypesMerged);
      setLastUpdate(new Date());
      setError(null);

    } catch (err) {
      console.error('❌ Erro ao carregar fontes:', err);
      setError(err.message || 'Falha ao carregar dados');
      setData(null);
      setRawData(null);
      setUniqueDemandTypes([]);
    } finally {
      setLoading(false);
    }
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
      setFilteredData(filtered);
      console.log('🔍 Filtros aplicados:', {
        filtros: activeFilters,
        ordens: filtered?.originalOrders?.length || 0,
        clientes: filtered?.visaoGeral?.length || 0,
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
        Junho: cliente.junho || 0
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
    sourceStatus
  };
};

export default useDashboardData;
