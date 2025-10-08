// ==========================================
// src/components/DrillDownModal.js
// Modal para análise detalhada com drill-down
// ==========================================

import React, { useState, useEffect } from 'react';
import { 
  X, TrendingUp, BarChart3, Brain, 
  AlertCircle, CheckCircle, Lightbulb, Target,
  Calendar, Users, FileText, Zap, Star, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnalyticsService } from '../services/analyticsService';

const DrillDownModal = ({ isOpen, onClose, client, month, data }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [drillData, setDrillData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && client && data) {
      setLoading(true);
      // Simular carregamento assíncrono
      setTimeout(() => {
        const processedData = AnalyticsService.processDrillDownData(data, client, month);
        setDrillData(processedData);
        setLoading(false);
      }, 300);
    }
  }, [isOpen, client, month, data]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'breakdown', label: 'Breakdown', icon: PieChart },
    { id: 'insights', label: 'Insights IA', icon: Brain },
    { id: 'recommendations', label: 'Recomendações', icon: Lightbulb }
  ];

  const renderOverview = () => {
    if (!drillData) return null;

    return (
      <div className="drill-overview">
        {/* KPIs Principais */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #FF6B47, #FF8A6B)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>
              {drillData.overview.total}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: '0.9' }}>
              Total de Relatórios
            </div>
            {month && (
              <div style={{ fontSize: '0.75rem', opacity: '0.8', marginTop: '4px' }}>
                em {month}
              </div>
            )}
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #10B981, #34D399)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>
              {drillData.overview.types.length}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: '0.9' }}>
              Tipos de Conteúdo
            </div>
            <div style={{ fontSize: '0.75rem', opacity: '0.8', marginTop: '4px' }}>
              Diversificação
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>
              {drillData.overview.satisfaction}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: '0.9' }}>
              Satisfação Estimada
            </div>
            <div style={{ fontSize: '0.75rem', opacity: '0.8', marginTop: '4px' }}>
              de 5.0
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>
              {drillData.overview.efficiency}%
            </div>
            <div style={{ fontSize: '0.875rem', opacity: '0.9' }}>
              Eficiência
            </div>
            <div style={{ fontSize: '0.75rem', opacity: '0.8', marginTop: '4px' }}>
              Estimada
            </div>
          </div>
        </div>

        {/* Resumo Textual */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h4 style={{ 
            color: '#374151', 
            margin: '0 0 12px 0',
            fontSize: '1.125rem',
            fontWeight: '600'
          }}>
            📋 Resumo Executivo
          </h4>
          
          <div style={{ color: '#6B7280', lineHeight: '1.6' }}>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>{client}</strong> {month ? `em ${month}` : 'no período analisado'} 
              {' '}produziu <strong>{drillData.overview.total} relatórios</strong> 
              {' '}distribuídos em <strong>{drillData.overview.types.length} tipos</strong> de conteúdo.
            </p>
            
            {drillData.overview.types.length > 3 && (
              <p style={{ margin: '0 0 12px 0', color: '#059669' }}>
                ✅ <strong>Portfolio diversificado:</strong> Cliente utiliza múltiplos tipos de serviços,
                indicando relacionamento maduro e abrangente.
              </p>
            )}
            
            <p style={{ margin: '0' }}>
              Com satisfação estimada de <strong>{drillData.overview.satisfaction}/5.0</strong> e 
              eficiência de <strong>{drillData.overview.efficiency}%</strong>, o cliente apresenta 
              performance {drillData.overview.efficiency > 80 ? 'excelente' : drillData.overview.efficiency > 60 ? 'boa' : 'regular'}.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderBreakdown = () => {
    if (!drillData || !drillData.breakdown.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <div>Nenhum dado de breakdown disponível para este período</div>
        </div>
      );
    }

    return (
      <div className="drill-breakdown">
        {/* Gráfico de Pizza */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ 
            color: '#374151', 
            margin: '0 0 16px 0',
            fontSize: '1.125rem',
            fontWeight: '600'
          }}>
            📊 Distribuição por Tipo de Conteúdo
          </h4>
          
          <div style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={drillData.breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {drillData.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lista Detalhada */}
        <div>
          <h4 style={{ 
            color: '#374151', 
            margin: '0 0 16px 0',
            fontSize: '1.125rem',
            fontWeight: '600'
          }}>
            📋 Detalhamento Quantitativo
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drillData.breakdown.map((item, index) => (
              <div
                key={index}
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    background: `${item.color}20`,
                    padding: '8px',
                    borderRadius: '8px'
                  }}>
                    {item.icon}
                  </div>
                  
                  <div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#374151',
                      fontSize: '1rem'
                    }}>
                      {item.type}
                    </div>
                    <div style={{ 
                      color: '#6B7280', 
                      fontSize: '0.875rem'
                    }}>
                      {item.value} relatórios
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    background: item.color,
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {item.percentage}%
                  </div>
                  
                  <div style={{
                    marginTop: '4px',
                    width: '100px',
                    height: '4px',
                    background: '#E2E8F0',
                    borderRadius: '2px',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      background: item.color,
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderInsights = () => {
    if (!drillData || !drillData.insights.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <div>Analisando dados para gerar insights...</div>
          <div style={{ fontSize: '0.875rem', marginTop: '8px' }}>
            A IA precisa de mais dados para análise aprofundada
          </div>
        </div>
      );
    }

    const getInsightIcon = (type) => {
      switch (type) {
        case 'positive': return { icon: CheckCircle, color: '#10B981' };
        case 'attention': return { icon: AlertCircle, color: '#F59E0B' };
        case 'opportunity': return { icon: Target, color: '#3B82F6' };
        case 'pattern': return { icon: TrendingUp, color: '#8B5CF6' };
        default: return { icon: Lightbulb, color: '#6B7280' };
      }
    };

    return (
      <div className="drill-insights">
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <Brain size={32} style={{ marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700' }}>
            🤖 Análise Inteligente Automatizada
          </h4>
          <p style={{ margin: '0', fontSize: '0.875rem', opacity: '0.9' }}>
            Insights gerados por IA baseados em padrões e tendências dos dados
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {drillData.insights.map((insight, index) => {
            const { icon: IconComponent, color } = getInsightIcon(insight.type);
            
            return (
              <div
                key={index}
                style={{
                  background: 'white',
                  border: `2px solid ${color}20`,
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Barra colorida lateral */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  background: color
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{
                    background: `${color}20`,
                    color: color,
                    padding: '12px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComponent size={24} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h5 style={{
                        margin: 0,
                        color: '#374151',
                        fontSize: '1.125rem',
                        fontWeight: '600'
                      }}>
                        {insight.icon} {insight.title}
                      </h5>
                      
                      <div style={{
                        background: `${color}20`,
                        color: color,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {insight.confidence} confiança
                      </div>
                    </div>

                    <p style={{
                      margin: '0 0 12px 0',
                      color: '#6B7280',
                      lineHeight: '1.6',
                      fontSize: '0.95rem'
                    }}>
                      {insight.description}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem'
                    }}>
                      <span style={{ color: '#9CA3AF' }}>Impacto:</span>
                      <span style={{
                        color: insight.impact === 'positivo' ? '#10B981' : 
                              insight.impact === 'negativo' ? '#EF4444' : '#6B7280',
                        fontWeight: '600'
                      }}>
                        {insight.impact === 'positivo' ? '📈 Positivo' : 
                         insight.impact === 'negativo' ? '📉 Negativo' : '➡️ Neutro'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo dos Insights */}
        <div style={{
          marginTop: '24px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h5 style={{ 
            color: '#374151', 
            margin: '0 0 12px 0',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            🎯 Resumo da Análise IA
          </h5>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '12px',
            fontSize: '0.875rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
                {drillData.insights.filter(i => i.impact === 'positivo').length}
              </div>
              <div style={{ color: '#6B7280' }}>Pontos Positivos</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B' }}>
                {drillData.insights.filter(i => i.impact === 'negativo').length}
              </div>
              <div style={{ color: '#6B7280' }}>Atenções</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3B82F6' }}>
                {drillData.insights.filter(i => i.confidence === 'alta').length}
              </div>
              <div style={{ color: '#6B7280' }}>Alta Confiança</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!drillData || !drillData.recommendations.length) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
          <Lightbulb size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <div>Nenhuma recomendação específica no momento</div>
          <div style={{ fontSize: '0.875rem', marginTop: '8px' }}>
            Continue monitorando para receber sugestões personalizadas
          </div>
        </div>
      );
    }

    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'alta': return '#EF4444';
        case 'média': return '#F59E0B';
        case 'baixa': return '#10B981';
        default: return '#6B7280';
      }
    };

    const getCategoryIcon = (category) => {
      switch (category) {
        case 'retenção': return '🚨';
        case 'expansão': return '🚀';
        case 'diversificação': return '🎯';
        case 'otimização': return '⚡';
        default: return '💡';
      }
    };

    return (
      <div className="drill-recommendations">
        <div style={{
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <Lightbulb size={32} style={{ marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '700' }}>
            💡 Recomendações Estratégicas
          </h4>
          <p style={{ margin: '0', fontSize: '0.875rem', opacity: '0.9' }}>
            Ações sugeridas baseadas na análise de dados e padrões identificados
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {drillData.recommendations.map((rec, index) => (
            <div
              key={index}
              style={{
                background: 'white',
                border: `2px solid ${getPriorityColor(rec.priority)}20`,
                borderRadius: '12px',
                padding: '20px',
                position: 'relative'
              }}
            >
              {/* Indicador de Prioridade */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: getPriorityColor(rec.priority),
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {rec.priority} prioridade
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  fontSize: '2rem',
                  background: `${getPriorityColor(rec.priority)}20`,
                  padding: '12px',
                  borderRadius: '12px',
                  lineHeight: 1
                }}>
                  {getCategoryIcon(rec.category)}
                </div>

                <div style={{ flex: 1, paddingRight: '60px' }}>
                  <h5 style={{
                    margin: '0 0 8px 0',
                    color: '#374151',
                    fontSize: '1.125rem',
                    fontWeight: '600'
                  }}>
                    {rec.icon} {rec.title}
                  </h5>

                  <p style={{
                    margin: '0 0 16px 0',
                    color: '#6B7280',
                    lineHeight: '1.6'
                  }}>
                    {rec.description}
                  </p>

                  {/* Lista de Ações */}
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      📋 Ações Sugeridas:
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {rec.actions.map((action, actionIndex) => (
                        <div
                          key={actionIndex}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.875rem',
                            color: '#6B7280'
                          }}
                        >
                          <ArrowRight size={14} style={{ color: getPriorityColor(rec.priority) }} />
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo das Recomendações */}
        <div style={{
          marginTop: '24px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h5 style={{ 
            color: '#374151', 
            margin: '0 0 12px 0',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            📊 Distribuição de Prioridades
          </h5>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: '12px',
            fontSize: '0.875rem'
          }}>
            {['alta', 'média', 'baixa'].map(priority => (
              <div key={priority} style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700', 
                  color: getPriorityColor(priority) 
                }}>
                  {drillData.recommendations.filter(r => r.priority === priority).length}
                </div>
                <div style={{ color: '#6B7280', textTransform: 'capitalize' }}>
                  {priority} Prioridade
                </div>
              </div>
            ))}
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#6B7280' }}>
                {drillData.recommendations.reduce((sum, r) => sum + r.actions.length, 0)}
              </div>
              <div style={{ color: '#6B7280' }}>Total de Ações</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #FF6B47, #FF8A6B)',
          color: 'white',
          borderRadius: '16px 16px 0 0'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '1.5rem',
              fontWeight: '700'
            }}>
              🔍 Análise Detalhada: {client}
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.9 }}>
              {month ? `Drill-down específico para ${month}` : 'Visão geral completa do cliente'}
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          padding: '0 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          gap: '0'
        }}>
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: activeTab === tab.id ? '#FF6B47' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#6B7280',
                  border: 'none',
                  padding: '16px 20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '8px 8px 0 0',
                  transition: 'all 0.2s ease',
                  marginTop: '8px'
                }}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              color: '#6B7280'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #E5E7EB',
                borderTop: '4px solid #FF6B47',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <div style={{ fontSize: '1rem', fontWeight: '500' }}>
                Processando análise detalhada...
              </div>
              <div style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                Aplicando algoritmos de IA aos dados
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'breakdown' && renderBreakdown()}
              {activeTab === 'insights' && renderInsights()}
              {activeTab === 'recommendations' && renderRecommendations()}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          borderRadius: '0 0 16px 16px',
          fontSize: '0.875rem',
          color: '#6B7280',
          textAlign: 'center'
        }}>
          🤖 Análise gerada por IA • Dados processados em tempo real • 
          {new Date().toLocaleString('pt-BR')}
        </div>
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

export default DrillDownModal;