// ==========================================
// src/services/chartService.js
// Serviço para configuração e processamento de gráficos
// ==========================================

import { MetricsService } from './metricsService';

export class ChartService {
  
  // Configurações padrão para gráficos
  static getDefaultChartConfig() {
    return {
      colors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#84cc16', '#f97316'],
      tooltipStyle: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        padding: '12px'
      },
      gridStyle: {
        strokeDasharray: "3 3",
        stroke: "#e2e8f0"
      },
      axisStyle: {
        stroke: "#64748b",
        fontSize: 12
      },
      animation: {
        duration: 1000,
        easing: 'ease-out'
      }
    };
  }

  // Processar dados para gráfico de linha (tendência)
  static processLineChartData(data, highlightGrowth = true) {
    const trendData = MetricsService.processMonthlyTrend(data);
    
    return trendData.map((item, index) => ({
      ...item,
      stroke: highlightGrowth && item.crescimento ? '#10b981' : '#6366f1',
      strokeWidth: highlightGrowth && item.crescimento ? 4 : 3,
      dotSize: highlightGrowth && item.crescimento ? 8 : 6,
      // Adicionar informações extras para tooltip
      percentualCrescimento: item.percentualCrescimento,
      posicao: index + 1,
      destaque: item.crescimento ? 'Pós-nova diretoria' : 'Período anterior'
    }));
  }

  // Processar dados para gráfico de barras horizontais
  static processHorizontalBarData(data, limit = 6) {
    const clientesData = MetricsService.getTopClients(data, limit);
    
    return clientesData.map((item, index) => ({
      ...item,
      fill: this.getDefaultChartConfig().colors[index % this.getDefaultChartConfig().colors.length],
      rank: index + 1,
      // Adicionar classificação por performance
      performance: item.crescimentoAbril > 50 ? 'Excelente' : 
                   item.crescimentoAbril > 20 ? 'Boa' : 
                   item.crescimentoAbril > 0 ? 'Regular' : 'Baixa',
      // Formatação para tooltip
      totalFormatted: item.total.toLocaleString('pt-BR'),
      mediaFormatted: item.media.toLocaleString('pt-BR', { minimumFractionDigits: 1 })
    }));
  }

  // Processar dados para gráfico de pizza
  static processPieChartData(data) {
    const distributionData = MetricsService.getReportTypeDistribution(data);
    
    return distributionData.map((item, index) => ({
      ...item,
      // Adicionar informações para renderização
      labelPosition: index % 2 === 0 ? 'outside' : 'inside',
      // Formatação para exibição
      valorFormatted: item.valor.toLocaleString('pt-BR'),
      label: `${item.tipo}: ${item.percentual}%`,
      // Configuração de estilo
      opacity: 0.9,
      strokeWidth: 2,
      stroke: '#ffffff'
    }));
  }

  // Processar dados para gráfico de barras comparativo
  static processComparisonBarData(data) {
    const comparativoData = MetricsService.getYearlyComparison(data);
    
    return comparativoData
      .slice(0, 8) // Limitar a 8 clientes para melhor visualização
      .map((item, index) => ({
        ...item,
        crescimentoPositivo: item.crescimento > 0,
        crescimentoCategoria: item.crescimento > 50 ? 'Alto' : 
                             item.crescimento > 20 ? 'Médio' : 
                             item.crescimento > 0 ? 'Baixo' : 'Negativo',
        // Formatação para exibição
        crescimentoFormatted: `${item.crescimento > 0 ? '+' : ''}${item.crescimento}%`,
        variacaoFormatted: `${item.variacao > 0 ? '+' : ''}${item.variacao}`,
        // Cores condicionais
        cor2024: '#06b6d4',
        cor2025: item.crescimento > 0 ? '#10b981' : '#ef4444'
      }));
  }

  // Configurar tooltip personalizado para diferentes tipos de gráfico
  static getCustomTooltip(type = 'default') {
    const baseStyle = this.getDefaultChartConfig().tooltipStyle;
    
    const tooltipFormatters = {
      linha: (value, name, props) => {
        if (name === 'total') {
          return [
            `${value} relatórios`,
            props.payload.destaque || 'Total'
          ];
        }
        return [value, name];
      },
      
      barra: (value, name, props) => {
        if (name === 'total') {
          return [
            `${value} relatórios`,
            `Ranking: #${props.payload.rank}`
          ];
        }
        return [value, name];
      },
      
      pizza: (value, name, props) => {
        return [
          `${value} relatórios (${props.payload.percentual}%)`,
          props.payload.descricao || name
        ];
      },
      
      comparativo: (value, name, props) => {
        return [
          `${value} projetos`,
          `${name} • Crescimento: ${props.payload.crescimentoFormatted || '0%'}`
        ];
      }
    };

    return {
      contentStyle: baseStyle,
      formatter: tooltipFormatters[type] || tooltipFormatters.default,
      labelStyle: { color: '#374151', fontWeight: 600 },
      itemStyle: { color: '#64748b' }
    };
  }

  // Gerar configuração completa para gráfico de linha
  static getLineChartConfig(data, options = {}) {
    const processedData = this.processLineChartData(data, options.highlightGrowth);
    const config = this.getDefaultChartConfig();
    
    return {
      data: processedData,
      config: {
        ...config,
        ...options,
        margin: { top: 20, right: 30, left: 20, bottom: 20 },
        dot: (props) => {
          const { payload, cx, cy } = props;
          return (
            <circle 
              cx={cx}
              cy={cy}
              fill={payload.crescimento ? '#10b981' : '#6366f1'}
              stroke={payload.crescimento ? '#10b981' : '#6366f1'}
              strokeWidth={2} 
              r={payload.dotSize || 6}
              style={{ 
                filter: payload.crescimento ? 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))' : 'none'
              }}
            />
          );
        },
        line: {
          strokeWidth: 3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        }
      }
    };
  }

  // Gerar configuração para gráfico de barras
  static getBarChartConfig(data, options = {}) {
    const processedData = this.processHorizontalBarData(data, options.limit);
    const config = this.getDefaultChartConfig();
    
    return {
      data: processedData,
      config: {
        ...config,
        ...options,
        margin: { top: 20, right: 30, left: 80, bottom: 20 },
        bar: {
          radius: [0, 8, 8, 0],
          maxBarSize: 40
        }
      }
    };
  }

  // Gerar configuração para gráfico de pizza
  static getPieChartConfig(data, options = {}) {
    const processedData = this.processPieChartData(data);
    const config = this.getDefaultChartConfig();
    
    return {
      data: processedData,
      config: {
        ...config,
        ...options,
        pie: {
          cx: '50%',
          cy: '50%',
          outerRadius: 120,
          innerRadius: options.donut ? 40 : 0,
          paddingAngle: 2,
          dataKey: 'valor'
        },
        label: {
          fontSize: 12,
          fontWeight: 500
        }
      }
    };
  }

  // Gerar configuração para gráfico comparativo
  static getComparisonChartConfig(data, options = {}) {
    const processedData = this.processComparisonBarData(data);
    const config = this.getDefaultChartConfig();
    
    return {
      data: processedData,
      config: {
        ...config,
        ...options,
        margin: { top: 20, right: 30, left: 20, bottom: 60 },
        bars: {
          '2024': {
            fill: '#06b6d4',
            radius: [4, 4, 0, 0],
            name: '2024'
          },
          '2025': {
            fill: '#10b981',
            radius: [4, 4, 0, 0],
            name: '2025'
          }
        }
      }
    };
  }

  // Utilitários para formatação de dados nos gráficos
  static formatters = {
    // Formatar números para exibição
    number: (value) => {
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return value.toString();
    },

    // Formatar percentuais
    percentage: (value) => {
      return `${value}%`;
    },

    // Formatar datas
    date: (value) => {
      return new Date(value).toLocaleDateString('pt-BR');
    },

    // Formatar moeda (se necessário)
    currency: (value) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
  };

  // Temas de cores predefinidos
  static themes = {
    default: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
    pastel: ['#fecaca', '#fed7d7', '#fde68a', '#d9f99d', '#a7f3d0', '#bfdbfe'],
    dark: ['#1e293b', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'],
    corporate: ['#1e40af', '#7c3aed', '#059669', '#dc2626', '#ea580c', '#ca8a04'],
    ocean: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16']
  };

  // Aplicar tema aos gráficos
  static applyTheme(themeName = 'default') {
    const theme = this.themes[themeName] || this.themes.default;
    
    return {
      colors: theme,
      gradients: theme.map(color => ({
        start: color,
        end: this.adjustColorBrightness(color, -20)
      }))
    };
  }

  // Utilitário para ajustar brilho das cores
  static adjustColorBrightness(color, amount) {
    const usePound = color[0] === '#';
    const col = usePound ? color.slice(1) : color;
    
    const num = parseInt(col, 16);
    let r = (num >> 16) + amount;
    let g = (num >> 8 & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    
    r = r > 255 ? 255 : r < 0 ? 0 : r;
    g = g > 255 ? 255 : g < 0 ? 0 : g;
    b = b > 255 ? 255 : b < 0 ? 0 : b;
    
    return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
  }

  // Configurações responsivas para diferentes tamanhos de tela
  static getResponsiveConfig(width) {
    if (width < 640) {
      return {
        fontSize: 10,
        margin: { top: 10, right: 10, left: 10, bottom: 30 },
        barSize: 30,
        pieRadius: 80
      };
    } else if (width < 1024) {
      return {
        fontSize: 11,
        margin: { top: 15, right: 20, left: 40, bottom: 40 },
        barSize: 35,
        pieRadius: 100
      };
    } else {
      return {
        fontSize: 12,
        margin: { top: 20, right: 30, left: 60, bottom: 50 },
        barSize: 40,
        pieRadius: 120
      };
    }
  }
}