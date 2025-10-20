// ==========================================
// src/components/DashboardFilters.js - DEBUG COMPLETO
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

  // Estratégia MÚLTIPLA para extrair clientes
  const uniqueClients = React.useMemo(() => {
    console.log('🎯 Iniciando extração de clientes únicos...');
    
    const clientsSet = new Set();
    let dataSource = null;
    let sourceDescription = '';
    
    // Estratégia 1: data.visaoGeral
    if (data && data.visaoGeral && Array.isArray(data.visaoGeral)) {
      dataSource = data.visaoGeral;
      sourceDescription = 'data.visaoGeral';
    }
    // Estratégia 2: rawData.visaoGeral
    else if (rawData && rawData.visaoGeral && Array.isArray(rawData.visaoGeral)) {
      dataSource = rawData.visaoGeral;
      sourceDescription = 'rawData.visaoGeral';
    }
    // Estratégia 3: data.originalOrders
    else if (data && data.originalOrders && Array.isArray(data.originalOrders)) {
      dataSource = data.originalOrders;
      sourceDescription = 'data.originalOrders';
    }
    // Estratégia 4: Qualquer array que tenha 'cliente'
    else if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0 && value[0] && value[0].cliente) {
          dataSource = value;
          sourceDescription = `data.${key}`;
          break;
        }
      }
    }
    
    console.log(`🎯 Usando fonte de dados: ${sourceDescription}`);
    console.log(`🎯 Tamanho da fonte: ${dataSource ? dataSource.length : 0}`);
    
    if (!dataSource) {
      console.log('❌ Nenhuma fonte de dados encontrada para clientes');
      return [];
    }
    
    // Processar a fonte encontrada
    dataSource.forEach((item, index) => {
      if (!item) return;
      
      // Testar diferentes campos que podem conter cliente
      const possibleFields = ['cliente', 'client', 'clientName', 'nomeCliente'];
      let clienteValue = null;
      
      for (const field of possibleFields) {
        if (item[field]) {
          clienteValue = String(item[field]).trim();
          break;
        }
      }
      
      if (!clienteValue) return;
      
      if (index < 5) { // Log dos primeiros 5 para debug
        console.log(`🔎 Item ${index}: cliente = "${clienteValue}"`);
      }
      
      // Separar por vírgula se existir
      if (clienteValue.includes(',')) {
        const splitClients = clienteValue.split(',');
        splitClients.forEach(client => {
          const cleanClient = client.trim();
          if (cleanClient) {
            clientsSet.add(cleanClient);
            if (index < 5) {
              console.log(`  ➕ Adicionado (split): "${cleanClient}"`);
            }
          }
        });
      } else {
        clientsSet.add(clienteValue);
        if (index < 5) {
          console.log(`  ➕ Adicionado (único): "${clienteValue}"`);
        }
      }
    });
    
    const result = Array.from(clientsSet).sort((a, b) => 
      a.localeCompare(b, 'pt-BR')
    );
    
    console.log('✅ Clientes únicos extraídos:', result.slice(0, 10), '...'); // Primeiros 10
    console.log('📊 Total de clientes únicos:', result.length);
    
    return result;
  }, [data, rawData]);

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
            CLIENTES ({uniqueClients.length} ÚNICOS DISPONÍVEIS)
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
            
            {/* Debug info */}
            <div className="filter-count" style={{ fontSize: '11px', color: '#666' }}>
              Debug: {uniqueClients.length} clientes únicos
            </div>
          </div>
        </div>

       {/* Filtro por Tipo de Conteúdo da Planilha */}
<div className="filter-group">
  <label htmlFor="originalTypeDropdown" className="filter-label">
    TIPO DE CONTEÚDO ({uniqueDemandTypes.length} TIPOS ÚNICOS)
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