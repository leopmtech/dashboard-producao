import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const VerticalBarChart = ({ 
  data, 
  title, 
  subtitle, 
  dataKey1 = "media2024", 
  dataKey2 = "media2025",
  color1 = "#2C3E50", 
  color2 = "#FF6B47",
  singleBar = false
}) => {
  
  // Detectar se é dados de distribuição (tem propriedade 'tipo' ao invés de 'cliente')
  const isDistributionData = data.length > 0 && data[0].hasOwnProperty('tipo');
  const isComparativeDistribution = isDistributionData && data.length > 0 && data[0].hasOwnProperty('media2024');
  const isComparativeData = dataKey2 && !singleBar;
  
  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isDistributionData = data.hasOwnProperty('tipo');
      const isComparativeDistribution = isDistributionData && data.hasOwnProperty('media2024');
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">
            {isDistributionData ? `Tipo: ${label}` : `Cliente: ${label}`}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="tooltip-value" style={{ color: entry.color }}>
              {/* Para dados de distribuição comparativa */}
              {isComparativeDistribution && entry.dataKey === 'media2024' && `Média 2024: ${entry.value} rel/mês`}
              {isComparativeDistribution && entry.dataKey === 'media2025' && `Média 2025: ${entry.value} rel/mês`}
              
              {/* Para dados de distribuição simples */}
              {isDistributionData && !isComparativeDistribution && entry.dataKey === 'valor' && `Média Mensal: ${data.mediaMensal} rel/mês`}
              {isDistributionData && !isComparativeDistribution && entry.dataKey === 'mediaMensal' && `Média Mensal: ${entry.value} rel/mês`}
              
              {/* Para dados comparativos normais */}
              {!isDistributionData && entry.dataKey === 'media2024' && `Média 2024: ${entry.value} rel/mês`}
              {!isDistributionData && entry.dataKey === 'media2025' && `Média 2025: ${entry.value} rel/mês`}
              {!isDistributionData && entry.dataKey === 'total2024' && `Total 2024: ${entry.value} relatórios`}
              {!isDistributionData && entry.dataKey === 'total2025' && `Total 2025: ${entry.value} relatórios`}
              {!isDistributionData && entry.dataKey === 'total' && `Total: ${entry.value} relatórios`}
            </p>
          ))}
          
          {/* Informações adicionais para distribuição */}
          {isDistributionData && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
              {isComparativeDistribution ? (
                <>
                  <p className="tooltip-value" style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    Total 2024: {data.valor2024 || 0} relatórios
                  </p>
                  <p className="tooltip-value" style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    Total 2025: {data.valor2025 || 0} relatórios
                  </p>
                  {data.crescimento !== undefined && (
                    <p className={`tooltip-growth ${data.crescimento > 0 ? 'positive' : 'negative'}`}>
                      {data.crescimento > 0 ? '📈' : '📉'} {data.crescimento > 0 ? '+' : ''}{data.crescimento}% crescimento
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="tooltip-value" style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                    Total Anual: {data.totalAnual || data.valor || 0} relatórios
                  </p>
                  {data.percentual && (
                    <p className="tooltip-value" style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                      Participação: {data.percentual}%
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          
          {!isDistributionData && data.crescimento !== undefined && (
            <div className="tooltip-comparison">
              <p className={`tooltip-growth ${data.crescimento > 0 ? 'positive' : 'negative'}`}>
                {data.crescimento > 0 ? '📈' : '📉'} Crescimento: {data.crescimento}%
              </p>
              {data.categoria && <p className="tooltip-category">Categoria: {data.categoria}</p>}
            </div>
          )}
          
          {isDistributionData && data.descricao && (
            <p className="tooltip-description" style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '4px' }}>
              {data.descricao}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Determinar a chave para o eixo X
  const xDataKey = isDistributionData ? "tipo" : "cliente";
  
  // Para dados de distribuição, adaptar as chaves
  let actualDataKey1, actualDataKey2;
  
  if (isComparativeDistribution) {
    actualDataKey1 = "media2024";
    actualDataKey2 = "media2025";
  } else if (isDistributionData) {
    actualDataKey1 = data[0]?.hasOwnProperty('mediaMensal') ? "mediaMensal" : "valor";
    actualDataKey2 = null;
  } else {
    actualDataKey1 = dataKey1;
    actualDataKey2 = dataKey2;
  }

  return (
    <div className="chart-container modern">
      <h3 className="chart-title">{title}</h3>
      {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      
      <ResponsiveContainer width="100%" height={500}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 100, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          
          <XAxis 
            dataKey={xDataKey}
            stroke="#FF6B47" 
            fontSize={15}
            angle={-45}
            textAnchor="end"
            height={70}
            tick={{ fill: '#FF6B47' }}
          />
          
          <YAxis 
            stroke="#FF6B47" 
            fontSize={12}
            tick={{ fill: '#FF6B47' }}
            label={{ 
              value: isDistributionData ? 'Média Mensal (Relatórios/Mês)' : 'Relatórios/Mês', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#FF6B47' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          {(isComparativeDistribution || (isComparativeData && actualDataKey2)) && <Legend />}
          
          {/* Primeira barra */}
          <Bar 
            dataKey={actualDataKey1}
            radius={[4, 4, 0, 0]}
            name={isComparativeDistribution ? "Média 2024" : isDistributionData ? "Média Mensal" : "2024"}
            animationDuration={1000}
            animationDelay={200}
          >
            {isDistributionData && !isComparativeDistribution ? (
              // Para dados de distribuição simples, usar cores individuais
              data.map((entry, index) => (
                <Bar key={`bar-${index}`} fill={entry.color || color1} />
              ))
            ) : (
              // Para dados comparativos, usar cor uniforme
              <Bar fill={color1} />
            )}
          </Bar>
          
          {/* Segunda barra (apenas para dados comparativos) */}
          {actualDataKey2 && (isComparativeDistribution || isComparativeData) && (
            <Bar 
              dataKey={actualDataKey2}
              fill={color2}
              radius={[4, 4, 0, 0]}
              name={isComparativeDistribution ? "Média 2025" : "2025"}
              animationDuration={1000}
              animationDelay={400}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Resumo estatístico */}
      <div className="chart-summary">
        <div className="summary-stats">
          {isDistributionData ? (
            <>
              <div className="stat-item">
                <span className="stat-label">Tipos de Conteúdo:</span>
                <span className="stat-value">{data.length}</span>
              </div>
              {isComparativeDistribution ? (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Total 2024:</span>
                    <span className="stat-value">
                      {data.reduce((sum, item) => sum + (item.valor2024 || 0), 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total 2025:</span>
                    <span className="stat-value">
                      {data.reduce((sum, item) => sum + (item.valor2025 || 0), 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Crescimento Médio:</span>
                    <span className="stat-value positive">
                      +{data.length > 0 ? Math.round(data.reduce((sum, item) => sum + (item.crescimento || 0), 0) / data.length) : 0}%
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="stat-item">
                    <span className="stat-label">Total Relatórios:</span>
                    <span className="stat-value">
                      {data.reduce((sum, item) => sum + (item.totalAnual || item.valor || 0), 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Tipo Dominante:</span>
                    <span className="stat-value">
                      {data.length > 0 ? 
                        data.reduce((max, item) => (item.mediaMensal || item.valor || 0) > (max.mediaMensal || max.valor || 0) ? item : max, data[0])?.tipo || 'N/A' :
                        'N/A'
                      }
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="stat-item">
                <span className="stat-label">Total Clientes:</span>
                <span className="stat-value">{data.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Em Crescimento:</span>
                <span className="stat-value positive">
                  {data.filter(item => (item.crescimento || 0) > 0).length}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Crescimento Médio:</span>
                <span className="stat-value">
                  {data.length > 0 ? 
                    Math.round(data.reduce((sum, item) => sum + (item.crescimento || 0), 0) / data.length) : 0}%
                </span>
              </div>
            </>
          )}
        </div>
        
        {/* Top performer */}
        {data.length > 0 && (
          <div className="top-performer">
            {isDistributionData ? (
              <div className="performer-card">
                <div className="performer-icon">📊</div>
                <div className="performer-info">
                  <div className="performer-title">
                    {isComparativeDistribution ? 'Maior Crescimento' : 'Maior Volume'}
                  </div>
                  <div className="performer-client">
                    {isComparativeDistribution ? 
                      data.reduce((max, item) => (item.crescimento || 0) > (max.crescimento || 0) ? item : max, data[0])?.tipo || 'N/A' :
                      data.reduce((max, item) => (item.mediaMensal || item.valor || 0) > (max.mediaMensal || max.valor || 0) ? item : max, data[0])?.tipo || 'N/A'
                    }
                  </div>
                  <div className="performer-growth">
                    {isComparativeDistribution ? 
                      `+${data.reduce((max, item) => (item.crescimento || 0) > (max.crescimento || 0) ? item : max, data[0])?.crescimento || 0}%` :
                      `${data.reduce((max, item) => (item.mediaMensal || item.valor || 0) > (max.mediaMensal || max.valor || 0) ? item : max, data[0])?.percentual || 0}%`
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className="performer-card">
                <div className="performer-icon">🏆</div>
                <div className="performer-info">
                  <div className="performer-title">Melhor Performance</div>
                  <div className="performer-client">
                    {(() => {
                      const topClient = data.reduce((max, client) => 
                        (client.crescimento || 0) > (max.crescimento || 0) ? client : max
                      );
                      return topClient.cliente || 'N/A';
                    })()}
                  </div>
                  <div className="performer-growth">
                    +{(() => {
                      const topClient = data.reduce((max, client) => 
                        (client.crescimento || 0) > (max.crescimento || 0) ? client : max
                      );
                      return topClient.crescimento || 0;
                    })()}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerticalBarChart;