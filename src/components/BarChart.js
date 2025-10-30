import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ClientesBarChart = () => {
  const data = [
    { cliente: 'ANP', total: 216 },
    { cliente: 'CFQ', total: 93 },
    { cliente: 'VALE', total: 75 },
    { cliente: 'GOVGO', total: 54 },
    { cliente: 'MS', total: 43 },
    { cliente: 'PETROBRAS', total: 42 }
  ];

  return (
    <div className="chart-container">
      <h3 className="chart-title">Top Clientes por Produção</h3>
      <ResponsiveContainer width="100%" height={400}>
  <BarChart 
    data={data}
    margin={{ top: 20, right: 220, left: 10, bottom: 40 }}
    barCategoryGap="40%"
  >
    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
    
    <XAxis 
      dataKey="cliente"
      stroke="#FF6B47" 
      fontSize={14}
      tick={{ fill: '#FF6B47' }}
      axisLine={{ stroke: '#FF6B47' }}
      tickLine={{ stroke: '#FF6B47' }}
      interval={0}
    />
    
    <YAxis 
      stroke="#FF6B47" 
      fontSize={12}
      tick={{ fill: '#FF6B47' }}
      axisLine={{ stroke: '#FF6B47' }}
      tickLine={{ stroke: '#FF6B47' }}
      label={{ 
        value: 'Relatórios/Mês', 
        angle: -90, 
        position: 'insideLeft',
        style: { textAnchor: 'middle', fill: '#FF6B47' }
      }}
    />
    
    <Tooltip content={<CustomTooltip />} />
    
    <Bar 
      dataKey={dataKey}
      radius={[8, 8, 0, 0]}
      animationDuration={1200}
      animationDelay={300}
      maxBarSize={120}
    >
      {data.map((entry, index) => (
        <Cell 
          key={`cell-${index}`} 
          fill={index === 0 ? '#FF6B47' : '#10B981'}
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
    </div>
  );
};

export default ClientesBarChart;