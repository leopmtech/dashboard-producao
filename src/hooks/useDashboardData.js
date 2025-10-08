// ==========================================
// src/hooks/useDashboardData.js - VERSÃO COMPATÍVEL COM APP.JS
// ==========================================

import { useState, useEffect, useCallback } from 'react';
import googleSheetsService from '../services/googleSheetsService';
import { DataProcessingService } from '../services/dataProcessingService';

const useDashboardData = () => {
  // Estados principais
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [uniqueDemandTypes, setUniqueDemandTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Estados de filtro
  const [activeFilters, setActiveFilters] = useState({
    periodo: 'ambos',
    tipo: 'geral',
    cliente: 'todos',
    tipoDemandaOriginal: 'todos'
  });
  const [filteredData, setFilteredData] = useState(null);

  // Função para buscar dados
  const fetchData = useCallback(async (useCache = true) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Carregando dados do dashboard...');
      
      // Buscar dados do Google Sheets
      const dashboardData = await googleSheetsService.getDashboardData(useCache);
      
      setRawData(dashboardData);
      setData(dashboardData);
      setLastUpdate(new Date());

      // Extrair tipos únicos de demanda dos dados originais
      if (dashboardData && dashboardData.originalOrders) {
        const uniqueTypes = DataProcessingService.extractUniqueContentTypes(dashboardData);
        setUniqueDemandTypes(uniqueTypes);
        console.log('✅ Tipos únicos carregados:', uniqueTypes.length);
      } else {
        console.warn('⚠️ Nenhuma ordem encontrada para extrair tipos');
        setUniqueDemandTypes([]);
      }

    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err);
      setError(err.message || 'Falha ao carregar dados do dashboard');
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
      // Usar o DataProcessingService para aplicar filtros
      const filtered = DataProcessingService.applyAdvancedFilters(data, activeFilters);
      setFilteredData(filtered);
      
      console.log('🔍 Filtros aplicados:', { 
        filtros: activeFilters,
        ordens: filtered?.originalOrders?.length || 0,
        clientes: filtered?.visaoGeral?.length || 0
      });
    } catch (error) {
      console.error('❌ Erro ao aplicar filtros:', error);
      setFilteredData(data);
    }
  }, [data, activeFilters]);

  // Função para atualizar filtros
  const updateFilter = useCallback((filterType, value) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Se mudou o tipo de demanda original, resetar outros filtros relacionados
      if (filterType === 'tipoDemandaOriginal') {
        newFilters.tipo = 'geral';
      }
      
      console.log('🔧 Atualizando filtro:', { [filterType]: value });
      return newFilters;
    });
  }, []);

  // Função para limpar filtros
  const clearFilters = useCallback(() => {
    setActiveFilters({
      periodo: 'ambos',
      tipo: 'geral',
      cliente: 'todos',
      tipoDemandaOriginal: 'todos'
    });
  }, []);

  // Função para recarregar dados (compatível com App.js)
  const refreshData = useCallback(async () => {
    await fetchData(false); // Force refresh sem cache
  }, [fetchData]);

  // Função para exportar dados (compatível com App.js)
  const exportData = useCallback(async (format = 'csv') => {
    try {
      console.log('📤 Exportando dados em formato:', format);
      
      const dataToExport = filteredData || data;
      if (!dataToExport || !dataToExport.visaoGeral) {
        throw new Error('Nenhum dado disponível para exportar');
      }

      // Preparar dados para exportação
      const csvData = dataToExport.visaoGeral.map(cliente => ({
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

      // Converter para CSV
      const csvContent = [
        // Cabeçalho
        Object.keys(csvData[0] || {}).join(','),
        // Dados
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      // Download do arquivo
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
      
    } catch (error) {
      console.error('❌ Erro ao exportar dados:', error);
      throw error;
    }
  }, [data, filteredData]);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Efeito para aplicar filtros quando mudarem
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Verificar se há filtros ativos
  const hasActiveFilters = Object.entries(activeFilters).some(([key, value]) => {
    const defaults = {
      periodo: 'ambos',
      tipo: 'geral',
      cliente: 'todos',
      tipoDemandaOriginal: 'todos'
    };
    return value !== defaults[key];
  });

  // Dados para retornar (usa filteredData se houver filtros, senão usa data)
  const dataToReturn = filteredData || data;

  return {
    // Dados principais (compatível com App.js)
    data: dataToReturn,
    rawData,
    loading,
    error,
    lastUpdate,
    
    // Tipos únicos para dropdown
    uniqueDemandTypes,
    
    // Filtros
    activeFilters,
    hasActiveFilters,
    
    // Funções (compatível com App.js)
    refreshData,
    exportData,
    updateFilter,
    clearFilters,
    
    // Estatísticas úteis
    stats: {
      totalOrders: data?.originalOrders?.length || 0,
      filteredOrders: dataToReturn?.originalOrders?.length || 0,
      totalClients: data?.visaoGeral?.length || 0,
      filteredClients: dataToReturn?.visaoGeral?.length || 0,
      uniqueTypesCount: uniqueDemandTypes.length
    }
  };
};

export default useDashboardData;