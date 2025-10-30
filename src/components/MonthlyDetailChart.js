// ==========================================
// GRÁFICO MENSAL COM IDENTIDADE in.Pacto
// Crie: src/components/MonthlyDetailChart.js
// ==========================================

import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MonthlyDetailChart = ({ data, title, subtitle }) => {
  
  // Tooltip customizado com cores in.Pacto
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
                  {entry.dataKey === 'total' && '📊 Total'}
                  {entry.dataKey === 'media' && '👥 Média/Cliente'}
                  {entry.dataKey === 'mediaDiaria' && '📅 Média Diária'}
                  {entry.dataKey === 'produtividade' && '⚡ Produtividade'}
                </span>
                <span className="tooltip-value">{entry.value}</span>
              </div>
            ))}
          </div>
          <div className="tooltip-footer">
            <div className="tooltip-trend">
              <span className="trend-icon">
                {data.tendencia === 'crescente' ? '📈' : data.tendencia === 'decrescente' ? '📉' : '➡️'}
              </span>
              <span>{data.tendencia}</span>
            </div>
            <div className="tooltip-days">
              <span>📅 {data.diasUteis} dias úteis</span>
            </div>
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

  return (
    <div className="chart-container modern monthly inpacto">
      <div className="chart-header-inpacto">
        <div className="chart-brand">
          <span className="brand-in">in</span>
          <span className="brand-dot">•</span>
          <span className="brand-pacto">Pacto</span>
          <span className="brand-360">360°</span>
        </div>
        <div className="chart-title-group">
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={450}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="inpactoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B47" stopOpacity={0.3}/>
              <stop offset="50%" stopColor="#FF8A6B" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#FFB399" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="darkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2C3E50" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#34495E" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#FF6B47" opacity={0.2} />
          
          <XAxis 
            dataKey="mes" 
            stroke="#FF6B47" 
            fontSize={15}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: '#FF6B47', fontWeight: 600 }}
          />
          
          <YAxis 
            yAxisId="left"
            stroke="#FF6B47" 
            fontSize={12}
            tick={{ fill: '#FF6B47', fontWeight: 600 }}
            label={{ 
              value: 'Total Relatórios', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#FF6B47', fontWeight: 600 }
            }}
          />

          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#2C3E50" 
            fontSize={12}
            tick={{ fill: '#2C3E50', fontWeight: 600 }}
            label={{ 
              value: 'Médias', 
              angle: 90, 
              position: 'insideRight',
              style: { textAnchor: 'middle', fill: '#2C3E50', fontWeight: 600 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Barras para total mensal */}
          <Bar 
            yAxisId="left"
            dataKey="total" 
            fill="url(#inpactoGradient)"
            radius={[6, 6, 0, 0]}
            name="📊 Total Mensal"
            animationDuration={1200}
          />

          {/* Linha para média por cliente */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="media"
            stroke="#FF6B47"
            strokeWidth={4}
            name="👥 Média/Cliente"
            dot={(props) => {
              const { payload, cx, cy } = props;
              return (
                <circle 
                  cx={cx}
                  cy={cy}
                  fill={payload.isNovaGestao ? '#2C3E50' : '#FF6B47'}
                  stroke={payload.isNovaGestao ? '#2C3E50' : '#FF6B47'}
                  strokeWidth={3} 
                  r={payload.isNovaGestao ? 8 : 6}
                  style={{ 
                    filter: payload.isNovaGestao ? 'drop-shadow(0 3px 6px rgba(44, 62, 80, 0.4))' : 'drop-shadow(0 2px 4px rgba(255, 107, 71, 0.3))'
                  }}
                />
              );
            }}
            activeDot={{ r: 10, fill: '#FF6B47', stroke: '#fff', strokeWidth: 3 }}
          />

          {/* Linha para produtividade diária */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="mediaDiaria"
            stroke="#2C3E50"
            strokeWidth={3}
            strokeDasharray="8 4"
            name="📅 Média Diária"
            dot={{ fill: '#2C3E50', strokeWidth: 2, r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Análise mensal detalhada com identidade in.Pacto */}
      <div className="monthly-analysis-inpacto">
        <div className="analysis-header-inpacto">
          <h4>Inteligência de Dados in.Pacto 360°</h4>
          <div className="analysis-badge">Análise Mensal Detalhada</div>
        </div>
        
        <div className="analysis-cards-inpacto">
          <div className="analysis-card-inpacto primary">
            <div className="card-icon-inpacto">📊</div>
            <div className="card-info-inpacto">
              <div className="card-title-inpacto">Meses Ativos</div>
              <div className="card-value-inpacto">{data.length}</div>
              <div className="card-subtitle-inpacto">Com produção</div>
            </div>
            <div className="card-indicator"></div>
          </div>
          
          <div className="analysis-card-inpacto success">
            <div className="card-icon-inpacto">🏆</div>
            <div className="card-info-inpacto">
              <div className="card-title-inpacto">Melhor Performance</div>
              <div className="card-value-inpacto">
                {data.reduce((max, mes) => mes.total > max.total ? mes : max, data[0])?.mes || 'N/A'}
              </div>
              <div className="card-subtitle-inpacto">Maior produção</div>
            </div>
            <div className="card-indicator"></div>
          </div>
          
          <div className="analysis-card-inpacto warning">
            <div className="card-icon-inpacto">⚡</div>
            <div className="card-info-inpacto">
              <div className="card-title-inpacto">Produtividade</div>
              <div className="card-value-inpacto">
                {Math.round(data.reduce((sum, mes) => sum + mes.produtividade, 0) / data.length * 10) / 10}
              </div>
              <div className="card-subtitle-inpacto">Relatórios/dia</div>
            </div>
            <div className="card-indicator"></div>
          </div>

          <div className="analysis-card-inpacto highlight">
            <div className="card-icon-inpacto">🚀</div>
            <div className="card-info-inpacto">
              <div className="card-title-inpacto">Nova Gestão</div>
              <div className="card-value-inpacto">
                {(() => {
                  const novosGestao = data.filter(m => m.isNovaGestao);
                  const antesGestao = data.filter(m => !m.isNovaGestao);
                  if (novosGestao.length === 0 || antesGestao.length === 0) return '+0%';
                  const mediaNova = novosGestao.reduce((sum, m) => sum + m.media, 0) / novosGestao.length;
                  const mediaAntes = antesGestao.reduce((sum, m) => sum + m.media, 0) / antesGestao.length;
                  return `+${Math.round(((mediaNova - mediaAntes) / mediaAntes) * 100)}%`;
                })()}
              </div>
              <div className="card-subtitle-inpacto">Impacto positivo</div>
            </div>
            <div className="card-indicator"></div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MonthlyDetailChart;

