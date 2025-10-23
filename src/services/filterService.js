// ==========================================
// src/services/filterService.js
// Serviço para filtros e manipulação de dados
// ==========================================

export class FilterService {
  
  // ==========================================
  // FUNÇÃO PRINCIPAL DE FILTROS
  // ==========================================
  
  // Aplicar filtros aos dados
  static applyFilters(data, filters) {
    if (!data) return null;

    let filteredData = JSON.parse(JSON.stringify(data)); // Deep clone

    console.log('🔧 Aplicando filtros:', filters);

    // 1. PRIMEIRO: Filtrar por tipo de conteúdo (baseado na coluna "Tipo de demanda")
    if (filters.contentType && filters.contentType !== 'todos') {
      filteredData = this.filterByContentType(filteredData, filters.contentType);
    }

    // 2. Aplicar filtros de período
    if (filters.periodo && filters.periodo !== 'todos') {
      filteredData = this.filterByPeriod(filteredData, filters.periodo);
    }

    // 3. Aplicar filtro de cliente
    if (filters.cliente && filters.cliente !== 'todos') {
      filteredData = this.filterByClient(filteredData, filters.cliente);
    }

    // 4. Aplicar filtro de tipo antigo (manter compatibilidade)
    if (filters.tipo && filters.tipo !== 'todos') {
      filteredData = this.filterByType(filteredData, filters.tipo);
    }

    // 5. Recalcular totais após todos os filtros
    filteredData = this.recalculateTotals(filteredData);

    console.log('✅ Filtros aplicados com sucesso');

    return filteredData;
  }

  // ==========================================
  // FILTROS ESPECÍFICOS
  // ==========================================

  // Extrair tipos únicos de demanda dos dados
  static getUniqueContentTypes(data) {
    if (!data || !data.originalOrders) return [];

    const uniqueTypes = [...new Set(data.originalOrders
      .map(order => order.tipoDemanda)
      .filter(tipo => tipo && tipo.trim() !== '')
      .map(tipo => tipo.trim())
    )].sort();

    console.log('🏷️ Tipos únicos extraídos para dropdown:', uniqueTypes);
    
    return uniqueTypes.map(tipo => ({
      id: tipo.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''), // ID limpo para filtros
      label: tipo,           // Texto para exibir no dropdown
      value: tipo           // Valor original da planilha
    }));
  }

  // Filtrar dados por tipo de demanda real (baseado na coluna da planilha)
  static filterByContentType(data, tipoSelecionado) {
    if (!data || !data.originalOrders || tipoSelecionado === 'todos') {
      return data;
    }

    console.log(`🔍 Filtrando por tipo de demanda: "${tipoSelecionado}"`);

    // Filtrar ordens por tipo de demanda
    const filteredOrders = data.originalOrders.filter(order => 
      order.tipoDemanda && order.tipoDemanda.trim() === tipoSelecionado
    );

    console.log(`📊 Ordens filtradas: ${filteredOrders.length} de ${data.originalOrders.length}`);

    // Recalcular dados dos clientes baseado nas ordens filtradas
    const clienteStats = {};

    filteredOrders.forEach(order => {
      const cliente = order.cliente1;
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

      // Distribuir por ano e mês - apenas para datas até a data atual
      if (order.dataEntregaDate) {
        // Verificar se a data de entrega não é futura
        const currentDate = new Date();
        // Resetar horas para comparação apenas de data
        currentDate.setHours(0, 0, 0, 0);
        
        // Só processar se a data de entrega for menor ou igual à data atual
        if (order.dataEntregaDate <= currentDate) {
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
      }
    });

    const filteredClientsData = Object.values(clienteStats);

    // Retornar dados no formato esperado pelo dashboard
    return {
      ...data,
      filteredByContentType: tipoSelecionado,
      totalFilteredOrders: filteredOrders.length,
      
      // Usar os dados filtrados para todas as categorias
      visaoGeral: filteredClientsData,
      visaoGeral2024: filteredClientsData.filter(c => c['2024'] > 0),
      diarios: filteredClientsData,
      diarios2024: filteredClientsData.filter(c => c['2024'] > 0),
      semanais: filteredClientsData,
      semanais2024: filteredClientsData.filter(c => c['2024'] > 0),
      mensais: filteredClientsData,
      mensais2024: filteredClientsData.filter(c => c['2024'] > 0),
      especiais: filteredClientsData,
      especiais2024: filteredClientsData.filter(c => c['2024'] > 0),
      diagnosticos: filteredClientsData,
      diagnosticos2024: filteredClientsData.filter(c => c['2024'] > 0),
      design: filteredClientsData
    };
  }

  // Filtrar por período
  static filterByPeriod(data, periodo) {
    const newData = { ...data };

    switch (periodo) {
      case '2025':
        // Retornar apenas dados de 2025 (todos os meses)
        return newData;
      
      case 'ultimos3':
        // Últimos 3 meses (março, abril, maio)
        newData.visaoGeral = this.filterDataByMonths(data.visaoGeral, ['marco', 'abril', 'maio']);
        newData.semanais = this.filterDataByMonths(data.semanais, ['marco', 'abril', 'maio']);
        newData.mensais = this.filterDataByMonths(data.mensais, ['marco', 'abril', 'maio']);
        // Design mantém dados anuais
        break;
      
      case 'apartir-abril':
        // A partir de abril (nova diretoria)
        newData.visaoGeral = this.filterDataByMonths(data.visaoGeral, ['abril', 'maio']);
        newData.semanais = this.filterDataByMonths(data.semanais, ['abril', 'maio']);
        newData.mensais = this.filterDataByMonths(data.mensais, ['abril', 'maio']);
        // Design mantém dados anuais
        break;
      
      default:
        return newData;
    }

    return newData;
  }

  // Filtrar dados por meses específicos
  static filterDataByMonths(dataArray, allowedMonths) {
    if (!dataArray || !Array.isArray(dataArray)) return [];

    return dataArray.map(cliente => {
      const filteredCliente = { cliente: cliente.cliente };
      
      // Lista de todos os meses possíveis
      const allMonths = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      
      // Para cada mês, incluir apenas se estiver na lista de permitidos
      allMonths.forEach(mes => {
        filteredCliente[mes] = allowedMonths.includes(mes) ? (cliente[mes] || 0) : 0;
      });

      return filteredCliente;
    });
  }

  // Filtrar por cliente
  static filterByClient(data, cliente) {
    if (!data) return null;

    return {
      ...data,
      visaoGeral: data.visaoGeral ? data.visaoGeral.filter(item => item.cliente === cliente) : [],
      semanais: data.semanais ? data.semanais.filter(item => item.cliente === cliente) : [],
      mensais: data.mensais ? data.mensais.filter(item => item.cliente === cliente) : [],
      design: data.design ? data.design.filter(item => item.cliente === cliente) : [],
      diarios: data.diarios ? data.diarios.filter(item => item.cliente === cliente) : [],
      especiais: data.especiais ? data.especiais.filter(item => item.cliente === cliente) : [],
      diagnosticos: data.diagnosticos ? data.diagnosticos.filter(item => item.cliente === cliente) : []
    };
  }

  // Filtrar por tipo de relatório (legado - manter compatibilidade)
  static filterByType(data, tipo) {
    if (!data) return null;

    switch (tipo) {
      case 'semanal':
        return {
          ...data,
          visaoGeral: [],
          semanais: data.semanais || [],
          mensais: [],
          design: [],
          diarios: [],
          especiais: [],
          diagnosticos: []
        };
      
      case 'mensal':
        return {
          ...data,
          visaoGeral: [],
          semanais: [],
          mensais: data.mensais || [],
          design: [],
          diarios: [],
          especiais: [],
          diagnosticos: []
        };
      
      case 'design':
        return {
          ...data,
          visaoGeral: [],
          semanais: [],
          mensais: [],
          design: data.design || [],
          diarios: [],
          especiais: [],
          diagnosticos: []
        };
      
      case 'geral':
      default:
        return {
          ...data,
          visaoGeral: data.visaoGeral || [],
          semanais: [],
          mensais: [],
          design: [],
          diarios: [],
          especiais: [],
          diagnosticos: []
        };
    }
  }

  // ==========================================
  // UTILITÁRIOS E CÁLCULOS
  // ==========================================

  // Recalcular totais após filtros
  static recalculateTotals(data) {
    if (!data) return null;

    const newData = { ...data };

    // Lista de seções para recalcular
    const sections = ['visaoGeral', 'semanais', 'mensais', 'diarios', 'especiais', 'diagnosticos', 'design'];

    sections.forEach(section => {
      if (newData[section] && Array.isArray(newData[section])) {
        newData[section] = newData[section].map(cliente => {
          const total = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
            .reduce((sum, mes) => sum + (cliente[mes] || 0), 0);
          
          return { ...cliente, total };
        }).filter(cliente => cliente.total > 0); // Remover clientes sem produção no período
      }
    });

    return newData;
  }

  // Obter lista de clientes únicos
  static getUniqueClients(data) {
    if (!data) return [];

    const clients = new Set();
    
    // Coletar clientes de todas as abas
    const sections = ['visaoGeral', 'semanais', 'mensais', 'design', 'diarios', 'especiais', 'diagnosticos'];
    
    sections.forEach(section => {
      if (data[section] && Array.isArray(data[section])) {
        data[section].forEach(item => {
          if (item.cliente) {
            clients.add(item.cliente);
          }
        });
      }
    });
    
    return Array.from(clients).sort();
  }

  // Obter estatísticas dos filtros aplicados (versão atualizada)
  static getFilterStats(data, filters) {
    if (!data) return {
      totalClientes: 0,
      totalRelatorios: 0,
      clientesAtivos: 0,
      tiposAtivos: 0,
      contentTypesDisponiveis: []
    };

    const filteredData = this.applyFilters(data, filters);
    const uniqueClients = this.getUniqueClients(filteredData);
    const contentTypes = this.getUniqueContentTypes(data);
    
    // Calcular total de relatórios considerando todos os tipos
    const totalRelatorios = [
      ...(filteredData.visaoGeral || []),
      ...(filteredData.semanais || []),
      ...(filteredData.mensais || []),
      ...(filteredData.diarios || []),
      ...(filteredData.especiais || []),
      ...(filteredData.diagnosticos || [])
    ].reduce((sum, cliente) => sum + (cliente.total || 0), 0);

    // Contar tipos de relatório ativos
    let tiposAtivos = 0;
    const sections = ['visaoGeral', 'semanais', 'mensais', 'design', 'diarios', 'especiais', 'diagnosticos'];
    sections.forEach(section => {
      if (filteredData[section] && filteredData[section].length > 0) tiposAtivos++;
    });

    return {
      totalClientes: uniqueClients.length,
      totalRelatorios,
      clientesAtivos: uniqueClients.length,
      tiposAtivos,
      contentTypesDisponiveis: contentTypes,
      filtroAtivo: {
        periodo: filters.periodo,
        cliente: filters.cliente,
        tipo: filters.tipo,
        contentType: filters.contentType
      }
    };
  }

  // ==========================================
  // ANÁLISES E RELATÓRIOS
  // ==========================================

  // Obter resumo dos dados por período
  static getPeriodSummary(data) {
    if (!data || !data.visaoGeral) return {};

    const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
    const summary = {};

    meses.forEach(mes => {
      const total = data.visaoGeral.reduce((sum, cliente) => sum + (cliente[mes] || 0), 0);
      const clientesAtivos = data.visaoGeral.filter(cliente => (cliente[mes] || 0) > 0).length;
      
      summary[mes] = {
        total,
        clientesAtivos,
        media: clientesAtivos > 0 ? Math.round((total / clientesAtivos) * 10) / 10 : 0
      };
    });

    return summary;
  }

  // Validar consistência dos dados
  static validateData(data) {
    const errors = [];
    const warnings = [];

    if (!data) {
      errors.push('Dados não fornecidos');
      return { valid: false, errors, warnings };
    }

    // Verificar estrutura básica
    const requiredSections = ['visaoGeral', 'semanais', 'mensais', 'design'];
    requiredSections.forEach(section => {
      if (!data[section]) {
        warnings.push(`Seção '${section}' não encontrada`);
      } else if (!Array.isArray(data[section])) {
        errors.push(`Seção '${section}' deve ser um array`);
      }
    });

    // Verificar dados da visão geral
    if (data.visaoGeral && Array.isArray(data.visaoGeral)) {
      data.visaoGeral.forEach((cliente, index) => {
        if (!cliente.cliente || typeof cliente.cliente !== 'string') {
          errors.push(`Cliente na posição ${index} não tem nome válido`);
        }

        const meses = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'];
        meses.forEach(mes => {
          if (cliente[mes] && (typeof cliente[mes] !== 'number' || cliente[mes] < 0)) {
            warnings.push(`Valor inválido para ${cliente.cliente} em ${mes}`);
          }
        });
      });
    }

    // Verificar consistência entre seções
    if (data.visaoGeral && data.semanais) {
      const clientesGeral = new Set(data.visaoGeral.map(c => c.cliente));
      const clientesSemanais = new Set(data.semanais.map(c => c.cliente));
      
      clientesSemanais.forEach(cliente => {
        if (!clientesGeral.has(cliente)) {
          warnings.push(`Cliente '${cliente}' presente em semanais mas não em visão geral`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Comparar dados entre diferentes períodos
  static compareData(dataAtual, dataAnterior) {
    if (!dataAtual || !dataAnterior) return null;

    const comparison = {
      totalClientes: {
        atual: dataAtual.visaoGeral ? dataAtual.visaoGeral.length : 0,
        anterior: dataAnterior.visaoGeral ? dataAnterior.visaoGeral.length : 0
      },
      totalRelatorios: {
        atual: dataAtual.visaoGeral ? dataAtual.visaoGeral.reduce((sum, c) => sum + c.total, 0) : 0,
        anterior: dataAnterior.visaoGeral ? dataAnterior.visaoGeral.reduce((sum, c) => sum + c.total, 0) : 0
      }
    };

    // Calcular variações percentuais
    Object.keys(comparison).forEach(key => {
      const { atual, anterior } = comparison[key];
      comparison[key].variacao = anterior > 0 ? 
        Math.round(((atual - anterior) / anterior) * 100) : 
        (atual > 0 ? 100 : 0);
      comparison[key].variacaoAbsoluta = atual - anterior;
    });

    return comparison;
  }

  // Detectar anomalias nos dados
  static detectAnomalies(data) {
    if (!data || !data.visaoGeral) return [];

    const anomalies = [];
    const allValues = [];

    // Coletar todos os valores mensais
    data.visaoGeral.forEach(cliente => {
      ['janeiro', 'fevereiro', 'marco', 'abril', 'maio'].forEach(mes => {
        if (cliente[mes] && cliente[mes] > 0) {
          allValues.push({
            cliente: cliente.cliente,
            mes,
            valor: cliente[mes]
          });
        }
      });
    });

    if (allValues.length === 0) return anomalies;

    // Calcular estatísticas
    const valores = allValues.map(item => item.valor);
    const media = valores.reduce((sum, val) => sum + val, 0) / valores.length;
    const variance = valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / valores.length;
    const desvioPadrao = Math.sqrt(variance);

    // Detectar outliers (valores além de 2 desvios padrão)
    const limiteInferior = media - (2 * desvioPadrao);
    const limiteSuperior = media + (2 * desvioPadrao);

    allValues.forEach(item => {
      if (item.valor < limiteInferior) {
        anomalies.push({
          tipo: 'valor_baixo',
          cliente: item.cliente,
          mes: item.mes,
          valor: item.valor,
          esperado: `Entre ${Math.round(limiteInferior)} e ${Math.round(limiteSuperior)}`,
          descricao: 'Valor anormalmente baixo'
        });
      } else if (item.valor > limiteSuperior) {
        anomalies.push({
          tipo: 'valor_alto',
          cliente: item.cliente,
          mes: item.mes,
          valor: item.valor,
          esperado: `Entre ${Math.round(limiteInferior)} e ${Math.round(limiteSuperior)}`,
          descricao: 'Valor anormalmente alto'
        });
      }
    });

    // Detectar clientes sem produção em meses esperados
    data.visaoGeral.forEach(cliente => {
      const mesesComProducao = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio']
        .filter(mes => cliente[mes] && cliente[mes] > 0);
      
      if (mesesComProducao.length === 0) {
        anomalies.push({
          tipo: 'sem_producao',
          cliente: cliente.cliente,
          descricao: 'Cliente sem produção em nenhum mês'
        });
      } else if (mesesComProducao.length < 3) {
        anomalies.push({
          tipo: 'producao_irregular',
          cliente: cliente.cliente,
          mesesAtivos: mesesComProducao.length,
          descricao: 'Cliente com produção muito irregular'
        });
      }
    });

    return anomalies;
  }

  // Sugerir filtros baseados nos dados
  static suggestFilters(data) {
    if (!data) return [];

    const suggestions = [];

    // Sugerir filtro por maior cliente
    if (data.visaoGeral && data.visaoGeral.length > 0) {
      const maiorCliente = data.visaoGeral.reduce((max, cliente) => 
        cliente.total > max.total ? cliente : max
      );
      
      suggestions.push({
        tipo: 'cliente',
        valor: maiorCliente.cliente,
        razao: `Maior produtor (${maiorCliente.total} relatórios)`,
        filtro: { cliente: maiorCliente.cliente }
      });
    }

    // Sugerir filtro por período de crescimento
    suggestions.push({
      tipo: 'periodo',
      valor: 'apartir-abril',
      razao: 'Período de crescimento (Nova Diretoria)',
      filtro: { periodo: 'apartir-abril' }
    });

    // Sugerir filtro por tipo mais produtivo
    const totalGeral = data.visaoGeral ? data.visaoGeral.reduce((sum, c) => sum + c.total, 0) : 0;
    const totalSemanais = data.semanais ? data.semanais.reduce((sum, c) => sum + c.total, 0) : 0;
    const totalMensais = data.mensais ? data.mensais.reduce((sum, c) => sum + c.total, 0) : 0;

    const tipoMaior = totalGeral >= totalSemanais && totalGeral >= totalMensais ? 'geral' :
                     totalSemanais >= totalMensais ? 'semanal' : 'mensal';

    suggestions.push({
      tipo: 'tipo',
      valor: tipoMaior,
      razao: `Tipo mais produtivo`,
      filtro: { tipo: tipoMaior }
    });

    return suggestions;
  }
}