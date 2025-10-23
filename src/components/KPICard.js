import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const KPICard = ({ 
  title, 
  value, 
  subtitle, 
  gradient, 
  delay = '0ms',
  trend = null,
  previousValue = null,
  icon = null 
}) => {
  
  // Calcular tendência se temos valor anterior
  const calculateTrend = () => {
    if (!previousValue || previousValue === 0) return null;
    
    const numericValue = typeof value === 'string' ? 
      parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    
    if (isNaN(numericValue)) return null;
    
    const percentChange = ((numericValue - previousValue) / previousValue) * 100;
    return {
      percentage: Math.abs(percentChange).toFixed(1),
      direction: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral'
    };
  };

  const trendData = trend || calculateTrend();

  // Determinar ícone de tendência
  const getTrendIcon = () => {
    if (!trendData) return null;
    
    switch (trendData.direction) {
      case 'up':
        return <TrendingUp size={14} />;
      case 'down':
        return <TrendingDown size={14} />;
      default:
        return <Minus size={14} />;
    }
  };

  // Determinar cor da tendência
  const getTrendColor = () => {
    if (!trendData) return '#FF6B47';
    
    switch (trendData.direction) {
      case 'up':
        return '#10B981';
      case 'down':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  return (
    <div 
      className="kpi-card modern" 
      style={{ 
        background: gradient,
        animationDelay: delay
      }}
    >
      <div className="kpi-content">
        <div className="kpi-text">
          <p className="kpi-title">{title}</p>
          <p className="kpi-value">{value}</p>
          <p className="kpi-subtitle">{subtitle}</p>
        </div>
        <div className="kpi-icon">
          {icon && (
            <div className="kpi-icon-circle">
              {React.createElement(icon, { size: 24 })}
            </div>
          )}
          {trendData && (
            <div 
              className="kpi-trend" 
              style={{ 
                background: `${getTrendColor()}20`,
                border: `1px solid ${getTrendColor()}40`,
                color: getTrendColor()
              }}
            >
              {getTrendIcon()}
              <span>{trendData.percentage}%</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Borda animada */}
      <div className="kpi-border-animation"></div>
      
      {/* Efeito de brilho */}
      <div className="kpi-shine"></div>
    </div>
  );
};

export default KPICard;