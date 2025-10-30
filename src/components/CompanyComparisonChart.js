import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CompanyComparisonChart = ({ data, title, subtitle, dataKey = "media2025", filters = { periodo: '2025' } }) => {
  
  // Cores do tema do dashboard
  const colors = {
    primary: '#FF6B47',
    secondary: '#10B981',
    tertiary: '#3B82F6',
    quaternary: '#F59E0B',
    background: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    gridLines: '#F3F4F6',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    warningText: '#B45309',
    info: '#3B82F6',
    infoBg: '#EBF8FF',
    infoText: '#1E40AF',
    muted: '#9CA3AF',
    mutedBg: '#F9FAFB'
  };

  // Função para processar dados baseado no filtro selecionado
  const getProcessedData = (originalData, filters) => {
    if (filters.periodo === '2024') {
      // Para 2024, STA não deve aparecer ou deve aparecer zerada
      return originalData.map(item => {
        if (item.cliente === 'STA') {
          return {
            ...item,
            [dataKey]: 0,
            total: 0,
            noData2024: true
          };
        }
        // Para In.Pacto em 2024, usar dados históricos (simulados ou reais)
        if (item.cliente === 'In.Pacto') {
          return {
            ...item,
            [dataKey]: 5.4, // Média de 2024 (exemplo)
            total: 65, // Total de 2024 (exemplo)
            year: '2024'
          };
        }
        return item;
      });
    }
    
    if (filters.periodo === 'ambos') {
      // Para comparativo, mostrar In.Pacto de ambos os anos
      const inPactoData = [
        {
          cliente: 'In.Pacto 2024',
          [dataKey]: 5.4,
          total: 65,
          year: '2024'
        },
        {
          cliente: 'In.Pacto 2025', 
          [dataKey]: 6.3,
          total: 38,
          year: '2025'
        },
        {
          cliente: 'STA 2025',
          [dataKey]: 2.5,
          total: 15,
          year: '2025'
        }
      ];
      return inPactoData;
    }
    
    // Para 2025, manter dados originais
    return originalData;
  };

  // Dados processados baseados no filtro
  const processedData = getProcessedData(data, filters);

  // Função para verificar se há avisos necessários
  const getDataWarnings = (filters) => {
    const warnings = [];
    
    if (filters.periodo === '2024') {
      warnings.push({
        type: 'no_data_2024',
        company: 'STA',
        message: 'STA não possui dados para 2024'
      });
    }
    
    return warnings;
  };

  const warnings = getDataWarnings(filters);

  // Banner de aviso inteligente
  const DataWarningBanner = ({ warnings, selectedPeriod }) => {
    if (warnings.length === 0) return null;
    
    return (
      <div style={{
        backgroundColor: colors.infoBg,
        border: `1px solid ${colors.info}`,
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{ fontSize: '18px' }}>ℹ️</div>
        <div>
          <p style={{ 
            margin: '0', 
            fontSize: '14px',
            color: colors.infoText,
            fontWeight: '500'
          }}>
            {selectedPeriod === '2024' && 
              'Exibindo apenas empresas com dados disponíveis para 2024.'
            }
          </p>
        </div>
      </div>
    );
  };

  // Função para subtítulo dinâmico inteligente
  const getDynamicSubtitle = (originalSubtitle, filters) => {
    if (filters.periodo === '2024') {
      return "Dados históricos de 2024 • Apenas empresas ativas no período";
    }
    if (filters.periodo === 'ambos') {
      return "Evolução In.Pacto 2024→2025 vs STA 2025 • Análise comparativa temporal";
    }
    return originalSubtitle;
  };

  // Tooltip inteligente
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isNoData = data.noData2024;
      const value = payload[0].value;
      
      if (isNoData || value === 0) {
        return (
          <div style={{
            backgroundColor: colors.mutedBg,
            border: `2px solid ${colors.muted}`,
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            minWidth: '200px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: colors.text,
              marginBottom: '12px'
            }}>
              {label}
            </div>
            <div style={{
              padding: '8px 12px',
              backgroundColor: colors.infoBg,
              borderRadius: '8px',
              border: `1px solid ${colors.info}`,
              textAlign: 'center'
            }}>
              <p style={{
                margin: '0',
                fontSize: '13px',
                color: colors.infoText,
                fontWeight: '500'
              }}>
                📅 Sem dados para este período
              </p>
            </div>
          </div>
        );
      }
      
      return (
        <div style={{
          backgroundColor: colors.background,
          border: `2px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          backdropFilter: 'blur(16px)',
          minWidth: '200px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: colors.text,
            marginBottom: '12px',
            borderBottom: `2px solid ${colors.gridLines}`,
            paddingBottom: '8px'
          }}>
            {label}
            {data.year && (
              <span style={{
                fontSize: '12px',
                backgroundColor: data.year === '2024' ? colors.infoBg : colors.warningBg,
                color: data.year === '2024' ? colors.infoText : colors.warningText,
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '8px',
                fontWeight: '500'
              }}>
                {data.year}
              </span>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '14px',
                color: colors.textSecondary,
                fontWeight: '500'
              }}>
                Média Mensal:
              </span>
              <span style={{
                fontSize: '16px',
                fontWeight: '700',
                color: payload[0].color,
                backgroundColor: `${payload[0].color}20`,
                padding: '4px 8px',
                borderRadius: '8px'
              }}>
                {value} rel/mês
              </span>
            </div>
            
            {data.total && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: colors.textSecondary,
                  fontWeight: '500'
                }}>
                  Total do Período:
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.text
                }}>
                  {data.total} relatórios
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Função para obter cor baseada no item
  const getBarColor = (item, index) => {
    if (item.noData2024 || item[dataKey] === 0) {
      return colors.muted;
    }
    
    if (filters.periodo === 'ambos') {
      if (item.cliente.includes('In.Pacto 2024')) return colors.tertiary;
      if (item.cliente.includes('In.Pacto 2025')) return colors.primary;
      if (item.cliente.includes('STA')) return colors.secondary;
    }
    
    const colorArray = [colors.primary, colors.secondary, colors.tertiary, colors.quaternary];
    return colorArray[index % colorArray.length];
  };

  return (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: `1px solid ${colors.border}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Header do gráfico */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.text,
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '16px',
          color: colors.textSecondary,
          margin: '0',
          lineHeight: '1.5'
        }}>
          {getDynamicSubtitle(subtitle, filters)}
        </p>
      </div>

      {/* Banner de aviso */}
      <DataWarningBanner warnings={warnings} selectedPeriod={filters.periodo} />

      {/* Área do gráfico */}
      <div style={{ 
        position: 'relative',
        height: '400px',
        marginBottom: '32px'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={processedData}
            margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
            barCategoryGap="30%"
          >
            <defs>
              {processedData.map((item, index) => (
                <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={getBarColor(item, index)} stopOpacity={0.9}/>
                  <stop offset="100%" stopColor={getBarColor(item, index)} stopOpacity={0.7}/>
                </linearGradient>
              ))}
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={colors.gridLines} 
              opacity={0.8}
              vertical={false}
            />
            
            <XAxis 
              dataKey="cliente"
              stroke={colors.primary}
              fontSize={14}
              fontWeight="600"
              tick={{ 
                fill: colors.text,
                fontSize: 14,
                fontWeight: '600'
              }}
              axisLine={{ 
                stroke: colors.primary, 
                strokeWidth: 2 
              }}
              tickLine={{ 
                stroke: colors.primary, 
                strokeWidth: 2 
              }}
              height={60}
              interval={0}
            />
            
            <YAxis 
              stroke={colors.primary}
              fontSize={14}
              tick={{ 
                fill: colors.textSecondary,
                fontSize: 14
              }}
              axisLine={{ 
                stroke: colors.primary, 
                strokeWidth: 2 
              }}
              tickLine={{ 
                stroke: colors.primary, 
                strokeWidth: 2 
              }}
              label={{ 
                value: 'Relatórios/Mês', 
                angle: -90, 
                position: 'insideLeft',
                style: { 
                  textAnchor: 'middle', 
                  fill: colors.primary,
                  fontSize: '14px',
                  fontWeight: '600'
                }
              }}
            />
            
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ 
                fill: colors.gridLines, 
                opacity: 0.3,
                radius: 8
              }}
            />
            
            <Bar 
              dataKey={dataKey}
              radius={[12, 12, 0, 0]}
              animationDuration={1500}
              animationDelay={500}
              maxBarSize={120}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#barGradient${index})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards de estatísticas modernos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginTop: '24px'
      }}>
        {processedData.map((item, index) => {
          const isNoData = item.noData2024 || item[dataKey] === 0;
          const barColor = getBarColor(item, index);
          
          return (
            <div 
              key={`${item.cliente}-${index}`}
              style={{
                background: isNoData ? 
                  `linear-gradient(135deg, ${colors.mutedBg}, ${colors.mutedBg})` :
                  `linear-gradient(135deg, ${barColor}15, ${barColor}05)`,
                border: `2px solid ${isNoData ? colors.muted : barColor}30`,
                borderRadius: '16px',
                padding: '24px',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                opacity: isNoData ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isNoData) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 20px 25px -5px ${barColor}40, 0 10px 10px -5px ${barColor}20`;
                  e.currentTarget.style.borderColor = barColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!isNoData) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = `${barColor}30`;
                }
              }}
            >
              {/* Decoração de fundo */}
              {!isNoData && (
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-50%',
                  width: '100px',
                  height: '100px',
                  background: `radial-gradient(circle, ${barColor}20, transparent)`,
                  borderRadius: '50%'
                }} />
              )}
              
              {/* Header do card */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
                position: 'relative'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: isNoData ? 
                    `linear-gradient(135deg, ${colors.muted}, ${colors.muted}CC)` :
                    `linear-gradient(135deg, ${barColor}, ${barColor}CC)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '700',
                  boxShadow: isNoData ? 
                    `0 8px 16px ${colors.muted}40` :
                    `0 8px 16px ${barColor}40`
                }}>
                  {isNoData ? '—' : `#${index + 1}`}
                </div>
                <div>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: isNoData ? colors.muted : colors.text,
                    margin: '0',
                    lineHeight: '1.2'
                  }}>
                    {item.cliente}
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    color: colors.textSecondary,
                    margin: '4px 0 0 0',
                    fontWeight: '500'
                  }}>
                    {isNoData ? 'Sem dados para o período' : 
                     index === 0 ? 'Líder em produção' : 'Performance consistente'}
                  </p>
                </div>
              </div>

              {/* Métricas */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: `${colors.background}80`,
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <span style={{
                    fontSize: '14px',
                    color: colors.textSecondary,
                    fontWeight: '600'
                  }}>
                    Média Mensal:
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: isNoData ? colors.muted : barColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isNoData ? '—' : item[dataKey]} 
                    {!isNoData && <span style={{ fontSize: '14px', fontWeight: '500' }}>rel/mês</span>}
                  </span>
                </div>
                
                {item.total !== undefined && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    backgroundColor: `${colors.background}80`,
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: colors.textSecondary,
                      fontWeight: '600'
                    }}>
                      Total do Período:
                    </span>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: isNoData ? colors.muted : colors.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isNoData ? '—' : item.total} 
                      {!isNoData && <span style={{ fontSize: '12px', fontWeight: '500' }}>relatórios</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompanyComparisonChart;