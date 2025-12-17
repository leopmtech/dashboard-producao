// ==========================================
// src/components/DrillDownModal.js
// Modal para análise detalhada com drill-down
// ==========================================

import React, { useState, useEffect } from 'react';
import { 
  X, BarChart3, PieChart as PieChartIcon, FileText
} from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DataProcessingService } from '../services/dataProcessingService';

const DrillDownModal = ({ isOpen, onClose, client, month, data }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [drillData, setDrillData] = useState(null);
  const [loading, setLoading] = useState(false);

  const processDrillDownData = (payload, clientName, monthLabel) => {
    const monthIndexMap = {
      Jan: 0, Fev: 1, Mar: 2, Abr: 3, Mai: 4, Jun: 5,
      Jul: 6, Ago: 7, Set: 8, Out: 9, Nov: 10, Dez: 11,
    };

    const orders = Array.isArray(payload?.originalOrders) ? payload.originalOrders : [];
    const targetMonthIndex = monthLabel ? monthIndexMap[String(monthLabel).trim()] : null;

    const filteredOrders = orders.filter((o) => {
      const clients = DataProcessingService.extractCanonicalClientsFromOrder(o);
      if (!clients || clients.length === 0) return false;
      const matchesClient = clients.includes(clientName);
      if (!matchesClient) return false;

      if (targetMonthIndex == null) return true;
      const dt = DataProcessingService.parseDeliveryDate(o);
      if (!dt) return false;
      return dt.getMonth() === targetMonthIndex;
    });

    const total = filteredOrders.length;
    const typesMap = new Map(); // tipo -> count
    filteredOrders.forEach((o) => {
      const tipo = (o?.tipoDemanda || o?.TipoDemanda || o?.tipo_demanda || 'Sem tipo').toString().trim() || 'Sem tipo';
      typesMap.set(tipo, (typesMap.get(tipo) || 0) + 1);
    });

    const types = Array.from(typesMap.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const palette = ['#FF6B47', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#84CC16'];
    const breakdown = Array.from(typesMap.entries())
      .map(([type, value], idx) => {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        return {
          type,
          value,
          percentage,
          color: palette[idx % palette.length],
          icon: '📄',
        };
      })
      .sort((a, b) => b.value - a.value);

    const concluidos = filteredOrders.filter((o) => o?.isConcluido || o?.concluido === true || o?.concluida === 'YES').length;
    const efficiency = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    const satisfaction = efficiency >= 85 ? 4.7 : efficiency >= 70 ? 4.3 : efficiency >= 50 ? 3.9 : 3.5;

    return {
      overview: {
        total,
        types,
        satisfaction,
        efficiency,
      },
      breakdown,
      // Seção de IA removida
      insights: [],
      recommendations: [],
    };
  };

  useEffect(() => {
    if (isOpen && client && data) {
      setLoading(true);
      // Simular carregamento assíncrono
      setTimeout(() => {
        const processedData = processDrillDownData(data, client, month);
        setDrillData(processedData);
        setLoading(false);
      }, 300);
    }
  }, [isOpen, client, month, data]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'breakdown', label: 'Breakdown', icon: PieChartIcon },
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
              <RechartsPieChart>
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
              </RechartsPieChart>
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
          Dados processados em tempo real • 
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