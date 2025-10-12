// ==========================================
// src/hooks/useDashboardData.js - COEXISTÊNCIA NOTION + SHEETS
// ==========================================

import { useState, useEffect, useCallback } from 'react';
import notionService from '../services/notionService';
import googleSheetsService from '../services/googleSheetsService';
import { DataProcessingService } from '../services/dataProcessingService';

// --- Helpers de merge --- //
const sumSafe = (a = 0, b = 0) => (Number(a) || 0) + (Number(b) || 0);

function mergeClientsArrays(a = [], b = []) {
  // Agrupa por cliente e soma campos relevantes
  const map = new Map();

  const push = (item) => {
    if (!item || !item.cliente) return;
    const key = item.cliente.trim();
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

function dedupeContentTypes(listA = [], listB = []) {
  // items no formato { id, label, value }
  const byId = new Map();
  const push = (it) => {
    if (!it) return;
    const id = it.id || (it.value || it.label || '').toLowerCase().replace(/\s+/g, '_');
    if (!id) return;
    if (!byId.has(id)) {
      byId.set(id, { id, label: it.label || it.value || it.id, value: it.value || it.label || it.id });
    }
  };
  listA.forEach(push);
  listB.forEach(push);
  return Array.from(byId.values()).sort((x, y) => x.label.localeCompare(y.label, 'pt-BR'));
}

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
        // Se precisar ainda passar dbName temporariamente: notionService.getDashboardData({ dbName: 'NomeDB' })
        notionService.getDashboardData(),
        googleSheetsService.getDashboardData(useCache)
      ]);

      let notionData = null;
      let sheetsData = null;

      if (notionRes.status === 'fulfilled' && notionRes.value) {
        notionData = notionRes.value;
      }
      if (sheetsRes.status === 'fulfilled' && sheetsRes.value) {
        sheetsData = sheetsRes.value;
      }

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

      // --- Mesclar originalOrders --- //
      const originalOrdersMerged = [
        ...(notionData?.originalOrders || []),
        ...(sheetsData?.originalOrders || []),
      ];

      // --- Mesclar visaoGeral por cliente somando campos --- //
      const visaoGeralMerged = mergeClientsArrays(
        notionData?.visaoGeral || [],
        sheetsData?.visaoGeral || []
      );

      // --- Unir contentTypes --- //
      const contentTypesMerged = dedupeContentTypes(
        notionData?.contentTypes || [],
        sheetsData?.contentTypes || []
      );

      // Montar payload no mesmo shape esperado
      const merged = {
        totalSheets: (notionData ? 1 : 0) + (sheetsData ? 1 : 0),
        loadedAt: new Date().toISOString(),
        sheetName: 'notion+sheets',
        originalOrders: originalOrdersMerged,
        metrics: notionData?.metrics || sheetsData?.metrics || {},
        contentTypes: contentTypesMerged,

        // Coleções que o App usa
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
