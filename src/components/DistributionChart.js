import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DistributionChart = ({ data, title, subtitle, chartType = 'pie', year = '2025' }) => {
  
  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`Tipo: ${label || data.tipo}`}</p>
          <p className="tooltip-value" style={{ color: payload[0].color }}>
            Relatórios: {payload[0].value}
          </p>
          <p className="tooltip-value">
            Participação: {data.percentual}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Renderizar gráfico de pizza
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ tipo, percentual }) => `${tipo}: ${percentual}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="valor"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );

  // Renderizar gráfico de barras
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
        <XAxis 
          dataKey="tipo" 
          stroke="#FF6B47" 
          fontSize={11}
          angle={-45}
          textAnchor="end"
          height={80}
          tick={{ fill: '#FF6B47' }}
        />
        <YAxis 
          stroke="#FF6B47" 
          fontSize={12}
          tick={{ fill: '#FF6B47' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="valor" 
          radius={[4, 4, 0, 0]}
          animationDuration={1000}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  // Calcular estatísticas
  const totalRelatorios = data.reduce((sum, item) => sum + item.valor, 0);
  const tiposAtivos = data.filter(item => item.valor > 0).length;
  const tipoMaior = data.reduce((max, item) => item.valor > max.valor ? item : max, { tipo: 'N/A', valor: 0 });

  return (
    <div className="chart-container modern">
      <h3 className="chart-title">{title}</h3>
      {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      
      {chartType === 'pie' ? renderPieChart() : renderBarChart()}

      {/* Estatísticas da distribuição */}
      <div className="chart-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total de Relatórios:</span>
            <span className="stat-value">{totalRelatorios.toLocaleString('pt-BR')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tipos Ativos:</span>
            <span className="stat-value">{tiposAtivos}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Tipo Dominante:</span>
            <span className="stat-value">{tipoMaior.tipo}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Participação Máxima:</span>
            <span className="stat-value">{tipoMaior.valor > 0 ? Math.round((tipoMaior.valor / totalRelatorios) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Lista detalhada dos tipos */}
      <div className="distribution-details">
        <h4 style={{ 
          color: '#FF6B47', 
          fontSize: '1rem', 
          fontWeight: '600', 
          marginBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '8px'
        }}>
          📊 Detalhamento por Tipo de Conteúdo
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px' 
        }}>
          {data.map((item, index) => (
            <div key={index} style={{
              padding: '12px',
              background: `${item.color}10`,
              border: `1px solid ${item.color}30`,
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: item.color
                }}></div>
                <span style={{
                  fontWeight: '600',
                  color: '#2C3E50',
                  fontSize: '0.85rem'
                }}>
                  {item.tipo}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  color: '#6B7280',
                  fontSize: '0.8rem'
                }}>
                  {item.valor.toLocaleString('pt-BR')} relatórios
                </span>
                <span style={{
                  color: item.color,
                  fontWeight: '700',
                  fontSize: '0.9rem'
                }}>
                  {item.percentual}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights sobre a distribuição */}
      <div className="distribution-insights">
        <h4 style={{ 
          color: '#FF6B47', 
          fontSize: '1rem', 
          fontWeight: '600', 
          marginBottom: '12px',
          marginTop: '20px'
        }}>
          💡 Insights da Distribuição
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Insight sobre concentração */}
          {tipoMaior.valor > totalRelatorios * 0.5 && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(255, 107, 71, 0.05)',
              border: '1px solid rgba(255, 107, 71, 0.2)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#2C3E50'
            }}>
              📈 <strong>Alta concentração:</strong> {tipoMaior.tipo} representa mais de 50% da produção
            </div>
          )}
          
          {/* Insight sobre diversificação */}
          {tiposAtivos >= 5 && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              fontSize: '0.85rem',
              color: '#2C3E50'
            }}>
              🎯 <strong>Boa diversificação:</strong> {tiposAtivos} tipos diferentes de conteúdo ativos
            </div>
          )}
          
          {/* Insight sobre produtividade */}
          <div style={{
            padding: '8px 12px',
            background: 'rgba(59, 130, 246, 0.05)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '6px',
            fontSize: '0.85rem',
            color: '#2C3E50'
          }}>
            📊 <strong>Produtividade {year}:</strong> {Math.round(totalRelatorios / (year === '2024' ? 12 : 5))} relatórios/mês em média
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionChart;