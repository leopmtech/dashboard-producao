import React from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

const TrendChart = ({ data, title, subtitle, showComparison = false }) => {
  // Tooltip customizado estilo in.Pacto similar ao MonthlyDetailChart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip monthly inpacto">
          <div className="tooltip-header">
            <span className="tooltip-logo">in•Pacto</span>
            <span className="tooltip-month">{label}</span>
          </div>
          <div className="tooltip-content">
            {payload.map((entry, index) => (
              <div key={index} className="tooltip-item" style={{ borderLeftColor: entry.color }}>
                <span className="tooltip-label">
                  {entry.dataKey === 'total' && '📊 Total do Mês'}
                  {entry.dataKey === 'media' && '👥 Média por Cliente'}
                  {entry.dataKey === 'total2024' && '📅 Total 2024'}
                  {entry.dataKey === 'media2024' && '👥 Média 2024'}
                </span>
                <span className="tooltip-value">{entry.value}</span>
              </div>
            ))}
          </div>
          <div className="tooltip-footer">
            <div className="tooltip-trend">
              <span className="trend-icon">
                {data.crescimento > 20 ? '🚀' : data.crescimento > 0 ? '📈' : data.crescimento < 0 ? '📉' : '➡️'}
              </span>
              <span>
                {data.crescimento > 20 ? 'Alto Crescimento' : 
                 data.crescimento > 0 ? 'Crescimento' : 
                 data.crescimento < 0 ? 'Declínio' : 'Estável'}
              </span>
            </div>
            {data.crescimento !== undefined && data.crescimento !== 0 && (
              <div className="tooltip-growth">
                <span style={{ color: data.crescimento > 0 ? '#10B981' : '#EF4444' }}>
                  {data.crescimento > 0 ? '+' : ''}{data.crescimento}% vs 2024
                </span>
              </div>
            )}
            {data.isNovaGestao && (
              <div className="tooltip-highlight">
                <span>🚀 Nova Gestão in.Pacto</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Componente customizado para rótulos dos dados
  const CustomDataLabel = (props) => {
    const { x, y, value, index } = props;
    if (value === 0) return null;
    
    return (
      <text 
        x={x} 
        y={y - 8} 
        fill="#FF6B47" 
        textAnchor="middle" 
        fontSize="11" 
        fontWeight="600"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="chart-container modern">
      <h3 className="chart-title">{title}</h3>
      <p className="chart-subtitle">{subtitle}</p>
      
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorGradient2025" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B47" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#FF6B47" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorGradient2024" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2C3E50" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#2C3E50" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          
          <XAxis 
            dataKey="mes" 
            stroke="#FF6B47" 
            fontSize={14}
            tick={{ fill: '#FF6B47' }}
          />
          
          <YAxis 
            stroke="#FF6B47" 
            fontSize={12}
            tick={{ fill: '#FF6B47' }}
            label={{ 
              value: 'Relatórios', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#FF6B47' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Área para dados atuais */}
          <Area
            type="monotone"
            dataKey="media"
            stroke="#FF6B47"
            fill="url(#colorGradient2025)"
            strokeWidth={3}
            name="Média Atual"
            dot={(props) => {
              const { payload, cx, cy } = props;
              return (
                <circle 
                  cx={cx}
                  cy={cy}
                  fill={payload.isNovaGestao ? '#10b981' : '#FF6B47'}
                  stroke={payload.isNovaGestao ? '#10b981' : '#FF6B47'}
                  strokeWidth={3} 
                  r={payload.isNovaGestao ? 7 : 5}
                  style={{ 
                    filter: payload.isNovaGestao ? 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.4))' : 'none'
                  }}
                />
              );
            }}
            activeDot={{ r: 8, fill: '#FF6B47', stroke: '#fff', strokeWidth: 2 }}
          >
            {/* Rótulos de dados para linha principal */}
            <LabelList content={<CustomDataLabel />} />
          </Area>

          {/* Linha para comparação com dados históricos */}
          {showComparison && (
            <Line
              type="monotone"
              dataKey="media2024"
              stroke="#2C3E50"
              strokeWidth={2}
              strokeDasharray="8 4"
              name="Média 2024"
              dot={{ fill: '#2C3E50', strokeWidth: 2, r: 4 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legenda explicativa */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-dot nova-gestao"></div>
          <span>Período Nova Gestão (Abril-Maio)</span>
        </div>
        {showComparison && (
          <div className="legend-item">
            <div className="legend-line comparison"></div>
            <span>Comparação com 2024</span>
          </div>
        )}
      </div>

      {/* Insights do gráfico de tendência */}
      <div className="chart-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Meses Analisados:</span>
            <span className="stat-value">{data.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Crescimento Médio:</span>
            <span className="stat-value positive">
              {data.length > 0 ? 
                `+${Math.round(data.reduce((sum, mes) => sum + (mes.crescimento || 0), 0) / data.length)}%` : 
                '0%'
              }
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Melhor Mês:</span>
            <span className="stat-value">
              {data.length > 0 ? 
                data.reduce((melhor, mes) => mes.total > melhor.total ? mes : melhor, data[0])?.mes || 'N/A' :
                'N/A'
              }
            </span>
          </div>
        </div>
        
        {/* Indicador de tendência geral */}
        {data.length > 0 && (
          <div className="top-performer">
            <div className="performer-card">
              <div className="performer-icon">
                {(() => {
                  const ultimoMes = data[data.length - 1];
                  const primeiroMes = data[0];
                  const tendenciaGeral = ultimoMes.total > primeiroMes.total;
                  return tendenciaGeral ? '📈' : '📉';
                })()}
              </div>
              <div className="performer-info">
                <div className="performer-title">Tendência Geral</div>
                <div className="performer-client">
                  {(() => {
                    const ultimoMes = data[data.length - 1];
                    const primeiroMes = data[0];
                    const tendenciaGeral = ultimoMes.total > primeiroMes.total;
                    return tendenciaGeral ? 'Crescimento' : 'Declínio';
                  })()}
                </div>
                <div className="performer-growth">
                  {(() => {
                    const ultimoMes = data[data.length - 1];
                    const primeiroMes = data[0];
                    if (primeiroMes.total > 0) {
                      const variacao = ((ultimoMes.total - primeiroMes.total) / primeiroMes.total) * 100;
                      return `${variacao > 0 ? '+' : ''}${Math.round(variacao)}%`;
                    }
                    return '0%';
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendChart;