import React from 'react';
import { TrendingUp, Users, FileText, Target, BarChart3 } from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, gradient, subtitle, trend }) => (
  <div className="kpi-card" style={{ background: gradient }}>
    <div className="kpi-content">
      <div className="kpi-text">
        <p className="kpi-title">{title}</p>
        <p className="kpi-value">{value}</p>
        {subtitle && <p className="kpi-subtitle">{subtitle}</p>}
      </div>
      <div className="kpi-icon">
        <Icon size={32} />
        {trend && (
          <div className="kpi-trend">
            <TrendingUp size={16} />
            <span>+{trend}%</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const KPISection = ({ metrics }) => {
  const gradients = {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    purple: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  };

  return (
    <div className="kpis-grid">
      <KPICard
        title="Total de Clientes"
        value={metrics.totalClientes}
        icon={Users}
        gradient={gradients.primary}
        subtitle="Clientes ativos"
      />
      <KPICard
        title="Total de Relatórios"
        value={metrics.totalRelatorios}
        icon={FileText}
        gradient={gradients.success}
        subtitle="Em 2025"
        trend={metrics.crescimento}
      />
      <KPICard
        title="Média por Cliente/Mês"
        value={metrics.mediaClienteMes}
        icon={Target}
        gradient={gradients.warning}
        subtitle="Relatórios/mês"
      />
      <KPICard
        title="Produtividade Mensal"
        value={metrics.produtividadeMensal}
        icon={BarChart3}
        gradient={gradients.info}
        subtitle="Relatórios/mês"
      />
      <KPICard
        title="Crescimento"
        value={`+${metrics.crescimento}%`}
        icon={TrendingUp}
        gradient={gradients.purple}
        subtitle="Desde nova diretoria"
      />
    </div>
  );
};

export default KPISection;
