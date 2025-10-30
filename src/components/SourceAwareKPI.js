// ==========================================
// src/components/SourceAwareKPI.js
// Componente KPI com awareness de fontes
// ==========================================

import React from 'react';
import { TrendingUp, Users, FileText, BarChart3 } from 'lucide-react';

const SourceAwareKPI = ({ 
  title, 
  value, 
  icon: Icon, 
  gradient, 
  subtitle, 
  trend, 
  sourceBreakdown,
  sourceDefinitions 
}) => {
  const getSourceColor = (source) => {
    switch (source) {
      case 'sheets': return '#0284C7'; // Azul para dados históricos
      case 'notion': return '#10B981'; // Verde para dados atuais
      case 'unknown': return '#6B7280'; // Cinza para desconhecidos
      default: return '#6B7280';
    }
  };

  const getSourceIcon = (source) => {
    switch (source) {
      case 'sheets': return '📊';
      case 'notion': return '📝';
      case 'unknown': return '❓';
      default: return '📊';
    }
  };

  return (
    <div className="kpi-card" style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #E2E8F0',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: gradient
      }} />
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Icon size={24} />
          </div>
          <div>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#6B7280',
              margin: 0
            }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{
                fontSize: '0.75rem',
                color: '#9CA3AF',
                margin: 0
              }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: trend > 0 ? '#10B981' : '#EF4444',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            <TrendingUp size={16} />
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>

      {/* Valor principal */}
      <div style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: '16px'
      }}>
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </div>

      {/* Breakdown por fonte */}
      {sourceBreakdown && (
        <div style={{
          borderTop: '1px solid #F3F4F6',
          paddingTop: '16px'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6B7280',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            📊 Breakdown por Fonte
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {Object.entries(sourceBreakdown).map(([source, count]) => {
              if (count === 0) return null;
              
              return (
                <div key={source} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: `1px solid ${getSourceColor(source)}20`
                }}>
                  <span style={{ fontSize: '0.875rem' }}>
                    {getSourceIcon(source)}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: getSourceColor(source)
                  }}>
                    {count}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#6B7280'
                  }}>
                    {sourceDefinitions?.[source]?.name?.split(' ')[0] || source}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Informações adicionais sobre fontes */}
          {sourceDefinitions && (
            <div style={{
              marginTop: '8px',
              fontSize: '0.7rem',
              color: '#9CA3AF',
              lineHeight: '1.4'
            }}>
              {Object.entries(sourceDefinitions).map(([key, def]) => (
                <div key={key} style={{ marginBottom: '2px' }}>
                  <strong>{getSourceIcon(key)} {def.name}:</strong> {def.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SourceAwareKPI;
