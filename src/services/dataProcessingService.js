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

  static GRUPO_EMPRESAS = ['in.Pacto','STA','Holding','Listening'];

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
    console.log('🔄 [CONSOLIDATION] Usando APENAS dados do Notion...');
    console.log('🔍 [CONSOLIDATION] Dados de entrada:', {
      notionLength: notionData?.length || 0,
      sheetsIgnorados: 'Fonte Excel desabilitada'
    });
    
    // ✅ USAR APENAS NOTION - IGNORAR SHEETS COMPLETAMENTE
    const normalizedNotion = (notionData || []).map((item, index) => ({
      ...item,
      _source: 'notion',
      _id: `notion_${item.id || index}`,
      _sourceIndex: index,
      cliente: item.cliente1 || item.cliente || item.Cliente || 'Cliente Não Informado',
      dataEntrega: item.dataEntrega || item.DataEntrega || item.data_entrega,
      tipoDemanda: item.tipoDemanda || item.TipoDemanda || item.tipo_demanda,
      _original: item
    }));

    // ✅ RETORNAR APENAS DADOS DO NOTION
    const consolidated = normalizedNotion;
    
    console.log('✅ [CONSOLIDATION] Concluída - NOTION ONLY:', {
      notion: normalizedNotion.length,
      sheets: 0,
      total: consolidated.length
    });
    
    // ✅ Verificar se todos os 1616 registros estão sendo processados
    if (consolidated.length !== notionData?.length) {
      console.warn('⚠️ [CONSOLIDATION] Possível perda de dados:', {
        esperado: notionData?.length,
        processado: consolidated.length,
        diferenca: (notionData?.length || 0) - consolidated.length
      });
    }

    return consolidated;
  }

  // ==========================================
  // CLIENTES ÚNICOS (FONTE: SOMENTE NOTION)
  // ==========================================
  static getUniqueClients(data) {
    console.log('🏢 [CLIENTES NOTION] Extraindo do campo "Cliente" do Notion...');
    
    if (!data || !data.originalOrders) {
      console.log('❌ [CLIENTES] Nenhum dado do Notion disponível');
      return [];
    }

    try {
      const clientesSet = new Set();
      const clientesDetalhados = new Map();
      const orders = data.originalOrders || [];
      let ordersComCliente = 0;
      let ordersSemCliente = 0;

      console.log(`🏢 [CLIENTES] Processando ${orders.length} registros do Notion...`);

      orders.forEach((order, index) => {
        // ✅ FOCAR ESPECIFICAMENTE NO CAMPO "Cliente" DO NOTION
        const campoCliente = order.Cliente || order.cliente || order.cliente1;
        
        // Debug dos primeiros 10 registros
        if (index < 10) {
          console.log(`🔍 [REGISTRO ${index}] Campo Cliente:`, {
            'Cliente': order.Cliente,
            'cliente': order.cliente,
            'cliente1': order.cliente1,
            'valorEscolhido': campoCliente,
            'todosOsCampos': Object.keys(order).filter(k => k.toLowerCase().includes('client'))
          });
        }

        if (campoCliente && typeof campoCliente === 'string' && campoCliente.trim()) {
          const valorLimpo = campoCliente.trim();
          
          // ✅ PROCESSAR CLIENTES MÚLTIPLOS (separados por vírgula, etc.)
          const separadores = [',', '/', '|', ';', '+', '&', ' e ', ' E '];
          let clientesEncontrados = [valorLimpo];
          
          // Verificar se há separadores
          for (const sep of separadores) {
            if (valorLimpo.includes(sep)) {
              clientesEncontrados = valorLimpo.split(sep)
                .map(c => c.trim())
                .filter(c => c && c.length > 1);
              break; // Usar apenas o primeiro separador encontrado
            }
          }

          // ✅ ADICIONAR CADA CLIENTE ENCONTRADO
          let clientesValidosNaOrder = 0;
          
          clientesEncontrados.forEach(cliente => {
            const clienteFinal = cliente.trim();
            
            // Filtros mínimos (bem permissivos para não perder dados)
            if (clienteFinal && 
                clienteFinal.length >= 2 && 
                clienteFinal !== 'null' && 
                clienteFinal !== 'undefined' &&
                clienteFinal !== 'N/A' &&
                clienteFinal !== '-' &&
                clienteFinal !== '0' &&
                !clienteFinal.toLowerCase().includes('teste')) {
              
              clientesSet.add(clienteFinal);
              clientesValidosNaOrder++;
              
              // ✅ RASTREAR DETALHES
              if (!clientesDetalhados.has(clienteFinal)) {
                clientesDetalhados.set(clienteFinal, {
                  nome: clienteFinal,
                  primeiraOcorrencia: index,
                  valorOriginal: valorLimpo,
                  ocorrencias: 1,
                  separadoPor: clientesEncontrados.length > 1 ? 'múltiplos' : 'único'
                });
              } else {
                clientesDetalhados.get(clienteFinal).ocorrencias++;
              }
            }
          });
          
          if (clientesValidosNaOrder > 0) {
            ordersComCliente++;
          } else {
            ordersSemCliente++;
          }
          
        } else {
          ordersSemCliente++;
          
          // Log de registros sem cliente (primeiros 10)
          if (ordersSemCliente <= 10) {
            console.log(`❌ [SEM CLIENTE ${ordersSemCliente}] Registro ${index}:`, {
              id: order.id,
              Cliente: order.Cliente,
              cliente: order.cliente,
              cliente1: order.cliente1,
              todosOsCampos: Object.keys(order).slice(0, 10)
            });
          }
        }
      });

      // ✅ RESULTADOS DETALHADOS
      const clientesUnicos = Array.from(clientesSet).sort();
      const clientesComDetalhes = Array.from(clientesDetalhados.values())
        .sort((a, b) => b.ocorrencias - a.ocorrencias);

      console.log('🏢 [CLIENTES NOTION] === RESULTADOS ESPECÍFICOS ===');
      console.log(`  📊 Total de clientes únicos: ${clientesUnicos.length}`);
      console.log(`  ✅ Orders com cliente: ${ordersComCliente}`);
      console.log(`  ❌ Orders sem cliente: ${ordersSemCliente}`);
      console.log(`  📊 Taxa de sucesso: ${((ordersComCliente / orders.length) * 100).toFixed(1)}%`);
      
      console.log('🏢 [TOP 30 CLIENTES] Por frequência:');
      clientesComDetalhes.slice(0, 30).forEach((cliente, index) => {
        console.log(`  ${index + 1}. "${cliente.nome}" (${cliente.ocorrencias}x) ${cliente.separadoPor === 'múltiplos' ? '🔀' : ''}`);
      });

      // ✅ VERIFICAR SE CHEGAMOS PRÓXIMO DOS 1616 REGISTROS
      if (orders.length < 1616) {
        console.warn(`⚠️ [CLIENTES] Esperado 1616 registros, temos ${orders.length}. Faltam ${1616 - orders.length} registros.`);
      }

      // ✅ ANÁLISE DE CLIENTES MÚLTIPLOS
      const clientesMultiplos = clientesComDetalhes.filter(c => c.separadoPor === 'múltiplos');
      if (clientesMultiplos.length > 0) {
        console.log(`🔀 [CLIENTES MÚLTIPLOS] ${clientesMultiplos.length} clientes encontrados em registros com múltiplos clientes:`);
        clientesMultiplos.slice(0, 10).forEach(c => {
          console.log(`  "${c.nome}" (original: "${c.valorOriginal}")`);
        });
      }

      console.log('📋 [LISTA COMPLETA] Todos os clientes encontrados:');
      console.log(clientesUnicos);

      return clientesUnicos;

    } catch (err) {
      console.error('❌ [CLIENTES] Erro:', err);
      return [];
    }
  }

  // ==========================================
  // CONSOLIDAÇÃO DE DADOS DE CLIENTES
  // ==========================================
  
  // 🆕 Função de consolidação de clientes corrigida
  static consolidateClientData(data) {
    console.log('🔄 [CONSOLIDATION] Iniciando consolidação de clientes...');
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ [CONSOLIDATION] Dados não são um array');
      return [];
    }
    
    const consolidated = data.map((order, index) => {
      // Criar campo cliente consolidado
      const clientes = [];
      
      // Coletar todos os campos de cliente
      [order.cliente, order.cliente1, order.cliente2].forEach(cliente => {
        if (cliente && cliente.trim() && cliente.trim() !== '') {
          // Dividir por vírgula se necessário
          if (cliente.includes(',')) {
            const splitClientes = cliente.split(',').map(c => c.trim()).filter(c => c);
            clientes.push(...splitClientes);
          } else {
            clientes.push(cliente.trim());
          }
        }
      });

      // Remover duplicatas e juntar
      const clientesUnicos = [...new Set(clientes)];
      const clienteConsolidado = clientesUnicos.join(', ');

      return {
        ...order,
        clienteOriginal: order.cliente,
        cliente: clienteConsolidado || 'Cliente Não Informado',
        cliente1: clienteConsolidado || order.cliente1 || 'Cliente Não Informado',
        clientesArray: clientesUnicos,
        temMultiplosClientes: clientesUnicos.length > 1,
        _consolidado: true
      };
    });
    
    console.log(`✅ [CONSOLIDATION] ${consolidated.length} registros consolidados`);
    console.log(`📊 [CONSOLIDATION] Registros com múltiplos clientes: ${consolidated.filter(o => o.temMultiplosClientes).length}`);
    console.log(`📊 [CONSOLIDATION] Registros sem cliente: ${consolidated.filter(o => o.cliente === 'Cliente Não Informado').length}`);
    
    return consolidated;
  }

  // ==========================================
  // MÉTRICAS AVANÇADAS - CORREÇÃO DEFINITIVA
  // ==========================================
  
  // 🆕 NOVA FUNÇÃO: Cálculo correto da média mensal para 2024 e 2025
  static calculateCorrectMonthlyAverage(filteredData, filters) {
    console.log('📊 [MÉTRICAS CORRIGIDAS] Calculando médias mensais para 2024 e 2025...');
    
    if (!filteredData || !Array.isArray(filteredData)) {
      return { 
        mediaMensal2024: 0,
        mediaMensal2025: 0 
      };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1, Outubro = 10

    // ✅ FILTRAR DADOS DE 2024
    const dados2024Filtrados = filteredData.filter(item => {
      if (!item.dataEntrega) return false;
      
      try {
        let year;
        if (typeof item.dataEntrega === 'string') {
          // Formato YYYY-MM-DD ou DD/MM/YYYY
          if (item.dataEntrega.includes('-')) {
            year = parseInt(item.dataEntrega.split('-')[0]);
          } else if (item.dataEntrega.includes('/')) {
            const parts = item.dataEntrega.split('/');
            year = parseInt(parts[2]); // DD/MM/YYYY
          }
        } else {
          year = new Date(item.dataEntrega).getFullYear();
        }
        
        return year === 2024;
      } catch (error) {
        return false;
      }
    });

    // ✅ FILTRAR DADOS DE 2025
    const data2025 = filteredData.filter(item => {
      if (!item.dataEntrega) return false;
      
      try {
        let year;
        if (typeof item.dataEntrega === 'string') {
          // Formato YYYY-MM-DD ou DD/MM/YYYY
          if (item.dataEntrega.includes('-')) {
            year = parseInt(item.dataEntrega.split('-')[0]);
          } else if (item.dataEntrega.includes('/')) {
            const parts = item.dataEntrega.split('/');
            year = parseInt(parts[2]); // DD/MM/YYYY
          }
        } else {
          year = new Date(item.dataEntrega).getFullYear();
        }
        
        return year === 2025;
      } catch (error) {
        return false;
      }
    });

    // ✅ CÁLCULO CORRETO PARA 2024
      const totalDemandas2024 = dados2024Filtrados.length;
    const mesesTotais2024 = 12; // 2024 completo = 12 meses
    
    const mediaMensal2024 = mesesTotais2024 > 0 ? 
      Number((totalDemandas2024 / mesesTotais2024).toFixed(1)) : 0;

    // ✅ CÁLCULO CORRETO PARA 2025
    const totalDemandas2025 = data2025.length;
    const mesesDecorridos2025 = currentYear === 2025 ? currentMonth : 12;
    
    const mediaMensal2025 = mesesDecorridos2025 > 0 ? 
      Number((totalDemandas2025 / mesesDecorridos2025).toFixed(1)) : 0;

    // ✅ CÁLCULO DE CRESCIMENTO (OPCIONAL)
    const crescimento = mediaMensal2024 > 0 ? 
      Number(((mediaMensal2025 - mediaMensal2024) / mediaMensal2024 * 100).toFixed(1)) : 0;

    console.log('📊 [CORREÇÕES APLICADAS] Novos cálculos:', {
      '2024': {
        totalDemandas: totalDemandas2024,
        meses: mesesTotais2024,
        mediaMensal: mediaMensal2024,
        calculo: `${totalDemandas2024} / ${mesesTotais2024} = ${mediaMensal2024}`
      },
      '2025': {
        totalDemandas: totalDemandas2025,
        meses: mesesDecorridos2025,
        mediaMensal: mediaMensal2025,
        calculo: `${totalDemandas2025} / ${mesesDecorridos2025} = ${mediaMensal2025}`
      },
      crescimento: `${crescimento}%`
    });

    return {
      // ✅ MÉDIAS MENSAIS CORRIGIDAS
      mediaMensal2024,
      mediaMensal2025,
      
      // ✅ DADOS DETALHADOS
      totalDemandas2024,
      totalDemandas2025,
      mesesTotais2024,
      mesesDecorridos2025,
      
      // ✅ CRESCIMENTO
      crescimento,
      
      // ✅ CLIENTES ÚNICOS
      totalClientes2024: new Set(dados2024Filtrados.map(item => item.cliente).filter(Boolean)).size,
      totalClientes2025: new Set(data2025.map(item => item.cliente).filter(Boolean)).size,
      
      // ✅ OUTRAS MÉTRICAS
      melhorAno: mediaMensal2025 > mediaMensal2024 ? '2025' : '2024',
      diferencaAbsoluta: Number((mediaMensal2025 - mediaMensal2024).toFixed(1))
    };
  }

  static calculateAdvancedMetrics(data, filters = {}) {
    console.log('📊 [MÉTRICAS] Calculando (advanced)...');
    if (!data) return this.getEmptyMetrics();

    try {
      const trendData = this.processTrendData(data, filters);
      const actualCurrentMonthIndex = new Date().getMonth();

      const currentData = data.visaoGeral || [];
      const dados2024Visao = data.visaoGeral2024 || [];
      const dados2024Ranking = data.visaoGeral2024 || [];

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

      console.log('🔍 [DEBUG 2025] Processando dados de 2025...');
      console.log('🔍 [DEBUG 2025] Total de registros originais:', dadosOriginais.length);
      console.log('🔍 [DEBUG 2025] Mês atual (índice):', actualCurrentMonthIndex);
      console.log('🔍 [DEBUG 2025] Mês atual (número):', actualCurrentMonthIndex + 1);

      dadosOriginais.forEach((order, index) => {
        const dataEntrega = order.dataEntrega || order.DataEntrega || order.data_entrega;
        if (!dataEntrega) return;

        try {
          const data = new Date(dataEntrega);
          const ano = data.getFullYear();
          const mes = data.getMonth();
          
          // Log dos primeiros 10 registros para debug
          if (index < 10) {
            console.log(`🔍 [DEBUG 2025] Registro ${index}:`, {
              dataEntrega,
              ano,
              mes,
              mesNome: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][mes],
              cliente: order.cliente || order.Cliente || order.cliente1
            });
          }
          
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

      console.log('🔍 [DEBUG 2025] Resultado final:', {
        totalDemandas2025,
        totalClientes2025: clientesUnicos2025.size,
        demandasPorMes,
        mesesAtuais
      });

      const totalClientes2025 = clientesUnicos2025.size;

      // ✅ CORREÇÃO: Cálculo correto da média mensal (SEM dividir por clientes)
      const mediaReal2025 = mesesAtuais > 0 
        ? totalDemandas2025 / mesesAtuais 
        : 0;

      console.log('🧮 [CÁLCULO CORRIGIDO] Resultado:', {
        totalDemandas2025,
        totalClientes2025,
        mesesAtuais,
        mediaReal2025: mediaReal2025.toFixed(2),
        calculoCorreto: `${totalDemandas2025} / ${mesesAtuais} = ${mediaReal2025.toFixed(2)}`,
        calculoAnteriorErrado: `${totalDemandas2025} / ${totalClientes2025} / ${mesesAtuais} = ${(totalDemandas2025 / totalClientes2025 / mesesAtuais).toFixed(2)}`,
        demandasPorMes,
        clientesUnicos: Array.from(clientesUnicos2025).slice(0, 10)
      });
      
      // Log expandido para debug
      console.log('🔍 [VALORES EXPANDIDOS]:', {
        'Total Demandas 2025': totalDemandas2025,
        'Total Clientes Únicos': totalClientes2025,
        'Meses Atuais': mesesAtuais,
        'Média Calculada (CORRIGIDA)': mediaReal2025,
        'Média Anterior (ERRADA)': totalClientes2025 > 0 ? (totalDemandas2025 / totalClientes2025 / mesesAtuais).toFixed(2) : 0,
        'Distribuição por Mês': JSON.stringify(demandasPorMes, null, 2),
        'Primeiros 15 Clientes': Array.from(clientesUnicos2025).slice(0, 15)
      });
      
      // Log com valores completos em JSON
      console.log('🔍 [VALORES COMPLETOS JSON]:', JSON.stringify({
        'Total Demandas 2025': totalDemandas2025,
        'Total Clientes Únicos': totalClientes2025,
        'Meses Atuais': mesesAtuais,
        'Média Calculada (CORRIGIDA)': mediaReal2025,
        'Média Anterior (ERRADA)': totalClientes2025 > 0 ? (totalDemandas2025 / totalClientes2025 / mesesAtuais).toFixed(2) : 0,
        'Distribuição por Mês': demandasPorMes,
        'Todos os Clientes': Array.from(clientesUnicos2025),
        'Cálculo Correto': `${totalDemandas2025} / ${mesesAtuais} = ${mediaReal2025.toFixed(2)}`,
        'Cálculo Anterior (Errado)': `${totalDemandas2025} / ${totalClientes2025} / ${mesesAtuais} = ${(totalDemandas2025 / totalClientes2025 / mesesAtuais).toFixed(2)}`
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
        calculoCorreto: `${totalDemandas2025} / ${mesesAtuais} = ${mediaReal2025.toFixed(2)}`,
        calculoAnterior: `${totalDemandas2025} / ${totalClientes2025} / ${mesesAtuais} = ${(totalDemandas2025 / totalClientes2025 / mesesAtuais).toFixed(2)}`
      });

      // ✅ CORREÇÃO: Calcular médias corretas para 2024 e 2025
      // Filtrar dados de 2024
      console.log('🔍 [DEBUG 2024] Processando dados de 2024...');
      
      const dados2024 = dadosOriginais.filter(order => {
        const dataEntrega = order.dataEntrega || order.DataEntrega || order.data_entrega;
        if (!dataEntrega) return false;
        
        try {
          const data = new Date(dataEntrega);
          return data.getFullYear() === 2024;
        } catch {
          return false;
        }
      });

      const totalDemandas2024 = dados2024.length;
      const mesesTotais2024 = 12; // 2024 completo
      const mediaReal2024 = mesesTotais2024 > 0 ? totalDemandas2024 / mesesTotais2024 : 0;

      console.log('🔍 [DEBUG 2024] Resultado final:', {
        totalDemandas2024,
        mesesTotais2024,
        mediaReal2024,
        calculo: `${totalDemandas2024} / ${mesesTotais2024} = ${mediaReal2024}`
      });

      // Usar os cálculos corretos
      const overallAvg2024 = mediaReal2024;
      const overallAvg2025 = mediaReal2025;

      // ✅ CORREÇÃO: Processar trendData para calcular mesesAnalisados e melhorMes
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

      console.log('📊 [CÁLCULOS CORRIGIDOS] Comparação 2024 vs 2025:', {
        '2024': {
          totalDemandas: totalDemandas2024,
          meses: mesesTotais2024,
          mediaMensal: mediaReal2024.toFixed(1),
          calculo: `${totalDemandas2024} / ${mesesTotais2024} = ${mediaReal2024.toFixed(1)}`
        },
        '2025': {
          totalDemandas: totalDemandas2025,
          meses: mesesAtuais,
          mediaMensal: mediaReal2025.toFixed(1),
          calculo: `${totalDemandas2025} / ${mesesAtuais} = ${mediaReal2025.toFixed(1)}`
        },
        mesesAnalisados: monthsWithActualData,
        melhorMes: melhorMes
      });

      // 🔍 DEBUG DETALHADO: Verificar valores antes da formatação
      console.log('🔍 [DEBUG DETALHADO] Valores antes da formatação:', {
        overallAvg2024: overallAvg2024,
        overallAvg2025: overallAvg2025,
        mediaReal2024: mediaReal2024,
        mediaReal2025: mediaReal2025,
        formatDisplayValue2024: this.formatDisplayValue(overallAvg2024, 1),
        formatDisplayValue2025: this.formatDisplayValue(overallAvg2025, 1)
      });

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
        totalClientes2024: dados2024Ranking.length,
        totalRelatorios,
        totalDemandas: totalRelatorios,
        crescimento: this.roundToDecimal(crescimento, 0),
        crescimentoDemandas: this.roundToDecimal(crescimento, 0),
        mediaMensal2024: this.formatDisplayValue(overallAvg2024, 1),
        mediaMensal2025: this.formatDisplayValue(overallAvg2025, 1),
        mediaMensal: this.formatDisplayValue(overallAvg2025, 1),
        produtividade: this.formatDisplayValue(overallAvg2025, 1),
        // 🆕 NOVAS PROPRIEDADES CORRIGIDAS
        totalDemandas2024: totalDemandas2024,
        totalDemandas2025: totalDemandas2025,
        mesesTotais2024: mesesTotais2024,
        mesesDecorridos2025: mesesAtuais,
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
  // TREND DATA (12 meses, 2024 x 2025) - COMPARAÇÃO MÊS A MÊS REAL
  // ==========================================
  static processTrendData(data, filters = {}) {
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const actualCurrentMonthIndex = new Date().getMonth();
    const actualCurrentYear = new Date().getFullYear();

    // ✅ USAR ORIGINAL ORDERS PARA COMPARAÇÃO MÊS A MÊS REAL
    const originalOrders = data.originalOrders || [];
    
    console.log('📊 [TREND] Processando comparação mês a mês real:', {
      totalOrders: originalOrders.length,
      mesAtual: actualCurrentMonthIndex + 1,
      anoAtual: actualCurrentYear
    });

    // Função helper para extrair ano e mês de uma data
    const extractYearMonth = (item) => {
      try {
        // Priorizar dataEntregaDate se disponível
        if (item.dataEntregaDate) {
          const date = new Date(item.dataEntregaDate);
          if (!isNaN(date.getTime())) {
            return { year: date.getFullYear(), month: date.getMonth() }; // month: 0-11
          }
        }
        
        // Fallback para string dataEntrega
        const dataStr = item.dataEntrega || item.DataEntrega || item.data_entrega || '';
        if (!dataStr) return null;
        
        if (typeof dataStr === 'string') {
          // Formato YYYY-MM-DD
          if (dataStr.includes('-')) {
            const parts = dataStr.split('-');
            if (parts.length >= 2) {
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // JavaScript month is 0-based
              if (!isNaN(year) && !isNaN(month) && year >= 2020 && year <= 2030 && month >= 0 && month <= 11) {
                return { year, month };
              }
            }
          }
          
          // Formato DD/MM/YYYY
          if (dataStr.includes('/')) {
            const parts = dataStr.split('/');
            if (parts.length === 3) {
              const year = parseInt(parts[2]);
              const month = parseInt(parts[1]) - 1; // JavaScript month is 0-based
              if (!isNaN(year) && !isNaN(month) && year >= 2020 && year <= 2030 && month >= 0 && month <= 11) {
                return { year, month };
              }
            }
          }
          
          // Tentar parsear como Date
          const date = new Date(dataStr);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = date.getMonth();
            if (year >= 2020 && year <= 2030) {
              return { year, month };
            }
          }
        }
      } catch (e) {
        // Ignora erros
      }
      return null;
    };

    // Contar demandas por mês e ano
    const monthly = {};
    monthNames.forEach((name, idx) => {
      monthly[idx] = {
        monthName: name,
        total2024: 0,
        total2025: 0,
        monthIndex: idx
      };
    });

    originalOrders.forEach(order => {
      const yearMonth = extractYearMonth(order);
      if (!yearMonth) return;
      
      const { year, month } = yearMonth;
      const monthIndex = month; // 0-11
      
      if (monthIndex >= 0 && monthIndex <= 11) {
        if (year === 2024) {
          monthly[monthIndex].total2024++;
        } else if (year === 2025) {
          monthly[monthIndex].total2025++;
        }
      }
    });

    // Criar dados do gráfico com comparação mês a mês
    const trendChartData = monthNames.map((name, idx) => {
      const monthData = monthly[idx];
      const total2024 = monthData.total2024 || 0;
      const total2025 = monthData.total2025 || 0;
      
      // Calcular crescimento mês a mês
      const crescimento = total2024 > 0
        ? Math.round(((total2025 - total2024) / total2024) * 100)
        : (total2025 > 0 ? 100 : 0);
      
      // Média por cliente (se necessário para exibição)
      // Por enquanto, vamos usar o total de demandas
      const media2024 = total2024; // Total de demandas terminadas no mês
      const media2025 = idx <= actualCurrentMonthIndex ? total2025 : null; // Só mostra se já passou o mês

      return {
        month: name,
        mes: name,
        value2024: media2024,
        value2025: media2025,
        total: total2025,
        media: media2025 !== null ? media2025 : 0,
        total2024: total2024,
        media2024: media2024,
        crescimento: crescimento,
        isNovaGestao: idx === 3 || idx === 4, // Abril (index 3) e Maio (index 4)
        isFutureMonth: idx > actualCurrentMonthIndex
      };
    });

    console.log('✅ [TREND] Dados processados mês a mês:', {
      mesesProcessados: trendChartData.length,
      total2024: trendChartData.reduce((sum, m) => sum + (m.total2024 || 0), 0),
      total2025: trendChartData.reduce((sum, m) => sum + (m.total2025 || 0), 0),
      amostra: trendChartData.slice(0, 3)
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
    console.log('🏢 [CLIENTE] Aplicando filtro corrigido:', cliente);
    
    if (!cliente || cliente === 'todos') {
      console.log('🏢 [CLIENTE] Nenhum filtro aplicado (todos)');
      return data;
    }

    // Função auxiliar para verificar se um item corresponde ao filtro
    const matchesFilter = (item) => {
      if (!item) return false;
      
      // Verificar no cliente consolidado
      if (item.cliente) {
        const clienteStr = String(item.cliente).toLowerCase();
        if (clienteStr.includes(cliente.toLowerCase())) {
          return true;
        }
      }
      
      // Verificar no cliente1 (campo original do Notion)
      if (item.cliente1) {
        const clienteStr = String(item.cliente1).toLowerCase();
        if (clienteStr.includes(cliente.toLowerCase())) {
          return true;
        }
      }
      
      // Verificar no array de clientes se disponível
      if (item.clientesArray && Array.isArray(item.clientesArray)) {
        return item.clientesArray.some(clienteItem => 
          String(clienteItem).toLowerCase().includes(cliente.toLowerCase())
        );
      }
      
      // Fallback: verificar se é um cliente separado por vírgula
      const clienteStr = item.cliente || item.cliente1 || '';
      if (clienteStr.includes(',')) {
        const clientesSplit = clienteStr.split(',').map(c => c.trim().toLowerCase());
        return clientesSplit.some(c => c.includes(cliente.toLowerCase()));
      }
      
      return false;
    };

    const filtered = { ...data };
    const sections = [
      'visaoGeral','visaoGeral2024',
      'diarios','diarios2024',
      'semanais','semanais2024',
      'mensais','mensais2024',
      'especiais','especiais2024',
      'diagnosticos','diagnosticos2024',
      'design'
    ];
    
    // Filtrar cada seção
    sections.forEach(section => {
      if (Array.isArray(filtered[section])) {
        const before = filtered[section].length;
        filtered[section] = filtered[section].filter(matchesFilter);
        console.log(`🏢 [CLIENTE] ${section}: ${before} → ${filtered[section].length} registros`);
      }
    });
    
    // Filtrar originalOrders
    if (Array.isArray(filtered.originalOrders)) {
      const before = filtered.originalOrders.length;
      filtered.originalOrders = filtered.originalOrders.filter(matchesFilter);
      console.log(`🏢 [CLIENTE] originalOrders: ${before} → ${filtered.originalOrders.length} registros`);
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

  // 🆕 CORRIGIDO: Ranking com clientes únicos e separação correta de demandas
  // - filters.onlyGroup === true -> somente Inpacto/STA/Holding/Listening
  // - filters.excludeGroup === true -> exclui Inpacto/STA/Holding/Listening
  static processRankingData(data, filters = {}) {
    const currentData = data.visaoGeral || [];
    const dados2024Ranking = data.visaoGeral2024 || [];
    const originalOrders = data.originalOrders || [];
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
      data2024: dados2024Ranking.length,
      originalOrders: originalOrders.length,
      onlyGroup,
      excludeGroup
    });

    // ✅ NOVA LÓGICA: Processar clientes únicos a partir das ordens originais
    const processarClientesUnicos = (orders) => {
      const clientesMap = new Map();
      
      orders.forEach(order => {
        const clienteValue = order.cliente1 || order.cliente || order.Cliente;
        if (!clienteValue) return;
        
        const clienteStr = String(clienteValue).trim();
        
        // Separar clientes combinados (ex: "MIDR, in.Pacto")
        if (clienteStr.includes(',')) {
          const clientes = clienteStr.split(',').map(c => c.trim()).filter(Boolean);
          clientes.forEach(cliente => {
            if (!clientesMap.has(cliente)) {
              clientesMap.set(cliente, {
                cliente,
                total2024: 0,
                total2025: 0,
                demandas: 0
              });
            }
            clientesMap.get(cliente).demandas++;
            
            // Contar por ano baseado na data de entrega - CORRIGIDO para usar dataEntregaDate
            let ano = null;
            
            // Priorizar dataEntregaDate se disponível (já parseada)
            if (order.dataEntregaDate) {
              try {
                const date = new Date(order.dataEntregaDate);
                if (!isNaN(date.getTime())) {
                  ano = date.getFullYear();
                }
              } catch (e) {
                // Ignora erro
              }
            }
            
            // Fallback para string dataEntrega
            if (ano === null) {
              const dataEntrega = order.dataEntrega || order.DataEntrega || order.data_entrega;
              if (dataEntrega) {
                try {
                  if (typeof dataEntrega === 'string') {
                    if (dataEntrega.includes('-')) {
                      const parts = dataEntrega.split('-');
                      ano = parseInt(parts[0]);
                    } else if (dataEntrega.includes('/')) {
                      const parts = dataEntrega.split('/');
                      if (parts.length === 3) ano = parseInt(parts[2]);
                    }
                  }
                  if (!ano) {
                    const data = new Date(dataEntrega);
                    if (!isNaN(data.getTime())) ano = data.getFullYear();
                  }
                } catch (error) {
                  // Ignora erro
                }
              }
            }
            
            // Contar por ano
            if (ano === 2024) {
              clientesMap.get(cliente).total2024++;
            } else if (ano === 2025) {
              clientesMap.get(cliente).total2025++;
            } else if (ano === null || ano < 2024) {
              // Se não tem data válida ou é anterior a 2024, não conta para nenhum ano
              // (mas a demanda já foi contada no contador geral)
            }
          });
        } else {
          // Cliente único
          if (!clientesMap.has(clienteStr)) {
            clientesMap.set(clienteStr, {
              cliente: clienteStr,
              total2024: 0,
              total2025: 0,
              demandas: 0
            });
          }
          clientesMap.get(clienteStr).demandas++;
          
          // Contar por ano baseado na data de entrega
          const dataEntrega = order.dataEntrega || order.DataEntrega || order.data_entrega;
          if (dataEntrega) {
            try {
              const data = new Date(dataEntrega);
              const ano = data.getFullYear();
              if (ano === 2024) {
                clientesMap.get(clienteStr).total2024++;
              } else if (ano === 2025) {
                clientesMap.get(clienteStr).total2025++;
              }
            } catch (error) {
              // Se não conseguir parsear a data, conta como 2025 por padrão
              clientesMap.get(clienteStr).total2025++;
            }
          } else {
            // Se não tem data, conta como 2025 por padrão
            clientesMap.get(clienteStr).total2025++;
          }
        }
      });
      
      return Array.from(clientesMap.values());
    };

    if (periodo === 'ambos') {
      // ✅ USAR DADOS REAIS DAS ORDENS ORIGINAIS
      const clientesUnicos = processarClientesUnicos(originalOrders);
      
      console.log('🏆 [RANKING] Clientes únicos processados:', {
        total: clientesUnicos.length,
        sample: clientesUnicos.slice(0, 5).map(c => ({
          cliente: c.cliente,
          total2024: c.total2024,
          total2025: c.total2025,
          demandas: c.demandas
        }))
      });

      // Divisor dinâmico: 12 para 2024, meses decorridos de 2025
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1, Outubro = 10
      const divisor2024 = 12; // 2024 completo = 12 meses
      const divisor2025 = currentYear === 2025 ? currentMonth : 12; // Meses decorridos em 2025

      console.log('📊 [RANKING] Divisores usados:', {
        divisor2024,
        divisor2025,
        currentYear,
        currentMonth
      });

      let result = clientesUnicos.map(cliente => {
        // ✅ Média 2024: total de demandas do cliente em 2024 / 12
        const media2024 = cliente.total2024 > 0
          ? Math.round((cliente.total2024 / divisor2024) * 10) / 10
          : 0;
        
        // ✅ Média 2025: total de demandas do cliente em 2025 / meses decorridos
        const media2025 = cliente.total2025 > 0
          ? Math.round((cliente.total2025 / Math.max(divisor2025, 1)) * 10) / 10
          : 0;

        // Crescimento baseado na comparação das médias
        const crescimento = media2024 > 0
          ? Math.round(((media2025 - media2024) / media2024) * 100)
          : (media2025 > 0 ? 100 : 0);

        // ✅ Demandas: total inteiro de demandas em que o cliente aparece (independente do ano)
        const totalDemandas = Math.floor(cliente.demandas) || 0;
        
        // Log de debug para primeiros 5 clientes
        if (clientesUnicos.indexOf(cliente) < 5) {
          console.log(`📊 [RANKING] ${cliente.cliente}:`, {
            totalDemandas2024: cliente.total2024,
            totalDemandas2025: cliente.total2025,
            totalDemandas: totalDemandas,
            media2024: `${cliente.total2024} / ${divisor2024} = ${media2024}`,
            media2025: `${cliente.total2025} / ${divisor2025} = ${media2025}`,
            crescimento: `${crescimento}%`
          });
        }

        return {
          cliente: cliente.cliente,
          total2024: cliente.total2024, // Total de demandas em 2024 (inteiro)
          total2025: cliente.total2025, // Total de demandas em 2025 (inteiro)
          media2024, // Média mensal 2024
          media2025, // Média mensal 2025
          crescimento,
          categoria: this.categorizeGrowth(crescimento),
          valor: media2025,
          total: media2025,
          media: media2025,
          demandas: totalDemandas // Total de demandas (inteiro)
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
      const clientesUnicos = processarClientesUnicos(originalOrders);
      const divisor = periodo === '2024' ? 12 : (this.monthsWithData(currentData) || 10);

      let result = clientesUnicos
        .map(c => {
          const total = periodo === '2024' ? c.total2024 : c.total2025;
          const media = Math.round((total / Math.max(divisor, 1)) * 10) / 10;
          
          return {
            cliente: c.cliente,
            total,
            media,
            valor: total,
            demandas: c.demandas
          };
        })
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
    const dados2024Ranking = data.visaoGeral2024 || [];

    const total2025 = currentData.reduce((s, c) => s + (c.total || 0), 0);
    const total2024 = dados2024Ranking.reduce((s, c) => s + (c.total || 0), 0);

    const divisor2024 = 12;
    const divisor2025 = this.monthsWithData(currentData);

    const media2025 = currentData.length > 0
      ? Math.round((total2025 / Math.max(divisor2025,1)) * 10) / 10
      : 0;

    const media2024 = dados2024Ranking.length > 0
      ? Math.round((total2024 / divisor2024) * 10) / 10
      : 0;

    return [
      { periodo: '2024', total: total2024, media: media2024, clientes: dados2024Ranking.length },
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

// 🆕 EXPORTAÇÃO DA FUNÇÃO CORRIGIDA PARA USO DIRETO - VERSÃO LIMPA
export const calculateAdvancedMetrics = (filteredData, filters) => {
  try {
    console.log('📊 [MÉTRICAS v2] Iniciando cálculo corrigido...');
    
    if (!filteredData || !Array.isArray(filteredData)) {
      console.log('📊 [MÉTRICAS v2] Dados inválidos');
      return { 
        mediaMensal2024: 0,
        mediaMensal2025: 0,
        debug: 'Dados inválidos'
      };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    console.log('📊 [MÉTRICAS v2] Info atual:', { currentYear, currentMonth });

    // Função helper para extrair ano de forma segura
    const extractYear = (item) => {
      const dateField = item.dataEntrega || item.DataEntrega || item.data_entrega;
      if (!dateField) return null;
      
      try {
        if (typeof dateField === 'string') {
          if (dateField.includes('-')) {
            return parseInt(dateField.split('-')[0]);
          }
          if (dateField.includes('/')) {
            const parts = dateField.split('/');
            return parts.length === 3 ? parseInt(parts[2]) : null;
          }
        }
        return new Date(dateField).getFullYear();
      } catch {
        return null;
      }
    };

    // Filtrar dados por ano
    const items2024 = filteredData.filter(item => extractYear(item) === 2024);
    const items2025 = filteredData.filter(item => extractYear(item) === 2025);

    // Calcular médias
    const totalDemandas2024 = items2024.length;
    const totalDemandas2025 = items2025.length;
    
    const mediaMensal2024 = totalDemandas2024 / 12; // 2024 = 12 meses
    const mediaMensal2025 = totalDemandas2025 / (currentYear === 2025 ? currentMonth : 12);

    // Calcular crescimento
    const crescimento = mediaMensal2024 > 0 ? 
      ((mediaMensal2025 - mediaMensal2024) / mediaMensal2024 * 100) : 0;

    const resultado = {
      mediaMensal2024: Number(mediaMensal2024.toFixed(1)),
      mediaMensal2025: Number(mediaMensal2025.toFixed(1)),
      totalDemandas2024,
      totalDemandas2025,
      crescimento: Number(crescimento.toFixed(1)),
      mesesTotais2024: 12,
      mesesDecorridos2025: currentYear === 2025 ? currentMonth : 12,
      totalClientes2024: new Set(items2024.map(item => item.cliente).filter(Boolean)).size,
      totalClientes2025: new Set(items2025.map(item => item.cliente).filter(Boolean)).size,
      // Compatibilidade com código existente
      totalClientes: new Set(items2025.map(item => item.cliente).filter(Boolean)).size,
      melhorAno: mediaMensal2025 > mediaMensal2024 ? '2025' : '2024'
    };

    console.log('📊 [MÉTRICAS v2] Resultado final:', {
      '2024': `${totalDemandas2024} / 12 = ${resultado.mediaMensal2024}`,
      '2025': `${totalDemandas2025} / ${currentMonth} = ${resultado.mediaMensal2025}`,
      crescimento: `${resultado.crescimento}%`
    });

    return resultado;

  } catch (error) {
    console.error('❌ [MÉTRICAS v2] Erro capturado:', error);
    return {
      mediaMensal2024: 0,
      mediaMensal2025: 0,
      erro: error.message,
      debug: 'Erro na execução'
    };
  }
};

// ==========================================
// PASSO 4: KPIs CORRIGIDOS
// ==========================================

export function calculateCorrectedKPIs(data) {
    console.log('📊 [KPI CORRIGIDO] Calculando métricas corrigidas...');
    
    if (!data || !Array.isArray(data)) {
      console.warn('⚠️ [KPI CORRIGIDO] Dados inválidos');
      return {
        totalRegistros: 0,
        clientesUnicos: 0,
        demandas2025: 0,
        demandas2024: 0,
        mediaMensal2025: 0,
        mediaMensal2024: 0,
        crescimentoAnual: 0,
        clientesList: []
      };
    }
    
    // Dados consolidados
    const consolidatedData = this.consolidateClientData(data);
    
    // Extrair clientes únicos correto
    const dataForClients = { originalOrders: consolidatedData };
    const clientesUnicos = this.getUniqueClients(dataForClients);
    
    // Filtrar por ano
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const data2025 = consolidatedData.filter(item => {
      if (!item.dataEntrega && !item.dataEntregaDate) return false;
      const dateObj = item.dataEntregaDate || new Date(item.dataEntrega);
      const year = dateObj.getFullYear();
      return year === 2025;
    });
    
    const data2024 = consolidatedData.filter(item => {
      if (!item.dataEntrega && !item.dataEntregaDate) return false;
      const dateObj = item.dataEntregaDate || new Date(item.dataEntrega);
      const year = dateObj.getFullYear();
      return year === 2024;
    });

    // Calcular médias mensais
    const mediaMensal2025 = data2025.length > 0 ? (data2025.length / currentMonth) : 0;
    const mediaMensal2024 = data2024.length > 0 ? (data2024.length / 12) : 0;
    
    // Calcular crescimento
    const crescimentoAnual = mediaMensal2024 > 0 
      ? ((data2025.length - data2024.length) / data2024.length * 100) 
      : (data2025.length > 0 ? 100 : 0);

    console.log('📊 [KPI CORRIGIDO] Resultados:');
    console.log(`  📋 Total registros: ${consolidatedData.length}`);
    console.log(`  🏢 Clientes únicos: ${clientesUnicos.length}`);
    console.log(`  📅 Demandas 2025: ${data2025.length}`);
    console.log(`  📅 Demandas 2024: ${data2024.length}`);
    console.log(`  📊 Média mensal 2025: ${mediaMensal2025.toFixed(2)}`);
    console.log(`  📊 Média mensal 2024: ${mediaMensal2024.toFixed(2)}`);
    console.log(`  📈 Crescimento anual: ${crescimentoAnual.toFixed(2)}%`);

    return {
      totalRegistros: consolidatedData.length,
      clientesUnicos: clientesUnicos.length,
      clientesList: clientesUnicos,
      demandas2025: data2025.length,
      demandas2024: data2024.length,
      mediaMensal2025: Number(mediaMensal2025.toFixed(1)),
      mediaMensal2024: Number(mediaMensal2024.toFixed(1)),
      crescimentoAnual: Number(crescimentoAnual.toFixed(1)),
      mesesDecorridos2025: currentMonth,
      totalMeses2024: 12
    };
  }


// 🆕 FUNÇÃO NOVA SEM CONFLITOS - KPI METRICS  
export const calculateKPIMetrics = (filteredData) => {
  try {
    console.log('📊 [KPI METRICS] Iniciando cálculo simples...');
    
    if (!filteredData || !Array.isArray(filteredData)) {
      console.log('📊 [KPI METRICS] Dados inválidos');
      return { 
        mediaMensal2024: 0,
        mediaMensal2025: 0
      };
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // Outubro = 10

    // Separar por ano usando os dados filtrados
    const items2024 = filteredData.filter(item => {
      const dataStr = item.dataEntrega || '';
      return dataStr.includes('2024');
    });

    const items2025 = filteredData.filter(item => {
      const dataStr = item.dataEntrega || '';
      return dataStr.includes('2025');
    });

    // Calcular médias
    const total2024 = items2024.length;
    const total2025 = items2025.length;
    
    const mediaMensal2024 = Number((total2024 / 12).toFixed(1));
    const mediaMensal2025 = Number((total2025 / currentMonth).toFixed(1));
    
    const crescimento = mediaMensal2024 > 0 ? 
      Number(((mediaMensal2025 - mediaMensal2024) / mediaMensal2024 * 100).toFixed(1)) : 0;

    console.log('📊 [KPI METRICS] Resultado:', {
      total2024,
      total2025,
      mediaMensal2024,
      mediaMensal2025,
      crescimento: `${crescimento}%`
    });

    return {
      mediaMensal2024,
      mediaMensal2025,
      totalDemandas2024: total2024,
      totalDemandas2025: total2025,
      crescimento,
      mesesTotais2024: 12,
      mesesDecorridos2025: currentMonth
    };

  } catch (error) {
    console.error('❌ [KPI METRICS] Erro:', error);
    return {
      mediaMensal2024: 0,
      mediaMensal2025: 0,
      erro: error.message
    };
  }
};


export const extractDynamicKPIMetrics = (consolidatedData) => {
  try {
    console.log('📊 [KPI DINÂMICO] Extraindo dados em tempo real...');
    console.log('📊 [KPI DINÂMICO] Dados recebidos:', {
      tipo: typeof consolidatedData,
      isArray: Array.isArray(consolidatedData),
      length: Array.isArray(consolidatedData) ? consolidatedData.length : 'N/A',
      sample: Array.isArray(consolidatedData) ? consolidatedData.slice(0, 2) : 'N/A'
    });
    
    if (!consolidatedData || !Array.isArray(consolidatedData)) {
      console.log('⚠️ [KPI] Sem dados consolidados, usando fallback');
      return {
        mediaMensal2024: 0,
        mediaMensal2025: 0,
        totalDemandas2024: 0,
        totalDemandas2025: 0,
        crescimento: 0,
        crescimentoTotal2025: 0,
        crescimentoMedio: 0,
        mesesDecorridos2025: new Date().getMonth() + 1,
        source: 'fallback'
      };
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // Janeiro = 1, Outubro = 10
    const currentYear = currentDate.getFullYear();
    console.log('📊 [KPI DINÂMICO] Mês atual:', currentMonth, 'Ano:', currentYear);
    
    // Função helper para extrair ano de data - CORRIGIDA para usar dataEntregaDate primeiro
    const extractYear = (item) => {
      try {
        // Priorizar dataEntregaDate se disponível (já parseada)
        if (item.dataEntregaDate) {
          const date = new Date(item.dataEntregaDate);
          if (!isNaN(date.getTime())) {
            return date.getFullYear();
          }
        }
        
        // Fallback para string dataEntrega
        const dataStr = item.dataEntrega || item.DataEntrega || item.data_entrega || '';
        if (!dataStr) return null;
        
        if (typeof dataStr === 'string') {
          // Verificar formato YYYY-MM-DD
          if (dataStr.includes('-')) {
            const parts = dataStr.split('-');
            const year = parseInt(parts[0]);
            if (!isNaN(year) && year >= 2020 && year <= 2030) {
              return year;
            }
          }
          
          // Verificar formato DD/MM/YYYY
          if (dataStr.includes('/')) {
            const parts = dataStr.split('/');
            if (parts.length === 3) {
              const year = parseInt(parts[2]);
              if (!isNaN(year) && year >= 2020 && year <= 2030) {
                return year;
              }
            }
          }
          
          // Verificar strings com ano literal
          if (dataStr.includes('2024')) return 2024;
          if (dataStr.includes('2025')) return 2025;
          
          // Tentar parsear como Date
          const date = new Date(dataStr);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            if (year >= 2020 && year <= 2030) {
              return year;
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ [EXTRACT YEAR] Erro ao extrair ano:', e, item);
      }
      return null;
    };

    // Função helper para extrair mês de data
    const extractMonth = (item) => {
      const dataStr = item.dataEntrega || item.DataEntrega || item.data_entrega || '';
      if (!dataStr) return null;
      
      try {
        if (item.dataEntregaDate) {
          return new Date(item.dataEntregaDate).getMonth() + 1; // 1-12
        }
        if (typeof dataStr === 'string') {
          if (dataStr.includes('-')) {
            const parts = dataStr.split('-');
            if (parts.length >= 2) return parseInt(parts[1]);
          }
          if (dataStr.includes('/')) {
            const parts = dataStr.split('/');
            if (parts.length === 3) return parseInt(parts[1]);
          }
        }
        const date = new Date(dataStr);
        if (!isNaN(date.getTime())) return date.getMonth() + 1;
      } catch (e) {
        // Ignora erros
      }
      return null;
    };
    
    // Separar dados por ano
    const items2024 = consolidatedData.filter(item => extractYear(item) === 2024);
    const items2025 = consolidatedData.filter(item => extractYear(item) === 2025);

    console.log('📊 [KPI DINÂMICO] Filtros por ano:', {
      items2024: items2024.length,
      items2025: items2025.length,
      totalItems: consolidatedData.length,
      itemsSemData: consolidatedData.filter(i => !extractYear(i)).length,
      sample2024: items2024.slice(0, 2).map(i => ({ 
        dataEntrega: i.dataEntrega || i.DataEntrega || i.data_entrega,
        dataEntregaDate: i.dataEntregaDate,
        anoExtraido: extractYear(i),
        cliente: i.cliente || i.Cliente || i.cliente1
      })),
      sample2025: items2025.slice(0, 2).map(i => ({ 
        dataEntrega: i.dataEntrega || i.DataEntrega || i.data_entrega,
        dataEntregaDate: i.dataEntregaDate,
        anoExtraido: extractYear(i),
        cliente: i.cliente || i.Cliente || i.cliente1
      }))
    });

    // Calcular totais
    const totalDemandas2024 = items2024.length;
    const totalDemandas2025 = items2025.length;
    
    // Média mensal 2024: total / 12
    const mediaMensal2024 = Number((totalDemandas2024 / 12).toFixed(1));
    
    // Média mensal 2025: total / meses decorridos
    const mesesDecorridos2025 = currentYear === 2025 ? currentMonth : 12;
    const mediaMensal2025 = Number((totalDemandas2025 / mesesDecorridos2025).toFixed(1));
    
    // Crescimento médio: comparação mês a mês das médias mensais
    const crescimentoMedio = mediaMensal2024 > 0 ? 
      Number(((mediaMensal2025 - mediaMensal2024) / mediaMensal2024 * 100).toFixed(1)) : 
      (mediaMensal2025 > 0 ? 100 : 0);
    
    // Crescimento 2025: porcentagem de crescimento total (demandas2025 vs demandas2024)
    const crescimentoTotal2025 = totalDemandas2024 > 0 ?
      Number(((totalDemandas2025 - totalDemandas2024) / totalDemandas2024 * 100).toFixed(1)) :
      (totalDemandas2025 > 0 ? 100 : 0);

    console.log('📊 [KPI DINÂMICO] Calculado:', {
      totalDemandas2024,
      totalDemandas2025,
      mediaMensal2024,
      mediaMensal2025,
      crescimentoMedio,
      crescimentoTotal2025,
      mesesDecorridos2025,
      source: 'dynamic',
      // Valores detalhados para debug
      calculo2024: `${totalDemandas2024} / 12 = ${mediaMensal2024}`,
      calculo2025: `${totalDemandas2025} / ${mesesDecorridos2025} = ${mediaMensal2025}`,
      calculoCrescimentoMedio: `(${mediaMensal2025} - ${mediaMensal2024}) / ${mediaMensal2024} * 100 = ${crescimentoMedio}%`,
      calculoCrescimentoTotal: `(${totalDemandas2025} - ${totalDemandas2024}) / ${totalDemandas2024} * 100 = ${crescimentoTotal2025}%`
    });

    const resultado = {
      mediaMensal2024: Number(mediaMensal2024) || 0,
      mediaMensal2025: Number(mediaMensal2025) || 0,
      totalDemandas2024: Number(totalDemandas2024) || 0,
      totalDemandas2025: Number(totalDemandas2025) || 0,
      crescimento: Number(crescimentoMedio) || 0, // Mantém compatibilidade
      crescimentoMedio: Number(crescimentoMedio) || 0, // Crescimento médio (comparação de médias)
      crescimentoTotal2025: Number(crescimentoTotal2025) || 0, // Crescimento total (demandas2025 vs demandas2024)
      mesesDecorridos2025: Number(mesesDecorridos2025) || currentMonth,
      source: 'dynamic'
    };
    
    console.log('✅ [KPI DINÂMICO] Retornando:', resultado);
    return resultado;

  } catch (error) {
    console.error('❌ [KPI DINÂMICO] Erro:', error);
    // Fallback para valores fixos se der erro
    return {
      mediaMensal2024: 0,
      mediaMensal2025: 0,
      totalDemandas2024: 0,
      totalDemandas2025: 0,
      crescimento: 0,
      crescimentoMedio: 0,
      crescimentoTotal2025: 0,
      mesesDecorridos2025: new Date().getMonth() + 1,
      source: 'fallback-error'
    };
  }
};