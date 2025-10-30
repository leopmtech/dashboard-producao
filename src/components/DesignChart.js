import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const DesignChart = ({ data, title, subtitle }) => {
  
  // Tooltip customizado para design
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip design">
          <p className="tooltip-label">{`Cliente: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {entry.dataKey === 'media2024' && `Média 2024: ${entry.value} proj/mês`}
              {entry.dataKey === 'media2025' && `Média 2025: ${entry.value} proj/mês`}
              {entry.dataKey === 'crescimento' && `Crescimento: ${entry.value}%`}
            </p>
          ))}
          <div className="tooltip-design-info">
            <p className="tooltip-impact">Impacto: {data.impacto}</p>
            <p className="tooltip-category">Categoria: {data.categoria}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Cores baseadas na categoria de performance
  const getBarColor = (categoria) => {
    const colorMap = {
      'Premium': '#FF6B47',
      'Padrão': '#10B981',
      'Básico': '#F59E0B',
      'Inicial': '#94A3AF'
    };
    return colorMap[categoria] || '#94A3AF';
  };

  return (
    <div className="chart-container modern design">
      <h3 className="chart-title">{title}</h3>
      {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          
          <XAxis 
            dataKey="cliente" 
            stroke="#FF6B47" 
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fill: '#FF6B47' }}
          />
          
          <YAxis 
            yAxisId="left"
            stroke="#FF6B47" 
            fontSize={12}
            tick={{ fill: '#FF6B47' }}
            label={{ 
              value: 'Projetos/Mês', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#FF6B47' }
            }}
          />

          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#F59E0B" 
            fontSize={12}
            tick={{ fill: '#F59E0B' }}
            label={{ 
              value: 'Crescimento (%)', 
              angle: 90, 
              position: 'insideRight',
              style: { textAnchor: 'middle', fill: '#F59E0B' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Barras para médias 2024 */}
          <Bar 
            yAxisId="left"
            dataKey="media2024" 
            fill="#94A3AF" 
            radius={[4, 4, 0, 0]}
            name="Média 2024"
            animationDuration={1000}
            opacity={0.7}
          />
          
          {/* Barras para médias 2025 com cores por categoria */}
          <Bar 
            yAxisId="left"
            dataKey="media2025" 
            radius={[4, 4, 0, 0]}
            name="Média 2025"
            animationDuration={1000}
            animationDelay={300}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.categoria)}
              />
            ))}
          </Bar>

          {/* Linha de crescimento */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="crescimento"
            stroke="#F59E0B"
            strokeWidth={3}
            name="Crescimento %"
            dot={{ fill: '#F59E0B', strokeWidth: 2, r: 6 }}
            activeDot={{ r: 8, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Análise detalhada do design */}
      <div className="design-analysis">
        <div className="analysis-header">
          <h4>Análise de Performance em Design</h4>
        </div>
        
        <div className="analysis-grid">
          {/* Estatísticas gerais */}
          <div className="analysis-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-value">{data.length}</div>
                <div className="stat-label">Clientes Ativos</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-info">
                <div className="stat-value">
                  {data.filter(item => item.crescimento > 0).length}
                </div>
                <div className="stat-label">Em Crescimento</div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <div className="stat-value">
                  {Math.round(data.reduce((sum, item) => sum + item.crescimento, 0) / data.length)}%
                </div>
                <div className="stat-label">Crescimento Médio</div>
              </div>
            </div>
          </div>

          {/* Categorias de performance */}
          <div className="performance-categories">
            <h5>Distribuição por Categoria</h5>
            <div className="category-list">
              {['Premium', 'Padrão', 'Básico', 'Inicial'].map(categoria => {
                const count = data.filter(item => item.categoria === categoria).length;
                const percentage = data.length > 0 ? Math.round((count / data.length) * 100) : 0;
                
                return (
                  <div key={categoria} className="category-item">
                    <div 
                      className="category-color" 
                      style={{ backgroundColor: getBarColor(categoria) }}
                    ></div>
                    <span className="category-name">{categoria}</span>
                    <span className="category-count">{count} ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recomendações */}
          <div className="recommendations">
            <h5>Recomendações Estratégicas</h5>
            <div className="recommendation-list">
              {data.filter(item => item.crescimento > 50).length > 0 && (
                <div className="recommendation-item success">
                  <div className="rec-icon">🚀</div>
                  <div className="rec-text">
                    Expandir serviços de design para clientes com alto crescimento
                  </div>
                </div>
              )}
              
              {data.filter(item => item.categoria === 'Inicial').length > 0 && (
                <div className="recommendation-item warning">
                  <div className="rec-icon">💡</div>
                  <div className="rec-text">
                    Desenvolver estratégias específicas para clientes iniciantes em design
                  </div>
                </div>
              )}
              
              {data.filter(item => item.crescimento < 0).length > 0 && (
                <div className="recommendation-item danger">
                  <div className="rec-icon">⚠️</div>
                  <div className="rec-text">
                    Revisar estratégia para clientes com declínio em projetos de design
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignChart;