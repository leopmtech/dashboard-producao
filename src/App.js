// ==========================================
// src/App.js - VERSÃO CORRIGIDA
// Dashboard principal conectado automaticamente à nova planilha
// ==========================================

import React, { useState } from 'react';
import './styles/dashboard.css';

// Componentes existentes (mantidos)
import KPICard from './components/KPICard';
import TrendChart from './components/TrendChart';
import HorizontalBarChart from './components/HorizontalBarChart';
import VerticalBarChart from './components/VerticalBarChart';
import DesignChart from './components/DesignChart';
import MonthlyDetailChart from './components/MonthlyDetailChart';
import ConnectionStatus from './components/ConnectionStatus';
import RankingTable from './components/RankingTable';
import CompanyComparisonChart from './components/CompanyComparisonChart';
import DesignProductionChart from './components/DesignProductionChart';

// Novos componentes analíticos
import InteractiveHeatmap from './components/InteractiveHeatmap';
import DrillDownModal from './components/DrillDownModal';
import EventTimeline from './components/EventTimeline';
import NavigationManager from './components/NavigationManager';
import AIInsightsPanel from './components/AIInsightsPanel';

// Hooks e serviços
import { default as useDashboardData } from './hooks/useDashboardData';
import { DataProcessingService } from './services/dataProcessingService';

function App() {
  const [filters, setFilters] = useState({
    periodo: 'ambos',
    cliente: 'todos',
    tipo: 'geral'
  });

  // Estados para navegação entre views
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewHistory, setViewHistory] = useState(['dashboard']);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  // Estados para drill-down
  const [drillDownData, setDrillDownData] = useState({
    isOpen: false,
    client: null,
    month: null
  });

  // Estados para modals e interações
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [insights, setInsights] = useState([]);

  // Hook simplificado - sem connectToGoogleSheets e connected
  const { 
    data, 
    loading, 
    error,
    lastUpdate, 
    refreshData,
    exportData
  } = useDashboardData();

  // ==========================================
  // FUNÇÃO AUXILIAR PARA VERIFICAÇÃO SEGURA
  // ==========================================
  
  const safeFilter = (items, filterFn) => {
    return (items || []).filter(item => {
      if (!item || !item.tipo || typeof item.tipo !== 'string') {
        return false;
      }
      return filterFn(item);
    });
  };

  const safeStringCheck = (str, searchTerm) => {
    if (!str || typeof str !== 'string') return false;
    return str.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // Aplicar filtros aos dados
  const filteredData = React.useMemo(() => {
    if (!data) return null;
    return DataProcessingService.applyAdvancedFilters(data, filters);
  }, [data, filters]);

  // Calcular métricas
  const metrics = React.useMemo(() => {
    if (!filteredData) return {
      totalClientes: 0,
      totalRelatorios: 0,
      crescimento: 0,
      mediaMensal2024: 0,
      mediaMensal2025: 0,
      melhorCliente: { cliente: 'N/A', crescimento: 0 }
    };
    return DataProcessingService.calculateAdvancedMetrics(filteredData, filters);
  }, [filteredData, filters]);

  // Processar dados para gráficos
  const chartData = React.useMemo(() => {
    if (!filteredData) return {
      trend: [],
      ranking: [],
      comparison: [],
      design: [],
      monthlyDetailed: [],
      distribution: []
    };
    
    return {
      trend: DataProcessingService.processChartData(filteredData, 'trend', filters),
      ranking: DataProcessingService.processChartData(filteredData, 'ranking', filters),
      comparison: DataProcessingService.processChartData(filteredData, 'comparison', filters),
      design: DataProcessingService.processChartData(filteredData, 'design', filters),
      monthlyDetailed: DataProcessingService.processChartData(filteredData, 'monthlyDetailed', filters),
      distribution: DataProcessingService.processChartData(filteredData, 'distribution', filters)
    };
  }, [filteredData, filters]);

  // Lista de clientes únicos
  const uniqueClients = React.useMemo(() => {
    if (!data) return [];
    return DataProcessingService.getUniqueClients(data);
  }, [data]);

  // Handlers para navegação
  const handleViewChange = (newView) => {
    setCurrentView(newView);
    setViewHistory(prev => [...prev, newView].slice(-10));
    
    // Atualizar breadcrumbs baseado na view
    const breadcrumbsMap = {
      dashboard: [{ label: 'Dashboard', onClick: () => handleViewChange('dashboard') }],
      heatmap: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Heatmap Interativo' }
      ],
      timeline: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Timeline de Eventos' }
      ],
      insights: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Insights com IA' }
      ],
      analytics: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Analytics Avançado' }
      ]
    };
    
    setBreadcrumbs(breadcrumbsMap[newView] || []);
  };

  // Handler para drill-down
  const handleDrillDown = (client, month, value) => {
    setDrillDownData({
      isOpen: true,
      client,
      month,
      value
    });
  };

  // Handler para eventos da timeline
  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  // Handler para insights
  const handleInsightClick = (insight) => {
    if (insight.category === 'performance' && insight.metrics?.client) {
      handleDrillDown(insight.metrics.client, null, null);
    }
  };

  // Handlers para filtros
  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportData('csv');
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      periodo: 'ambos',
      cliente: 'todos', 
      tipo: 'geral'
    });
  };

  const handleBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];
      setViewHistory(newHistory);
      setCurrentView(previousView);
    }
  };

  // Renderizar view atual
  const renderCurrentView = () => {
    switch (currentView) {
      case 'heatmap':
        return (
          <InteractiveHeatmap
            data={filteredData}
            onCellClick={handleDrillDown}
            title="🗺️ Heatmap Interativo de Produção"
          />
        );

      case 'timeline':
        return (
          <EventTimeline
            data={filteredData}
            onEventClick={handleEventClick}
            title="📅 Timeline de Eventos e Marcos"
          />
        );

      case 'insights':
        return (
          <AIInsightsPanel
            data={filteredData}
            onInsightClick={handleInsightClick}
            autoUpdate={true}
          />
        );

      case 'analytics':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <InteractiveHeatmap
              data={filteredData}
              onCellClick={handleDrillDown}
              title="🗺️ Mapa de Calor - Clientes x Meses"
            />
            
            <EventTimeline
              data={filteredData}
              onEventClick={handleEventClick}
              title="📅 Linha do Tempo de Eventos"
            />
            
            <AIInsightsPanel
              data={filteredData}
              onInsightClick={handleInsightClick}
              autoUpdate={false}
            />
          </div>
        );

      default: // dashboard
        return renderDashboard();
    }
  };

  // Renderizar dashboard principal
  const renderDashboard = () => (
    <>
      {/* KPIs Dinâmicos */}
      <div className="kpis-grid modern">
        {filters.periodo === 'ambos' ? (
          <>
            <KPICard
              title="Clientes Analisados"
              value={metrics.totalClientes || 0}
              subtitle={`${filters.cliente !== 'todos' ? 'Cliente: ' + filters.cliente : 'Todos os clientes'}`}
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="100ms"
            />
            <KPICard
              title="Crescimento Médio"
              value={`${metrics.crescimento > 0 ? '+' : ''}${metrics.crescimento || 0}%`}
              subtitle="Comparando médias mensais"
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="200ms"
            />
            <KPICard
              title="Média 2024"
              value={metrics.mediaMensal2024 || 0}
              subtitle="Relatórios/mês/cliente"
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="300ms"
            />
            <KPICard
              title="Média 2025"
              value={metrics.mediaMensal2025 || 0}
              subtitle="Relatórios/mês/cliente"
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="400ms"
            />
            <KPICard
              title="Melhor Performance"
              value={metrics.melhorCliente?.cliente || 'N/A'}
              subtitle={`+${metrics.melhorCliente?.crescimento || 0}% crescimento`}
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="500ms"
            />
          </>
        ) : (
          <>
            <KPICard
              title="Clientes Filtrados"
              value={metrics.totalClientes || 0}
              subtitle={`Período: ${filters.periodo} • Tipo: ${filters.tipo}`}
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="100ms"
            />
            <KPICard
              title="Total de Relatórios"
              value={metrics.totalRelatorios || 0}
              subtitle={`${filters.cliente !== 'todos' ? filters.cliente : 'Todos'} em ${filters.periodo}`}
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="200ms"
            />
            <KPICard
              title="Média Mensal"
              value={metrics.mediaMensal || 0}
              subtitle="Por cliente filtrado"
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="300ms"
            />
            <KPICard
              title="Produtividade"
              value={metrics.produtividade || 0}
              subtitle="Relatórios/mês total"
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="400ms"
            />
            <KPICard
              title="Melhor Cliente"
              value={metrics.melhorCliente?.cliente || 'N/A'}
              subtitle={`${metrics.melhorCliente?.total || 0} relatórios`}
              gradient="linear-gradient(135deg, #FF6B47 0%, #FF8A6B 100%)"
              delay="500ms"
            />
          </>
        )}
      </div>
      
      {/* Gráfico Comparativo In.pacto vs STA */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          <CompanyComparisonChart 
            data={[
              { 
                cliente: 'In.Pacto', 
                total: 38,
                media2025: 6.3,
                crescimento: 0,
                dataAvailable: { 2024: true, 2025: true }
              },
              { 
                cliente: 'STA', 
                total: 15,
                media2025: 2.5,
                crescimento: 0,
                dataAvailable: { 2024: false, 2025: true }
              }
            ]}
            title="📊 Comparativo de Produção: In.pacto vs STA"
            subtitle="Quantidade produzida Janeiro-Junho 2025 • Análise empresarial"
            dataKey="media2025"
            filters={filters}
          />
        </div>
      </div>

      {/* Gráfico de Tendência */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          <TrendChart 
            data={chartData.trend || []}
            title={filters.periodo === 'ambos' ? 
              "📈 Evolução Histórica de Produção" : 
              `📈 Evolução ${filters.periodo} - Todos os Meses`}
            subtitle={
              filters.cliente !== 'todos' ? 
                `Análise específica: ${filters.cliente}` :
              filters.tipo !== 'geral' ?
                `Tipo: ${filters.tipo}` :
                "Dados da nova planilha Google Sheets"
            }
            showComparison={filters.periodo === 'ambos'}
          />
        </div>
      </div>

      {/* Tabela de Ranking */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          <RankingTable 
            data={chartData.ranking || []}
            title={filters.periodo === 'ambos' ? 
              "🏆 Ranking Comparativo - Médias Mensais" : 
              `🏆 Top Clientes ${filters.periodo}`}
            subtitle={
              filters.cliente !== 'todos' ? 
                `Foco: ${filters.cliente}` :
              filters.tipo !== 'geral' ?
                `${filters.tipo} • Performance detalhada` :
                filters.periodo === 'ambos' ? 
                  'Comparação de médias mensais 2024 vs 2025 • Nova planilha Google Sheets' :
                  `Análise de performance ${filters.periodo} • Dados atualizados automaticamente`
            }
            dataKey={filters.periodo === 'ambos' ? "media2025" : "total"}
          />
        </div>
      </div>

      {/* Gráfico de Distribuição por Tipo */}
      <div className="chart-container modern distribution-table-container">
        <div className="chart-header">
          <h3 className="chart-title">📊 Distribuição por Tipo de Conteúdo</h3>
          <p className="chart-subtitle">
            {filters.periodo === 'ambos' ? 
              'Comparativo 2024 vs 2025 • Análise detalhada por categoria' :
              filters.cliente !== 'todos' ? 
                `Cliente: ${filters.cliente} • Análise detalhada por categoria` :
                `Composição de conteúdo • Análise detalhada por categoria`
            }
          </p>
        </div>
        
        <div className="modern-table-wrapper">
          <table className="modern-distribution-table">
            <thead>
              <tr>
                <th className="type-column">
                  <div className="header-content">
                    <span className="header-icon">📋</span>
                    <span>Tipo de Conteúdo</span>
                  </div>
                </th>
                
                {filters.periodo === 'ambos' ? (
                  <>
                    <th className="comparative-column">
                      <div className="header-content">
                        <span className="header-icon">📊</span>
                        <span>2024</span>
                      </div>
                    </th>
                    <th className="comparative-column">
                      <div className="header-content">
                        <span className="header-icon">📈</span>
                        <span>2025</span>
                      </div>
                    </th>
                    <th className="percentage-column">
                      <div className="header-content">
                        <span className="header-icon">📈</span>
                        <span>Participação</span>
                      </div>
                    </th>
                    <th className="trend-column">
                      <div className="header-content">
                        <span className="header-icon">🔄</span>
                        <span>Variação</span>
                      </div>
                    </th>
                  </>
                ) : (
                  <>
                    <th className="quantity-column">
                      <div className="header-content">
                        <span className="header-icon">📊</span>
                        <span>Quantidade</span>
                      </div>
                    </th>
                    <th className="percentage-column">
                      <div className="header-content">
                        <span className="header-icon">📈</span>
                        <span>Participação</span>
                      </div>
                    </th>
                    <th className="trend-column">
                      <div className="header-content">
                        <span className="header-icon">📈</span>
                        <span>Tendência</span>
                      </div>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* ✅ CORREÇÃO APLICADA AQUI */}
              {safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design'))
                .map((item, index) => {
                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                  const color = colors[index % colors.length];
                  
                  // Verificação segura do tipo
                  const tipoSeguro = item.tipo || 'Tipo não definido';
                  
                  // Calcular dados comparativos baseados em médias mensais
                  const media2024 = item.media2024 || (item.valor2024 ? item.valor2024 / 12 : 0);
                  const media2025 = item.media2025 || (item.valor2025 ? item.valor2025 / 6 : item.valor ? item.valor / 6 : 0);
                  
                  const totalMedia2024 = safeFilter(chartData.distribution, i => !safeStringCheck(i.tipo, 'design'))
                    .reduce((sum, i) => sum + (i.media2024 || (i.valor2024 ? i.valor2024 / 12 : 0)), 0);
                  const totalMedia2025 = safeFilter(chartData.distribution, i => !safeStringCheck(i.tipo, 'design'))
                    .reduce((sum, i) => sum + (i.media2025 || (i.valor2025 ? i.valor2025 / 6 : i.valor ? i.valor / 6 : 0)), 0);
                  
                  const percentual2024 = totalMedia2024 > 0 ? Math.round((media2024 / totalMedia2024) * 100) : 0;
                  const percentual2025 = totalMedia2025 > 0 ? Math.round((media2025 / totalMedia2025) * 100) : 0;
                  const variacao = media2024 > 0 ? Math.round(((media2025 - media2024) / media2024) * 100) : 0;
                  
                  return (
                    <tr key={tipoSeguro} className="table-row">
                      <td className="type-cell">
                        <div className="type-content">
                          <div 
                            className="type-indicator" 
                            style={{ backgroundColor: color }}
                          ></div>
                          <div className="type-info">
                            <span className="type-name">{tipoSeguro}</span>
                            <span className="type-description">
                              {tipoSeguro === 'Relatórios Gerais' && 'Análises principais'}
                              {tipoSeguro === 'Semanais' && 'Monitoramento semanal'}
                              {tipoSeguro === 'Mensais' && 'Relatórios mensais'}
                              {tipoSeguro === 'Especiais' && 'Projetos especiais'}
                              {tipoSeguro === 'Diagnósticos' && 'Análises diagnósticas'}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {filters.periodo === 'ambos' ? (
                        <>
                          <td className="comparative-cell">
                            <div className="comparative-content">
                              <div className="comparative-bar-container">
                                <div 
                                  className="comparative-bar year-2024" 
                                  style={{ 
                                    width: `${percentual2024}%`,
                                    backgroundColor: '#6B7280'
                                  }}
                                ></div>
                              </div>
                              <div className="comparative-details">
                                <span className="comparative-value">{media2024.toFixed(1)}</span>
                                <span className="comparative-label">rel/mês</span>
                                <span className="comparative-percentage">{percentual2024}%</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="comparative-cell">
                            <div className="comparative-content highlighted">
                              <div className="comparative-bar-container">
                                <div 
                                  className="comparative-bar year-2025" 
                                  style={{ 
                                    width: `${percentual2025}%`,
                                    backgroundColor: color
                                  }}
                                ></div>
                              </div>
                              <div className="comparative-details">
                                <span className="comparative-value">{media2025.toFixed(1)}</span>
                                <span className="comparative-label">rel/mês</span>
                                <span className="comparative-percentage">{percentual2025}%</span>
                              </div>
                            </div>
                          </td>
                          
                          <td className="percentage-cell">
                            <div className="percentage-comparison">
                              <div className="comparison-bars">
                                <div className="comparison-bar-item">
                                  <span className="comparison-year">2024</span>
                                  <div className="comparison-bar-bg">
                                    <div 
                                      className="comparison-bar" 
                                      style={{ 
                                        width: `${percentual2024}%`,
                                        backgroundColor: '#E5E7EB'
                                      }}
                                    ></div>
                                  </div>
                                  <span className="comparison-percent">{percentual2024}%</span>
                                </div>
                                <div className="comparison-bar-item">
                                  <span className="comparison-year">2025</span>
                                  <div className="comparison-bar-bg">
                                    <div 
                                      className="comparison-bar" 
                                      style={{ 
                                        width: `${percentual2025}%`,
                                        backgroundColor: color
                                      }}
                                    ></div>
                                  </div>
                                  <span className="comparison-percent">{percentual2025}%</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="trend-cell">
                            <div className="trend-content">
                              <div className={`variation-badge-professional ${variacao > 0 ? 'positive' : variacao < 0 ? 'negative' : 'neutral'}`}>
                                <span className="variation-icon">
                                  {variacao > 0 ? '📈' : variacao < 0 ? '📉' : '➖'}
                                </span>
                                <span className="variation-value">
                                  {variacao > 0 ? '+' : ''}{variacao}%
                                </span>
                              </div>
                              <span className="variation-description">
                                {variacao > 0 ? 'Crescimento na média mensal' : variacao < 0 ? 'Redução na média mensal' : 'Média estável'}
                              </span>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="quantity-cell">
                            <div className="quantity-content">
                              <span className="quantity-number">
                                {(item.valor || 0).toLocaleString('pt-BR')}
                              </span>
                              <span className="quantity-label">total</span>
                              <span className="quantity-average">
                                {((item.valor || 0) / 6).toFixed(1)} rel/mês
                              </span>
                            </div>
                          </td>
                          
                          <td className="percentage-cell">
                            <div className="percentage-content">
                              <div className="percentage-bar-container">
                                <div 
                                  className="percentage-bar" 
                                  style={{ 
                                    width: `${percentual2025}%`,
                                    backgroundColor: color 
                                  }}
                                ></div>
                              </div>
                              <span className="percentage-text">{percentual2025}%</span>
                            </div>
                          </td>
                          
                          <td className="trend-cell">
                            <div className="trend-content">
                              <span className={`trend-indicator ${(item.valor || 0) > 0 ? 'positive' : 'neutral'}`}>
                                {(item.valor || 0) > 0 ? '🟢' : '⚪'}
                              </span>
                              <span className="trend-text">
                                {(item.valor || 0) > 0 ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Insights da distribuição */}
        <div className="distribution-insights">
          <div className="insights-grid">
            {filters.periodo === 'ambos' ? (
              <>
                <div className="insight-card">
                  <span className="insight-icon">📊</span>
                  <div className="insight-content">
                    <span className="insight-label">Média Mensal 2024</span>
                    <span className="insight-value">
                      {safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design'))
                        .reduce((sum, item) => sum + (item.media2024 || (item.valor2024 ? item.valor2024 / 12 : 0)), 0)
                        .toFixed(1)} rel/mês
                    </span>
                  </div>
                </div>
                
                <div className="insight-card">
                  <span className="insight-icon">📈</span>
                  <div className="insight-content">
                    <span className="insight-label">Média Mensal 2025</span>
                    <span className="insight-value">
                      {safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design'))
                        .reduce((sum, item) => sum + (item.media2025 || (item.valor2025 ? item.valor2025 / 6 : item.valor ? item.valor / 6 : 0)), 0)
                        .toFixed(1)} rel/mês
                    </span>
                  </div>
                </div>
                
                <div className="insight-card">
                  <span className="insight-icon">🔄</span>
                  <div className="insight-content">
                    <span className="insight-label">Crescimento das Médias</span>
                    <span className="insight-value">
                      {(() => {
                        const totalMedia2024 = safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design'))
                          .reduce((sum, item) => sum + (item.media2024 || (item.valor2024 ? item.valor2024 / 12 : 0)), 0);
                        const totalMedia2025 = safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design'))
                          .reduce((sum, item) => sum + (item.media2025 || (item.valor2025 ? item.valor2025 / 6 : item.valor ? item.valor / 6 : 0)), 0);
                        const crescimento = totalMedia2024 > 0 ? Math.round(((totalMedia2025 - totalMedia2024) / totalMedia2024) * 100) : 0;
                        return crescimento > 0 ? `+${crescimento}%` : `${crescimento}%`;
                      })()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="insight-card">
                  <span className="insight-icon">📊</span>
                  <div className="insight-content">
                    <span className="insight-label">Total de Tipos</span>
                    <span className="insight-value">
                      {safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design')).length}
                    </span>
                  </div>
                </div>
                
                <div className="insight-card">
                  <span className="insight-icon">⚡</span>
                  <div className="insight-content">
                    <span className="insight-label">Tipos Ativos</span>
                    <span className="insight-value">
                      {safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design'))
                        .filter(item => (item.valor || 0) > 0).length}
                    </span>
                  </div>
                </div>
                
                <div className="insight-card">
                  <span className="insight-icon">📈</span>
                  <div className="insight-content">
                    <span className="insight-label">Produção Total</span>
                    <span className="insight-value">
                      {safeFilter(chartData.distribution, item => !safeStringCheck(item.tipo, 'design'))
                        .reduce((sum, item) => sum + (item.valor || 0), 0)
                        .toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico Mensal Detalhado - Apenas para comparativo */}
      {filters.periodo === 'ambos' && chartData.monthlyDetailed && chartData.monthlyDetailed.length > 0 && (
        <div className="charts-row modern">
          <div className="chart-col-full">
            <MonthlyDetailChart 
              data={chartData.monthlyDetailed}
              title="📊 Análise Mensal Detalhada in.Pacto"
              subtitle={`Inteligência de dados${filters.cliente !== 'todos' ? ` - Cliente: ${filters.cliente}` : ''}`}
            />
          </div>
        </div>
      )}

      {/* Gráfico de Produção de Design */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          <DesignProductionChart 
            data={data}
            title="🎨 Produção de Design"
            filters={filters}
          />
        </div>
      </div>

      {/* Gráfico Específico de Design */}
      {filters.tipo === 'design' && (
        <div className="charts-row modern">
          <div className="chart-col-full">
            <DesignChart 
              data={chartData.design || []}
              title="🎨 Análise Específica: Design & Criação"
              subtitle={`Performance detalhada em projetos de design${filters.cliente !== 'todos' ? ` - ${filters.cliente}` : ''}`}
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="dashboard-producao modern">
      {/* Header com navegação aprimorada */}
      <div className="dashboard-header modern">
        <div className="header-content">
          <div className="header-text">
            <h1 className="header-title">
              Dashboard de Produção
            </h1>
            <p className="header-subtitle">
               • Diretoria de Inteligência de Dados •
            </p>
          </div>
          
          <ConnectionStatus 
            onRefresh={handleRefresh}
            onExportCSV={handleExportCSV}
            loading={loading}
            error={error}
            lastUpdate={lastUpdate}
          />
        </div>
        <div className="last-update">
          Última atualização: {lastUpdate.toLocaleString('pt-BR')} • 
          Fonte: Google Sheets (Nova Planilha) • Auto-refresh ativo
          {error && ` • Erro: ${error}`}
        </div>
      </div>

      {/* Navegação entre Views */}
      <NavigationManager
        currentView={currentView}
        onViewChange={handleViewChange}
        data={data}
        breadcrumbs={breadcrumbs}
        onBack={viewHistory.length > 1 ? handleBack : null}
        showFilters={true}
        showExport={true}
      />

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            🔄 <span>Carregando dados da nova planilha...</span>
          </div>
        </div>
      )}

      {/* Filtros Funcionais - Apenas para dashboard principal */}
      {currentView === 'dashboard' && (
        <div className="dashboard-filters modern">
          <div className="filters-content">
            <div className="filter-intro">
              <div className="inpacto-logo-mini">
                <span className="logo-in">in</span>
                <span className="logo-dot">•</span>
                <span className="logo-pacto">Pacto</span>
              </div>
              <span className="filter-main-label">Filtros Inteligentes</span>
              {(filters.cliente !== 'todos' || filters.tipo !== 'geral' || filters.periodo !== 'ambos') && (
                <button 
                  onClick={clearAllFilters}
                  style={{
                    padding: '8px 16px',
                    background: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    marginLeft: '16px'
                  }}
                >
                  🧹 Limpar Filtros
                </button>
              )}
            </div>
            
            <div className="filters-grid">
              <div className="filter-group-labeled">
                <label className="filter-label-title">
                  <span className="filter-icon">📅</span>
                  Período de Análise
                </label>
                <select 
                  value={filters.periodo}
                  onChange={(e) => handleFilterChange('periodo', e.target.value)}
                  className="filter-select modern"
                >
                  <option value="ambos">📊 Comparativo 2024 vs 2025</option>
                  <option value="2024">📅 Apenas 2024 (Histórico)</option>
                  <option value="2025">📅 Apenas 2025 (Atual)</option>
                </select>
              </div>
              
              <div className="filter-group-labeled">
                <label className="filter-label-title">
                  <span className="filter-icon">🏢</span>
                  Clientes ({uniqueClients.length} disponíveis)
                </label>
                <select 
                  value={filters.cliente}
                  onChange={(e) => handleFilterChange('cliente', e.target.value)}
                  className="filter-select modern"
                >
                  <option value="todos">🌐 Todos os Clientes</option>
                  {uniqueClients.map(cliente => (
                    <option key={cliente} value={cliente}>
                      🏢 {cliente}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group-labeled">
                <label className="filter-label-title">
                  <span className="filter-icon">📋</span>
                  Tipo de Conteúdo
                </label>
                <select 
                  value={filters.tipo}
                  onChange={(e) => handleFilterChange('tipo', e.target.value)}
                  className="filter-select modern"
                >
                  <option value="geral">📊 Relatórios Gerais</option>
                  <option value="diario">📅 Monitoramento Diário</option>
                  <option value="semanal">📈 Análises Semanais</option>
                  <option value="mensal">📆 Relatórios Mensais</option>
                  <option value="especial">⭐ Projetos Especiais</option>
                  <option value="diagnostico">🔍 Diagnósticos Estratégicos</option>
                  <option value="design">🎨 Criações & Design</option>
                </select>
              </div>
            </div>

            {/* Indicador de Status dos Filtros */}
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: (filters.cliente !== 'todos' || filters.tipo !== 'geral' || filters.periodo !== 'ambos') ? 
                'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              border: `1px solid ${(filters.cliente !== 'todos' || filters.tipo !== 'geral' || filters.periodo !== 'ambos') ? 
                'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}>
              <span style={{ fontSize: '1.2rem' }}>
                {(filters.cliente !== 'todos' || filters.tipo !== 'geral' || filters.periodo !== 'ambos') ? '🔍' : '✅'}
              </span>
              <span style={{ 
                color: (filters.cliente !== 'todos' || filters.tipo !== 'geral' || filters.periodo !== 'ambos') ? 
                  '#92400E' : '#065F46', 
                fontWeight: '600' 
              }}>
                {(filters.cliente !== 'todos' || filters.tipo !== 'geral' || filters.periodo !== 'ambos') ? 
                  `Filtros ativos: ${filteredData?.visaoGeral?.length || 0} clientes, ${filteredData?.visaoGeral?.reduce((sum, c) => sum + (c.total || 0), 0) || 0} relatórios` :
                  'Visualizando todos os dados da nova planilha - Nenhum filtro ativo'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Renderizar View Atual */}
      {renderCurrentView()}

      {/* Modal de Drill Down */}
      <DrillDownModal
        isOpen={drillDownData.isOpen}
        onClose={() => setDrillDownData({ isOpen: false, client: null, month: null })}
        client={drillDownData.client}
        month={drillDownData.month}
        data={data}
      />

      {/* Ações Rápidas Flutuantes */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 100
      }}>
        {/* Botão para Heatmap */}
        {currentView !== 'heatmap' && (
          <button
            onClick={() => handleViewChange('heatmap')}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981, #34D399)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              transition: 'all 0.2s ease',
              fontSize: '1.5rem'
            }}
            title="Ver Heatmap Interativo"
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
            }}
          >
            🗺️
          </button>
        )}

        {/* Botão para Timeline */}
        {currentView !== 'timeline' && (
          <button
            onClick={() => handleViewChange('timeline')}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s ease',
              fontSize: '1.5rem'
            }}
            title="Ver Timeline de Eventos"
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
            }}
          >
            📅
          </button>
        )}

        {/* Botão para Insights IA */}
        {currentView !== 'insights' && (
          <button
            onClick={() => handleViewChange('insights')}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.2s ease',
              fontSize: '1.5rem'
            }}
            title="Ver Insights com IA"
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
            }}
          >
            🤖
          </button>
        )}

        {/* Botão para Dashboard */}
        {currentView !== 'dashboard' && (
          <button
            onClick={() => handleViewChange('dashboard')}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF6B47, #FF8A6B)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 107, 71, 0.4)',
              transition: 'all 0.2s ease',
              fontSize: '1.5rem'
            }}
            title="Voltar ao Dashboard"
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.1)';
              e.target.style.boxShadow = '0 6px 16px rgba(255, 107, 71, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 71, 0.4)';
            }}
          >
            📊
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="dashboard-footer modern">
        <div className="footer-content">
          <p> <strong>  Copyright © 2025 </strong> - Todos os direitos reservados - Holding Inpacto.
Desenvolvido pela Diretoria de Inteligência de Dados</p>
        </div>
      </div>
    </div>
  );
}

export default App;