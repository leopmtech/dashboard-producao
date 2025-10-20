// ==========================================
// src/services/dataProcessingService.js
// VERSÃO COMPLETA COM TODOS OS MÉTODOS NECESSÁRIOS
// ==========================================

export class DataProcessingService {
  
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

    // 1. APLICAR FILTRO DE TIPO DE DEMANDA ORIGINAL (NOVO)
    if (filters.tipoDemandaOriginal && filters.tipoDemandaOriginal !== 'todos') {
      filteredData = this.applyOriginalTypeFilter(filteredData, filters.tipoDemandaOriginal);
      console.log('🔧 [FILTROS] Após filtro de tipo original:', {
        tipo: filters.tipoDemandaOriginal,
        ordens: filteredData.originalOrders?.length || 0
      });
    }

    // 2. APLICAR FILTRO DE PERÍODO
    filteredData = this.applyPeriodFilter(filteredData, filters.periodo);
    console.log('🔧 [FILTROS] Após filtro de período:', {
      periodo: filters.periodo,
      visaoGeral: filteredData.visaoGeral?.length || 0
    });

    // 3. APLICAR FILTRO DE TIPO DE CONTEÚDO (categorias pré-definidas)
    filteredData = this.applyContentTypeFilter(filteredData, filters.tipo);
    console.log('🔧 [FILTROS] Após filtro de tipo:', {
      tipo: filters.tipo,
      visaoGeral: filteredData.visaoGeral?.length || 0
    });

    // 4. APLICAR FILTRO DE CLIENTE
    filteredData = this.applyClientFilter(filteredData, filters.cliente);
    console.log('🔧 [FILTROS] Após filtro de cliente:', {
      cliente: filters.cliente,
      visaoGeral: filteredData.visaoGeral?.length || 0
    });

    // 5. RECALCULAR TOTAIS
    filteredData = this.recalculateTotals(filteredData);
    
    console.log('✅ [FILTROS] Filtros aplicados com sucesso:', {
      filtros: filters,
      resultados: {
        ordens: filteredData.originalOrders?.length || 0,
        clientes: filteredData.visaoGeral?.length || 0,
        totalRelatorios: filteredData.visaoGeral?.reduce((sum, c) => sum + (c.total || 0), 0) || 0
      }
    });

    return filteredData;
  }
  
// ==========================================
// CORREÇÃO PARA dataProcessingService.js - FUNÇÃO getUniqueClients
// ==========================================

static getUniqueClients(data) {
  console.log('🏢 [CLIENTES] Extraindo clientes únicos...');
  
  if (!data) {
    console.warn('⚠️ [CLIENTES] Dados não fornecidos');
    return [];
  }

  try {
    const clientesSet = new Set();
    
    // Função auxiliar para processar cliente e separar por vírgula
    const processarCliente = (clienteValue) => {
      if (!clienteValue || !clienteValue.trim()) return;
      
      const clienteLimpo = String(clienteValue).trim();
      
      // Se contém vírgula, separar
      if (clienteLimpo.includes(',')) {
        const clientesSeparados = clienteLimpo.split(',');
        clientesSeparados.forEach(cliente => {
          const clienteIndividual = cliente.trim();
          if (clienteIndividual) {
            clientesSet.add(clienteIndividual);
          }
        });
      } else {
        // Cliente único
        clientesSet.add(clienteLimpo);
      }
    };
    
    // Extrair de visaoGeral (2025)
    if (data.visaoGeral && Array.isArray(data.visaoGeral)) {
      data.visaoGeral.forEach(item => {
        processarCliente(item.cliente);
      });
    }
    
    // Extrair de visaoGeral2024
    if (data.visaoGeral2024 && Array.isArray(data.visaoGeral2024)) {
      data.visaoGeral2024.forEach(item => {
        processarCliente(item.cliente);
      });
    }
    
    // Extrair de originalOrders
    if (data.originalOrders && Array.isArray(data.originalOrders)) {
      data.originalOrders.forEach(order => {
        const cliente = order.cliente1 || order.cliente;
        processarCliente(cliente);
      });
    }
    
    // Extrair de design
    if (data.design && Array.isArray(data.design)) {
      data.design.forEach(item => {
        processarCliente(item.cliente);
      });
    }
    
    // Extrair de outras seções se existirem
    const otherSections = ['diarios', 'semanais', 'mensais', 'especiais', 'diagnosticos'];
    otherSections.forEach(section => {
      if (data[section] && Array.isArray(data[section])) {
        data[section].forEach(item => {
          processarCliente(item.cliente);
        });
      }
      
      // Versões 2024
      const section2024 = section + '2024';
      if (data[section2024] && Array.isArray(data[section2024])) {
        data[section2024].forEach(item => {
          processarCliente(item.cliente);
        });
      }
    });
    
    // Converter Set para Array e ordenar
    const clientesUnicos = Array.from(clientesSet).sort((a, b) => {
      // Ordenar alfabeticamente, mas com prioridade para alguns clientes importantes
      const prioridade = ['ANP', 'PETROBRAS', 'VALE', 'CFQ', 'GOVGO', 'MS'];
      const indexA = prioridade.indexOf(a);
      const indexB = prioridade.indexOf(b);
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b, 'pt-BR');
    });
    
    console.log('🏢 [CLIENTES] Clientes únicos encontrados:', {
      total: clientesUnicos.length,
      clientes: clientesUnicos.slice(0, 10) // Primeiros 10 para debug
    });
    
    return clientesUnicos;
    
  } catch (error) {
    console.error('❌ [CLIENTES] Erro ao extrair clientes únicos:', error);
    return [];
  }
}

  // ==========================================
  // CALCULAR MÉTRICAS AVANÇADAS
  // ==========================================
  
  static calculateAdvancedMetrics(data, filters = {}) {
    console.log('📊 [MÉTRICAS] Calculando métricas avançadas:', { data: !!data, filters });
    
    if (!data) {
      console.warn('⚠️ [MÉTRICAS] Dados não fornecidos');
      return this.getEmptyMetrics();
    }

    try {
      const currentData = data.visaoGeral || [];
      const data2024 = data.visaoGeral2024 || [];
      const originalOrders = data.originalOrders || [];
      const designData = data.design || [];

      // Métricas básicas
      const totalClientes = currentData.length;
      const totalClientes2024 = data2024.length;
      const totalDemandas = currentData.reduce((sum, cliente) => sum + (cliente.total || 0), 0);
      const totalDemandas2024 = data2024.reduce((sum, cliente) => sum + (cliente.total || 0), 0);

      // Métricas de crescimento
      const crescimentoClientes = this.calculateGrowthPercentage(totalClientes2024, totalClientes, 12, 5);
      const crescimentoDemandas = this.calculateGrowthPercentage(totalDemandas2024, totalDemandas, 12, 5);

      // Métricas mensais
      const mediaMensal = totalClientes > 0 ? Math.round((totalDemandas / 5) * 10) / 10 : 0;
      const mediaMensal2024 = totalClientes2024 > 0 ? Math.round((totalDemandas2024 / 12) * 10) / 10 : 0;

      // Métricas por cliente
      const mediaPorCliente = totalClientes > 0 ? Math.round((totalDemandas / totalClientes) * 10) / 10 : 0;
      const mediaPorCliente2024 = totalClientes2024 > 0 ? Math.round((totalDemandas2024 / totalClientes2024) * 10) / 10 : 0;

      // Cliente top performer
      const topCliente = currentData.length > 0 
        ? currentData.reduce((max, cliente) => 
            (cliente.total || 0) > (max.total || 0) ? cliente : max, currentData[0])
        : null;

      // Distribuição por volume
      const distribuicao = this.calculateVolumeDistribution(currentData);

      // Métricas de design (se disponível)
      const designMetrics = this.calculateDesignMetrics(designData);

      // Taxa de retenção de clientes
      const clientesRetidos = this.calculateClientRetention(data2024, currentData);

      // Métricas de tipos de demanda (baseado em originalOrders)
      const tiposMetrics = this.calculateTypeMetrics(originalOrders);

      // Tendência mensal
      const tendenciaMensal = this.calculateMonthlyTrend(currentData);

      const metrics = {
        // Totais
        totalClientes,
        totalClientes2024,
        totalDemandas,
        totalDemandas2024,
        totalRelatorios: totalDemandas, // Alias
        
        // Crescimento
        crescimentoClientes,
        crescimentoDemandas,
        crescimento: crescimentoDemandas, // Alias
        
        // Médias
        mediaMensal,
        mediaMensal2024,
        mediaPorCliente,
        mediaPorCliente2024,
        produtividade: mediaMensal, // Alias
        
        // Performance
        topCliente: topCliente ? {
          nome: topCliente.cliente,
          cliente: topCliente.cliente, // Alias
          total: topCliente.total || 0,
          participacao: totalDemandas > 0 ? Math.round(((topCliente.total || 0) / totalDemandas) * 100) : 0
        } : { nome: 'N/A', cliente: 'N/A', total: 0, participacao: 0 },
        
        melhorCliente: topCliente ? { // Alias
          cliente: topCliente.cliente,
          total: topCliente.total || 0,
          crescimento: 0 // Pode ser calculado se necessário
        } : { cliente: 'N/A', total: 0, crescimento: 0 },
        
        // Distribuição
        distribuicao,
        
        // Retenção
        clientesRetidos,
        taxaRetencao: totalClientes2024 > 0 ? Math.round((clientesRetidos / totalClientes2024) * 100) : 0,
        
        // Design
        designMetrics,
        
        // Tipos de demanda
        tiposMetrics,
        
        // Tendências
        tendenciaMensal,
        
        // Período de análise
        periodoAnalise: filters.periodo || '2025',
        
        // Eficiência
        eficienciaMensal: mediaMensal > mediaMensal2024 ? 'crescente' : 
                         mediaMensal === mediaMensal2024 ? 'estável' : 'decrescente',
        
        // Última atualização
        ultimaAtualizacao: new Date().toISOString()
      };

      console.log('✅ [MÉTRICAS] Métricas calculadas:', {
        totalClientes: metrics.totalClientes,
        totalDemandas: metrics.totalDemandas,
        crescimento: metrics.crescimentoDemandas,
        topCliente: metrics.topCliente?.nome
      });

      return metrics;

    } catch (error) {
      console.error('❌ [MÉTRICAS] Erro ao calcular métricas:', error);
      return this.getEmptyMetrics();
    }
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
      mediaPorCliente: 0,
      mediaPorCliente2024: 0,
      produtividade: 0,
      topCliente: { nome: 'N/A', cliente: 'N/A', total: 0, participacao: 0 },
      melhorCliente: { cliente: 'N/A', total: 0, crescimento: 0 },
      distribuicao: { alto: 0, medio: 0, baixo: 0 },
      clientesRetidos: 0,
      taxaRetencao: 0,
      designMetrics: { total2024: 0, total2025: 0, crescimento: 0 },
      tiposMetrics: { totalTipos: 0, tipoMaisComum: null },
      tendenciaMensal: 'estável',
      periodoAnalise: 'N/A',
      eficienciaMensal: 'estável',
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
    
    clientes.forEach(cliente => {
      const total = cliente.total || 0;
      if (total > 50) {
        distribuicao.alto++;
      } else if (total >= 20) {
        distribuicao.medio++;
      } else if (total > 0) {
        distribuicao.baixo++;
      }
    });
    
    return distribuicao;
  }

  static calculateDesignMetrics(designData) {
    if (!designData || designData.length === 0) {
      return { total2024: 0, total2025: 0, crescimento: 0, clientes: 0 };
    }
    
    const total2024 = designData.reduce((sum, item) => sum + (item['2024'] || 0), 0);
    const total2025 = designData.reduce((sum, item) => sum + (item['2025'] || 0), 0);
    const crescimento = this.calculateGrowth(total2024, total2025);
    
    return {
      total2024,
      total2025,
      crescimento,
      clientes: designData.length
    };
  }

  static calculateClientRetention(clientes2024, clientesAtual) {
    if (!clientes2024 || !clientesAtual) return 0;
    
    const nomes2024 = new Set(clientes2024.map(c => c.cliente));
    const clientesRetidos = clientesAtual.filter(c => nomes2024.has(c.cliente));
    
    return clientesRetidos.length;
  }

  static calculateTypeMetrics(orders) {
    if (!orders || orders.length === 0) {
      return { totalTipos: 0, tipoMaisComum: null, distribuicao: {} };
    }
    
    const tipos = {};
    orders.forEach(order => {
      const tipo = order.tipoDemanda;
      if (tipo && tipo.trim()) {
        tipos[tipo] = (tipos[tipo] || 0) + 1;
      }
    });
    
    const tipoMaisComum = Object.keys(tipos).length > 0 
      ? Object.keys(tipos).reduce((a, b) => tipos[a] > tipos[b] ? a : b)
      : null;
    
    return {
      totalTipos: Object.keys(tipos).length,
      tipoMaisComum,
      distribuicao: tipos
    };
  }

  static calculateMonthlyTrend(clientes) {
    if (!clientes || clientes.length === 0) return 'estável';
    
    const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    const totaisMensais = meses.map(mes => 
      clientes.reduce((sum, cliente) => sum + (cliente[mes] || 0), 0)
    );
    
    let crescente = 0;
    let decrescente = 0;
    
    for (let i = 1; i < totaisMensais.length; i++) {
      if (totaisMensais[i] > totaisMensais[i-1]) crescente++;
      else if (totaisMensais[i] < totaisMensais[i-1]) decrescente++;
    }
    
    if (crescente > decrescente) return 'crescente';
    if (decrescente > crescente) return 'decrescente';
    return 'estável';
  }

  // ==========================================
// CORREÇÃO PARA dataProcessingService.js - FUNÇÃO extractUniqueContentTypes
// ==========================================

static extractUniqueContentTypes(data) {
  console.log('🏷️ [TIPOS] Extraindo tipos únicos de demanda (normalizado)...');
  
  if (!data || !data.originalOrders || !Array.isArray(data.originalOrders)) {
    console.warn('⚠️ [TIPOS] Dados originalOrders não encontrados');
    return [];
  }

  try {
    // Map para rastrear tipos normalizados e suas versões preferenciais
    const tiposMap = new Map();
    let totalProcessados = 0;

    console.log(`📊 [TIPOS] Processando ${data.originalOrders.length} ordens...`);

    data.originalOrders.forEach((order, index) => {
      const tipoOriginal = order.tipoDemanda;
      
      if (!tipoOriginal || !tipoOriginal.trim()) return;
      
      const tipoLimpo = tipoOriginal.trim();
      const tipoNormalizado = tipoLimpo.toLowerCase();
      
      // Log dos primeiros 10 para debug
      if (index < 10) {
        console.log(`🔍 [TIPOS] Ordem ${index}: "${tipoLimpo}" → "${tipoNormalizado}"`);
      }
      
      // Se já temos esse tipo normalizado
      if (tiposMap.has(tipoNormalizado)) {
        const existente = tiposMap.get(tipoNormalizado);
        
        // Preferir a versão com primeira letra maiúscula
        const versaoPreferida = this.escolherVersaoPreferida(existente.original, tipoLimpo);
        
        tiposMap.set(tipoNormalizado, {
          original: versaoPreferida,
          normalizado: tipoNormalizado,
          contador: existente.contador + 1
        });
      } else {
        // Primeiro encontro deste tipo
        tiposMap.set(tipoNormalizado, {
          original: tipoLimpo,
          normalizado: tipoNormalizado,
          contador: 1
        });
      }
      
      totalProcessados++;
    });

    // Converter Map para array de tipos únicos
    const tiposUnicos = Array.from(tiposMap.values())
      .map(tipo => tipo.original)
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    console.log('🏷️ [TIPOS] === RESULTADO FINAL ===');
    console.log(`📊 [TIPOS] Total processado: ${totalProcessados}`);
    console.log(`✅ [TIPOS] Tipos únicos encontrados: ${tiposUnicos.length}`);
    console.log('🏷️ [TIPOS] Primeiros 10:', tiposUnicos.slice(0, 10));

    // Formatar para o padrão esperado pelo sistema
    const formattedTypes = tiposUnicos.map(tipo => ({
      id: tipo.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9_]/g, ''),
      label: tipo,
      value: tipo,
      icon: this.getIconForDemandType(tipo),
      category: this.categorizeDemandType(tipo)
    }));

    console.log('🏷️ [TIPOS] Tipos formatados:', formattedTypes.length);
    return formattedTypes;

  } catch (error) {
    console.error('❌ [TIPOS] Erro ao extrair tipos únicos:', error);
    return [];
  }
}

// ==========================================
// NOVA FUNÇÃO AUXILIAR - ESCOLHER VERSÃO PREFERIDA
// ==========================================

static escolherVersaoPreferida(versaoA, versaoB) {
  // Critério 1: Preferir versão com primeira letra maiúscula
  const primeiraLetraA = versaoA.charAt(0);
  const primeiraLetraB = versaoB.charAt(0);
  
  const aTemMaiuscula = primeiraLetraA === primeiraLetraA.toUpperCase();
  const bTemMaiuscula = primeiraLetraB === primeiraLetraB.toUpperCase();
  
  if (aTemMaiuscula && !bTemMaiuscula) return versaoA;
  if (!aTemMaiuscula && bTemMaiuscula) return versaoB;
  
  // Critério 2: Preferir versão com mais palavras capitalizadas
  const palavrasCapitalizadasA = (versaoA.match(/\b[A-Z]/g) || []).length;
  const palavrasCapitalizadasB = (versaoB.match(/\b[A-Z]/g) || []).length;
  
  if (palavrasCapitalizadasA > palavrasCapitalizadasB) return versaoA;
  if (palavrasCapitalizadasB > palavrasCapitalizadasA) return versaoB;
  
  // Critério 3: Preferir versão mais longa (mais completa)
  if (versaoA.length > versaoB.length) return versaoA;
  if (versaoB.length > versaoA.length) return versaoB;
  
  // Se tudo igual, manter a primeira versão encontrada
  return versaoA;
}
  static getIconForDemandType(tipo) {
    const tipoLower = tipo.toLowerCase();
    
    if (tipoLower.includes('relatório') || tipoLower.includes('relatorio')) {
      if (tipoLower.includes('semanal')) return '📊';
      if (tipoLower.includes('mensal')) return '📅';
      if (tipoLower.includes('diário') || tipoLower.includes('diario')) return '🗓️';
      if (tipoLower.includes('anual')) return '📋';
      return '📄';
    }
    
    if (tipoLower.includes('monitoramento')) return '👁️';
    if (tipoLower.includes('acompanhamento')) return '📈';
    if (tipoLower.includes('análise') || tipoLower.includes('analise')) return '🔍';
    if (tipoLower.includes('diagnóstico') || tipoLower.includes('diagnostico')) return '🔬';
    if (tipoLower.includes('projeto')) return '⭐';
    if (tipoLower.includes('estratégi') || tipoLower.includes('estrategi')) return '🎯';
    if (tipoLower.includes('planejamento')) return '📋';
    if (tipoLower.includes('design')) return '🎨';
    if (tipoLower.includes('criação') || tipoLower.includes('criacao')) return '✨';
    if (tipoLower.includes('arte')) return '🖼️';
    if (tipoLower.includes('comunicação') || tipoLower.includes('comunicacao')) return '📢';
    if (tipoLower.includes('nota')) return '📝';
    if (tipoLower.includes('boletim')) return '📰';
    if (tipoLower.includes('pesquisa')) return '🔎';
    if (tipoLower.includes('estudo')) return '📚';
    if (tipoLower.includes('levantamento')) return '📊';
    
    return '📋';
  }

  static categorizeDemandType(tipo) {
    const tipoLower = tipo.toLowerCase();
    
    if (tipoLower.includes('relatório') || tipoLower.includes('relatorio')) {
      return 'Relatórios';
    }
    
    if (tipoLower.includes('monitoramento') || tipoLower.includes('acompanhamento')) {
      return 'Monitoramento';
    }
    
    if (tipoLower.includes('análise') || tipoLower.includes('analise') || 
        tipoLower.includes('diagnóstico') || tipoLower.includes('diagnostico')) {
      return 'Análises';
    }
    
    if (tipoLower.includes('design') || tipoLower.includes('criação') || tipoLower.includes('arte')) {
      return 'Design';
    }
    
    if (tipoLower.includes('projeto') || tipoLower.includes('estratégi') || tipoLower.includes('planejamento')) {
      return 'Projetos';
    }
    
    if (tipoLower.includes('comunicação') || tipoLower.includes('nota') || tipoLower.includes('boletim')) {
      return 'Comunicação';
    }
    
    return 'Outros';
  }

  // ... [todos os outros métodos permanecem iguais] ...

  static applyOriginalTypeFilter(data, tipoFiltro) {
    console.log('🔍 [TIPO ORIGINAL] Aplicando filtro:', tipoFiltro);
    
    if (!data || !data.originalOrders || tipoFiltro === 'todos' || !tipoFiltro) {
      console.log('🔍 [TIPO ORIGINAL] Mantendo todos os dados');
      return data;
    }

    try {
      const filteredOrders = data.originalOrders.filter(order => 
        order.tipoDemanda && order.tipoDemanda.trim() === tipoFiltro
      );

      console.log('🔍 [TIPO ORIGINAL] Filtrados:', {
        original: data.originalOrders.length,
        filtrado: filteredOrders.length,
        tipo: tipoFiltro
      });

      const filteredData = {
        ...data,
        originalOrders: filteredOrders,
        visaoGeral: this.aggregateByClient(filteredOrders),
        metrics: this.recalculateMetricsFromOrders(filteredOrders)
      };

      return filteredData;

    } catch (error) {
      console.error('❌ [TIPO ORIGINAL] Erro ao filtrar:', error);
      return data;
    }
  }

  static aggregateByClient(orders) {
    if (!orders || orders.length === 0) return [];

    const clienteStats = {};

    orders.forEach(order => {
      const cliente = order.cliente1 || order.cliente;
      if (!cliente || !cliente.trim()) return;

      if (!clienteStats[cliente]) {
        clienteStats[cliente] = {
          cliente: cliente,
          total: 0,
          concluidos: 0,
          pendentes: 0,
          atrasados: 0,
          2024: 0,
          2025: 0,
          janeiro: 0, fevereiro: 0, marco: 0, abril: 0,
          maio: 0, junho: 0, julho: 0, agosto: 0,
          setembro: 0, outubro: 0, novembro: 0, dezembro: 0
        };
      }

      const stats = clienteStats[cliente];
      stats.total++;
      
      if (order.isConcluido) stats.concluidos++;
      else stats.pendentes++;
      
      if (order.isAtrasado) stats.atrasados++;

      if (order.dataEntregaDate) {
        const year = order.dataEntregaDate.getFullYear();
        if (year === 2024) stats['2024']++;
        if (year === 2025) stats['2025']++;

        const month = order.dataEntregaDate.getMonth();
        const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
                           'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        if (monthNames[month]) {
          stats[monthNames[month]]++;
        }
      }
    });

    return Object.values(clienteStats).filter(cliente => cliente.total > 0);
  }

  static recalculateMetricsFromOrders(orders) {
    if (!orders || orders.length === 0) {
      return {
        totalDemandas: 0,
        totalConcluidos: 0,
        totalPendentes: 0,
        totalAtrasados: 0,
        taxaConclusao: 0,
        tiposUnicos: 0
      };
    }

    const totalDemandas = orders.length;
    const totalConcluidos = orders.filter(o => o.isConcluido).length;
    const totalPendentes = orders.filter(o => !o.isConcluido).length;
    const totalAtrasados = orders.filter(o => o.isAtrasado).length;
    const taxaConclusao = totalDemandas > 0 ? Math.round((totalConcluidos / totalDemandas) * 100) : 0;
    
    const tiposUnicos = [...new Set(orders
      .map(o => o.tipoDemanda)
      .filter(t => t && t.trim())
    )].length;

    return {
      totalDemandas,
      totalConcluidos,
      totalPendentes,
      totalAtrasados,
      taxaConclusao,
      tiposUnicos
    };
  }

  static applyPeriodFilter(data, periodo) {
    console.log('📅 [PERÍODO] Aplicando filtro:', periodo);
    
    if (periodo === 'ambos') {
      return data;
    } 
    
    if (periodo === '2024') {
      const filtered = {
        ...data,
        visaoGeral: data.visaoGeral2024 || [],
        diarios: data.diarios2024 || [],
        semanais: data.semanais2024 || [],
        mensais: data.mensais2024 || [],
        especiais: data.especiais2024 || [],
        diagnosticos: data.diagnosticos2024 || []
      };
      console.log('📅 [PERÍODO] Aplicado 2024:', filtered.visaoGeral.length, 'clientes');
      return filtered;
    } 
    
    if (periodo === '2025') {
      const filtered = {
        ...data,
        visaoGeral: data.visaoGeral || [],
        diarios: data.diarios || [],
        semanais: data.semanais || [],
        mensais: data.mensais || [],
        especiais: data.especiais || [],
        diagnosticos: data.diagnosticos || []
      };
      console.log('📅 [PERÍODO] Aplicado 2025:', filtered.visaoGeral.length, 'clientes');
      return filtered;
    }
    
    return data;
  }

  static applyContentTypeFilter(data, tipo) {
    console.log('📋 [TIPO] Aplicando filtro:', tipo);
    
    if (tipo === 'geral') {
      console.log('📋 [TIPO] Mantendo visão geral:', data.visaoGeral?.length || 0, 'clientes');
      return data;
    }

    const tipoToSource = {
      'diario': 'diarios',
      'semanal': 'semanais',
      'mensal': 'mensais', 
      'especial': 'especiais',
      'diagnostico': 'diagnosticos',
      'design': 'design'
    };

    const sourceKey = tipoToSource[tipo];
    
    if (sourceKey && data[sourceKey]) {
      const filtered = {
        ...data,
        visaoGeral: data[sourceKey] || []
      };
      console.log('📋 [TIPO] Aplicado', tipo, ':', filtered.visaoGeral.length, 'clientes');
      return filtered;
    }

    console.warn('⚠️ [TIPO] Tipo não encontrado:', tipo);
    return data;
  }

  static applyClientFilter(data, cliente) {
    console.log('🏢 [CLIENTE] Aplicando filtro:', cliente);
    
    if (cliente === 'todos') {
      console.log('🏢 [CLIENTE] Mantendo todos os clientes');
      return data;
    }

    const sectionsToFilter = [
      'visaoGeral', 'visaoGeral2024',
      'diarios', 'diarios2024',
      'semanais', 'semanais2024', 
      'mensais', 'mensais2024',
      'especiais', 'especiais2024',
      'diagnosticos', 'diagnosticos2024',
      'design'
    ];

    const filtered = { ...data };
    
    sectionsToFilter.forEach(section => {
      if (filtered[section] && Array.isArray(filtered[section])) {
        const originalLength = filtered[section].length;
        filtered[section] = filtered[section].filter(item => item.cliente === cliente);
        console.log(`🏢 [CLIENTE] ${section}: ${originalLength} → ${filtered[section].length}`);
      }
    });

    if (filtered.originalOrders && Array.isArray(filtered.originalOrders)) {
      const originalLength = filtered.originalOrders.length;
      filtered.originalOrders = filtered.originalOrders.filter(order => 
        (order.cliente1 || order.cliente) === cliente
      );
      console.log(`🏢 [CLIENTE] originalOrders: ${originalLength} → ${filtered.originalOrders.length}`);
    }

    console.log('🏢 [CLIENTE] Filtro aplicado para:', cliente);
    return filtered;
  }

  static recalculateTotals(data) {
    if (!data) return null;

    const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const newData = { ...data };

    const sections = [
      'visaoGeral', 'visaoGeral2024',
      'diarios', 'diarios2024',
      'semanais', 'semanais2024',
      'mensais', 'mensais2024', 
      'especiais', 'especiais2024',
      'diagnosticos', 'diagnosticos2024'
    ];

    sections.forEach(section => {
      if (newData[section] && Array.isArray(newData[section])) {
        newData[section] = newData[section].map(cliente => {
          const total = meses.reduce((sum, mes) => sum + (cliente[mes] || 0), 0);
          return { ...cliente, total };
        }).filter(cliente => cliente.total > 0);
      }
    });

    if (newData.design && Array.isArray(newData.design)) {
      newData.design = newData.design.map(item => {
        const total2025 = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'].reduce((sum, mes) => sum + (item[mes] || 0), 0);
        return { ...item, '2025': total2025 };
      }).filter(item => (item['2024'] || 0) > 0 || (item['2025'] || 0) > 0);
    }

    return newData;
  }

  static processChartData(data, chartType, filters = {}) {
    if (!data) return [];
    
    console.log(`📊 [GRÁFICO] Processando ${chartType} com filtros:`, filters);
    
    switch (chartType) {
      case 'trend':
        return this.processTrendData(data, filters);
      
      case 'ranking':
        return this.processRankingData(data, filters);
      
      case 'comparison':
        return this.processComparisonData(data, filters);
      
      case 'distribution':
        return this.processDistributionData(data, filters);
        
      case 'design':
        return this.processDesignData(data, filters);
        
      case 'monthlyDetailed':
        return this.processMonthlyDetailedData(data, filters);
        
      default:
        console.warn('⚠️ [GRÁFICO] Tipo de gráfico não reconhecido:', chartType);
        return [];
    }
  }

  static processTrendData(data, filters) {
    const periodo = filters.periodo || '2025';
    
    let meses;
    
    if (periodo === '2024') {
      meses = [
        { key: 'janeiro', nome: 'Jan' },
        { key: 'fevereiro', nome: 'Fev' },
        { key: 'marco', nome: 'Mar' },
        { key: 'abril', nome: 'Abr' },
        { key: 'maio', nome: 'Mai' },
        { key: 'junho', nome: 'Jun' },
        { key: 'julho', nome: 'Jul' },
        { key: 'agosto', nome: 'Ago' },
        { key: 'setembro', nome: 'Set' },
        { key: 'outubro', nome: 'Out' },
        { key: 'novembro', nome: 'Nov' },
        { key: 'dezembro', nome: 'Dez' }
      ];
    } else if (periodo === '2025') {
      meses = [
        { key: 'janeiro', nome: 'Jan' },
        { key: 'fevereiro', nome: 'Fev' },
        { key: 'marco', nome: 'Mar' },
        { key: 'abril', nome: 'Abr' },
        { key: 'maio', nome: 'Mai' },
        { key: 'junho', nome: 'Jun' },
        { key: 'julho', nome: 'Jul' },
        { key: 'agosto', nome: 'Ago' },
        { key: 'setembro', nome: 'Set' },
        { key: 'outubro', nome: 'Out' },
        { key: 'novembro', nome: 'Nov' },
        { key: 'dezembro', nome: 'Dez' }
      ];
    } else {
      meses = [
        { key: 'janeiro', nome: 'Jan' },
        { key: 'fevereiro', nome: 'Fev' },
        { key: 'marco', nome: 'Mar' },
        { key: 'abril', nome: 'Abr' },
        { key: 'maio', nome: 'Mai' },
         { key: 'junho', nome: 'Jun' }
      ];
    }

    const currentData = data.visaoGeral || [];
    const data2024 = data.visaoGeral2024 || [];

    return meses.map(mes => {
      const total = currentData.reduce((sum, cliente) => sum + (cliente[mes.key] || 0), 0);
      const total2024 = data2024.reduce((sum, cliente) => sum + (cliente[mes.key] || 0), 0);
      
      const media = currentData.length > 0 ? Math.round((total / currentData.length) * 10) / 10 : 0;
      const media2024 = data2024.length > 0 ? Math.round((total2024 / data2024.length) * 10) / 10 : 0;

      const crescimento = media2024 > 0 ? Math.round(((media - media2024) / media2024) * 100) : 0;

      return {
        mes: mes.nome,
        total,
        media,
        total2024,
        media2024,
        crescimento,
        isNovaGestao: mes.key === 'abril' || mes.key === 'maio'
      };
    }).filter(mes => {
      if (periodo === '2025') {
        return mes.total > 0;
      }
      return true;
    });
  }

  static processRankingData(data, filters) {
    const currentData = data.visaoGeral || [];
    const data2024 = data.visaoGeral2024 || [];
    const periodo = filters.periodo || 'ambos';

    console.log('🏆 [RANKING] DEBUG - Dados de entrada:', {
      periodo,
      currentData: currentData.length,
      data2024: data2024.length
    });

    if (periodo === 'ambos') {
      const mockData2024 = [
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
        { cliente: 'MS', janeiro: 1, fevereiro: 3, marco: 0, abril: 1, maio: 38, total: 43 },
        { cliente: 'PETROBRAS', janeiro: 8, fevereiro: 8, marco: 8, abril: 8, maio: 10, total: 42 }
      ];

      const dados2024Final = data2024.length > 0 ? data2024 : mockData2024;

      const result = dados2025.map(cliente2025 => {
        const cliente2024 = dados2024Final.find(c => c.cliente === cliente2025.cliente);
        
        const total2024 = cliente2024?.total || 0;
        const total2025 = cliente2025.total || 0;
        
        const media2024 = Math.round((total2024 / 12) * 10) / 10;
        const media2025 = Math.round((total2025 / 5) * 10) / 10;
        
        const crescimento = media2024 > 0 ? 
          Math.round(((media2025 - media2024) / media2024) * 100) : 
          (media2025 > 0 ? 100 : 0);

        return {
          cliente: cliente2025.cliente,
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

      const resultadoFinal = result
        .filter(item => item.media2025 > 0)
        .sort((a, b) => b.media2025 - a.media2025)
        .slice(0, 10);

      return resultadoFinal;
    } else {
      const mesesDivisor = periodo === '2024' ? 12 : 5;
      
      const result = currentData
        .map(cliente => ({
          cliente: cliente.cliente,
          total: cliente.total || 0,
          media: Math.round(((cliente.total || 0) / mesesDivisor) * 10) / 10,
          valor: cliente.total || 0
        }))
        .filter(item => item.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      return result;
    }
  }

  static categorizeGrowth(crescimento) {
    if (crescimento >= 50) return 'alto';
    if (crescimento >= 20) return 'medio';
    if (crescimento >= 0) return 'baixo';
    return 'negativo';
  }

  static processComparisonData(data, filters) {
    const currentData = data.visaoGeral || [];
    const data2024 = data.visaoGeral2024 || [];
    
    const total2025 = currentData.reduce((sum, cliente) => sum + (cliente.total || 0), 0);
    const total2024 = data2024.reduce((sum, cliente) => sum + (cliente.total || 0), 0);
    
    const media2025 = currentData.length > 0 ? Math.round((total2025 / 5) * 10) / 10 : 0;
    const media2024 = data2024.length > 0 ? Math.round((total2024 / 12) * 10) / 10 : 0;
    
    return [
      {
        periodo: '2024',
        total: total2024,
        media: media2024,
        clientes: data2024.length
      },
      {
        periodo: '2025',
        total: total2025,
        media: media2025,
        clientes: currentData.length
      }
    ];
  }

  static processDistributionData(data, filters) {
    const currentData = data.visaoGeral || [];
    
    if (!currentData || currentData.length === 0) return [];
    
    const categories = {
      'Alto Volume (>50)': 0,
      'Médio Volume (20-50)': 0,
      'Baixo Volume (<20)': 0
    };
    
    currentData.forEach(cliente => {
      const total = cliente.total || 0;
      if (total > 50) {
        categories['Alto Volume (>50)']++;
      } else if (total >= 20) {
        categories['Médio Volume (20-50)']++;
      } else if (total > 0) {
        categories['Baixo Volume (<20)']++;
      }
    });
    
    return Object.entries(categories).map(([categoria, quantidade]) => ({
      categoria,
      quantidade,
      porcentagem: Math.round((quantidade / currentData.length) * 100)
    }));
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
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  }

  static processMonthlyDetailedData(data, filters) {
    const currentData = data.visaoGeral || [];
    const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    
    if (!currentData || currentData.length === 0) return [];
    
    return meses.map(mes => {
      const total = currentData.reduce((sum, cliente) => sum + (cliente[mes] || 0), 0);
      const clientes = currentData.filter(cliente => (cliente[mes] || 0) > 0).length;
      const media = clientes > 0 ? Math.round((total / clientes) * 10) / 10 : 0;
      
      return {
        mes: mes.charAt(0).toUpperCase() + mes.slice(1),
        total,
        clientes,
        media
      };
    });
  }

  static calculateGrowth(valor2024, valor2025) {
    if (!valor2024 || valor2024 === 0) {
      return valor2025 > 0 ? 100 : 0;
    }
    
    const media2024 = valor2024 / 12;
    const media2025 = valor2025 / 5;
    
    return Math.round(((media2025 - media2024) / media2024) * 100);
  }
}