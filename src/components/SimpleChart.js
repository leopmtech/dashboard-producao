import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SimpleChart = () => {
  const data = [
    { mes: 'Jan', total: 47 },
    { mes: 'Fev', total: 42 },
    { mes: 'Mar', total: 42 },
    { mes: 'Abr', total: 55 },
    { mes: 'Mai', total: 65 }
  ];

  return (
    <div className="chart-container">
      <h3 className="chart-title">Evolução da Produção Mensal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="mes" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: 'none', 
              borderRadius: '12px', 
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' 
            }} 
          />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#6366f1"
            strokeWidth={3}
            dot={{ fill: '#6366f1', strokeWidth: 2, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimpleChart;