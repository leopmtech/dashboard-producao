// ==========================================
// src/services/metricsService.js
// Serviço para cálculos de métricas e KPIs
// ==========================================

export class MetricsService {
  
  // Calcular métricas principais do dashboard
  static calculateMainMetrics(data) {
    if (!data || !data.visaoGeral || data.visaoGeral.length === 0) {
      return {
        totalClientes: 0,
        totalRelatorios: 0,
        mediaClienteMes: 0,
        crescimento: 0,
        produtividadeMensal: 0,
        maiorCliente: { cliente: 'N/A', total: 0 },
        crescimentoDesign: 0
      };
    }

    const totalClientes = data.visaoGeral.length;
    const totalRelatorios = data.visaoGeral.reduce((sum, cliente) => sum + cliente.total, 0);
    
    // Calcular média por cliente por mês (considerando meses com dados)
    const mesesComDados = 5; // Janeiro a Maio
    const mediaClienteMes = totalClientes > 0 ? totalRelatorios / totalClientes / mesesComDados : 0;
    
    // Crescimento desde abril (nova diretora)
    const prodAntesAbril = data.visaoGeral.reduce((sum, cliente) => 
      sum + (cliente.janeiro || 0) + (cliente.fevereiro || 0) + (cliente.marco || 0), 0);
    const prodDepoisAbril = data.visaoGeral.reduce((sum, cliente) => 
      sum + (cliente.abril || 0) + (cliente.maio || 0), 0);
    
    const mediaAntesAbril = prodAntesAbril / 3; // 3 meses antes
    const mediaDepoisAbril = prodDepoisAbril / 2; // 2 meses depois
    
    const crescimento = mediaAntesAbril > 0 ? 
      ((mediaDepoisAbril - mediaAntesAbril) / mediaAntesAbril) * 100 : 100;

    return {
      totalClientes,
      totalRelatorios,
      mediaClienteMes: Math.round(mediaClienteMes * 10) / 10,
      crescimento: Math.round(Math.max(0, crescimento)),
      produtividadeMensal: Math.round(totalRelatorios / mesesComDados),
      maiorCliente: this.findTopClient(data.visaoGeral),
      crescimentoDesign: this.calculateDesignGrowth(data.design || [])
    };
  }

  // Encontrar cliente com maior produção
  static findTopClient(visaoGeral) {
    if (!visaoGeral || visaoGeral.length === 0) {
      return { cliente: 'N/A', total: 0 };
    }
    
    return visaoGeral.reduce((max, cliente) => 
      cliente.total > max.total ? cliente : max
    );
  }

  // Calcular crescimento do design
  static calculateDesignGrowth(designData) {
    if (!designData || designData.length === 0) return 0;
    
    const total2024 = designData.reduce((sum, item) => sum + (item['2024'] || 0), 0);
    const total2025 = designData.reduce((sum, item) => sum + (item['2025'] || 0), 0);
    
    return total2024 > 0 ? Math.round(((total2025 - total2024) / total2024) * 100) : 100;
  }

  // Processar tendência mensal
  static processMonthlyTrend(data) {
    if (!data || !data.visaoGeral) return [];

    const meses = [
      { key: 'janeiro', nome: 'Jan' },
      { key: 'fevereiro', nome: 'Fev' },
      { key: 'marco', nome: 'Mar' },
      { key: 'abril', nome: 'Abr' },
      { key: 'maio', nome: 'Mai' }
    ];

    return meses.map(mes => {
      const total = data.visaoGeral.reduce((sum, cliente) => sum + (cliente[mes.key] || 0), 0);
      const crescimento = mes.key === 'abril' || mes.key === 'maio'; // Marcar meses pós-nova diretoria
      
      return { 
        mes: mes.nome, 
        total, 
        crescimento,
        percentualCrescimento: mes.key === 'maio' ? this.calculateMonthlyGrowth(data, mes.key) : null
      };
    });
  }

  // Calcular crescimento mensal específico
  static calculateMonthlyGrowth(data, currentMonth) {
    if (!data || !data.visaoGeral) return 0;

    const currentTotal = data.visaoGeral.reduce((sum, cliente) => sum + (cliente[currentMonth] || 0), 0);
    const previousMonth = currentMonth === 'maio' ? 'abril' : currentMonth === 'abril' ? 'marco' : 'fevereiro';
    const previousTotal = data.visaoGeral.reduce((sum, cliente) => sum + (cliente[previousMonth] || 0), 0);
    
    return previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0;
  }

  // Ranking de clientes
  static getTopClients(data, limit = 6) {
    if (!data || !data.visaoGeral) return [];

    return data.visaoGeral
      .map(cliente => ({
        cliente: cliente.cliente,
        total: cliente.total,
        media: Math.round((cliente.total / 5) * 10) / 10, // Média mensal
        crescimentoAbril: this.calculateClientGrowthFromApril(cliente)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  // Calcular crescimento do cliente desde abril
  static calculateClientGrowthFromApril(cliente) {
    const antesAbril = (cliente.janeiro || 0) + (cliente.fevereiro || 0) + (cliente.marco || 0);
    const depoisAbril = (cliente.abril || 0) + (cliente.maio || 0);
    
    const mediaAntes = antesAbril / 3;
    const mediaDepois = depoisAbril / 2;
    
    return mediaAntes > 0 ? Math.round(((mediaDepois - mediaAntes) / mediaAntes) * 100) : 100;
  }

  // Distribuição por tipo de relatório
  static getReportTypeDistribution(data) {
    if (!data) return [];

    const tipos = [
      { 
        tipo: 'Relatórios Gerais', 
        valor: data.visaoGeral ? data.visaoGeral.reduce((sum, c) => sum + c.total, 0) : 0,
        descricao: 'Relatórios principais'
      },
      { 
        tipo: 'Semanais', 
        valor: data.semanais ? data.semanais.reduce((sum, c) => sum + c.total, 0) : 0,
        descricao: 'Relatórios semanais'
      },
      { 
        tipo: 'Mensais', 
        valor: data.mensais ? data.mensais.reduce((sum, c) => sum + c.total, 0) : 0,
        descricao: 'Relatórios mensais'
      },

    ];
    
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];
    const totalGeral = tipos.reduce((sum, t) => sum + t.valor, 0);
    
    return tipos
      .filter(item => item.valor > 0) // Filtrar tipos sem dados
      .map((item, index) => ({
        ...item,
        color: colors[index % colors.length],
        percentual: this.calculatePercentage(item.valor, totalGeral)
      }));
  }

  // Calcular percentual
  static calculatePercentage(value, total) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  // Comparativo anual (Design)
  static getYearlyComparison(data) {
    if (!data || !data.design) return [];

    return data.design
      .filter(item => (item['2024'] || 0) > 0 || (item['2025'] || 0) > 0)
      .map(cliente => ({
        cliente: cliente.cliente,
        '2024': cliente['2024'] || 0,
        '2025': cliente['2025'] || 0,
        crescimento: (cliente['2024'] || 0) > 0 ? 
          Math.round(((cliente['2025'] - cliente['2024']) / cliente['2024']) * 100) : 100,
        variacao: (cliente['2025'] || 0) - (cliente['2024'] || 0)
      }))
      .sort((a, b) => b['2025'] - a['2025']);
  }

  // Análise de sazonalidade
  static getSeasonalityAnalysis(data) {
    if (!data || !data.visaoGeral) return [];

    const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    
    return meses.map(mes => {
      const total = data.visaoGeral.reduce((sum, cliente) => sum + (cliente[mes] || 0), 0);
      const clientesAtivos = data.visaoGeral.filter(cliente => (cliente[mes] || 0) > 0).length;
      
      return {
        mes: mes.charAt(0).toUpperCase() + mes.slice(1),
        total,
        clientesAtivos,
        mediaCliente: clientesAtivos > 0 ? Math.round((total / clientesAtivos) * 10) / 10 : 0
      };
    });
  }

  // Estatísticas avançadas
  static getAdvancedStats(data) {
    if (!data || !data.visaoGeral) return {};

    const totals = data.visaoGeral.map(cliente => cliente.total);
    const soma = totals.reduce((sum, val) => sum + val, 0);
    const media = soma / totals.length;
    
    // Desvio padrão
    const variance = totals.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / totals.length;
    const desvioPadrao = Math.sqrt(variance);
    
    // Quartis
    const sorted = [...totals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const mediana = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];

    return {
      media: Math.round(media * 10) / 10,
      mediana,
      desvioPadrao: Math.round(desvioPadrao * 10) / 10,
      quartis: { q1, mediana, q3 },
      amplitude: Math.max(...totals) - Math.min(...totals)
    };
  }

  // Projeções baseadas na tendência atual
  static getProjections(data) {
    if (!data || !data.visaoGeral) return {};

    const trendData = this.processMonthlyTrend(data);
    const ultimos3Meses = trendData.slice(-3);
    
    if (ultimos3Meses.length < 3) return {};

    // Calcular taxa de crescimento média
    let taxaCrescimento = 0;
    for (let i = 1; i < ultimos3Meses.length; i++) {
      const anterior = ultimos3Meses[i - 1].total;
      const atual = ultimos3Meses[i].total;
      if (anterior > 0) {
        taxaCrescimento += (atual - anterior) / anterior;
      }
    }
    taxaCrescimento = taxaCrescimento / (ultimos3Meses.length - 1);

    const ultimoMes = ultimos3Meses[ultimos3Meses.length - 1].total;
    
    return {
      projecaoJunho: Math.round(ultimoMes * (1 + taxaCrescimento)),
      projecaoJulho: Math.round(ultimoMes * Math.pow(1 + taxaCrescimento, 2)),
      taxaCrescimentoMensal: Math.round(taxaCrescimento * 100 * 10) / 10,
      projecaoAnual: Math.round(ultimoMes * 12 * (1 + taxaCrescimento))
    };
  }
}