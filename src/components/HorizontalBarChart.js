import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const HorizontalBarChart = ({ data, title, subtitle, dataKey = "media2025" }) => {
  
  console.log('📊 [HORIZONTAL BAR] ENTRADA:', {
    dataReceived: data,
    dataLength: data?.length || 0,
    dataKey,
    firstItem: data?.[0]
  });

  // CORREÇÃO: Normalização robusta dos dados
  const processedData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ [HORIZONTAL BAR] Dados inválidos');
      return [];
    }

    const normalizedData = data.map((item, index) => {
      // Determinar o valor a ser exibido baseado no dataKey
      let displayValue = 0;
      
      if (dataKey === "media2025") {
        displayValue = item.media2025 || item.valor || item.media || item.total || 0;
      } else if (dataKey === "total") {
        displayValue = item.total || item.valor || 0;
      } else if (dataKey === "media") {
        displayValue = item.media || item.valor || 0;
      } else {
        displayValue = item[dataKey] || item.valor || item.media2025 || item.total || 0;
      }

      const normalizedItem = {
        cliente: item.cliente || `Cliente ${index + 1}`,
        [dataKey]: Number(displayValue),
        displayValue: Number(displayValue),
        media2024: item.media2024 || 0,
        media2025: item.media2025 || displayValue,
        crescimento: item.crescimento || 0,
        categoria: item.categoria || 'N/A',
        index
      };

      console.log(`📊 [HORIZONTAL BAR] Normalizado ${item.cliente}:`, normalizedItem);
      return normalizedItem;
    });

    // Filtrar apenas itens com valores > 0 e ordenar
    const filteredData = normalizedData
      .filter(item => item.displayValue > 0)
      .sort((a, b) => b.displayValue - a.displayValue)
      .slice(0, 8); // Limitar a 8 para melhor visualização

    console.log('📊 [HORIZONTAL BAR] Dados processados final:', filteredData);
    return filteredData;
  }, [data, dataKey]);

  // Cores baseadas na performance
  const getBarColor = (item, index) => {
    if (item.crescimento !== undefined) {
      if (item.crescimento >= 50) return '#10B981'; // Verde - Excelente
      if (item.crescimento >= 20) return '#F59E0B'; // Amarelo - Bom  
      if (item.crescimento >= 0) return '#6366F1';   // Azul - Estável
      return '#EF4444'; // Vermelho - Declínio
    }
    
    const colors = ['#FF6B47', '#FF8A6B', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6', '#06B6D4', '#84CC16'];
    return colors[index % colors.length];
  };

  // Tooltip melhorado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '16px',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          minWidth: '240px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#2C3E50', marginBottom: '12px', fontSize: '1rem' }}>
            🏢 {label}
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#FF6B47', fontWeight: '600', fontSize: '0.9rem' }}>
              📊 Média 2025: {data.media2025} rel/mês
            </span>
          </div>
          
          {data.media2024 > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>
                📅 Média 2024: {data.media2024} rel/mês
              </span>
            </div>
          )}
          
          {data.crescimento !== undefined && (
            <div style={{ 
              marginTop: '8px',
              padding: '6px 8px',
              backgroundColor: data.crescimento >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: '6px'
            }}>
              <span style={{
                color: data.crescimento >= 0 ? '#10B981' : '#EF4444',
                fontWeight: '600',
                fontSize: '0.85rem'
              }}>
                {data.crescimento >= 0 ? '📈' : '📉'} 
                Crescimento: {data.crescimento >= 0 ? '+' : ''}{data.crescimento}%
              </span>
            </div>
          )}
          
          {data.categoria && data.categoria !== 'N/A' && (
            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#8B5CF6' }}>
              🏷️ {data.categoria}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Se não há dados processados
  if (!processedData || processedData.length === 0) {
    return (
      <div className="chart-container modern">
        <h3 className="chart-title">{title}</h3>
        {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        
        <div style={{
          height: '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          border: '2px dashed #D1D5DB',
          borderRadius: '12px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ fontSize: '4rem' }}>📊</div>
          <div style={{ color: '#6B7280', fontSize: '1.2rem', fontWeight: '600' }}>
            Nenhum dado disponível
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '1rem', textAlign: 'center' }}>
            Verifique se os dados estão sendo carregados corretamente<br />
            ou ajuste os filtros selecionados
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container modern">
      <h3 className="chart-title">{title}</h3>
      {subtitle && <p className="chart-subtitle">{subtitle}</p>}
      
      <ResponsiveContainer width="100%" height={350}>
        <BarChart 
          data={processedData}
          layout="horizontal"
          margin={{ top: 20, right: 50, left: 80, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          
          <XAxis 
            type="number"
            stroke="#FF6B47"
            fontSize={12}
            tick={{ fill: '#FF6B47' }}
            domain={[0, 'dataMax + 5']}
          />
          
          <YAxis 
            type="category"
            dataKey="cliente"
            stroke="#FF6B47"
            fontSize={11}
            width={75}
            tick={{ fill: '#FF6B47' }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar 
            dataKey={dataKey}
            radius={[0, 8, 8, 0]}
            animationDuration={1200}
            animationBegin={0}
          >
            {processedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={getBarColor(entry, index)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Top 3 Performers */}
      <div style={{ marginTop: '24px' }}>
        <h4 style={{ 
          color: '#FF6B47', 
          fontSize: '1.1rem', 
          fontWeight: '700', 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🏆 Top 3 Performers
        </h4>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '16px' 
        }}>
          {processedData.slice(0, 3).map((item, index) => (
            <div key={item.cliente} style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}>
              <div style={{
                background: getBarColor(item, index),
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
              }}>
                #{index + 1}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', color: '#2C3E50', fontSize: '1rem', marginBottom: '4px' }}>
                  {item.cliente}
                </div>
                <div style={{ color: '#6B7280', fontSize: '0.9rem', marginBottom: '2px' }}>
                  📊 {item[dataKey]} rel/mês (2025)
                </div>
                {item.crescimento !== undefined && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: item.crescimento >= 0 ? '#10B981' : '#EF4444',
                    fontWeight: '600'
                  }}>
                    {item.crescimento >= 0 ? '↗' : '↘'} {item.crescimento >= 0 ? '+' : ''}{item.crescimento}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalBarChart;