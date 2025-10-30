// ==========================================
// src/services/analyticsService.js
// Serviço para funcionalidades analíticas avançadas
// ==========================================

export class AnalyticsService {
  
  // Gerar heatmap de clientes x meses
  static generateHeatmapData(data) {
    if (!data || !data.visaoGeral) return [];

    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return data.visaoGeral.map(cliente => {
      const clientData = {
        cliente: cliente.cliente,
        data: months.map((month, index) => ({
          month: monthLabels[index],
          monthKey: month,
          value: cliente[month] || 0,
          intensity: this.calculateIntensity(cliente[month] || 0),
          percentage: this.calculatePercentage(cliente[month] || 0, cliente.total || 0)
        })),
        total: cliente.total || 0,
        average: Math.round(((cliente.total || 0) / 12) * 10) / 10,
        peak: Math.max(...months.map(m => cliente[m] || 0)),
        trend: this.calculateTrend(months.map(m => cliente[m] || 0))
      };
      return clientData;
    }).sort((a, b) => b.total - a.total);
  }

  // Calcular intensidade para heatmap (0-1)
  static calculateIntensity(value) {
    const max = 70; // valor máximo esperado
    return Math.min(value / max, 1);
  }

  // Calcular percentual do total anual
  static calculatePercentage(value, total) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  // Calcular tendência (crescente, estável, decrescente)
  static calculateTrend(values) {
    const firstHalf = values.slice(0, 6).reduce((sum, val) => sum + val, 0) / 6;
    const secondHalf = values.slice(6).reduce((sum, val) => sum + val, 0) / 6;
    
    if (secondHalf > firstHalf * 1.1) return 'crescente';
    if (secondHalf < firstHalf * 0.9) return 'decrescente';
    return 'estável';
  }

  // Processar dados para drill-down
  static processDrillDownData(data, client, month) {
    const baseData = {
      client,
      month,
      overview: {
        total: 0,
        types: [],
        satisfaction: 4.5,
        efficiency: 85
      },
      breakdown: [],
      insights: [],
      recommendations: []
    };

    if (!data) return baseData;

    // Buscar dados do cliente em todas as abas
    const clientData = {
      geral: data.visaoGeral?.find(c => c.cliente === client) || {},
      semanais: data.semanais?.find(c => c.cliente === client) || {},
      mensais: data.mensais?.find(c => c.cliente === client) || {},
      especiais: data.especiais?.find(c => c.cliente === client) || {},
      diagnosticos: data.diagnosticos?.find(c => c.cliente === client) || {},
      design: data.design?.find(c => c.cliente === client) || {}
    };

    const monthKey = this.getMonthKey(month);
    
    // Calcular breakdown por tipo
    const breakdown = Object.entries(clientData).map(([type, typeData]) => ({
      type: this.formatTypeName(type),
      value: typeData[monthKey] || 0,
      percentage: 0, // será calculado depois
      color: this.getTypeColor(type),
      icon: this.getTypeIcon(type)
    })).filter(item => item.value > 0);

    const total = breakdown.reduce((sum, item) => sum + item.value, 0);
    
    // Calcular percentuais
    breakdown.forEach(item => {
      item.percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
    });

    baseData.overview.total = total;
    baseData.overview.types = breakdown.map(b => b.type);
    baseData.breakdown = breakdown.sort((a, b) => b.value - a.value);

    // Gerar insights automáticos
    baseData.insights = this.generateAutoInsights(clientData, monthKey, client);
    baseData.recommendations = this.generateRecommendations(clientData, monthKey, client);

    return baseData;
  }

  // Converter nome do mês para chave
  static getMonthKey(month) {
    const monthMap = {
      'Jan': 'janeiro', 'Fev': 'fevereiro', 'Mar': 'marco',
      'Abr': 'abril', 'Mai': 'maio', 'Jun': 'junho',
      'Jul': 'julho', 'Ago': 'agosto', 'Set': 'setembro',
      'Out': 'outubro', 'Nov': 'novembro', 'Dez': 'dezembro'
    };
    return monthMap[month] || month.toLowerCase();
  }

  // Formatar nome do tipo
  static formatTypeName(type) {
    const typeMap = {
      'geral': 'Relatórios Gerais',
      'semanais': 'Análises Semanais',
      'mensais': 'Relatórios Mensais',
      'especiais': 'Projetos Especiais',
      'diagnosticos': 'Diagnósticos',
      'design': 'Design & Criação'
    };
    return typeMap[type] || type;
  }

  // Cores por tipo
  static getTypeColor(type) {
    const colorMap = {
      'geral': '#FF6B47',
      'semanais': '#10B981',
      'mensais': '#3B82F6',
      'especiais': '#8B5CF6',
      'diagnosticos': '#F59E0B',
      'design': '#EF4444'
    };
    return colorMap[type] || '#6B7280';
  }

  // Ícones por tipo
  static getTypeIcon(type) {
    const iconMap = {
      'geral': '📊',
      'semanais': '📈',
      'mensais': '📅',
      'especiais': '⭐',
      'diagnosticos': '🔍',
      'design': '🎨'
    };
    return iconMap[type] || '📄';
  }

  // Gerar timeline de eventos
  static generateTimeline(data) {
    if (!data) return [];

    const events = [];
    const currentYear = new Date().getFullYear();

    // Eventos baseados nos dados reais
    if (data.visaoGeral && data.visaoGeral.length > 0) {
      // Detectar início de crescimento significativo
      const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
      const monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio'];
      
      months.forEach((month, index) => {
        const totalMonth = data.visaoGeral.reduce((sum, client) => sum + (client[month] || 0), 0);
        const prevMonth = index > 0 ? data.visaoGeral.reduce((sum, client) => sum + (client[months[index - 1]] || 0), 0) : 0;
        
        if (totalMonth > 0) {
          let eventType = 'normal';
          let impact = 'medium';
          
          if (prevMonth > 0) {
            const growth = ((totalMonth - prevMonth) / prevMonth) * 100;
            if (growth > 20) {
              eventType = 'growth';
              impact = 'high';
            } else if (growth < -20) {
              eventType = 'decline';
              impact = 'high';
            }
          }

          events.push({
            id: `month-${index}`,
            date: `${currentYear}-${String(index + 1).padStart(2, '0')}-15`,
            title: `Produção ${monthLabels[index]}`,
            description: `${totalMonth} relatórios produzidos`,
            type: eventType,
            impact: impact,
            value: totalMonth,
            growth: prevMonth > 0 ? Math.round(((totalMonth - prevMonth) / prevMonth) * 100) : 0,
            clients: data.visaoGeral.filter(c => (c[month] || 0) > 0).length
          });
        }
      });

      // Evento especial: Nova Diretoria (Abril)
      events.push({
        id: 'nova-diretoria',
        date: `${currentYear}-04-01`,
        title: '🚀 Nova Diretoria in.Pacto',
        description: 'Início da nova gestão com foco em crescimento e inovação',
        type: 'milestone',
        impact: 'critical',
        value: null,
        isSpecial: true
      });

      // Detectar marcos importantes
      const topClient = data.visaoGeral.reduce((max, client) => 
        client.total > max.total ? client : max, { total: 0, cliente: 'N/A' });

      if (topClient.total > 0) {
        events.push({
          id: 'top-client',
          date: `${currentYear}-05-31`,
          title: `🏆 ${topClient.cliente} - Cliente Destaque`,
          description: `Maior produção: ${topClient.total} relatórios`,
          type: 'achievement',
          impact: 'high',
          value: topClient.total
        });
      }
    }

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // IA: Gerar insights automáticos
  static generateAutoInsights(clientData, monthKey, client) {
    const insights = [];

    // Análise de performance
    const currentMonth = Object.values(clientData).reduce((sum, typeData) => 
      sum + (typeData[monthKey] || 0), 0);
    
    const averageMonth = Object.values(clientData).reduce((sum, typeData) => {
      const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
      const total = months.reduce((total, m) => total + (typeData[m] || 0), 0);
      return sum + (total / 5);
    }, 0);

    if (currentMonth > averageMonth * 1.2) {
      insights.push({
        type: 'positive',
        icon: '📈',
        title: 'Performance Excepcional',
        description: `${client} teve performance ${Math.round((currentMonth / averageMonth - 1) * 100)}% acima da média mensal`,
        confidence: 'alta',
        impact: 'positivo'
      });
    } else if (currentMonth < averageMonth * 0.8) {
      insights.push({
        type: 'attention',
        icon: '⚠️',
        title: 'Performance Abaixo da Média',
        description: `Produção ${Math.round((1 - currentMonth / averageMonth) * 100)}% menor que a média`,
        confidence: 'alta',
        impact: 'negativo'
      });
    }

    // Análise de diversificação
    const activeTypes = Object.entries(clientData).filter(([type, data]) => 
      (data[monthKey] || 0) > 0).length;

    if (activeTypes >= 4) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        title: 'Portfólio Diversificado',
        description: `Cliente ativo em ${activeTypes} tipos diferentes de conteúdo`,
        confidence: 'média',
        impact: 'positivo'
      });
    } else if (activeTypes <= 2) {
      insights.push({
        type: 'opportunity',
        icon: '💡',
        title: 'Oportunidade de Diversificação',
        description: 'Potencial para expandir tipos de serviços oferecidos',
        confidence: 'média',
        impact: 'neutro'
      });
    }

    // Análise de sazonalidade
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    const monthlyValues = months.map(m => 
      Object.values(clientData).reduce((sum, typeData) => sum + (typeData[m] || 0), 0));
    
    const maxMonth = Math.max(...monthlyValues);
    const minMonth = Math.min(...monthlyValues.filter(v => v > 0));
    
    if (maxMonth > minMonth * 2) {
      insights.push({
        type: 'pattern',
        icon: '📊',
        title: 'Padrão Sazonal Detectado',
        description: `Variação significativa entre meses (${Math.round((maxMonth / minMonth - 1) * 100)}%)`,
        confidence: 'média',
        impact: 'neutro'
      });
    }

    return insights;
  }

  // IA: Gerar recomendações
  static generateRecommendations(clientData, monthKey, client) {
    const recommendations = [];

    // Análise de crescimento
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    const monthIndex = months.indexOf(monthKey);
    
    if (monthIndex > 0) {
      const current = Object.values(clientData).reduce((sum, typeData) => 
        sum + (typeData[monthKey] || 0), 0);
      const previous = Object.values(clientData).reduce((sum, typeData) => 
        sum + (typeData[months[monthIndex - 1]] || 0), 0);
      
      if (current < previous * 0.9) {
        recommendations.push({
          priority: 'alta',
          category: 'retenção',
          icon: '🚨',
          title: 'Ação Imediata Necessária',
          description: 'Queda na produção detectada - revisar estratégia do cliente',
          actions: [
            'Agendar reunião de alinhamento',
            'Revisar escopo de trabalho',
            'Identificar possíveis bloqueadores'
          ]
        });
      } else if (current > previous * 1.2) {
        recommendations.push({
          priority: 'média',
          category: 'expansão',
          icon: '🚀',
          title: 'Oportunidade de Crescimento',
          description: 'Cliente em crescimento - considerar ampliar serviços',
          actions: [
            'Propor novos tipos de relatórios',
            'Aumentar frequência de entrega',
            'Oferecer serviços premium'
          ]
        });
      }
    }

    // Recomendações baseadas em tipos ativos
    const activeTypes = Object.entries(clientData).filter(([type, data]) => 
      (data[monthKey] || 0) > 0);

    if (!activeTypes.find(([type]) => type === 'design')) {
      recommendations.push({
        priority: 'baixa',
        category: 'diversificação',
        icon: '🎨',
        title: 'Oportunidade em Design',
        description: 'Cliente não utiliza serviços de design - potencial de upsell',
        actions: [
          'Apresentar portfólio de design',
          'Oferecer projeto piloto',
          'Demonstrar valor agregado'
        ]
      });
    }

    if (!activeTypes.find(([type]) => type === 'especiais')) {
      recommendations.push({
        priority: 'baixa',
        category: 'diversificação',
        icon: '⭐',
        title: 'Projetos Especiais',
        description: 'Considerar propor projetos customizados',
        actions: [
          'Identificar necessidades específicas',
          'Desenvolver proposta personalizada',
          'Agendar apresentação executiva'
        ]
      });
    }

    return recommendations.sort((a, b) => {
      const priorities = { 'alta': 3, 'média': 2, 'baixa': 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
  }

  // Análise de correlações
  static analyzeCorrelations(data) {
    if (!data || !data.visaoGeral) return [];

    const correlations = [];
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    
    // Correlação entre clientes (quem cresce junto)
    for (let i = 0; i < data.visaoGeral.length; i++) {
      for (let j = i + 1; j < data.visaoGeral.length; j++) {
        const client1 = data.visaoGeral[i];
        const client2 = data.visaoGeral[j];
        
        const values1 = months.map(m => client1[m] || 0);
        const values2 = months.map(m => client2[m] || 0);
        
        const correlation = this.calculateCorrelation(values1, values2);
        
        if (Math.abs(correlation) > 0.7) {
          correlations.push({
            type: correlation > 0 ? 'positive' : 'negative',
            strength: Math.abs(correlation),
            client1: client1.cliente,
            client2: client2.cliente,
            description: correlation > 0 ? 
              'Crescem juntos - mesma sazonalidade' : 
              'Padrões opostos - diversificação de risco'
          });
        }
      }
    }

    return correlations.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  // Calcular correlação de Pearson
  static calculateCorrelation(x, y) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Previsões baseadas em tendência
  static generateForecasts(data, periods = 3) {
    if (!data || !data.visaoGeral) return [];

    const forecasts = [];
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    const futureMonths = ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];

    data.visaoGeral.forEach(client => {
      const values = months.map(m => client[m] || 0);
      const trend = this.calculateLinearTrend(values);
      
      const predictions = [];
      for (let i = 1; i <= periods; i++) {
        const prediction = Math.max(0, Math.round(trend.slope * (values.length + i) + trend.intercept));
        predictions.push({
          month: futureMonths[i - 1],
          value: prediction,
          confidence: Math.max(0.3, 1 - (i * 0.2)) // confiança diminui com o tempo
        });
      }

      forecasts.push({
        client: client.cliente,
        currentTotal: client.total,
        trend: trend.slope > 0 ? 'crescente' : trend.slope < 0 ? 'decrescente' : 'estável',
        predictions: predictions,
        confidence: this.calculateTrendConfidence(values)
      });
    });

    return forecasts.sort((a, b) => b.currentTotal - a.currentTotal);
  }

  // Calcular tendência linear
  static calculateLinearTrend(values) {
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + (x + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  // Calcular confiança da tendência
  static calculateTrendConfidence(values) {
    const trend = this.calculateLinearTrend(values);
    const predictions = values.map((_, i) => trend.slope * (i + 1) + trend.intercept);
    const errors = values.map((actual, i) => Math.abs(actual - predictions[i]));
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    
    return Math.max(0.1, 1 - (avgError / avgValue));
  }

  // Detectar anomalias
  static detectAnomalies(data) {
    if (!data || !data.visaoGeral) return [];

    const anomalies = [];
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];

    data.visaoGeral.forEach(client => {
      const values = months.map(m => client[m] || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

      values.forEach((value, index) => {
        const zScore = std > 0 ? Math.abs((value - mean) / std) : 0;
        
        if (zScore > 2) { // Anomalia se z-score > 2
          anomalies.push({
            client: client.cliente,
            month: months[index],
            monthLabel: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'][index],
            value: value,
            expected: Math.round(mean),
            deviation: Math.round(((value - mean) / mean) * 100),
            type: value > mean ? 'spike' : 'drop',
            severity: zScore > 3 ? 'high' : 'medium'
          });
        }
      });
    });

    return anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
  }
}