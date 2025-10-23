// ========================================== 
// src/services/metricsService.js
// Serviço para cálculos de métricas e KPIs
// ==========================================

export class MetricsService {
  // ------------------------------------------
  // Utilidades internas
  // ------------------------------------------
  static MONTH_KEYS = [
    'janeiro','fevereiro','marco','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro'
  ];

  static monthLabel(key) {
    const map = {
      janeiro: 'Jan', fevereiro: 'Fev', marco: 'Mar', abril: 'Abr', maio: 'Mai',
      junho: 'Jun', julho: 'Jul', agosto: 'Ago', setembro: 'Set', outubro: 'Out',
      novembro: 'Nov', dezembro: 'Dez'
    };
    return map[key] || key;
  }

  static monthsWithData(rows = []) {
    if (!rows || rows.length === 0) return [];
    return this.MONTH_KEYS.filter(m => rows.some(c => (c?.[m] || 0) > 0));
  }

  static safeSum(arr, selector = x => x) {
    return (arr || []).reduce((s, v) => s + (selector(v) || 0), 0);
  }

  // ------------------------------------------
  // Métricas principais (cards)
  // - Adiciona: mediaMensal2024 e mediaMensal2025
  // - Corrige médias usando quantidade real de meses com dados
  // ------------------------------------------
  static calculateMainMetrics(data) {
    const current = data?.visaoGeral || [];
    const prev = data?.visaoGeral2024 || [];
    const design = data?.design || [];

    if (current.length === 0) {
      return {
        totalClientes: 0,
        totalRelatorios: 0,
        mediaClienteMes: 0,
        mediaMensal: 0,
        mediaMensal2024: 0,
        mediaMensal2025: 0,
        produtividadeMensal: 0,
        crescimento: 0,
        maiorCliente: { cliente: 'N/A', total: 0 },
        crescimentoDesign: 0
      };
    }

    const totalClientes2025 = current.length;
    const totalRelatorios2025 = this.safeSum(current, c => c.total);
    const meses2025 = this.monthsWithData(current).length || 1;

    // Média por cliente por mês (2025)
    const mediaClienteMes = totalClientes2025 > 0
      ? totalRelatorios2025 / totalClientes2025 / meses2025
      : 0;

    // Produtividade mensal total (2025)
    const produtividadeMensal = Math.round(totalRelatorios2025 / Math.max(meses2025, 1));

    // Crescimento desde abril (comparando médias antes/depois)
    const sumAntesAbril = this.safeSum(current, c => (c.janeiro || 0) + (c.fevereiro || 0) + (c.marco || 0));
    const sumDepoisAbril = this.safeSum(current, c => (c.abril || 0) + (c.maio || 0) + (c.junho || 0));
    const mesesAntes = ['janeiro','fevereiro','marco'].filter(m => current.some(c => (c[m] || 0) > 0)).length || 1;
    const mesesDepois = ['abril','maio','junho'].filter(m => current.some(c => (c[m] || 0) > 0)).length || 1;

    const mediaAntesAbril = sumAntesAbril / Math.max(mesesAntes, 1);
    const mediaDepoisAbril = sumDepoisAbril / Math.max(mesesDepois, 1);

    const crescimento = mediaAntesAbril > 0
      ? ((mediaDepoisAbril - mediaAntesAbril) / mediaAntesAbril) * 100
      : 100;

    // Médias de 2024 e 2025 para exibir nos cards
    const meses2024 = this.monthsWithData(prev).length || 1;
    const totalClientes2024 = prev.length || 0;
    const totalRelatorios2024 = this.safeSum(prev, c => c.total);

    const mediaMensal2025 = totalClientes2025 > 0
      ? Math.round((totalRelatorios2025 / Math.max(meses2025, 1) / totalClientes2025) * 10) / 10
      : 0;

    const mediaMensal2024 = (totalClientes2024 > 0)
      ? Math.round((totalRelatorios2024 / Math.max(meses2024, 1) / totalClientes2024) * 10) / 10
      : 0;

    // “mediaMensal” genérica = média de 2025 (mantém compatibilidade com telas)
    const mediaMensal = Math.round(mediaClienteMes * 10) / 10;

    return {
      totalClientes: totalClientes2025,
      totalRelatorios: totalRelatorios2025,
      mediaClienteMes: Math.round(mediaClienteMes * 10) / 10,
      mediaMensal,                 // para telas que usam “mediaMensal”
      mediaMensal2024,             // ✅ card “Média 2024”
      mediaMensal2025,             // ✅ card “Média 2025”
      produtividadeMensal,         // total/mês
      crescimento: Math.round(Math.max(0, crescimento)),
      maiorCliente: this.findTopClient(current),
      crescimentoDesign: this.calculateDesignGrowth(design)
    };
  }

  // Encontrar cliente com maior produção
  static findTopClient(visaoGeral) {
    if (!visaoGeral || visaoGeral.length === 0) {
      return { cliente: 'N/A', total: 0 };
    }
    return visaoGeral.reduce((max, cliente) => (cliente.total || 0) > (max.total || 0) ? cliente : max);
  }

  // Calcular crescimento do design (2024 x 2025)
  static calculateDesignGrowth(designData) {
    if (!designData || designData.length === 0) return 0;
    const total2024 = this.safeSum(designData, r => r['2024']);
    const total2025 = this.safeSum(designData, r => r['2025']);
    return total2024 > 0 ? Math.round(((total2025 - total2024) / total2024) * 100) : 100;
  }

  // Tendência mensal (2025) dinamicamente pelos meses com dados
  static processMonthlyTrend(data) {
    const rows = data?.visaoGeral || [];
    if (rows.length === 0) return [];

    const meses = this.monthsWithData(rows);
    return meses.map((key, idx) => {
      const total = this.safeSum(rows, c => c[key]);
      const crescimentoFlag = ['abril','maio','junho'].includes(key);
      const previousKey = idx > 0 ? meses[idx - 1] : null;
      const percentualCrescimento = previousKey
        ? this.calculateMonthlyGrowth(data, key, previousKey)
        : null;

      return {
        mes: this.monthLabel(key),
        total,
        crescimento: crescimentoFlag,
        percentualCrescimento
      };
    });
  }

  // Crescimento de um mês em relação ao anterior
  static calculateMonthlyGrowth(data, currentMonth, previousMonth = null) {
    const rows = data?.visaoGeral || [];
    if (rows.length === 0) return 0;

    const meses = this.monthsWithData(rows);
    const curr = currentMonth;
    const prev = previousMonth || meses[Math.max(meses.indexOf(curr) - 1, 0)];
    if (!prev || prev === curr) return 0;

    const currentTotal = this.safeSum(rows, c => c[curr]);
    const previousTotal = this.safeSum(rows, c => c[prev]);

    return previousTotal > 0
      ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100)
      : 0;
  }

  // Ranking de clientes (retorna ordenado; sem corte fixo de top 10)
  static getTopClients(data, limit = 6) {
    const rows = data?.visaoGeral || [];
    if (rows.length === 0) return [];

    const meses = this.monthsWithData(rows).length || 1;

    return rows
      .map(cliente => ({
        cliente: cliente.cliente,
        total: cliente.total || 0,
        media: Math.round(((cliente.total || 0) / meses) * 10) / 10,
        crescimentoAbril: this.calculateClientGrowthFromApril(cliente)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  // Crescimento do cliente desde abril (média antes vs depois)
  static calculateClientGrowthFromApril(cliente) {
    const antes = (cliente.janeiro || 0) + (cliente.fevereiro || 0) + (cliente.marco || 0);
    const mesesAntes = ['janeiro','fevereiro','marco'].filter(m => (cliente[m] || 0) > 0).length || 1;
    const mediaAntes = antes / mesesAntes;

    const depois = (cliente.abril || 0) + (cliente.maio || 0) + (cliente.junho || 0);
    const mesesDepois = ['abril','maio','junho'].filter(m => (cliente[m] || 0) > 0).length || 1;
    const mediaDepois = depois / mesesDepois;

    return mediaAntes > 0 ? Math.round(((mediaDepois - mediaAntes) / mediaAntes) * 100) : 100;
  }

  // Distribuição por tipo de relatório (tabela)
  static getReportTypeDistribution(data) {
    if (!data) return [];

    const tipos = [
      {
        tipo: 'Relatórios Gerais',
        valor: this.safeSum(data.visaoGeral, c => c.total),
        descricao: 'Relatórios principais'
      },
      {
        tipo: 'Semanais',
        valor: this.safeSum(data.semanais, c => c.total),
        descricao: 'Relatórios semanais'
      },
      {
        tipo: 'Mensais',
        valor: this.safeSum(data.mensais, c => c.total),
        descricao: 'Relatórios mensais'
      }
      // Adicione outros tipos se existirem no seu dataset (Especiais, Diagnósticos, etc.)
    ];

    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    const totalGeral = this.safeSum(tipos, t => t.valor);

    return tipos
      .filter(item => item.valor > 0)
      .map((item, index) => ({
        ...item,
        color: colors[index % colors.length],
        percentual: this.calculatePercentage(item.valor, totalGeral)
      }));
  }

  static calculatePercentage(value, total) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  // Comparativo anual (Design) 2024 x 2025
  static getYearlyComparison(data) {
    const design = data?.design || [];
    if (design.length === 0) return [];

    return design
      .filter(item => (item['2024'] || 0) > 0 || (item['2025'] || 0) > 0)
      .map(cliente => ({
        cliente: cliente.cliente,
        '2024': cliente['2024'] || 0,
        '2025': cliente['2025'] || 0,
        crescimento: (cliente['2024'] || 0) > 0
          ? Math.round((( (cliente['2025'] || 0) - (cliente['2024'] || 0) ) / (cliente['2024'] || 0)) * 100)
          : 100,
        variacao: (cliente['2025'] || 0) - (cliente['2024'] || 0)
      }))
      .sort((a, b) => (b['2025'] || 0) - (a['2025'] || 0));
  }

  // Análise de sazonalidade (média por cliente ativo no mês)
  static getSeasonalityAnalysis(data) {
    const rows = data?.visaoGeral || [];
    if (rows.length === 0) return [];

    const meses = this.monthsWithData(rows);
    return meses.map(mes => {
      const total = this.safeSum(rows, c => c[mes]);
      const clientesAtivos = (rows || []).filter(c => (c[mes] || 0) > 0).length;
      return {
        mes: mes.charAt(0).toUpperCase() + mes.slice(1),
        total,
        clientesAtivos,
        mediaCliente: clientesAtivos > 0 ? Math.round((total / clientesAtivos) * 10) / 10 : 0
      };
    });
  }

  // Estatísticas avançadas (média, mediana, desvio padrão, quartis, amplitude)
  static getAdvancedStats(data) {
    const rows = data?.visaoGeral || [];
    if (rows.length === 0) return {};

    const totals = rows.map(c => c.total || 0);
    const soma = this.safeSum(totals);
    const media = totals.length > 0 ? soma / totals.length : 0;

    // Desvio padrão (populacional)
    const variance = totals.length > 0
      ? totals.reduce((sum, v) => sum + Math.pow(v - media, 2), 0) / totals.length
      : 0;
    const desvioPadrao = Math.sqrt(variance);

    // Quartis
    const sorted = [...totals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
    const mediana = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;

    return {
      media: Math.round(media * 10) / 10,
      mediana,
      desvioPadrao: Math.round(desvioPadrao * 10) / 10,
      quartis: { q1, mediana, q3 },
      amplitude: (sorted[sorted.length - 1] ?? 0) - (sorted[0] ?? 0)
    };
  }

  // Projeções baseadas na tendência dos últimos 3 meses com dados
  static getProjections(data) {
    const trendData = this.processMonthlyTrend(data);
    const ultimos3Meses = trendData.slice(-3);
    if (ultimos3Meses.length < 3) return {};

    // taxa média entre os 3 últimos pontos
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
