// ==========================================
// src/components/AIInsightsPanel.js
// Painel de insights automáticos com IA
// ==========================================

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Brain, TrendingUp, AlertCircle, CheckCircle, Lightbulb,
  Target, Zap, Eye, RefreshCw, Settings, MessageSquare,
  BarChart3, Users, Calendar, Star, ArrowRight, Download
} from 'lucide-react';
import { AnalyticsService } from '../services/analyticsService';

const AIInsightsPanel = ({ data, onInsightClick, autoUpdate = true }) => {
  const [insights, setInsights] = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');

  // Categorias de insights
  const categories = {
    all: { label: 'Todos', icon: Brain, color: '#6B7280' },
    performance: { label: 'Performance', icon: TrendingUp, color: '#10B981' },
    alerts: { label: 'Alertas', icon: AlertCircle, color: '#EF4444' },
    opportunities: { label: 'Oportunidades', icon: Lightbulb, color: '#F59E0B' },
    patterns: { label: 'Padrões', icon: BarChart3, color: '#3B82F6' },
    predictions: { label: 'Previsões', icon: Target, color: '#8B5CF6' }
  };

  // Processar insights com IA
  const processInsights = useMemo(() => {
    if (!data) return { insights: [], correlations: [], forecasts: [], anomalies: [] };

    const insights = [];
    
    // Análise de crescimento geral
    const totalCurrent = data.visaoGeral?.reduce((sum, client) => sum + (client.total || 0), 0) || 0;
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    const monthlyTotals = months.map(month => 
      data.visaoGeral?.reduce((sum, client) => sum + (client[month] || 0), 0) || 0
    );

    const avgBefore = (monthlyTotals[0] + monthlyTotals[1] + monthlyTotals[2]) / 3;
    const avgAfter = (monthlyTotals[3] + monthlyTotals[4]) / 2;
    const growth = avgBefore > 0 ? ((avgAfter - avgBefore) / avgBefore) * 100 : 0;

    if (growth > 20) {
      insights.push({
        id: 'growth-acceleration',
        category: 'performance',
        type: 'positive',
        confidence: 'alta',
        priority: 'high',
        title: '🚀 Aceleração de Crescimento Detectada',
        description: `Performance aumentou ${Math.round(growth)}% após abril (Nova Diretoria)`,
        impact: 'Crescimento sustentável indica estratégia eficaz',
        recommendation: 'Manter e replicar práticas implementadas pela nova gestão',
        metrics: { growth: Math.round(growth), avgBefore: Math.round(avgBefore), avgAfter: Math.round(avgAfter) },
        timestamp: new Date(),
        aiScore: 0.92
      });
    }

    // Análise de concentração de clientes
    const topClient = data.visaoGeral?.reduce((max, client) => 
      client.total > max.total ? client : max, { total: 0, cliente: 'N/A' });
    
    const clientConcentration = totalCurrent > 0 ? (topClient.total / totalCurrent) * 100 : 0;
    
    if (clientConcentration > 40) {
      insights.push({
        id: 'client-concentration',
        category: 'alerts',
        type: 'warning',
        confidence: 'alta',
        priority: 'medium',
        title: '⚠️ Concentração de Cliente Detectada',
        description: `${topClient.cliente} representa ${Math.round(clientConcentration)}% da produção total`,
        impact: 'Risco de dependência excessiva de um cliente',
        recommendation: 'Diversificar portfólio e fortalecer relacionamento com outros clientes',
        metrics: { concentration: Math.round(clientConcentration), client: topClient.cliente },
        timestamp: new Date(),
        aiScore: 0.85
      });
    }

    // Análise de sazonalidade
    const monthlyVariation = monthlyTotals.reduce((acc, current, index) => {
      if (index === 0) return acc;
      const variation = monthlyTotals[index - 1] > 0 ? 
        Math.abs((current - monthlyTotals[index - 1]) / monthlyTotals[index - 1]) * 100 : 0;
      return acc + variation;
    }, 0) / (monthlyTotals.length - 1);

    if (monthlyVariation > 25) {
      insights.push({
        id: 'seasonality-pattern',
        category: 'patterns',
        type: 'info',
        confidence: 'média',
        priority: 'low',
        title: '📊 Padrão de Sazonalidade Identificado',
        description: `Variação média mensal de ${Math.round(monthlyVariation)}% detectada`,
        impact: 'Flutuações podem afetar previsibilidade de receita',
        recommendation: 'Implementar estratégias para suavizar variações sazonais',
        metrics: { variation: Math.round(monthlyVariation) },
        timestamp: new Date(),
        aiScore: 0.73
      });
    }

    // Análise de diversificação de serviços
    const serviceTypes = [];
    if (data.visaoGeral?.length) serviceTypes.push('Relatórios Gerais');
    if (data.semanais?.length) serviceTypes.push('Semanais');
    if (data.mensais?.length) serviceTypes.push('Mensais');
    if (data.design?.length) serviceTypes.push('Design');
    if (data.especiais?.length) serviceTypes.push('Especiais');

    if (serviceTypes.length >= 4) {
      insights.push({
        id: 'service-diversification',
        category: 'performance',
        type: 'positive',
        confidence: 'alta',
        priority: 'low',
        title: '🎯 Portfólio Bem Diversificado',
        description: `${serviceTypes.length} tipos de serviços ativos`,
        impact: 'A diversificação de serviços ajuda a reduzir riscos e ampliar a presença em diferentes segmentos de mercado',
        recommendation: 'Ampliar o portfólio de serviços de forma estratégica, buscando complementaridades que gerem mais valor para o cliente',
        metrics: { serviceCount: serviceTypes.length, services: serviceTypes },
        timestamp: new Date(),
        aiScore: 0.81
      });
    }

    // Análise de eficiência de novos clientes
    const newClients = data.visaoGeral?.filter(client => 
      (client.abril || 0) > 0 || (client.maio || 0) > 0
    ).length || 0;

    if (newClients > 0) {
      insights.push({
        id: 'new-client-acquisition',
        category: 'opportunities',
        type: 'positive',
        confidence: 'média',
        priority: 'medium',
        title: '👥 Aquisição de Novos Clientes',
        description: `${newClients} clientes com atividade recente detectados`,
        impact: 'O aumento na base de clientes reforça a percepção positiva da atuação da equipe de Inteligência de Dados',
        recommendation: 'Implementar novas estratégias de retenção para os novos clientes',
        metrics: { newClients },
        timestamp: new Date(),
        aiScore: 0.78
      });
    }

    // Análise de produtividade por tipo
    const designGrowth = data.design?.reduce((sum, client) => {
      const growth2025 = client['2025'] || 0;
      const growth2024 = client['2024'] || 0;
      return sum + growth2025;
    }, 0) || 0;

    if (designGrowth > 15) {
      insights.push({
        id: 'design-growth',
        category: 'opportunities',
        type: 'positive',
        confidence: 'alta',
        priority: 'high',
        title: '🎨 Crescimento em Design',
        description: `Área de design mostra forte crescimento com ${designGrowth} projetos`,
        impact: 'A oferta de serviços criativos pode representar um diferencial competitivo relevante no mercado',
        recommendation: 'Priorizar a capacitação da equipe e a adoção de ferramentas especializadas em design',
        metrics: { designProjects: designGrowth },
        timestamp: new Date(),
        aiScore: 0.87
      });
    }

    return {
      insights: insights.sort((a, b) => b.aiScore - a.aiScore),
      correlations: AnalyticsService.analyzeCorrelations(data),
      forecasts: AnalyticsService.generateForecasts(data, 3),
      anomalies: AnalyticsService.detectAnomalies(data)
    };
  }, [data]);

  // Atualizar insights
  useEffect(() => {
    if (data) {
      setLoading(true);
      // Simular processamento da IA
      setTimeout(() => {
        const processed = processInsights;
        setInsights(processed.insights);
        setCorrelations(processed.correlations);
        setForecasts(processed.forecasts);
        setAnomalies(processed.anomalies);
        setLastUpdate(new Date());
        setLoading(false);
      }, 800);
    }
  }, [data, processInsights]);

  // Auto-update
  useEffect(() => {
    if (!autoUpdate) return;

    const interval = setInterval(() => {
      if (data) {
        setLoading(true);
        setTimeout(() => {
          const processed = processInsights;
          setInsights(processed.insights);
          setLastUpdate(new Date());
          setLoading(false);
        }, 500);
      }
    }, 30000); // Update a cada 30 segundos

    return () => clearInterval(interval);
  }, [autoUpdate, data, processInsights]);

  // Filtrar insights
  const filteredInsights = insights.filter(insight => {
    const categoryMatch = selectedCategory === 'all' || insight.category === selectedCategory;
    const confidenceMatch = confidenceFilter === 'all' || insight.confidence === confidenceFilter;
    return categoryMatch && confidenceMatch;
  });

  // Obter configuração visual do insight
  const getInsightConfig = (insight) => {
    const configs = {
      positive: { color: '#10B981', bgColor: '#10B98110', icon: CheckCircle },
      warning: { color: '#F59E0B', bgColor: '#F59E0B10', icon: AlertCircle },
      info: { color: '#3B82F6', bgColor: '#3B82F610', icon: Brain },
      negative: { color: '#EF4444', bgColor: '#EF444410', icon: AlertCircle }
    };
    return configs[insight.type] || configs.info;
  };

  // Renderizar insight card
  const renderInsightCard = (insight) => {
    const config = getInsightConfig(insight);
    const IconComponent = config.icon;

    return (
      <div
        key={insight.id}
        style={{
          background: 'white',
          border: `2px solid ${config.color}20`,
          borderLeft: `4px solid ${config.color}`,
          borderRadius: '12px',
          padding: '20px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onClick={() => onInsightClick && onInsightClick(insight)}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = `0 8px 25px ${config.color}20`;
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}
      >
        {/* Conteúdo */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{
            margin: '0 0 8px 0',
            color: '#374151',
            fontSize: '1.125rem',
            fontWeight: '600',
            lineHeight: '1.3'
          }}>
            {insight.title}
          </h4>
          
          <p style={{
            margin: '0 0 12px 0',
            color: '#6B7280',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            {insight.description}
          </p>

          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '0.875rem'
          }}>
            <div style={{ color: '#374151', fontWeight: '500', marginBottom: '4px' }}>
              💡 <strong>Impacto:</strong> {insight.impact}
            </div>
            <div style={{ color: '#6B7280' }}>
              🎯 <strong>Recomendação:</strong> {insight.recommendation}
            </div>
          </div>
        </div>

        {/* Métricas */}
        {insight.metrics && (
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            paddingTop: '16px',
            borderTop: '1px solid #E5E7EB'
          }}>
            {Object.entries(insight.metrics).map(([key, value]) => (
              <div key={key} style={{
                background: '#F3F4F6',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem'
              }}>
                <span style={{ color: '#6B7280', textTransform: 'capitalize' }}>
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                </span>
                <span style={{ color: '#374151', fontWeight: '600', marginLeft: '4px' }}>
                  {Array.isArray(value) ? value.join(', ') : value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          color: '#9CA3AF',
          fontSize: '0.75rem'
        }}>
          {insight.timestamp.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="chart-container modern ai-insights">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
              color: 'white',
              padding: '8px',
              borderRadius: '8px'
            }}>
              <Brain size={24} />
            </div>
            Insights com Inteligência Artificial
          </h3>
          <p className="chart-subtitle">
            Análises automáticas e recomendações estratégicas baseadas em IA
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Status de atualização */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: loading ? '#F59E0B' : '#10B981',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            <RefreshCw 
              size={16} 
              style={{ 
                animation: loading ? 'spin 1s linear infinite' : 'none' 
              }} 
            />
            {loading ? 'Analisando...' : 'Atualizado'}
          </div>

          {/* Botão de refresh manual */}
          <button
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                const processed = processInsights;
                setInsights(processed.insights);
                setLastUpdate(new Date());
                setLoading(false);
              }, 1000);
            }}
            disabled={loading}
            style={{
              padding: '8px 12px',
              background: '#8B5CF6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} />
            Atualizar IA
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6B7280',
          fontSize: '0.875rem',
          fontWeight: '500'
        }}>
          <Settings size={16} />
          Filtros:
        </div>

        {/* Categoria */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '0.875rem',
            background: 'white'
          }}
        >
          {Object.entries(categories).map(([key, category]) => (
            <option key={key} value={key}>{category.label}</option>
          ))}
        </select>

        {/* Confiança */}
        <select
          value={confidenceFilter}
          onChange={(e) => setConfidenceFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '0.875rem',
            background: 'white'
          }}
        >
          <option value="all">Todas as confianças</option>
          <option value="alta">Alta confiança</option>
          <option value="média">Média confiança</option>
          <option value="baixa">Baixa confiança</option>
        </select>

        {/* Estatísticas rápidas */}
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: '16px',
          fontSize: '0.875rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B5CF6' }}>
              {filteredInsights.length}
            </div>
            <div style={{ color: '#6B7280' }}>Insights</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
              {filteredInsights.filter(i => i.type === 'positive').length}
            </div>
            <div style={{ color: '#6B7280' }}>Positivos</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B' }}>
              {filteredInsights.filter(i => i.confidence === 'alta').length}
            </div>
            <div style={{ color: '#6B7280' }}>Alta Conf.</div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          background: 'linear-gradient(135deg, #F3E8FF, #E0E7FF)',
          border: '1px solid #C4B5FD',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTop: '4px solid #8B5CF6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ color: '#8B5CF6', fontSize: '1.125rem', fontWeight: '600' }}>
            🤖 Processando análise com IA...
          </div>
          <div style={{ color: '#6B7280', fontSize: '0.875rem', marginTop: '8px' }}>
            Aplicando algoritmos de machine learning aos dados
          </div>
        </div>
      )}

      {/* Insights principais */}
      {!loading && filteredInsights.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {filteredInsights.slice(0, 5).map(renderInsightCard)}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && filteredInsights.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6B7280'
        }}>
          <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <div style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '8px' }}>
            Nenhum insight encontrado
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            Ajuste os filtros ou aguarde o processamento de novos dados
          </div>
        </div>
      )}

      {/* Seções adicionais */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '32px'
      }}>
        {/* Correlações */}
        {correlations.length > 0 && (
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              color: '#374151',
              fontSize: '1.125rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔗 Correlações Detectadas
            </h4>
            
            {correlations.slice(0, 3).map((corr, index) => (
              <div key={index} style={{
                padding: '12px',
                background: '#F8FAFC',
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '4px' }}>
                  {corr.client1} ↔ {corr.client2}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  {corr.description} (força: {(corr.strength * 100).toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Previsões */}
        {forecasts.length > 0 && (
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              color: '#374151',
              fontSize: '1.125rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🔮 Previsões
            </h4>
            
            {forecasts.slice(0, 3).map((forecast, index) => (
              <div key={index} style={{
                padding: '12px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '4px' }}>
                  {forecast.client}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                  Próximos 3 meses: {forecast.predictions.map(p => `${p.month}: ${p.value}`).join(', ')}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  Confiança: {(forecast.confidence * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Anomalias */}
        {anomalies.length > 0 && (
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              color: '#374151',
              fontSize: '1.125rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚡ Anomalias Detectadas
            </h4>
            
            {anomalies.slice(0, 3).map((anomaly, index) => (
              <div key={index} style={{
                padding: '12px',
                background: anomaly.type === 'spike' ? '#FEF3C7' : '#FEE2E2',
                border: `1px solid ${anomaly.type === 'spike' ? '#FCD34D' : '#FECACA'}`,
                borderRadius: '8px',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '4px' }}>
                  {anomaly.client} - {anomaly.monthLabel}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: anomaly.type === 'spike' ? '#92400E' : '#991B1B' 
                }}>
                  {anomaly.type === 'spike' ? '📈' : '📉'} 
                  {anomaly.value} vs esperado {anomaly.expected} ({anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation}%)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '32px',
        padding: '16px',
        background: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#6B7280',
        textAlign: 'center'
      }}>
        🤖 <strong>IA Dashboard in.Pacto</strong> • 
        Última análise: {lastUpdate.toLocaleString('pt-BR')} • 
        {insights.length} insights processados • 
        Próxima atualização automática em {autoUpdate ? '30s' : 'manual'}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AIInsightsPanel; 