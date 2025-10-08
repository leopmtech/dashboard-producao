// ==========================================
// src/components/DashboardFilters.js - VERSÃO FINAL
// ==========================================

import React from 'react';
import useDashboardData from '../hooks/useDashboardData';
import './DashboardFilters.css';

const DashboardFilters = ({ className = '' }) => {
  const { 
    uniqueDemandTypes, 
    activeFilters, 
    updateFilter, 
    clearFilters,
    hasActiveFilters,
    loading, 
    error,
    stats 
  } = useDashboardData();

  const handleTypeChange = (event) => {
    const value = event.target.value;
    updateFilter('tipoDemandaOriginal', value);
  };

  const handlePeriodChange = (event) => {
    const value = event.target.value;
    updateFilter('periodo', value);
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
              
              {Object.entries(typesByCategory).map(([category, types]) => (
                <optgroup key={category} label={category}>
                  {types.map((type) => (
                    <option key={type.id} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            
            <div className="filter-count">
              {uniqueDemandTypes.length} tipos únicos disponíveis
            </div>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;