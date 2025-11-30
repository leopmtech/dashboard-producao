// ==========================================
// src/App.js - VERSÃO CORRIGIDA COM EXTENSÃO PARA 12 MESES + VERIFICAÇÃO DE FONTES
// Dashboard principal conectado automaticamente à nova planilha
// ==========================================

import React, { useState, useEffect } from 'react';
import './styles/dashboard.css';

// Componentes existentes (mantidos)
import KPICard from './components/KPICard';
import TrendChart from './components/TrendChart';
// import HorizontalBarChart from './components/HorizontalBarChart'; // (removido: não utilizado)
// import VerticalBarChart from './components/VerticalBarChart';     // (removido: não utilizado)
import DesignChart from './components/DesignChart';
import MonthlyDetailChart from './components/MonthlyDetailChart';
import ConnectionStatus from './components/ConnectionStatus';
import RankingTable from './components/RankingTable';
import CompanyComparisonChart from './components/CompanyComparisonChart';
import DesignProductionChart from './components/DesignProductionChart';
import ReviewProductionChart from './components/ReviewProductionChart';
import CollaboratorDemands from './components/CollaboratorDemands';

// Novos componentes analíticos
import InteractiveHeatmap from './components/InteractiveHeatmap';
import DrillDownModal from './components/DrillDownModal';
import EventTimeline from './components/EventTimeline';
import NavigationManager from './components/NavigationManager';
import AIInsightsPanel from './components/AIInsightsPanel';
import AnalystsCalendar from './components/AnalystsCalendar';

// Hooks e serviços - 🔧 IMPORT CORRIGIDO
import { default as useDashboardData } from './hooks/useDashboardData';
import { DataProcessingService, extractDynamicKPIMetrics } from './services/dataProcessingService'; // 👈 CORRIGIDO: named import
import { dataStandardizer } from './utils/dataStandardization.js';
import { useProductionData } from './services/mockData';

// Componente de Debug para desenvolvimento
const DebugPanel = ({ data }) => {
  const [forceProduction, setForceProduction] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('force-production') === 'true';
    }
    return false;
  });
  const isProduction = useProductionData();
  
  const toggleMode = () => {
    const newMode = !forceProduction;
    setForceProduction(newMode);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('force-production', newMode.toString());
      // Também atualizar query string para compatibilidade
      const url = new URL(window.location);
      if (newMode) {
        url.searchParams.set('force-production', 'true');
      } else {
        url.searchParams.delete('force-production');
      }
      window.history.replaceState({}, '', url);
      window.location.reload();
    }
  };
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  const recordCount = data?.originalOrders?.length || 0;
  const expectedCount = 1616;
  const isMockData = recordCount === 50;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: isProduction ? '#4CAF50' : '#f44336',
      color: 'white',
      padding: '10px 15px',
      zIndex: 9999,
      fontSize: '12px',
      borderRadius: '0 0 0 8px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      fontFamily: 'monospace',
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
        🔧 DEBUG PANEL
      </div>
      <button
        onClick={toggleMode}
        style={{
          color: 'white',
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid white',
          padding: '6px 10px',
          borderRadius: '4px',
          cursor: 'pointer',
          width: '100%',
          marginBottom: '8px',
          fontWeight: 'bold'
        }}
      >
        {isProduction ? '🌐 PRODUCTION' : '🔧 MOCK DATA'}
      </button>
      <div style={{ marginTop: '5px', fontSize: '11px', lineHeight: '1.4' }}>
        <div>Mode: {isProduction ? '🌐 PRODUCTION' : '🔧 DEVELOPMENT'}</div>
        <div>Port: {window.location.port || 'default'}</div>
        <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.3)' }}>
          Records: <strong>{recordCount}</strong>
          {isMockData && <span style={{ color: '#ffeb3b' }}> (Mock)</span>}
          {!isMockData && recordCount !== expectedCount && (
            <span style={{ color: '#ffeb3b' }}> / {expectedCount}</span>
          )}
        </div>
        {isProduction && recordCount === 0 && (
          <div style={{ color: '#ffeb3b', marginTop: '4px', fontSize: '10px' }}>
            ⚠️ No data loaded
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [filters, setFilters] = useState({
    periodo: 'ambos',
    cliente: 'todos',
    tipo: 'geral',
  });

  // Navegação entre views
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewHistory, setViewHistory] = useState(['dashboard']);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  // Drill-down e interações
  const [drillDownData, setDrillDownData] = useState({
    isOpen: false,
    client: null,
    month: null,
    value: null,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [insights, setInsights] = useState([]);
  
  // Paginação para tabela de tipos de demanda
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 🔧 CORRIGIDO - agora recebe uniqueDemandTypes consolidados
  const { data, loading, error, lastUpdate, refreshData, exportData, demandTypes, uniqueDemandTypes, notionData, sheetsData, consolidatedData } = useDashboardData();

  // ✅ Debug para verificar dados do Notion - VERIFICAÇÃO DOS 1616 REGISTROS
  React.useEffect(() => {
    console.log('🎯 [APP.JS] uniqueDemandTypes recebidos:', uniqueDemandTypes?.length || 0);
    console.log('🎯 [APP.JS] Total de tipos únicos:', uniqueDemandTypes?.length || 0);
    console.log('🎯 [APP.JS] Primeiros 5 tipos:', uniqueDemandTypes?.slice(0, 5) || []);
    
    // ✅ VERIFICAR DADOS DO NOTION
    if (notionData && notionData.originalOrders) {
      const notionOrders = notionData.originalOrders;
      console.log('📊 [NOTION VERIFICATION]:', {
        totalRegistros: notionOrders.length,
        esperado: 1616,
        status: notionOrders.length === 1616 ? '✅ CORRETO' : '⚠️ DIVERGÊNCIA',
        amostra: notionOrders.slice(0, 3).map(item => ({
          id: item.id,
          cliente: item.cliente1 || item.cliente,
          dataEntrega: item.dataEntrega,
          tipoDemanda: item.tipoDemanda
        }))
      });
    }
  }, [notionData, uniqueDemandTypes]);

  // 🆕 Debug dos tipos consolidados e fontes de dados
  React.useEffect(() => {
    if (uniqueDemandTypes) {
      console.log('🎯 [APP.JS] uniqueDemandTypes recebidos:', uniqueDemandTypes);
      console.log('🎯 [APP.JS] Total de tipos únicos:', uniqueDemandTypes.length);
      console.log('🎯 [APP.JS] Primeiros 5 tipos:', uniqueDemandTypes.slice(0, 5));
    }
    
    // 🆕 Debug das fontes de dados
    if (data) {
      const sheetsRecords = data.filter ? data.filter(item => item._source === 'sheets').length : 0;
      const notionRecords = data.filter ? data.filter(item => item._source === 'notion').length : 0;
      
      console.log('📊 [APP.JS] Verificação de fontes de dados:', {
        totalRegistros: Array.isArray(data) ? data.length : 'N/A',
        registrosSheets: sheetsRecords,
        registrosNotion: notionRecords,
        temMarcacaoFonte: sheetsRecords > 0 || notionRecords > 0
      });
    }
  }, [uniqueDemandTypes, data]);

  // 🆕 PASSO 1: Debug detalhado das fontes de dados
  React.useEffect(() => {
    console.log('🔍 [APP DEBUG]', {
      notionData: notionData?.originalOrders?.length || 0,
      sheetsData: sheetsData?.originalOrders?.length || 0,
      consolidatedData: consolidatedData?.originalOrders?.length || 0,
      firstNotion: notionData?.originalOrders?.[0],
      firstSheets: sheetsData?.originalOrders?.[0],
      firstConsolidated: consolidatedData?.originalOrders?.[0]
    });
  }, [notionData, sheetsData, consolidatedData]);

  // ✅ NOTION ONLY: Forçar consolidação usando apenas dados do Notion
  const [notionOnlyData, setNotionOnlyData] = React.useState(null);
  
  React.useEffect(() => {
    if (notionData && notionData.originalOrders && notionData.originalOrders.length > 0) {
      console.log('📊 [NOTION ONLY] Carregando dados apenas do Notion...');
      console.log(`📊 [NOTION ONLY] Total de registros: ${notionData.originalOrders.length}`);
      
      // ✅ USAR APENAS NOTION - SHEETS = []
      const consolidatedData = DataProcessingService.consolidateAndNormalize(
        [], // ← SHEETS VAZIO
        notionData.originalOrders // ← APENAS NOTION
      );
      
      // ✅ Verificar se todos os registros foram processados
      if (consolidatedData.length === 1616) {
        console.log('🎉 [SUCESSO] Todos os 1616 registros carregados!');
      } else {
        console.warn(`⚠️ [VERIFICAÇÃO] Esperado: 1616, Carregado: ${consolidatedData.length}`);
      }
      
      // ✅ Processar dados consolidados
      setNotionOnlyData({
        originalOrders: consolidatedData,
        visaoGeral: DataProcessingService.aggregateByClient(consolidatedData),
      });
    }
  }, [notionData]); // ← Remover dependência de sheetsData

  // 🆕 PASSO 2: Consolidação de clientes antes do processamento
  const [dadosComClientesConsolidados, setDadosComClientesConsolidados] = React.useState(null);
  
  React.useEffect(() => {
    if (consolidatedData?.originalOrders) {
      console.log('🔄 [PASSO 2] Consolidando clientes RENOVADOS...');
      
      const dadosConsolidados = DataProcessingService.consolidateClientData(consolidatedData.originalOrders);
      
      setDadosComClientesConsolidados({
        ...consolidatedData,
        originalOrders: dadosConsolidados
      });
      
      // 🆕 PASSO 3: Teste e validação
      const clientesAntes = DataProcessingService.getUniqueClients({ originalOrders: consolidatedData.originalOrders });
      const clientesDepois = DataProcessingService.getUniqueClients({ originalOrders: dadosConsolidados });
      
      console.log('🧪 [TESTE] Validação de consolidação:', {
        antesConsolidacao: consolidatedData.originalOrders.length,
        depoisConsolidacao: dadosConsolidados.length,
        clientesAntes: clientesAntes.length,
        clientesDepois: clientesDepois.length,
        melhoria: clientesDepois.length - clientesAntes.length,
        clientesNovos: clientesDepois.filter(c => !clientesAntes.includes(c))
      });
    }
  }, [consolidatedData]);

  // ==========================================
  // FUNÇÕES AUXILIARES
  // ==========================================
  const safeFilter = (items, filterFn) => {
    return (items || []).filter((item) => {
      if (!item || !item.tipo || typeof item.tipo !== 'string') return false;
      return filterFn(item);
    });
  };

  const safeStringCheck = (str, searchTerm) => {
    if (!str || typeof str !== 'string') return false;
    return str.toLowerCase().includes(searchTerm.toLowerCase());
  };

  // 🆕 Usar dados com clientes consolidados se disponível, senão usar data normal
  const dataParaFiltrar = dadosComClientesConsolidados || data;
  
  const filteredData = React.useMemo(() => {
    if (!dataParaFiltrar) return null;
    console.log('🔧 [FILTROS] Usando dados:', {
      source: dadosComClientesConsolidados ? 'consolidados' : 'originais',
      registros: dataParaFiltrar.originalOrders?.length || 0
    });
    return DataProcessingService.applyAdvancedFilters(dataParaFiltrar, filters);
  }, [dataParaFiltrar, filters]);

  const metrics = React.useMemo(() => {
    if (!filteredData)
      return {
        totalClientes: 0,
        totalRelatorios: 0,
        crescimento: 0,
        mediaMensal2024: 0,
        mediaMensal2025: 0,
        melhorCliente: { cliente: 'N/A', crescimento: 0 },
        melhorMes: 'N/A',
        mesesAnalisados: 0,
        sourceBreakdown: { sheets: 0, notion: 0, unknown: 0 },
        sourceDefinitions: null,
        integrityCheck: null
      };
    
    // Calcular métricas tradicionais com o objeto filtrado completo
    const traditionalMetrics = DataProcessingService.calculateAdvancedMetrics(filteredData, filters);
    
    // Adicionar awareness de fonte
    const sourceAwareCount = dataStandardizer.getStandardizedCount(filteredData, {
      year: filters.periodo === '2024' ? '2024' : filters.periodo === '2025' ? '2025' : 'all',
      type: filters.tipo === 'relatorios' ? 'relatorios' : 'all',
      cliente: filters.cliente === 'todos' ? 'all' : filters.cliente,
      showBreakdown: true
    });
    
    const integrityCheck = dataStandardizer.validateDataIntegrity(filteredData);
    
    return {
      ...traditionalMetrics,
      sourceBreakdown: sourceAwareCount.breakdown,
      sourceDefinitions: sourceAwareCount.sourceDefinitions,
      integrityCheck: integrityCheck
    };
  }, [filteredData, filters]);

  // 🆕 KPI Dinâmico - Atualiza em tempo real baseado nos dados consolidados
  const dynamicKpiMetrics = React.useMemo(() => {
    console.log('🔄 [KPI] Atualizando métricas dinamicamente...');
    // Passa originalOrders do data, ou array vazio se não existir
    const orders = data?.originalOrders || [];
    return extractDynamicKPIMetrics(orders);
  }, [data]); // ✅ Atualiza quando dados mudam

  // Debug para verificar se está atualizando
  React.useEffect(() => {
    console.log('📊 [KPI STATUS]', {
      fonte: dynamicKpiMetrics.source,
      ultimaAtualizacao: new Date().toLocaleTimeString(),
      valores: dynamicKpiMetrics
    });
  }, [dynamicKpiMetrics]);

  const chartData = React.useMemo(() => {
    if (!filteredData)
      return {
        trend: [],
        ranking: [],
        comparison: [],
        design: [],
        monthlyDetailed: [],
        distribution: [],
      };
    return {
      trend: DataProcessingService.processChartData(filteredData, 'trend', filters),
      ranking: DataProcessingService.processChartData(filteredData, 'ranking', filters),
      comparison: DataProcessingService.processChartData(filteredData, 'comparison', filters),
      design: DataProcessingService.processChartData(filteredData, 'design', filters),
      monthlyDetailed: DataProcessingService.processChartData(filteredData, 'monthlyDetailed', filters),
      distribution: DataProcessingService.processChartData(filteredData, 'distribution', filters),
    };
  }, [filteredData, filters]);

  const uniqueClients = React.useMemo(() => {
    const originalOrders = notionData?.originalOrders || data?.originalOrders || [];
    if (!originalOrders || originalOrders.length === 0) return [];
    return DataProcessingService.getUniqueClients({ originalOrders });
  }, [notionData, data]);

  // 🆕 Contador de fontes de dados para exibição
  const dataSourcesCount = React.useMemo(() => {
    if (!data) return { sheets: 0, notion: 0, total: 0 };
    
    // Usar dados consolidados se disponível
    const consolidatedData = data._consolidatedSource || [];
    
    console.log('🔍 [DEBUG] dataSourcesCount - dados disponíveis:', {
      hasData: !!data,
      hasConsolidatedSource: !!data._consolidatedSource,
      consolidatedLength: consolidatedData.length,
      originalOrdersLength: data.originalOrders?.length || 0
    });
    
    if (consolidatedData.length > 0) {
      const sheets = consolidatedData.filter(item => item._source === 'sheets').length;
      const notion = consolidatedData.filter(item => item._source === 'notion').length;
      const total = consolidatedData.length;
      
      console.log('🔍 [DEBUG] Contagem consolidada:', { sheets, notion, total });
      
      return { sheets, notion, total };
    }
    
    // Fallback para dados do dashboard
    const sheets = data.originalOrders?.filter(item => item._source === 'sheets').length || 0;
    const notion = data.originalOrders?.filter(item => item._source === 'notion').length || 0;
    const total = data.originalOrders?.length || 0;
    
    console.log('🔍 [DEBUG] Contagem fallback:', { sheets, notion, total });
    
    return { sheets, notion, total };
  }, [data]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleViewChange = (newView) => {
    setCurrentView(newView);
    setViewHistory((prev) => [...prev, newView].slice(-10));

    const breadcrumbConfig = {
      dashboard: [{ label: 'Dashboard' }],
      heatmap: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Heatmap Interativo' },
      ],
      timeline: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Timeline de Eventos' },
      ],
      insights: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Insights com IA' },
      ],
      analysts: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        // { label: 'Calendário dos Analistas' },
      ],
      analytics: [
        { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
        { label: 'Analytics Avançado' },
      ],
    };

    setBreadcrumbs(breadcrumbConfig[newView] || [{ label: 'Dashboard' }]);
  };

  const handleDrillDown = (client, month, value) => {
    setDrillDownData({ isOpen: true, client, month, value });
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleInsightClick = (insight) => {
    if (insight?.category === 'performance' && insight.metrics?.client) {
      handleDrillDown(insight.metrics.client, null, null);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportData('csv');
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
    // Reset para primeira página quando filtros mudarem
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({ periodo: 'ambos', cliente: 'todos', tipo: 'geral' });
  };

  // Funções de paginação
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const getPaginatedData = (data, currentPage, itemsPerPage) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data, itemsPerPage) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  const handleBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];
      setViewHistory(newHistory);
      setCurrentView(previousView);
      // Atualiza os breadcrumbs coerentemente
      const breadcrumbConfig = {
        dashboard: [{ label: 'Dashboard' }],
        heatmap: [
          { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
          { label: 'Heatmap Interativo' },
        ],
        timeline: [
          { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
          { label: 'Timeline de Eventos' },
        ],
        insights: [
          { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
          { label: 'Insights com IA' },
        ],
        analysts: [
          { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
          // { label: 'Calendário dos Analistas' },
        ],
        analytics: [
          { label: 'Dashboard', onClick: () => handleViewChange('dashboard') },
          { label: 'Analytics Avançado' },
        ],
      };
      setBreadcrumbs(breadcrumbConfig[previousView] || [{ label: 'Dashboard' }]);
    }
  };

  // ==========================================
  // RENDERIZADORES
  // ==========================================
  const renderDashboard = () => (
    <>
      {/* 🆕 KPIs Dinâmicos - ATUALIZADOS COM NOVAS MÉTRICAS */}
      <div className="kpis-grid modern">
        {filters.periodo === 'ambos' ? (
          <>
            <KPICard
              title="Clientes atendidos"
              value={filteredData?.visaoGeral?.length || 0}
              subtitle="Com base nos filtros atuais"
              gradient="linear-gradient(135deg, #0EA5A4 0%, #14B8A6 100%)"
              delay="100ms"
            />
            
            {/*
            <KPICard
              title="Crescimento médio"
              value={`${(dynamicKpiMetrics.crescimentoMedio || dynamicKpiMetrics.crescimento || 0) > 0 ? '+' : ''}${dynamicKpiMetrics.crescimentoMedio || dynamicKpiMetrics.crescimento || 0}%`}
              subtitle="Comparação mês a mês entre 2024 e 2025"
              gradient="linear-gradient(135deg, #0EA5A4 0%, #14B8A6 100%)"
              delay="200ms"
            />
            */}
            
            <KPICard
              title="Média mensal 24"
              value={metrics.mediaMensal2024 || 0}
              subtitle={`${metrics.totalDemandas2024 || 0} demandas terminadas em 2024 ÷ 12`}
              gradient="linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)"
              delay="300ms"
            />
            
            <KPICard
              title="Média mensal 25"
              value={metrics.mediaMensal2025 || 0}
              subtitle={`${metrics.totalDemandas2025 || 0} demandas em 2025 ÷ ${metrics.mesesDecorridos2025 || new Date().getMonth() + 1} meses`}
              gradient="linear-gradient(135deg, #F97316 0%, #FB923C 100%)"
              delay="400ms"
            />
            
            <KPICard
              title="Crescimento 2025"
              value={`${(metrics.crescimento || 0) > 0 ? '+' : ''}${metrics.crescimento || 0}%`}
              subtitle={`Relação de crescimento entre os anos`}
              gradient="linear-gradient(135deg, #0EA5A4 0%, #14B8A6 100%)"
              delay="500ms"
            />
          </>
        ) : (
          <>
            <KPICard
              title="Clientes Filtrados"
              value={filteredData?.visaoGeral?.length || 0}
              subtitle={`Período: ${filters.periodo} • Tipo: ${filters.tipo}`}
              gradient="linear-gradient(135deg, #F97316 0%, #FB923C 100%)"
              delay="100ms"
            />
            <KPICard
              title="Total de Relatórios"
              value={metrics.totalRelatorios || 0}
              subtitle={`${filters.cliente !== 'todos' ? filters.cliente : 'Todos'} em ${filters.periodo}`}
              gradient="linear-gradient(135deg, #F97316 0%, #FB923C 100%)"
              delay="200ms"
            />
            {/* Card "Média Mensal" removido */}
            <KPICard
              title="Produtividade"
              value={metrics.produtividade || 0}
              subtitle="Relatórios/mês total"
              gradient="linear-gradient(135deg, #F97316 0%, #FB923C 100%)"
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


      {/* Gráfico Comparativo In.pacto vs STA - TEMPORARIAMENTE DESABILITADO */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          {/* Temporariamente desabilitado - Comparativo In.pacto vs STA */}
          {/*
          {(() => {
            // ... bloco comentado mantido
            const dynamicData = calculateCompanyData();
            return (
              <CompanyComparisonChart
                data={dynamicData}
                title="📊 Comparativo de Produção: In.pacto vs STA"
                subtitle={`Dados atualizados • Médias mensais progressivas até ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
                dataKey="media2025"
                filters={filters}
              />
            );
          })()}
          */}
        </div>
      </div>

      {/* 🔧 Gráfico de Tendência - ATUALIZADO PARA 12 MESES */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          <TrendChart
            data={chartData.trend || []}
            title={filters.periodo === 'ambos' ? '📈 Evolução Histórica de Produção (12 Meses)' : `📈 Evolução ${filters.periodo} - Todos os Meses`}
            subtitle={
              filters.cliente !== 'todos'
                ? `Análise específica: ${filters.cliente} • ${chartData.trend?.length || 0} meses processados`
                : filters.tipo !== 'geral'
                ? `Tipo: ${filters.tipo} • ${chartData.trend?.length || 0} meses processados`
                : `Dados consolidados (Sheets + Notion) • ${chartData.trend?.length || 0} meses processados`
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
            title={filters.periodo === 'ambos' ? '🏆 Ranking Comparativo - Médias Mensais' : `🏆 Top Clientes ${filters.periodo}`}
            subtitle={
              filters.cliente !== 'todos'
                ? `Foco: ${filters.cliente}`
                : filters.tipo !== 'geral'
                ? `${filters.tipo} • Performance detalhada`
                : filters.periodo === 'ambos'
                ? 'Comparação de médias mensais 2024 vs 2025 • Dados consolidados (Sheets + Notion)'
                : `Análise de performance ${filters.periodo} • Dados atualizados automaticamente`
            }
            dataKey={filters.periodo === 'ambos' ? 'media2025' : 'total'}
            orders={data?.originalOrders}             // 👈 necessário para preencher a coluna "Demandas"
            totalUniqueClients={uniqueClients.length} // 👈 mostrado no resumo abaixo da tabela
          />
        </div>
      </div>

      {/* 📋 Ranking de Tipos de Demanda — Dados da Planilha + Notion */}
      <div className="chart-container modern">
        <div className="chart-header">
          <h3 className="chart-title">📋 Tipos de Demanda Mais Realizados</h3>
          <p className="chart-subtitle">
            Ranking baseado na coluna "Tipo de Demanda" • Dados consolidados (Planilha + Notion)
          </p>
        </div>

        {(() => {
          const tiposRanking = Array.isArray(chartData.distribution) ? chartData.distribution : [];
          const totalDemandas = tiposRanking.reduce((sum, item) => sum + (item.quantidade || 0), 0);
          const totalPages = getTotalPages(tiposRanking, itemsPerPage);
          const paginatedData = getPaginatedData(tiposRanking, currentPage, itemsPerPage);
          const numberBR = (n) => Number(n || 0).toLocaleString('pt-BR');

          return (
            <>
              <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 12, background: '#FFF' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                  <thead style={{ background: '#FF6B47', color: '#FFF' }}>
                    <tr>
                      <th style={{ textAlign: 'center', padding: '14px 12px', width: '60px' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '14px 12px' }}>Tipo de Demanda</th>
                      <th style={{ textAlign: 'right', padding: '14px 12px', width: '120px' }}>Quantidade</th>
                      <th style={{ textAlign: 'right', padding: '14px 12px', width: '100px' }}>Percentual</th>
                      <th style={{ textAlign: 'center', padding: '14px 12px', width: '150px' }}>Barra Visual</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedData.map((item, index) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + index;
                      return (
                        <tr
                          key={item.tipo + '-' + globalIndex}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: index % 2 === 0 ? '#FAFBFC' : '#FFF',
                          }}
                        >
                          <td style={{ 
                            padding: '12px', 
                            textAlign: 'center', 
                            fontWeight: 700, 
                            color: globalIndex < 3 ? '#FF6B47' : '#64748B',
                            fontSize: '1.1rem'
                          }}>
                            {globalIndex + 1}
                          </td>
                          
                          <td style={{ padding: '12px', color: '#334155', fontWeight: 600 }}>
                            {item.tipo}
                          </td>

                          <td style={{ padding: '12px', textAlign: 'right', color: '#1F2937', fontWeight: 600 }}>
                            {numberBR(item.quantidade)}
                          </td>

                          <td style={{ padding: '12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                            {item.porcentagem}%
                          </td>

                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <div style={{
                              width: '100%',
                              height: '8px',
                              background: '#E5E7EB',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              position: 'relative'
                            }}>
                              <div style={{
                                width: `${item.porcentagem}%`,
                                height: '100%',
                                background: globalIndex < 3 ? '#FF6B47' : '#10B981',
                                borderRadius: '4px',
                                transition: 'width 0.6s ease'
                              }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr style={{ background: '#FFF7ED', fontWeight: 700 }}>
                      <td style={{ padding: '12px', textAlign: 'center' }}>TOTAL</td>
                      <td style={{ padding: '12px' }}>Todos os tipos</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{numberBR(totalDemandas)}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>100%</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{
                          width: '100%',
                          height: '8px',
                          background: '#FF6B47',
                          borderRadius: '4px'
                        }} />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Controles de Paginação */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ color: '#64748B', fontSize: '0.9rem' }}>
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, tiposRanking.length)} de {tiposRanking.length} tipos
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: currentPage === 1 ? '#F3F4F6' : '#FFF',
                        color: currentPage === 1 ? '#9CA3AF' : '#374151',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      ««
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: currentPage === 1 ? '#F3F4F6' : '#FFF',
                        color: currentPage === 1 ? '#9CA3AF' : '#374151',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      «
                    </button>

                    {/* Páginas numeradas */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            background: currentPage === pageNum ? '#FF6B47' : '#FFF',
                            color: currentPage === pageNum ? '#FFF' : '#374151',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            minWidth: '40px'
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: currentPage === totalPages ? '#F3F4F6' : '#FFF',
                        color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      »
                    </button>
                    
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: currentPage === totalPages ? '#F3F4F6' : '#FFF',
                        color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      »»
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Insights da distribuição */}
        <div className="distribution-insights">
          <div className="insights-grid">
            <div className="insight-card">
              <span className="insight-icon">📊</span>
              <div className="insight-content">
                <span className="insight-label">Total de Tipos Únicos</span>
                <span className="insight-value">
                  {chartData.distribution?.length || 0}
                </span>
              </div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">🏆</span>
              <div className="insight-content">
                <span className="insight-label">Tipo Mais Realizado</span>
                <span className="insight-value">
                  {chartData.distribution?.[0]?.tipo || 'N/A'}
                </span>
              </div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">📈</span>
              <div className="insight-content">
                <span className="insight-label">Total de Demandas</span>
                <span className="insight-value">
                  {chartData.distribution?.reduce((sum, item) => sum + (item.quantidade || 0), 0).toLocaleString('pt-BR') || 0}
                </span>
              </div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">⚡</span>
              <div className="insight-content">
                <span className="insight-label">Top 3 Representa</span>
                <span className="insight-value">
                  {(() => {
                    const top3 = chartData.distribution?.slice(0, 3) || [];
                    const totalTop3 = top3.reduce((sum, item) => sum + (item.porcentagem || 0), 0);
                    return `${totalTop3}%`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico Mensal Detalhado - COMENTADO */}
      {/* {filters.periodo === 'ambos' && chartData.monthlyDetailed && chartData.monthlyDetailed.length > 0 && (
        <div className="charts-row modern">
          <div className="chart-col-full">
            <MonthlyDetailChart
              data={chartData.monthlyDetailed}
              title="📊 Análise Mensal Detalhada in.Pacto"
              subtitle={`Inteligência de dados${filters.cliente !== 'todos' ? ` - Cliente: ${filters.cliente}` : ''}`}
            />
          </div>
        </div>
      )} */}

      {/* Gráfico de Produção de Design */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          <DesignProductionChart data={data} title="🎨 Produção de Design" filters={filters} />
        </div>
      </div>

      {/* Seção de Revisão - Anna Oliveira */}
      <div className="charts-row modern">
        <div className="chart-col-full">
          <ReviewProductionChart data={data} title="Produção de Revisão" filters={filters} />
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

  const renderCurrentView = () => {
    switch (currentView) {
      case 'heatmap':
        return <InteractiveHeatmap data={filteredData?.originalOrders || []} onCellClick={handleDrillDown} title="🗺️ Heatmap Interativo de Produção" />;

      case 'timeline':
        return <EventTimeline data={filteredData} onEventClick={handleEventClick} title="📅 Timeline de Eventos e Marcos" />;

      case 'insights':
        return <AIInsightsPanel data={filteredData} onInsightClick={handleInsightClick} autoUpdate={true} />;
      case 'collaborators':
        return (
          <div className="charts-row modern">
            <div className="chart-col-full">
              <CollaboratorDemands data={filteredData} title="📅 Demandas por Colaborador" />
            </div>
          </div>
        );

      case 'analysts':
        return (
          <div style={{ padding: '20px' }}>
            {/* <AnalystsCalendar
              data={data}
              title="📅 Calendário dos Analistas"
              onEventClick={(task) => {
                console.log('Tarefa clicada:', task);
              }}
            /> */}
          </div>
        );

      case 'analytics':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <InteractiveHeatmap data={filteredData?.originalOrders || []} onCellClick={handleDrillDown} title="🗺️ Mapa de Calor - Clientes x Meses" />
            <EventTimeline data={filteredData} onEventClick={handleEventClick} title="📅 Linha do Tempo de Eventos" />
            <AIInsightsPanel data={filteredData} onInsightClick={handleInsightClick} autoUpdate={false} />
          </div>
        );

      default:
        return renderDashboard();
    }
  };

  // ==========================================
  // RETURN (UM ÚNICO WRAPPER)
  // ==========================================
  return (
    <div className="dashboard-producao modern">
      {/* Debug Panel (apenas em desenvolvimento) */}
      <DebugPanel data={data} />
      
      {/* Header com navegação aprimorada */}
      <div className="dashboard-header modern">
        <div className="header-content">
          <div className="header-text">
            <h1 className="header-title">Dashboard de Produção</h1>
            <p className="header-subtitle">• Diretoria de Inteligência de Dados •</p>
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
          Última atualização{' '}
          {lastUpdate ? new Date(lastUpdate).toLocaleString('pt-BR') : '—'} •
          {' '}Fonte: Google Sheets + Notion (Consolidado) • Auto-refresh ativo
          {error ? ` • Erro: ${error}` : ''}
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
          <div className="loading-spinner">🔄 <span>Carregando dados consolidados (Sheets + Notion)...</span></div>
        </div>
      )}

      {/* 🔧 FILTROS CORRIGIDOS - Agora usando os dados consolidados */}
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
                    marginLeft: '16px',
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
                <select value={filters.periodo} onChange={(e) => handleFilterChange('periodo', e.target.value)} className="filter-select modern">
                  <option value="ambos">📊 Comparativo 2024 vs 2025 (12 meses)</option>
                  <option value="2024">📅 Apenas 2024 (Histórico)</option>
                  <option value="2025">📅 Apenas 2025 (Atual)</option>
                </select>
              </div>

              <div className="filter-group-labeled">
                <label className="filter-label-title">
                  <span className="filter-icon">🏢</span>
                  Clientes
                </label>
                <select value={filters.cliente} onChange={(e) => handleFilterChange('cliente', e.target.value)} className="filter-select modern">
                  <option value="todos">🌐 Todos os Clientes</option>
                  {uniqueClients.map((cliente) => (
                    <option key={cliente} value={cliente}>
                      🏢 {cliente}
                    </option>
                  ))}
                </select>
              </div>

              {/* 🎯 DROPDOWN CORRIGIDO - Usando uniqueDemandTypes consolidados */}
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
                  {/* Opção padrão */}
                  <option value="geral">📊 Relatórios Gerais</option>

                  {/* 🔧 CORRIGIDO - Usando uniqueDemandTypes consolidados (49 tipos únicos) */}
                  {(uniqueDemandTypes || []).map((type) => (
                    <option key={type.id} value={type.value}>
                      📝 {type.label}
                    </option>
                  ))}

                  {/* Opção especial para design */}
                  <option value="design">🎨 Criações & Design</option>
                </select>
                
                {/* Debug info */}
                {uniqueDemandTypes && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Render da View Atual */}
      {renderCurrentView()}

      {/* Modal de Drill Down */}
      <DrillDownModal
        isOpen={drillDownData.isOpen}
        onClose={() => setDrillDownData({ isOpen: false, client: null, month: null, value: null })}
        client={drillDownData.client}
        month={drillDownData.month}
        data={data}
      />

      {/* Botões Flutuantes */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 999999,
        }}
      >
        {/* Calendário dos Analistas - COMENTADO */}
        {/* <button
          onClick={() => handleViewChange('analysts')}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.2s ease',
            fontSize: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
          }}
          title="Calendário dos Analistas"
        >
          <span role="img" aria-label="team">👥</span>
        </button> */}

        {/* Heatmap */}
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
            fontSize: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
          }}
          title="Heatmap Interativo"
        >
          <span role="img" aria-label="map">🗺️</span>
        </button>

        {/* Timeline */}
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
            fontSize: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
          }}
          title="Timeline de Eventos"
        >
          <span role="img" aria-label="calendar">📅</span>
        </button>

        {/* Colaboradores */}
        <button
          onClick={() => handleViewChange('collaborators')}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22C55E, #86EFAC)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
            transition: 'all 0.2s ease',
            fontSize: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.4)';
          }}
          title="Demandas por Colaborador"
        >
          <span role="img" aria-label="collaborators">👥</span>
        </button>

        {/* Insights IA */}
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
            fontSize: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
          }}
          title="Insights com IA"
        >
          <span role="img" aria-label="robot">🤖</span>
        </button>

        {/* Voltar Dashboard */}
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
            fontSize: '1.5rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 71, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 71, 0.4)';
          }}
          title="Voltar ao Dashboard"
        >
          <span role="img" aria-label="chart">📊</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer modern">
        <div className="footer-content">
          <p>
            <strong>Copyright © 2025</strong> — Todos os direitos reservados — Holding Inpacto.
            {' '}Desenvolvido pela Diretoria de Inteligência de Dados
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;