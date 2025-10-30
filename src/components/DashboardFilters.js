// ==========================================
// src/components/DashboardFilters.js - DEBUG COMPLETO
// ==========================================

import React from 'react';
import useDashboardData from '../hooks/useDashboardData';
import './DashboardFilters.css';
import { DataProcessingService } from '../services/dataProcessingService';

const DashboardFilters = ({ className = '' }) => {
  const { 
    uniqueDemandTypes, 
    activeFilters, 
    updateFilter, 
    clearFilters,
    hasActiveFilters,
    loading, 
    error,
    stats,
    data,
    rawData // Vamos testar os dados brutos também
  } = useDashboardData();

    // ==========================================
  // DEBUG CRÍTICO - ADICIONE ISSO
  // ==========================================
  console.log('🚨 [FILTERS] === DEBUG CRÍTICO ===');
  console.log('🚨 [FILTERS] loading:', loading);
  console.log('🚨 [FILTERS] error:', error);
  console.log('🚨 [FILTERS] uniqueDemandTypes:', uniqueDemandTypes);
  console.log('🚨 [FILTERS] uniqueDemandTypes é array?', Array.isArray(uniqueDemandTypes));
  console.log('�� [FILTERS] uniqueDemandTypes length:', uniqueDemandTypes?.length);
  console.log('🚨 [FILTERS] Primeiros 3 tipos:', uniqueDemandTypes?.slice(0, 3));
  console.log('🚨 [FILTERS] activeFilters:', activeFilters);

  // Teste se o componente está sendo renderizado
  console.log('🚨 [FILTERS] Componente sendo renderizado');
  
  // ==========================================

  // Debug COMPLETO - vamos ver TUDO
  React.useEffect(() => {
    console.log('🔍 === DEBUG DASHBOARDFILTERS COMPLETO ===');
    console.log('data existe?', !!data);
    console.log('rawData existe?', !!rawData);
    
    if (data) {
      console.log('🔹 Estrutura de data:', Object.keys(data));
      console.log('🔹 data.visaoGeral existe?', !!data.visaoGeral);
      console.log('🔹 data.visaoGeral é array?', Array.isArray(data.visaoGeral));
      if (data.visaoGeral) {
        console.log('🔹 Tamanho de visaoGeral:', data.visaoGeral.length);
        console.log('🔹 Primeiro item de visaoGeral:', data.visaoGeral[0]);
        console.log('🔹 Segundo item de visaoGeral:', data.visaoGeral[1]);
        console.log('🔹 Terceiro item de visaoGeral:', data.visaoGeral[2]);
      }
      
      // Testar outras possíveis estruturas
      if (data.originalOrders) {
        console.log('🔹 data.originalOrders existe, tamanho:', data.originalOrders.length);
        console.log('�� Primeiro order:', data.originalOrders[0]);
      }
    }
    
    if (rawData) {
      console.log('🔸 Estrutura de rawData:', Object.keys(rawData));
      if (rawData.visaoGeral) {
        console.log('🔸 rawData.visaoGeral tamanho:', rawData.visaoGeral.length);
      }
    }
    
    console.log('🔍 === FIM DEBUG DASHBOARDFILTERS ===');
  }, [data, rawData]);

  // Clientes disponíveis COM OS MESMOS FILTROS do dashboard (consistência com KPIs)
  const uniqueClients = React.useMemo(() => {
    // Usa os mesmos filtros avançados para refletir período/tipo/cliente
    const base = data || rawData;
    if (!base) return [];
    const filtered = DataProcessingService.applyAdvancedFilters(base, activeFilters || {});
    const list = (filtered?.visaoGeral || []).map(item => item?.cliente).filter(Boolean);
    // Ordena e remove duplicados (visaoGeral já é por cliente, mas garantimos)
    return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [data, rawData, activeFilters]);

  const handleTypeChange = (event) => {
    const value = event.target.value;
    updateFilter('tipoDemandaOriginal', value);
  };

  const handlePeriodChange = (event) => {
    const value = event.target.value;
    updateFilter('periodo', value);
  };

  const handleClientChange = (event) => {
    const value = event.target.value;
    console.log('🎯 Cliente selecionado:', value);
    updateFilter('cliente', value);
  };

  const handleClearFilters = () => {
    clearFilters();
  };

  if (loading) {
    return (
      <div className={`dashboard-filters loading ${className}`}>
        <div className="filter-skeleton">
          <div className="skeleton-label"></div>
          <div className="skeleton-dropdown"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`dashboard-filters error ${className}`}>
        <div className="error-message">
          ⚠️ Erro ao carregar filtros: {error}
        </div>
      </div>
    );
  }

  // Agrupar tipos por categoria para melhor organização
  const typesByCategory = uniqueDemandTypes.reduce((acc, type) => {
    const category = type.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(type);
    return acc;
  }, {});

  return (
    <div className={`dashboard-filters ${className}`}>
      <div className="filters-grid">
        {/* Filtro por Cliente */}
        <div className="filter-group">
          <label htmlFor="clientDropdown" className="filter-label">
            CLIENTES
          </label>
          <div className="filter-dropdown-container">
            <select
              id="clientDropdown"
              value={activeFilters.cliente || 'todos'}
              onChange={handleClientChange}
              className="filter-dropdown"
              disabled={loading}
            >
              <option value="todos">🌐 Todos os Clientes</option>
              {uniqueClients.map((client, index) => (
                <option key={index} value={client}>
                  🏢 {client}
                </option>
              ))}
            </select>
          </div>
        </div>

       {/* Filtro por Tipo de Conteúdo da Planilha */}
<div className="filter-group">
  <label htmlFor="originalTypeDropdown" className="filter-label">
    TIPO DE CONTEÚDO
  </label>
  <div className="filter-dropdown-container">
    <select
      id="originalTypeDropdown"
      value={activeFilters.tipoDemandaOriginal}
      onChange={handleTypeChange}
      className="filter-dropdown"
      disabled={loading}
    >
      <option value="todos">📋 Todos os tipos</option>
      
      {/* Renderização SIMPLES sem categorias */}
      {uniqueDemandTypes.map((type) => (
        <option key={type.id} value={type.value}>
          📝 {type.label}
        </option>
      ))}
    </select>
  </div>
</div>

        {/* Filtro de Período */}
        <div className="filter-group">
          <label htmlFor="periodDropdown" className="filter-label">
            PERÍODO
          </label>
          <div className="filter-dropdown-container">
            <select
              id="periodDropdown"
              value={activeFilters.periodo}
              onChange={handlePeriodChange}
              className="filter-dropdown"
              disabled={loading}
            >
              <option value="ambos">📊 Comparativo 2024 vs 2025</option>
              <option value="2025">📅 Apenas 2025</option>
              <option value="2024">📅 Apenas 2024</option>
            </select>
          </div>
        </div>

        {/* Botão para limpar filtros */}
        {hasActiveFilters && (
          <div className="filter-actions">
            <button 
              onClick={handleClearFilters}
              className="clear-filters-btn"
              type="button"
            >
              🗑️ Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Estatísticas dos filtros */}
      {hasActiveFilters && (
        <div className="filter-stats">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Ordens:</span>
              <span className="stat-value">{stats.filteredOrders} de {stats.totalOrders}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Clientes:</span>
              <span className="stat-value">{stats.filteredClients} de {stats.totalClients}</span>
            </div>
            {activeFilters.tipoDemandaOriginal !== 'todos' && (
              <div className="stat-item">
                <span className="stat-label">Tipo:</span>
                <span className="stat-value">{activeFilters.tipoDemandaOriginal}</span>
              </div>
            )}
            {activeFilters.cliente && activeFilters.cliente !== 'todos' && (
              <div className="stat-item">
                <span className="stat-label">Cliente Selecionado:</span>
                <span className="stat-value">{activeFilters.cliente}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;