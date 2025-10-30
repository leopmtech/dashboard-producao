import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MetricsService } from '../services/metricsService';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="tooltip-value" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TrendChart = ({ data }) => {
  const trendData = MetricsService.processMonthlyTrend(data);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Evolução da Produção Mensal</h3>
      <div className="chart-subtitle">
        Destaque para crescimento a partir de Abril 2024 (Nova Diretoria)
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={trendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="mes" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="total" 
            stroke="#6366f1"
            strokeWidth={3}
            dot={(props) => {
              const { payload } = props;
              return (
                <circle 
                  {...props} 
                  fill={payload.crescimento ? '#10b981' : '#6366f1'}
                  stroke={payload.crescimento ? '#10b981' : '#6366f1'}
                  strokeWidth={2} 
                  r={6}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ClientesRanking = ({ data }) => {
  const clientesData = MetricsService.getTopClients(data, 6);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Top Clientes por Produção</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={clientesData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" />
          <YAxis type="category" dataKey="cliente" stroke="#64748b" width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="total" 
            fill="#8b5cf6"
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const TiposDistribuicao = ({ data }) => {
  const tiposData = MetricsService.getReportTypeDistribution(data);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Distribuição por Tipo de Relatório</h3>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={tiposData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ tipo, percentual }) => `${tipo}: ${percentual}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="valor"
          >
            {tiposData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const ComparativoAnual = ({ data }) => {
  const comparativoData = MetricsService.getYearlyComparison(data);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Crescimento Design: 2024 vs 2025</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={comparativoData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="cliente" stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="2024" fill="#06b6d4" name="2024" radius={[4, 4, 0, 0]} />
          <Bar dataKey="2025" fill="#10b981" name="2025" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const ChartsSection = ({ data }) => (
  <>
    <div className="charts-row">
      <div className="chart-col-2">
        <TrendChart data={data} />
      </div>
      <div className="chart-col-2">
        <ClientesRanking data={data} />
      </div>
    </div>

    <div className="charts-row">
      <div className="chart-col-2">
        <TiposDistribuicao data={data} />
      </div>
      <div className="chart-col-2">
        <ComparativoAnual data={data} />
      </div>
    </div>
  </>
);

export default ChartsSection;