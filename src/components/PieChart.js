import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const TiposPieChart = () => {
  const data = [
    { tipo: 'Relatórios Gerais', valor: 523, color: '#6366f1' },
    { tipo: 'Semanais', valor: 75, color: '#8b5cf6' },
    { tipo: 'Mensais', valor: 18, color: '#06b6d4' },
    { tipo: 'Design', valor: 17, color: '#10b981' }
  ];

  return (
    <div className="chart-container">
      <h3 className="chart-title">Distribuição por Tipo de Relatório</h3>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ tipo, valor }) => {
              const total = data.reduce((sum, item) => sum + item.valor, 0);
              const percent = Math.round((valor / total) * 100);
              return `${tipo}: ${percent}%`;
            }}
            outerRadius={120}
            fill="#8884d8"
            dataKey="valor"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: 'none', 
              borderRadius: '12px', 
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' 
            }}
            formatter={(value) => [value + ' relatórios', 'Total']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TiposPieChart;