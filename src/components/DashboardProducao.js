import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, Clock, Target, Calendar, Filter, Download, RefreshCw, Wifi, WifiOff, BarChart3 } from 'lucide-react';
import { dataStandardizer } from '../utils/dataStandardization.js';
import SourceAwareKPI from './SourceAwareKPI.js';

// ==========================================
// CONFIGURAÇÕES DE DESIGN E CORES
// ==========================================
const DESIGN_CONFIG = {
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6', 
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    gradient: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      success: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }
  },
  chartColors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#f97316'],
  animation: {
    duration: 300,
    easing: 'ease-in-out'
  }
};

// ==========================================
// DADOS MOCKADOS BASEADOS NA PLANILHA REAL
// ==========================================
const MOCK_DATA = {
  // Dados baseados na estrutura real da planilha
  visaoGeral: [
    { cliente: 'MS', janeiro: 1, fevereiro: 3, marco: 0, abril: 1, maio: 38, total: 43 },
    { cliente: 'AIR', janeiro: 1, fevereiro: 1, marco: 1, abril: 1, maio: 1, total: 5 },
    { cliente: 'ANP', janeiro: 47, fevereiro: 42, marco: 42, abril: 42, maio: 43, total: 216 },
    { cliente: 'CFQ', janeiro: 20, fevereiro: 18, marco: 20, abril: 20, maio: 15, total: 93 },
    { cliente: 'GOVGO', janeiro: 12, fevereiro: 10, marco: 12, abril: 12, maio: 8, total: 54 },
    { cliente: 'PETROBRAS', janeiro: 8, fevereiro: 8, marco: 8, abril: 8, maio: 10, total: 42 },
    { cliente: 'VALE', janeiro: 15, fevereiro: 12, marco: 15, abril: 15, maio: 18, total: 75 },
  ],
  
  semanais: [
    { cliente: 'CFQ', janeiro: 5, fevereiro: 4, marco: 5, abril: 5, maio: 2, total: 21 },
    { cliente: 'ANP', janeiro: 12, fevereiro: 10, marco: 12, abril: 12, maio: 8, total: 54 },
    { cliente: 'PETROBRAS', janeiro: 2, fevereiro: 2, marco: 2, abril: 2, maio: 3, total: 11 },
  ],
  
  mensais: [
    { cliente: 'ANP', janeiro: 3, fevereiro: 2, marco: 2, abril: 2, maio: 1, total: 10 },
    { cliente: 'GOVGO', janeiro: 2, fevereiro: 1, marco: 2, abril: 2, maio: 1, total: 8 },
    { cliente: 'VALE', janeiro: 1, fevereiro: 1, marco: 1, abril: 1, maio: 2, total: 6 },
  ],
  
  design: [
    { cliente: 'in.Pacto', '2024': 17, janeiro: 1, fevereiro: 6, marco: 4, abril: 3, maio: 2, '2025': 16 },
    { cliente: 'ANP', '2024': 4, janeiro: 0, fevereiro: 0, marco: 0, abril: 0, maio: 1, '2025': 1 },
    { cliente: 'GOVGO', '2024': 6, janeiro: 1, fevereiro: 0, marco: 0, abril: 0, maio: 0, '2025': 1 },
  ]
};

// ==========================================
// PROCESSADORES DE DADOS
// ==========================================
class DataProcessor {
  static processMetrics(data) {
    const totalClientes = data.visaoGeral.length;
    const totalRelatorios = data.visaoGeral.reduce((sum, cliente) => sum + cliente.total, 0);
    const mediaClienteMes = totalRelatorios / totalClientes / 5; // 5 meses de dados
    
    // Crescimento desde abril (nova diretora)
    const prodAntesAbril = data.visaoGeral.reduce((sum, cliente) => 
      sum + cliente.janeiro + cliente.fevereiro + cliente.marco, 0);
    const prodDepoisAbril = data.visaoGeral.reduce((sum, cliente) => 
      sum + cliente.abril + cliente.maio, 0);
    
    const crescimento = prodAntesAbril > 0 ? 
      ((prodDepoisAbril / 2 - prodAntesAbril / 3) / (prodAntesAbril / 3)) * 100 : 100;

    return {
      totalClientes,
      totalRelatorios,
      mediaClienteMes: Math.round(mediaClienteMes * 10) / 10,
      crescimento: Math.round(Math.max(0, crescimento)),
      produtividadeMensal: Math.round(totalRelatorios / 5)
    };
  }

  // 🆕 Método com awareness de fontes
  static processMetricsWithSourceAwareness(data, filters = {}) {
    console.log('📊 [DATA PROCESSOR] Processando métricas com awareness de fonte...');
    
    // Converter dados para formato compatível com dataStandardizer
    const compatibleData = this.convertToCompatibleFormat(data);
    
    // Usar dataStandardizer para contagem com awareness de fonte
    const sourceAwareCount = dataStandardizer.getStandardizedCount(compatibleData, {
      year: filters.year || 'all',
      type: filters.type || 'all',
      cliente: filters.cliente || 'all',
      showBreakdown: true
    });

    // Calcular métricas tradicionais
    const traditionalMetrics = this.processMetrics(data);
    
    // Adicionar breakdown por fonte
    const enhancedMetrics = {
      ...traditionalMetrics,
      sourceBreakdown: sourceAwareCount.breakdown,
      totalBySource: {
        sheets: sourceAwareCount.breakdown.sheets,
        notion: sourceAwareCount.breakdown.notion,
        unknown: sourceAwareCount.breakdown.unknown
      },
      sourceDefinitions: sourceAwareCount.sourceDefinitions,
      integrityCheck: dataStandardizer.validateDataIntegrity(compatibleData)
    };

    console.log('📊 [DATA PROCESSOR] Métricas com awareness:', enhancedMetrics);
    return enhancedMetrics;
  }

  // Converter dados do formato atual para formato compatível com dataStandardizer
  static convertToCompatibleFormat(data) {
    const compatibleData = [];
    
    // Processar dados de visão geral
    if (data.visaoGeral) {
      data.visaoGeral.forEach(cliente => {
        // Adicionar registros para cada mês com dados
        const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
        meses.forEach(mes => {
          if (cliente[mes] > 0) {
            compatibleData.push({
              id: `ORD-${cliente.cliente}-${mes}`,
              cliente: cliente.cliente,
              dataEntrega: `2024-${this.getMonthNumber(mes)}-01`,
              isRelatorio: true,
              _source: 'sheets', // Dados históricos do Sheets
              valor: cliente[mes] * 1000 // Estimativa de valor
            });
          }
        });
      });
    }

    // Processar dados de 2025 se existirem
    if (data.visaoGeral2025) {
      data.visaoGeral2025.forEach(cliente => {
        if (cliente['2025'] > 0) {
          compatibleData.push({
            id: `ORD-${cliente.cliente}-2025`,
            cliente: cliente.cliente,
            dataEntrega: '2025-01-01',
            isRelatorio: true,
            _source: 'notion', // Dados atuais do Notion
            valor: cliente['2025'] * 1000
          });
        }
      });
    }

    console.log('📊 [DATA PROCESSOR] Dados convertidos:', compatibleData.length, 'registros');
    return compatibleData;
  }

  static getMonthNumber(mes) {
    const meses = {
      'janeiro': '01', 'fevereiro': '02', 'marco': '03',
      'abril': '04', 'maio': '05', 'junho': '06',
      'julho': '07', 'agosto': '08', 'setembro': '09',
      'outubro': '10', 'novembro': '11', 'dezembro': '12'
    };
    return meses[mes] || '01';
  }

  static processMonthlyTrend(data) {
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio'];
    return meses.map(mes => {
      const key = mes.toLowerCase();
      const total = data.visaoGeral.reduce((sum, cliente) => sum + (cliente[key] || 0), 0);
      return { mes, total, crescimento: mes === 'Abril' || mes === 'Maio' };
    });
  }

  static processClientesTop(data) {
    return data.visaoGeral
      .map(cliente => ({
        cliente: cliente.cliente,
        total: cliente.total,
        media: Math.round((cliente.total / 5) * 10) / 10
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }

  static processTiposRelatorio(data) {
    const tipos = [
      { tipo: 'Relatórios Gerais', valor: data.visaoGeral.reduce((sum, c) => sum + c.total, 0) },
      { tipo: 'Semanais', valor: data.semanais.reduce((sum, c) => sum + c.total, 0) },
      { tipo: 'Mensais', valor: data.mensais.reduce((sum, c) => sum + c.total, 0) },
      { tipo: 'Design', valor: data.design.reduce((sum, c) => sum + c['2025'], 0) }
    ];
    
    return tipos.map((item, index) => ({
      ...item,
      color: DESIGN_CONFIG.chartColors[index % DESIGN_CONFIG.chartColors.length]
    }));
  }

  static processComparativo2024vs2025(data) {
    return data.design.map(cliente => ({
      cliente: cliente.cliente,
      '2024': cliente['2024'],
      '2025': cliente['2025'],
      crescimento: cliente['2024'] > 0 ? 
        Math.round(((cliente['2025'] - cliente['2024']) / cliente['2024']) * 100) : 0
    }));
  }
}

// ==========================================
// COMPONENTES MODULARES
// ==========================================

// Componente: Card de KPI
const KPICard = ({ title, value, icon: Icon, gradient, subtitle, trend }) => (
  <div className="kpi-card" style={{ background: gradient }}>
    <div className="kpi-content">
      <div className="kpi-text">
        <p className="kpi-title">{title}</p>
        <p className="kpi-value">{value}</p>
        {subtitle && <p className="kpi-subtitle">{subtitle}</p>}
      </div>
      <div className="kpi-icon">
        <Icon size={32} />
        {trend && (
          <div className="kpi-trend">
            <TrendingUp size={16} />
            <span>+{trend}%</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// Componente: Header do Dashboard
const DashboardHeader = ({ onRefresh, isConnected, lastUpdate }) => (
  <div className="dashboard-header">
    <div className="header-content">
      <div className="header-text">
        <h1 className="header-title">
          Dashboard Social Listening & BI
        </h1>
        <p className="header-subtitle">
          Acompanhamento da produção desde abril 2024 • Nova Diretoria
        </p>
      </div>
      <div className="header-actions">
        <div className="connection-status">
          {isConnected ? (
            <div className="status-connected">
              <Wifi size={16} />
              <span>Conectado</span>
            </div>
          ) : (
            <div className="status-disconnected">
              <WifiOff size={16} />
              <span>Offline</span>
            </div>
          )}
        </div>
        <button onClick={onRefresh} className="btn-refresh">
          <RefreshCw size={16} />
          Atualizar
        </button>
        <button className="btn-export">
          <Download size={16} />
          Exportar
        </button>
      </div>
    </div>
    {lastUpdate && (
      <div className="last-update">
        Última atualização: {lastUpdate.toLocaleString('pt-BR')}
      </div>
    )}
  </div>
);

// Componente: Filtros
const DashboardFilters = ({ filters, onFilterChange }) => (
  <div className="dashboard-filters">
    <div className="filters-content">
      <div className="filter-group">
        <Filter size={16} />
        <span className="filter-label">Filtros:</span>
      </div>
      <select 
        value={filters.periodo} 
        onChange={(e) => onFilterChange('periodo', e.target.value)}
        className="filter-select"
      >
        <option value="todos">Todos os períodos</option>
        <option value="2025">2025</option>
        <option value="ultimos3">Últimos 3 meses</option>
        <option value="apartir-abril">A partir de Abril 2024</option>
      </select>
      <select 
        value={filters.cliente} 
        onChange={(e) => onFilterChange('cliente', e.target.value)}
        className="filter-select"
      >
        <option value="todos">Todos os clientes</option>
        <option value="ANP">ANP</option>
        <option value="MS">MS</option>
        <option value="CFQ">CFQ</option>
        <option value="GOVGO">GOVGO</option>
        <option value="PETROBRAS">PETROBRAS</option>
        <option value="VALE">VALE</option>
      </select>
      <select 
        value={filters.tipo} 
        onChange={(e) => onFilterChange('tipo', e.target.value)}
        className="filter-select"
      >
        <option value="todos">Todos os tipos</option>
        <option value="geral">Relatórios Gerais</option>
        <option value="semanal">Semanais</option>
        <option value="mensal">Mensais</option>
        <option value="design">Design</option>
      </select>
    </div>
  </div>
);

// Componente: Gráfico de Tendência Mensal
const TrendChart = ({ data }) => (
  <div className="chart-container">
    <h3 className="chart-title">Evolução da Produção Mensal</h3>
    <div className="chart-subtitle">
      Destaque para crescimento a partir de Abril 2024 (Nova Diretoria)
    </div>
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="mes" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: 'none', 
            borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' 
          }} 
        />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke={DESIGN_CONFIG.colors.primary}
          strokeWidth={3}
          dot={(props) => {
            const { payload } = props;
            return (
              <circle 
                {...props} 
                fill={payload.crescimento ? DESIGN_CONFIG.colors.success : DESIGN_CONFIG.colors.primary}
                stroke={payload.crescimento ? DESIGN_CONFIG.colors.success : DESIGN_CONFIG.colors.primary}
                strokeWidth={2} 
                r={6}
              />
            );
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// Componente: Ranking de Clientes
const ClientesRanking = ({ data }) => (
  <div className="chart-container">
    <h3 className="chart-title">Top Clientes por Produção</h3>
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" stroke="#64748b" />
        <YAxis type="category" dataKey="cliente" stroke="#64748b" width={80} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: 'none', 
            borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' 
          }}
          formatter={(value, name) => [value, 'Total de Relatórios']}
        />
        <Bar 
          dataKey="total" 
          fill={DESIGN_CONFIG.colors.secondary}
          radius={[0, 8, 8, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// Componente: Distribuição por Tipo
const TiposDistribuicao = ({ data }) => (
  <div className="chart-container">
    <h3 className="chart-title">Distribuição por Tipo de Relatório</h3>
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ tipo, percent }) => `${tipo}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="valor"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: 'none', 
            borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' 
          }} 
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

// Componente: Comparativo 2024 vs 2025
const ComparativoAnual = ({ data }) => (
  <div className="chart-container">
    <h3 className="chart-title">Crescimento Design: 2024 vs 2025</h3>
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="cliente" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            border: 'none', 
            borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' 
          }} 
        />
        <Legend />
        <Bar dataKey="2024" fill={DESIGN_CONFIG.colors.info} name="2024" radius={[4, 4, 0, 0]} />
        <Bar dataKey="2025" fill={DESIGN_CONFIG.colors.success} name="2025" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ==========================================
// COMPONENTE PRINCIPAL DO DASHBOARD
// ==========================================
const DashboardProducao = () => {
  // Estados
  const [data, setData] = useState(MOCK_DATA);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filters, setFilters] = useState({
    periodo: 'todos',
    cliente: 'todos',
    tipo: 'todos'
  });

  // Dados processados com awareness de fonte
  const metrics = DataProcessor.processMetricsWithSourceAwareness(data, filters);
  const trendData = DataProcessor.processMonthlyTrend(data);
  const clientesTop = DataProcessor.processClientesTop(data);
  const tiposData = DataProcessor.processTiposRelatorio(data);
  const comparativoData = DataProcessor.processComparativo2024vs2025(data);

  // Handlers
  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Aqui você integrará com o Google Sheets Service
      // const newData = await GoogleSheetsService.getDashboardData(false);
      // setData(newData);
      
      // Por enquanto, simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdate(new Date());
      setIsConnected(true);
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Efeito para carregar dados iniciais
  useEffect(() => {
    setLastUpdate(new Date());
    setIsConnected(true);
  }, []);

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        handleRefresh();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="dashboard-producao">
      {/* Header */}
      <DashboardHeader 
        onRefresh={handleRefresh}
        isConnected={isConnected}
        lastUpdate={lastUpdate}
      />

      {/* Filtros */}
      <DashboardFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* KPIs principais com awareness de fonte */}
      <div className="kpis-grid">
        <SourceAwareKPI
          title="Total de Clientes"
          value={metrics.totalClientes}
          icon={Users}
          gradient={DESIGN_CONFIG.colors.gradient.primary}
          subtitle="Clientes ativos"
          sourceBreakdown={metrics.sourceBreakdown}
          sourceDefinitions={metrics.sourceDefinitions}
        />
        <SourceAwareKPI
          title="Total de Relatórios"
          value={metrics.totalRelatorios}
          icon={FileText}
          gradient={DESIGN_CONFIG.colors.gradient.success}
          subtitle="Em 2025"
          trend={metrics.crescimento}
          sourceBreakdown={metrics.sourceBreakdown}
          sourceDefinitions={metrics.sourceDefinitions}
        />
        <SourceAwareKPI
          title="Média por Cliente/Mês"
          value={metrics.mediaClienteMes}
          icon={Target}
          gradient={DESIGN_CONFIG.colors.gradient.warning}
          subtitle="Relatórios/mês"
          sourceBreakdown={metrics.sourceBreakdown}
          sourceDefinitions={metrics.sourceDefinitions}
        />
        <SourceAwareKPI
          title="Produtividade Mensal"
          value={metrics.produtividadeMensal}
          icon={BarChart3}
          gradient={DESIGN_CONFIG.colors.gradient.primary}
          subtitle="Relatórios/mês"
          sourceBreakdown={metrics.sourceBreakdown}
          sourceDefinitions={metrics.sourceDefinitions}
        />
        <SourceAwareKPI
          title="Crescimento"
          value={`+${metrics.crescimento}%`}
          icon={TrendingUp}
          gradient={DESIGN_CONFIG.colors.gradient.success}
          subtitle="Desde nova diretoria"
          sourceBreakdown={metrics.sourceBreakdown}
          sourceDefinitions={metrics.sourceDefinitions}
        />
      </div>

      {/* Gráficos principais */}
      <div className="charts-row">
        <div className="chart-col-2">
          <TrendChart data={trendData} />
        </div>
        <div className="chart-col-2">
          <ClientesRanking data={clientesTop} />
        </div>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="charts-row">
        <div className="chart-col-2">
          <TiposDistribuicao data={tiposData} />
        </div>
        <div className="chart-col-2">
          <ComparativoAnual data={comparativoData} />
        </div>
      </div>

      {/* Indicador de loading */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <RefreshCw className="spinning" size={24} />
            <span>Atualizando dados...</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="footer-content">
          <p>Dashboard de Produção Social Listening & BI</p>
          <p>Dados atualizados automaticamente a cada 5 minutos</p>
        </div>
      </div>

      {/* Estilos CSS inline para o componente */}
      <style jsx>{`
        .dashboard-producao {
          min-height: 100vh;
          background: ${DESIGN_CONFIG.colors.gradient.background};
          padding: 20px;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Header Styles */
        .dashboard-header {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-title {
          font-size: 2rem;
          font-weight: 700;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .header-subtitle {
          color: #64748b;
          margin: 8px 0 0 0;
          font-size: 1rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-connected {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-disconnected {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .btn-refresh, .btn-export {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-refresh {
          background: #6366f1;
          color: white;
        }

        .btn-refresh:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }

        .btn-export {
          background: rgba(255, 255, 255, 0.9);
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .btn-export:hover {
          background: white;
          transform: translateY(-1px);
        }

        .last-update {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          color: #64748b;
          font-size: 0.875rem;
        }

        /* Filters Styles */
        .dashboard-filters {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .filters-content {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #374151;
          font-weight: 500;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          font-size: 0.875rem;
          min-width: 140px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-select:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        /* KPIs Grid */
        .kpis-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .kpi-card {
          border-radius: 16px;
          padding: 24px;
          color: white;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-4px);
        }

        .kpi-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .kpi-title {
          font-size: 0.875rem;
          opacity: 0.9;
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        .kpi-value {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          line-height: 1;
        }

        .kpi-subtitle {
          font-size: 0.75rem;
          opacity: 0.8;
          margin: 4px 0 0 0;
        }

        .kpi-icon {
          opacity: 0.8;
          position: relative;
        }

        .kpi-trend {
          position: absolute;
          top: -8px;
          right: -8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 2px 6px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 2px;
        }

        /* Charts */
        .charts-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .chart-col-2 {
          min-width: 0; /* Permite que o grid funcione corretamente */
        }

        .chart-container {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .chart-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px 0;
        }

        .chart-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 20px;
        }

        /* Loading */
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .loading-spinner {
          background: white;
          padding: 24px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
          color: #374151;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .dashboard-footer {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 16px;
          margin-top: 30px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #64748b;
          font-size: 0.875rem;
          flex-wrap: wrap;
          gap: 8px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard-producao {
            padding: 12px;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .filters-content {
            flex-direction: column;
            align-items: flex-start;
          }

          .kpis-grid {
            grid-template-columns: 1fr;
          }

          .charts-row {
            grid-template-columns: 1fr;
          }

          .footer-content {
            flex-direction: column;
            text-align: center;
          }

          .header-title {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 640px) {
          .charts-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardProducao;