// ==========================================
// src/services/dataProcessingService.js
// VERSÃO COMPLETA COM TODOS OS MÉTODOS NECESSÁRIOS + CORREÇÕES
// ==========================================

export class DataProcessingService {
  // ------------------------------------------
  // Constantes e utilidades internas
  // ------------------------------------------
  static MONTH_KEYS = [
    'janeiro','fevereiro','marco','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro'
  ];

  static GRUPO_EMPRESAS = ['Inpacto','STA','Holding','Listening'];

  // 🆕 Conta quantos meses realmente têm dados (>0) em pelo menos um cliente
  static monthsWithData(rows = []) {
    if (!rows || rows.length === 0) return 0;
    return this.MONTH_KEYS.filter(m => rows.some(c => (c?.[m] || 0) > 0)).length || 1;
  }

  // 🆕 FUNÇÃO AUXILIAR: Arredondamento consistente
  static roundToDecimal(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // 🆕 FUNÇÃO AUXILIAR: Formatação para exibição
  static formatDisplayValue(value, decimals = 1) {
    const rounded = this.roundToDecimal(value, decimals);
    return parseFloat(rounded.toFixed(decimals));
  }

  // ==========================================
  // APLICAR FILTROS - MÉTODO PRINCIPAL
  // ==========================================
  static applyAdvancedFilters(data, filters) {
    if (!data) {
      console.warn('⚠️ Dados não fornecidos para filtros');
      return null;
    }

    console.log('🔧 [FILTROS] Iniciando aplicação de filtros:', filters);
    console.log('🔧 [FILTROS] Dados originais:', {
      visaoGeral: data.visaoGeral?.length || 0,
      visaoGeral2024: data.visaoGeral2024?.length || 0,
      design: data.design?.length || 0,
      originalOrders: data.originalOrders?.length || 0
    });

    // Criar cópia profunda
    let filteredData = JSON.parse(JSON.stringify(data));

    // 1) Tipo de demanda original
    if (filters?.tipoDemandaOriginal && filters.tipoDemandaOriginal !== 'todos') {
      filteredData = this.applyOriginalTypeFilter(filteredData, filters.tipoDemandaOriginal);
      console.log('🔧 [FILTROS] Após filtro de tipo original:', {
        tipo: filters.tipoDemandaOriginal,
        ordens: filteredData.originalOrders?.length || 0
      });
    }

    // 2) Período
    filteredData = this.applyPeriodFilter(filteredData, filters?.periodo);
    console.log('🔧 [FILTROS] Após período:', {
      periodo: filters?.periodo,
      visaoGeral: filteredData.visaoGeral?.length || 0
    });

    // 3) Tipo de conteúdo (categorias)
    filteredData = this.applyContentTypeFilter(filteredData, filters?.tipo);
    console.log('🔧 [FILTROS] Após tipo:', {
      tipo: filters?.tipo,
      visaoGeral: filteredData.visaoGeral?.length || 0
    });

    // 4) Cliente
    filteredData = this.applyClientFilter(filteredData, filters?.cliente);
    console.log('🔧 [FILTROS] Após cliente:', {
      cliente: filters?.cliente,
      visaoGeral: filteredData.visaoGeral?.length || 0
    });

    // 5) Recalcular totais
    filteredData = this.recalculateTotals(filteredData);

    console.log('✅ [FILTROS] Concluído:', {
      ordens: filteredData.originalOrders?.length || 0,
      clientes: filteredData.visaoGeral?.length || 0,
      totalRelatorios: filteredData.visaoGeral?.reduce((s, c) => s + (c.total || 0), 0) || 0
    });
    return filteredData;
  }

  // ==========================================
  // CONSOLIDAÇÃO (Sheets + Notion)
  // ==========================================
  static consolidateAndNormalize(sheetsData = [], notionData = []) {
    console.log('🔄 [CONSOLIDATION] Iniciando consolidação...');
    const normalizedSheets = (sheetsData || []).map((item, index) => ({
      ...item,
      _source: 'sheets',
      _id: `sheets_${item.id || index}`,
      _sourceIndex: index,
      cliente: item.cliente || item.client || item.clientName || item.Cliente,
      data: item.data || item.date || item.createdAt || item.Data,
      tipo: item.tipo || item.type || item.category || item.Tipo,
      _original: item
    }));

    const normalizedNotion = (notionData || []).map((item, index) => ({
      ...item,
      _source: 'notion',
      _id: `notion_${item.id || index}`,
      _sourceIndex: index,
      cliente: item.Cliente || item.client || item.clientName || item.cliente,
      data: item.Data || item.date || item.createdAt || item.data,
      tipo: item.Tipo || item.Type || item.category || item.tipo,
      _original: item
    }));

    const consolidated = [...normalizedSheets, ...normalizedNotion];
    console.log('✅ [CONSOLIDATION] Concluída:', {
      sheets: normalizedSheets.length,
      notion: normalizedNotion.length,
      total: consolidated.length
    });

    return consolidated;
  }

  // ==========================================
  // CLIENTES ÚNICOS
  // ==========================================
  static getUniqueClients(data) {
    console.log('🏢 [CLIENTES] Extraindo clientes únicos...');
    if (!data) return [];

    try {
      const clientesSet = new Set();
      const processarCliente = (clienteValue) => {
        if (!clienteValue || !String(clienteValue).trim()) return;
        const raw = String(clienteValue).trim();
        if (raw.includes(',')) {
          raw.split(',').forEach(c => {
            const v = c.trim();
            if (v) clientesSet.add(v);
          });
        } else {
          clientesSet.add(raw);
        }
      };

      // 2025
      (data.visaoGeral || []).forEach(i => processarCliente(i.cliente));
      // 2024
      (data.visaoGeral2024 || []).forEach(i => processarCliente(i.cliente));
      // Orders
      (data.originalOrders || []).forEach(o => processarCliente(o.cliente1 || o.cliente));
      // Design
      (data.design || []).forEach(i => processarCliente(i.cliente));
      // Outras seções
      ['diarios','semanais','mensais','especiais','diagnosticos'].forEach(section => {
        (data[section] || []).forEach(i => processarCliente(i.cliente));
        (data[`${section}2024`] || []).forEach(i => processarCliente(i.cliente));
      });

      const prioridade = ['ANP','PETROBRAS','VALE','CFQ','GOVGO','MS'];
      const clientesUnicos = Array.from(clientesSet).sort((a,b) => {
        const ia = prioridade.indexOf(a), ib = prioridade.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b, 'pt-BR');
      });

      console.log('🏢 [CLIENTES] Total:', clientesUnicos.length);
      return clientesUnicos;
    } catch (err) {
      console.error('❌ [CLIENTES] Erro:', err);
      return [];
    }
  }

  // ==========================================
  // MÉTRICAS AVANÇADAS
  // ==========================================
  static calculateAdvancedMetrics(data, filters = {}) {
    console.log('📊 [MÉTRICAS] Calculando (advanced)...');
    if (!data) return this.getEmptyMetrics();

    try {
      const trendData = this.processTrendData(data, filters);
      const actualCurrentMonthIndex = new Date().getMonth();

      const currentData = data.visaoGeral || [];
      const data2024 = data.visaoGeral2024 || [];

      // Calcular médias baseadas nos dados reais de demandas
      let sumAvg2024 = 0;
      let sumAvg2025 = 0;
      let monthsWithActualData = 0;
      let melhorMes = 'N/A';
      let maxAvg2025 = -1;

      // CÁLCULO SIMPLES E DIRETO - Média de demandas 2025
      const dadosOriginais = data.originalOrders || [];
      const mesesAtuais = actualCurrentMonthIndex + 1; // 10 em outubro

      console.log('🔍 [REVISÃO COMPLETA] Dados disponíveis:', {
        totalOriginalOrders: dadosOriginais.length,
        mesAtual: actualCurrentMonthIndex + 1,
        mesesAtuais,
        sampleData: dadosOriginais.slice(0, 3).map(o => ({
          cliente: o.cliente || o.Cliente || o.cliente1,
          dataEntrega: o.dataEntrega || o.DataEntrega || o.data_entrega,
          tipoDemanda: o.tipoDemanda || o.TipoDemanda || o.tipo_demanda
        }))
      });
      
      // Log detalhado dos primeiros 10 registros para debug
      console.log('📋 [AMOSTRA DETALHADA] Primeiros 10 registros:', 
        dadosOriginais.slice(0, 10).map((o, i) => ({
          index: i,
          cliente: o.cliente || o.Cliente || o.cliente1,
          dataEntrega: o.dataEntrega || o.DataEntrega || o.data_entrega,
          tipoDemanda: o.tipoDemanda || o.TipoDemanda || o.tipo_demanda,
          todasAsChaves: Object.keys(o).slice(0, 10) // Primeiras 10 chaves
        }))
      );
      
      // Log expandido com valores completos
      console.log('🔍 [VALORES COMPLETOS] Amostra detalhada:', JSON.stringify(
        dadosOriginais.slice(0, 5).map((o, i) => ({
          index: i,
          cliente: o.cliente || o.Cliente || o.cliente1,
          dataEntrega: o.dataEntrega || o.DataEntrega || o.data_entrega,
          tipoDemanda: o.tipoDemanda || o.TipoDemanda || o.tipo_demanda,
          todasAsChaves: Object.keys(o)
        })), null, 2
      ));

      // Contar TODAS as demandas de 2025 (sem filtros complexos)
      let totalDemandas2025 = 0;
      const clientesUnicos2025 = new Set();
      const demandasPorMes = {};

      dadosOriginais.forEach(order => {
        const dataEntrega = order.dataEntrega || order.DataEntrega || order.data_entrega;
        if (!dataEntrega) return;

        try {
          const data = new Date(dataEntrega);
          const ano = data.getFullYear();
          const mes = data.getMonth();
          
          // Se é 2025 e até o mês atual
          if (ano === 2025 && mes <= actualCurrentMonthIndex) {
            totalDemandas2025++;
            
            // Contar cliente único
            const cliente = order.cliente || order.Cliente || order.cliente1 || 'Cliente Desconhecido';
            clientesUnicos2025.add(cliente.trim());
            
            // Contar por mês para debug
            const nomeMes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][mes];
            demandasPorMes[nomeMes] = (demandasPorMes[nomeMes] || 0) + 1;
          }
        } catch (error) {
          console.warn('⚠️ Erro ao processar data:', dataEntrega, error);
        }
      });

      const totalClientes2025 = clientesUnicos2025.size;

      // Cálculo simples: total de demandas / total de clientes / meses
      const mediaReal2025 = totalClientes2025 > 0 && mesesAtuais > 0 
        ? totalDemandas2025 / totalClientes2025 / mesesAtuais 
        : 0;

      console.log('🧮 [CÁLCULO SIMPLES] Resultado:', {
        totalDemandas2025,
        totalClientes2025,
        mesesAtuais,
        mediaReal2025: mediaReal2025.toFixed(2),
        calculo: `${totalDemandas2025} / ${totalClientes2025} / ${mesesAtuais} = ${mediaReal2025.toFixed(2)}`,
        demandasPorMes,
        clientesUnicos: Array.from(clientesUnicos2025).slice(0, 10)
      });
      
      // Log expandido para debug
      console.log('🔍 [VALORES EXPANDIDOS]:', {
        'Total Demandas 2025': totalDemandas2025,
        'Total Clientes Únicos': totalClientes2025,
        'Meses Atuais': mesesAtuais,
        'Média Calculada': mediaReal2025,
        'Distribuição por Mês': JSON.stringify(demandasPorMes, null, 2),
        'Primeiros 15 Clientes': Array.from(clientesUnicos2025).slice(0, 15)
      });
      
      // Log com valores completos em JSON
      console.log('🔍 [VALORES COMPLETOS JSON]:', JSON.stringify({
        'Total Demandas 2025': totalDemandas2025,
        'Total Clientes Únicos': totalClientes2025,
        'Meses Atuais': mesesAtuais,
        'Média Calculada': mediaReal2025,
        'Distribuição por Mês': demandasPorMes,
        'Todos os Clientes': Array.from(clientesUnicos2025),
        'Cálculo Detalhado': `${totalDemandas2025} / ${totalClientes2025} / ${mesesAtuais} = ${mediaReal2025.toFixed(2)}`
      }, null, 2));

      // Verificação adicional: se ainda estiver baixo, vamos investigar
      if (mediaReal2025 < 2.0) {
        console.warn('⚠️ [ALERTA] Média ainda baixa! Investigando...');
        
        // Contar relatórios diários especificamente
        const relatoriosDiarios = dadosOriginais.filter(order => {
          const dataEntrega = order.dataEntrega || order.DataEntrega || order.data_entrega;
          const tipoDemanda = order.tipoDemanda || order.TipoDemanda || order.tipo_demanda || '';
          
          if (!dataEntrega) return false;
          
          try {
            const data = new Date(dataEntrega);
            const ano = data.getFullYear();
            const mes = data.getMonth();
            
            return ano === 2025 && mes <= actualCurrentMonthIndex && 
                   tipoDemanda.toLowerCase().includes('diário');
          } catch {
            return false;
          }
        });

        console.log('📊 [INVESTIGAÇÃO] Relatórios diários:', {
          totalRelatoriosDiarios: relatoriosDiarios.length,
          mediaApenasDiarios: relatoriosDiarios.length / totalClientes2025 / mesesAtuais,
          sampleRelatorios: relatoriosDiarios.slice(0, 5).map(r => ({
            cliente: r.cliente || r.Cliente || r.cliente1,
            dataEntrega: r.dataEntrega || r.DataEntrega || r.data_entrega,
            tipoDemanda: r.tipoDemanda || r.TipoDemanda || r.tipo_demanda
          }))
        });
        
        // Log expandido da investigação
        console.log('🔍 [INVESTIGAÇÃO EXPANDIDA]:', {
          'Total Relatórios Diários': relatoriosDiarios.length,
          'Média Apenas Diários': (relatoriosDiarios.length / totalClientes2025 / mesesAtuais).toFixed(2),
          'Comparação': {
            'Média Geral': mediaReal2025.toFixed(2),
            'Média Apenas Diários': (relatoriosDiarios.length / totalClientes2025 / mesesAtuais).toFixed(2),
            'Diferença': (mediaReal2025 - (relatoriosDiarios.length / totalClientes2025 / mesesAtuais)).toFixed(2)
          },
          'Amostra Relatórios Diários': relatoriosDiarios.slice(0, 10).map((r, i) => ({
            index: i,
            cliente: r.cliente || r.Cliente || r.cliente1,
            dataEntrega: r.dataEntrega || r.DataEntrega || r.data_entrega,
            tipoDemanda: r.tipoDemanda || r.TipoDemanda || r.tipo_demanda
          }))
        });
        
        // Log completo da investigação em JSON
        console.log('🔍 [INVESTIGAÇÃO COMPLETA JSON]:', JSON.stringify({
          'Total Relatórios Diários': relatoriosDiarios.length,
          'Média Apenas Diários': (relatoriosDiarios.length / totalClientes2025 / mesesAtuais).toFixed(2),
          'Comparação': {
            'Média Geral': mediaReal2025.toFixed(2),
            'Média Apenas Diários': (relatoriosDiarios.length / totalClientes2025 / mesesAtuais).toFixed(2),
            'Diferença': (mediaReal2025 - (relatoriosDiarios.length / totalClientes2025 / mesesAtuais)).toFixed(2)
          },
          'Todos os Relatórios Diários': relatoriosDiarios.map((r, i) => ({
            index: i,
            cliente: r.cliente || r.Cliente || r.cliente1,
            dataEntrega: r.dataEntrega || r.DataEntrega || r.data_entrega,
            tipoDemanda: r.tipoDemanda || r.TipoDemanda || r.tipo_demanda
          }))
        }, null, 2));
      }

      console.log('🔍 [DEBUG] Resultado final:', {
        totalDemandas2025,
        totalClientes2025,
        mesesAtuais,
        mediaReal2025: this.formatDisplayValue(mediaReal2025, 1),
        calculo: `${totalDemandas2025} / ${totalClientes2025} / ${mesesAtuais} = ${mediaReal2025.toFixed(2)}`
      });

      // Manter cálculo original para 2024 e outros dados
      trendData.forEach((item, index) => {
        sumAvg2024 += item.value2024 || 0;
        if (index <= actualCurrentMonthIndex && item.value2025 !== null) {
          sumAvg2025 += item.value2025;
          monthsWithActualData++;
          if (item.value2025 > maxAvg2025) {
            maxAvg2025 = item.value2025;
            melhorMes = item.month;
          }
        }
      });

      const overallAvg2024 = sumAvg2024 / 12;
      const overallAvg2025 = mediaReal2025; // Usar o cálculo real

      const crescimento = overallAvg2024 > 0
        ? ((overallAvg2025 - overallAvg2024) / overallAvg2024) * 100
        : 0;

      const uniqueClients = new Set();
      let totalRelatorios = 0;
      currentData.forEach(item => {
        uniqueClients.add(item.cliente || 'Cliente Desconhecido');
        totalRelatorios += item.total || 0;
      });

      const topCliente = currentData.length > 0
        ? currentData.reduce((max, c) => ((c.total || 0) > (max.total || 0) ? c : max), currentData[0])
        : null;

      return {
        totalClientes: uniqueClients.size,
        totalClientes2024: data2024.length,
        totalRelatorios,
        totalDemandas: totalRelatorios,
        crescimento: this.roundToDecimal(crescimento, 0),
        crescimentoDemandas: this.roundToDecimal(crescimento, 0),
        mediaMensal2024: this.formatDisplayValue(overallAvg2024, 1),
        mediaMensal2025: this.formatDisplayValue(overallAvg2025, 1),
        mediaMensal: this.formatDisplayValue(overallAvg2025, 1),
        produtividade: this.formatDisplayValue(overallAvg2025, 1),
        melhorCliente: topCliente ? {
          cliente: topCliente.cliente,
          total: topCliente.total || 0,
          crescimento: 0
        } : { cliente: 'N/A', total: 0, crescimento: 0 },
        melhorMes,
        mesesAnalisados: monthsWithActualData,
        distribuicao: this.calculateVolumeDistribution(currentData),
        ultimaAtualizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [MÉTRICAS] Erro:', error);
      return this.getEmptyMetrics();
    }
  }

  // ==========================================
  // TREND DATA (12 meses, 2024 x 2025)
  // ==========================================
  static processTrendData(data, filters = {}) {
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const monthKeys = this.MONTH_KEYS;
    const actualCurrentMonthIndex = new Date().getMonth();

    const currentData = data.visaoGeral || [];
    const data2024 = data.visaoGeral2024 || [];

    const monthly = {};
    monthNames.forEach((name, idx) => {
      monthly[name] = {
        totalReports2024: 0,
        uniqueClients2024: new Set(),
        totalReports2025: 0,
        uniqueClients2025: new Set(),
        monthKey: monthKeys[idx],
        monthIndex: idx
      };
    });

    data2024.forEach(c => {
      monthKeys.forEach((mk, i) => {
        const v = c[mk] || 0;
        if (v > 0) {
          monthly[monthNames[i]].totalReports2024 += v;
          monthly[monthNames[i]].uniqueClients2024.add(c.cliente);
        }
      });
    });

    currentData.forEach(c => {
      monthKeys.forEach((mk, i) => {
        const v = c[mk] || 0;
        if (v > 0) {
          monthly[monthNames[i]].totalReports2025 += v;
          monthly[monthNames[i]].uniqueClients2025.add(c.cliente);
        }
      });
    });

    const trendChartData = monthNames.map((name, idx) => {
      const ag = monthly[name];

      const avg2024 = ag.uniqueClients2024.size > 0
        ? this.formatDisplayValue(ag.totalReports2024 / ag.uniqueClients2024.size, 1)
        : 0;

      let avg2025 = null;
      if (idx <= actualCurrentMonthIndex) {
        avg2025 = ag.uniqueClients2025.size > 0
          ? this.formatDisplayValue(ag.totalReports2025 / ag.uniqueClients2025.size, 1)
          : 0;
      }

      return {
        month: name,
        mes: name,
        value2024: parseFloat(avg2024.toFixed(1)),
        value2025: avg2025 !== null ? parseFloat(avg2025.toFixed(1)) : null,
        debug: {
          reports2024: ag.totalReports2024,
          clients2024: ag.uniqueClients2024.size,
          reports2025: ag.totalReports2025,
          clients2025: ag.uniqueClients2025.size,
          monthIndex: idx,
          isFutureMonth: idx > actualCurrentMonthIndex
        },
        total: ag.totalReports2025,
        media: avg2025,
        total2024: ag.totalReports2024,
        media2024: avg2024,
        crescimento: avg2024 > 0 && avg2025 !== null
          ? Math.round(((avg2025 - avg2024) / avg2024) * 100)
          : 0
      };
    });

    return trendChartData;
  }

  // ==========================================
  // MÉTODOS AUXILIARES PARA MÉTRICAS
  // ==========================================
  static getEmptyMetrics() {
    return {
      totalClientes: 0,
      totalClientes2024: 0,
      totalDemandas: 0,
      totalDemandas2024: 0,
      totalRelatorios: 0,
      crescimentoClientes: 0,
      crescimentoDemandas: 0,
      crescimento: 0,
      mediaMensal: 0,
      mediaMensal2024: 0,
      mediaMensal2025: 0,
      mediaPorCliente: 0,
      mediaPorCliente2024: 0,
      produtividade: 0,
      melhorCliente: { cliente: 'N/A', total: 0, crescimento: 0 },
      melhorMes: 'N/A',
      mesesAnalisados: 0,
      distribuicao: { alto: 0, medio: 0, baixo: 0 },
      ultimaAtualizacao: new Date().toISOString()
    };
  }

  static calculateGrowthPercentage(valorAnterior, valorAtual, mesesAnterior, mesesAtual) {
    if (!valorAnterior || valorAnterior === 0) {
      return valorAtual > 0 ? 100 : 0;
    }
    const mediaAnterior = valorAnterior / mesesAnterior;
    const mediaAtual = valorAtual / mesesAtual;
    return Math.round(((mediaAtual - mediaAnterior) / mediaAnterior) * 100);
  }

  static calculateVolumeDistribution(clientes) {
    const distribuicao = { alto: 0, medio: 0, baixo: 0 };
    (clientes || []).forEach(cliente => {
      const total = cliente.total || 0;
      if (total > 50) distribuicao.alto++;
      else if (total >= 20) distribuicao.medio++;
      else if (total > 0) distribuicao.baixo++;
    });
    return distribuicao;
  }

  static calculateDesignMetrics(designData) {
    if (!designData || designData.length === 0) {
      return { total2024: 0, total2025: 0, crescimento: 0, clientes: 0 };
    }
    const total2024 = designData.reduce((s, i) => s + (i['2024'] || 0), 0);
    const total2025 = designData.reduce((s, i) => s + (i['2025'] || 0), 0);
    const crescimento = this.calculateGrowth(total2024, total2025);
    return { total2024, total2025, crescimento, clientes: designData.length };
  }

  static calculateClientRetention(clientes2024, clientesAtual) {
    if (!clientes2024 || !clientesAtual) return 0;
    const nomes2024 = new Set(clientes2024.map(c => c.cliente));
    return clientesAtual.filter(c => nomes2024.has(c.cliente)).length;
  }

  static calculateTypeMetrics(orders) {
    if (!orders || orders.length === 0) {
      return { totalTipos: 0, tipoMaisComum: null, distribuicao: {} };
    }
    const tipos = {};
    orders.forEach(o => {
      const t = o.tipoDemanda;
      if (t && t.trim()) tipos[t] = (tipos[t] || 0) + 1;
    });
    const tipoMaisComum = Object.keys(tipos).length > 0
      ? Object.keys(tipos).reduce((a, b) => (tipos[a] > tipos[b] ? a : b))
      : null;
    return { totalTipos: Object.keys(tipos).length, tipoMaisComum, distribuicao: tipos };
  }

  static calculateMonthlyTrend(clientes) {
    if (!clientes || clientes.length === 0) return 'estável';
    const meses = ['janeiro','fevereiro','marco','abril','maio'];
    const totaisMensais = meses.map(m => clientes.reduce((s,c) => s + (c[m] || 0), 0));
    let crescente = 0, decrescente = 0;
    for (let i = 1; i < totaisMensais.length; i++) {
      if (totaisMensais[i] > totaisMensais[i-1]) crescente++;
      else if (totaisMensais[i] < totaisMensais[i-1]) decrescente++;
    }
    if (crescente > decrescente) return 'crescente';
    if (decrescente > crescente) return 'decrescente';
    return 'estável';
  }

  // ==========================================
  // TIPOS ÚNICOS DE CONTEÚDO
  // ==========================================
  static extractUniqueContentTypes(data) {
    console.log('🏷️ [TIPOS] Extraindo tipos únicos de demanda (normalizado)...');
    if (!data || !Array.isArray(data.originalOrders)) return [];

    try {
      const tiposMap = new Map();
      (data.originalOrders || []).forEach((order, index) => {
        const tipoOriginal = order.tipoDemanda;
        if (!tipoOriginal || !tipoOriginal.trim()) return;

        const limpo = tipoOriginal.trim();
        const normalizado = limpo.toLowerCase();

        const escolherVersaoPreferida = (a, b) => {
          const aCap = (a.match(/\b[A-Z]/g) || []).length;
          const bCap = (b.match(/\b[A-Z]/g) || []).length;
          if (a[0] === a[0].toUpperCase() && b[0] !== b[0].toUpperCase()) return a;
          if (b[0] === b[0].toUpperCase() && a[0] !== a[0].toUpperCase()) return b;
          if (aCap > bCap) return a;
          if (bCap > aCap) return b;
          if (a.length > b.length) return a;
          if (b.length > a.length) return b;
          return a;
        };

        if (tiposMap.has(normalizado)) {
          const existente = tiposMap.get(normalizado);
          tiposMap.set(normalizado, {
            original: escolherVersaoPreferida(existente.original, limpo),
            normalizado,
            contador: existente.contador + 1
          });
        } else {
          tiposMap.set(normalizado, { original: limpo, normalizado, contador: 1 });
        }
      });

      const tiposUnicos = Array.from(tiposMap.values())
        .map(t => t.original)
        .sort((a,b) => a.localeCompare(b, 'pt-BR'));

      const slug = (s) => s.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[áàâãä]/g, 'a').replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i').replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u').replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9_]/g, '');

      return tiposUnicos.map(tipo => ({
        id: slug(tipo),
        label: tipo,
        value: tipo,
        icon: this.getIconForDemandType(tipo),
        category: this.categorizeDemandType(tipo)
      }));
    } catch (err) {
      console.error('❌ [TIPOS] Erro:', err);
      return [];
    }
  }

  // Auxiliares de tipo
  static escolherVersaoPreferida(a, b) {
    const aCap = (a.match(/\b[A-Z]/g) || []).length;
    const bCap = (b.match(/\b[A-Z]/g) || []).length;
    if (a[0] === a[0].toUpperCase() && b[0] !== b[0].toUpperCase()) return a;
    if (b[0] === b[0].toUpperCase() && a[0] !== a[0].toUpperCase()) return b;
    if (aCap > bCap) return a;
    if (bCap > aCap) return b;
    if (a.length > b.length) return a;
    if (b.length > a.length) return b;
    return a;
  }

  static getIconForDemandType(tipo) {
    const t = (tipo || '').toLowerCase();
    if (t.includes('relatório') || t.includes('relatorio')) {
      if (t.includes('semanal')) return '📊';
      if (t.includes('mensal')) return '📅';
      if (t.includes('diário') || t.includes('diario')) return '🗓️';
      if (t.includes('anual')) return '📋';
      return '📄';
    }
    if (t.includes('monitoramento')) return '👁️';
    if (t.includes('acompanhamento')) return '📈';
    if (t.includes('análise') || t.includes('analise')) return '🔍';
    if (t.includes('diagnóstico') || t.includes('diagnostico')) return '🔬';
    if (t.includes('projeto')) return '⭐';
    if (t.includes('estratégi') || t.includes('estrategi')) return '🎯';
    if (t.includes('planejamento')) return '📋';
    if (t.includes('design')) return '🎨';
    if (t.includes('criação') || t.includes('criacao')) return '✨';
    if (t.includes('arte')) return '🖼️';
    if (t.includes('comunicação') || t.includes('comunicacao')) return '📢';
    if (t.includes('nota')) return '📝';
    if (t.includes('boletim')) return '📰';
    if (t.includes('pesquisa')) return '🔎';
    if (t.includes('estudo')) return '📚';
    if (t.includes('levantamento')) return '📊';
    return '📋';
  }

  static categorizeDemandType(tipo) {
    const t = (tipo || '').toLowerCase();
    if (t.includes('relatório') || t.includes('relatorio')) return 'Relatórios';
    if (t.includes('monitoramento') || t.includes('acompanhamento')) return 'Monitoramento';
    if (t.includes('análise') || t.includes('analise') || t.includes('diagnóstico') || t.includes('diagnostico')) return 'Análises';
    if (t.includes('design') || t.includes('criação') || t.includes('arte')) return 'Design';
    if (t.includes('projeto') || t.includes('estratégi') || t.includes('planejamento')) return 'Projetos';
    if (t.includes('comunicação') || t.includes('nota') || t.includes('boletim')) return 'Comunicação';
    return 'Outros';
  }

  // ==========================================
  // FILTROS
  // ==========================================
  static applyOriginalTypeFilter(data, tipoFiltro) {
    console.log('🔍 [TIPO ORIGINAL] Aplicando filtro:', tipoFiltro);
    if (!data || !data.originalOrders || tipoFiltro === 'todos' || !tipoFiltro) return data;

    try {
      const filteredOrders = data.originalOrders.filter(order =>
        order.tipoDemanda && order.tipoDemanda.trim() === tipoFiltro
      );

      const filteredData = {
        ...data,
        originalOrders: filteredOrders,
        visaoGeral: this.aggregateByClient(filteredOrders),
        metrics: this.recalculateMetricsFromOrders(filteredOrders)
      };
      return filteredData;
    } catch (err) {
      console.error('❌ [TIPO ORIGINAL] Erro:', err);
      return data;
    }
  }

  static aggregateByClient(orders) {
    if (!orders || orders.length === 0) return [];
    const stats = {};
    orders.forEach(order => {
      const cliente = order.cliente1 || order.cliente;
      if (!cliente || !cliente.trim()) return;

      if (!stats[cliente]) {
        stats[cliente] = {
          cliente, total: 0, concluidos: 0, pendentes: 0, atrasados: 0,
          2024: 0, 2025: 0,
          janeiro:0,fevereiro:0,marco:0,abril:0,maio:0,junho:0,
          julho:0,agosto:0,setembro:0,outubro:0,novembro:0,dezembro:0
        };
      }
      const st = stats[cliente];
      st.total++;
      if (order.isConcluido) st.concluidos++; else st.pendentes++;
      if (order.isAtrasado) st.atrasados++;

      if (order.dataEntregaDate instanceof Date) {
        // Verificar se a data de entrega não é futura
        const currentDate = new Date();
        // Resetar horas para comparação apenas de data
        currentDate.setHours(0, 0, 0, 0);
        
        // Só processar se a data de entrega for menor ou igual à data atual
        if (order.dataEntregaDate <= currentDate) {
          const y = order.dataEntregaDate.getFullYear();
          if (y === 2024) st['2024']++;
          if (y === 2025) st['2025']++;
          const m = order.dataEntregaDate.getMonth(); // 0..11
          const key = this.MONTH_KEYS[m];
          if (key) st[key]++;
        }
      }
    });
    return Object.values(stats).filter(c => c.total > 0);
  }

  static recalculateMetricsFromOrders(orders) {
    if (!orders || orders.length === 0) {
      return { totalDemandas:0,totalConcluidos:0,totalPendentes:0,totalAtrasados:0,taxaConclusao:0,tiposUnicos:0 };
    }
    const totalDemandas = orders.length;
    const totalConcluidos = orders.filter(o => o.isConcluido).length;
    const totalPendentes = orders.filter(o => !o.isConcluido).length;
    const totalAtrasados = orders.filter(o => o.isAtrasado).length;
    const taxaConclusao = totalDemandas > 0 ? Math.round((totalConcluidos/totalDemandas)*100) : 0;
    const tiposUnicos = [...new Set(orders.map(o => o.tipoDemanda).filter(t => t && t.trim()))].length;
    return { totalDemandas,totalConcluidos,totalPendentes,totalAtrasados,taxaConclusao,tiposUnicos };
    }

  static applyPeriodFilter(data, periodo) {
    console.log('📅 [PERÍODO] Aplicando filtro:', periodo);
    if (periodo === 'ambos' || !periodo) return data;

    if (periodo === '2024') {
      return {
        ...data,
        visaoGeral: data.visaoGeral2024 || [],
        diarios: data.diarios2024 || [],
        semanais: data.semanais2024 || [],
        mensais: data.mensais2024 || [],
        especiais: data.especiais2024 || [],
        diagnosticos: data.diagnosticos2024 || []
      };
    }
    if (periodo === '2025') {
      return {
        ...data,
        visaoGeral: data.visaoGeral || [],
        diarios: data.diarios || [],
        semanais: data.semanais || [],
        mensais: data.mensais || [],
        especiais: data.especiais || [],
        diagnosticos: data.diagnosticos || []
      };
    }
    return data;
  }

  static applyContentTypeFilter(data, tipo) {
    console.log('📋 [TIPO] Aplicando filtro:', tipo);
    if (!tipo || tipo === 'geral') return data;

    const map = {
      'diario':'diarios',
      'semanal':'semanais',
      'mensal':'mensais',
      'especial':'especiais',
      'diagnostico':'diagnosticos',
      'design':'design'
    };
    const sourceKey = map[tipo];
    if (sourceKey && data[sourceKey]) {
      return { ...data, visaoGeral: data[sourceKey] || [] };
    }
    return data;
  }

  static applyClientFilter(data, cliente) {
    console.log('🏢 [CLIENTE] Aplicando filtro:', cliente);
    if (!cliente || cliente === 'todos') return data;

    const sections = [
      'visaoGeral','visaoGeral2024',
      'diarios','diarios2024',
      'semanais','semanais2024',
      'mensais','mensais2024',
      'especiais','especiais2024',
      'diagnosticos','diagnosticos2024',
      'design'
    ];
    const filtered = { ...data };
    sections.forEach(section => {
      if (Array.isArray(filtered[section])) {
        filtered[section] = filtered[section].filter(i => i.cliente === cliente);
      }
    });
    if (Array.isArray(filtered.originalOrders)) {
      filtered.originalOrders = filtered.originalOrders.filter(o => (o.cliente1 || o.cliente) === cliente);
    }
    return filtered;
  }

  static recalculateTotals(data) {
    if (!data) return null;
    const newData = { ...data };
    const months = this.MONTH_KEYS;

    const sections = [
      'visaoGeral','visaoGeral2024',
      'diarios','diarios2024',
      'semanais','semanais2024',
      'mensais','mensais2024',
      'especiais','especiais2024',
      'diagnosticos','diagnosticos2024'
    ];

    sections.forEach(section => {
      if (Array.isArray(newData[section])) {
        newData[section] = newData[section]
          .map(c => ({ ...c, total: months.reduce((s, m) => s + (c[m] || 0), 0) }))
          .filter(c => (c.total || 0) > 0);
      }
    });

    if (Array.isArray(newData.design)) {
      newData.design = newData.design
        .map(item => {
          const total2025 = this.MONTH_KEYS.reduce((s, m) => s + (item[m] || 0), 0);
          return { ...item, '2025': total2025 };
        })
        .filter(item => (item['2024'] || 0) > 0 || (item['2025'] || 0) > 0);
    }
    return newData;
  }

  // ==========================================
  // PROCESSADORES PARA GRÁFICOS/SEÇÕES
  // ==========================================
  static processChartData(data, chartType, filters = {}) {
    if (!data) return [];
    console.log(`📊 [GRÁFICO] ${chartType} filtros:`, filters);
    switch (chartType) {
      case 'trend': return this.processTrendData(data, filters);
      case 'ranking': return this.processRankingData(data, filters);
      case 'comparison': return this.processComparisonData(data, filters);
      case 'distribution': return this.processDistributionData(data, filters);
      case 'design': return this.processDesignData(data, filters);
      case 'monthlyDetailed': return this.processMonthlyDetailedData(data, filters);
      default:
        console.warn('⚠️ [GRÁFICO] Tipo não reconhecido:', chartType);
        return [];
    }
  }

  // 🆕 CORRIGIDO: Ranking sem corte de top 10 + flags de grupo
  // - filters.onlyGroup === true -> somente Inpacto/STA/Holding/Listening
  // - filters.excludeGroup === true -> exclui Inpacto/STA/Holding/Listening
  static processRankingData(data, filters = {}) {
    const currentData = data.visaoGeral || [];
    const data2024 = data.visaoGeral2024 || [];
    const periodo = filters.periodo || 'ambos';
    const onlyGroup = !!filters.onlyGroup;
    const excludeGroup = !!filters.excludeGroup;

    const filtraGrupo = (arr) => {
      if (onlyGroup) return arr.filter(r => this.GRUPO_EMPRESAS.includes(r.cliente));
      if (excludeGroup) return arr.filter(r => !this.GRUPO_EMPRESAS.includes(r.cliente));
      return arr;
    };

    console.log('🏆 [RANKING] Entrada:', {
      periodo,
      currentData: currentData.length,
      data2024: data2024.length,
      onlyGroup,
      excludeGroup
    });

    if (periodo === 'ambos') {
      // Dados 2025 e 2024 (se vazios, mantém mocks do seu original)
      const mock2024 = [
        { cliente: 'ANP', total: 216 },
        { cliente: 'CFQ', total: 93 },
        { cliente: 'VALE', total: 75 },
        { cliente: 'GOVGO', total: 54 },
        { cliente: 'MS', total: 43 },
        { cliente: 'PETROBRAS', total: 42 }
      ];
      const dados2025 = currentData.length > 0 ? currentData : [
        { cliente: 'ANP', janeiro: 47, fevereiro: 42, marco: 42, abril: 42, maio: 43, total: 216 },
        { cliente: 'CFQ', janeiro: 20, fevereiro: 18, marco: 20, abril: 20, maio: 15, total: 93 },
        { cliente: 'VALE', janeiro: 15, fevereiro: 12, marco: 15, abril: 15, maio: 18, total: 75 },
        { cliente: 'GOVGO', janeiro: 12, fevereiro: 10, marco: 12, abril: 12, maio: 8, total: 54 },
        { cliente: 'MS', janeiro: 1,  fevereiro: 3,  marco: 0,  abril: 1,  maio: 38, total: 43 },
        { cliente: 'PETROBRAS', janeiro: 8,  fevereiro: 8,  marco: 8,  abril: 8,  maio: 10, total: 42 }
      ];
      const dados2024 = data2024.length > 0 ? data2024 : mock2024;

      // Divisor dinâmico: 12 para 2024, meses com dados para 2025
      const divisor2024 = 12;
      const divisor2025 = this.monthsWithData(dados2025);

      let result = dados2025.map(c25 => {
        const c24 = dados2024.find(c => c.cliente === c25.cliente);
        const total2024 = c24?.total || 0;
        const total2025 = c25.total || 0;
        const media2024 = Math.round((total2024 / divisor2024) * 10) / 10;
        const media2025 = Math.round((total2025 / Math.max(divisor2025,1)) * 10) / 10;

        const crescimento = media2024 > 0
          ? Math.round(((media2025 - media2024) / media2024) * 100)
          : (media2025 > 0 ? 100 : 0);

        return {
          cliente: c25.cliente,
          total2024,
          total2025,
          media2024,
          media2025,
          crescimento,
          categoria: this.categorizeGrowth(crescimento),
          valor: media2025,
          total: media2025,
          media: media2025
        };
      });

      // Aplica filtros de grupo e remove SLICES (sem top 10 fixo)
      result = filtraGrupo(result)
        .filter(i => i.media2025 > 0)
        .sort((a,b) => b.media2025 - a.media2025);

      console.log('🏆 [RANKING] Resultado (ambos):', result.length, 'clientes');
      return result;
    } else {
      // Ranking para um período específico
      const base = periodo === '2024' ? (data2024 || []) : (currentData || []);
      const divisor = periodo === '2024' ? 12 : this.monthsWithData(base);

      let result = base
        .map(c => ({
          cliente: c.cliente,
          total: c.total || 0,
          media: Math.round(((c.total || 0) / Math.max(divisor,1)) * 10) / 10,
          valor: c.total || 0
        }))
        .filter(i => i.total > 0);

      // Filtros de grupo e sem corte de 10
      result = filtraGrupo(result).sort((a,b) => b.total - a.total);

      console.log('🏆 [RANKING] Resultado período específico:', result.length, 'clientes');
      return result;
    }
  }

  static categorizeGrowth(crescimento) {
    if (crescimento >= 50) return 'alto';
    if (crescimento >= 20) return 'medio';
    if (crescimento >= 0) return 'baixo';
    return 'negativo';
  }

  // 🆕 CORRIGIDO: usa divisores dinâmicos (12 para 2024; meses com dados para 2025)
  static processComparisonData(data, filters) {
    const currentData = data.visaoGeral || [];
    const data2024 = data.visaoGeral2024 || [];

    const total2025 = currentData.reduce((s, c) => s + (c.total || 0), 0);
    const total2024 = data2024.reduce((s, c) => s + (c.total || 0), 0);

    const divisor2024 = 12;
    const divisor2025 = this.monthsWithData(currentData);

    const media2025 = currentData.length > 0
      ? Math.round((total2025 / Math.max(divisor2025,1)) * 10) / 10
      : 0;

    const media2024 = data2024.length > 0
      ? Math.round((total2024 / divisor2024) * 10) / 10
      : 0;

    return [
      { periodo: '2024', total: total2024, media: media2024, clientes: data2024.length },
      { periodo: '2025', total: total2025, media: media2025, clientes: currentData.length }
    ];
  }

  static processDistributionData(data, filters) {
    // 🆕 NOVO: Processar tipos de demanda únicos da planilha + Notion
    if (!data || !data.originalOrders) return [];
    
    console.log('📋 [DISTRIBUIÇÃO] Processando tipos de demanda únicos...');
    
    // Contar ocorrências de cada tipo de demanda
    const tiposMap = new Map();
    
    data.originalOrders.forEach(order => {
      const tipoDemanda = order.tipoDemanda;
      if (!tipoDemanda || !tipoDemanda.trim()) return;
      
      const tipoLimpo = tipoDemanda.trim();
      const contadorAtual = tiposMap.get(tipoLimpo) || 0;
      tiposMap.set(tipoLimpo, contadorAtual + 1);
    });
    
    // Converter para array e ordenar por quantidade (ranking)
    const tiposRanking = Array.from(tiposMap.entries())
      .map(([tipo, quantidade]) => ({
        tipo,
        quantidade,
        porcentagem: 0 // será calculado depois
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
    
    // Calcular percentuais
    const total = tiposRanking.reduce((sum, item) => sum + item.quantidade, 0);
    tiposRanking.forEach(item => {
      item.porcentagem = total > 0 ? Math.round((item.quantidade / total) * 100) : 0;
    });
    
    console.log(`📋 [DISTRIBUIÇÃO] ${tiposRanking.length} tipos únicos encontrados`);
    console.log('📋 [DISTRIBUIÇÃO] Top 5:', tiposRanking.slice(0, 5));
    
    return tiposRanking;
  }

  static processDesignData(data, filters) {
    const designData = data.design || [];
    if (!designData || designData.length === 0) return [];
    return designData
      .map(item => ({
        cliente: item.cliente,
        '2024': item['2024'] || 0,
        '2025': item['2025'] || 0,
        total: (item['2024'] || 0) + (item['2025'] || 0),
        crescimento: this.calculateGrowth(item['2024'], item['2025'])
      }))
      .filter(i => i.total > 0)
      .sort((a,b) => b.total - a.total);
  }

  static processMonthlyDetailedData(data, filters) {
    const currentData = data.visaoGeral || [];
    const meses = ['janeiro','fevereiro','marco','abril','maio']; // mantém compatível com sua UI
    if (!currentData || currentData.length === 0) return [];
    return meses.map(m => {
      const total = currentData.reduce((s,c) => s + (c[m] || 0), 0);
      const clientes = currentData.filter(c => (c[m] || 0) > 0).length;
      const media = clientes > 0 ? Math.round((total / clientes) * 10) / 10 : 0;
      return { mes: m.charAt(0).toUpperCase() + m.slice(1), total, clientes, media };
    });
  }

  static calculateGrowth(valor2024, valor2025) {
    if (!valor2024 || valor2024 === 0) return valor2025 > 0 ? 100 : 0;
    const media2024 = valor2024 / 12;
    // Usar 12 para comparação anual aqui, mas poderia ser dinâmico se preferir
    const media2025 = valor2025 / 12;
    return Math.round(((media2025 - media2024) / media2024) * 100);
  }
}
