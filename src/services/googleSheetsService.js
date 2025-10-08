// ==========================================
// src/services/googleSheetsService.js - VERSÃO ORDENS DE SERVIÇO
// ==========================================

class GoogleSheetsService {
  constructor() {
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.sheetsId = process.env.REACT_APP_GOOGLE_SHEETS_ID;
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.sheetName = 'in';
  }

  // Verificar credenciais
  checkCredentials() {
    const hasId = !!this.sheetsId && this.sheetsId !== 'SUA_PLANILHA_ID_AQUI';
    const hasKey = !!this.apiKey && this.apiKey !== 'SUA_API_KEY_AQUI';
    
    console.log('🔑 Verificando credenciais:', {
      sheetsId: hasId ? '✅' : '❌',
      apiKey: hasKey ? '✅' : '❌'
    });
    
    return hasId && hasKey;
  }

  // Buscar dados da aba "in" (VERSÃO CORRIGIDA FINAL)
  async getInSheetData() {
    const cacheKey = 'in_sheet_raw_data';
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Usando cache da aba "in"');
        return cached.data;
      }
    }
    try {
      // Lista de URLs para testar diferentes formatos
      const testUrls = [
        `${this.baseUrl}/${this.sheetsId}/values/'in'!A:Z?key=${this.apiKey}`,          // Com aspas simples
        `${this.baseUrl}/${this.sheetsId}/values/"in"!A:Z?key=${this.apiKey}`,         // Com aspas duplas
        `${this.baseUrl}/${this.sheetsId}/values/${encodeURIComponent('in')}!A:Z?key=${this.apiKey}`, // Encoded
        `${this.baseUrl}/${this.sheetsId}/values/in!A:Z?key=${this.apiKey}`,           // Sem aspas (original)
      ];

      console.log('📊 Tentando carregar aba "in" com diferentes formatos...');

      let lastError;
      
      for (let i = 0; i < testUrls.length; i++) {
        const url = testUrls[i];
        const formatNames = ['aspas simples', 'aspas duplas', 'encoded', 'sem aspas'];
        
        console.log(`🧪 Teste ${i + 1}/4 (${formatNames[i]}):`, url);
        
        try {
          const response = await fetch(url);
          
          if (response.ok) {
            const result = await response.json();
            const rawData = result.values || [];
            
            console.log(`✅ SUCESSO com ${formatNames[i]}! ${rawData.length} linhas carregadas`);
            
            if (rawData.length > 0) {
              console.log('📋 Headers encontrados:', rawData[0]);
            }
            
            // Salvar no cache
            this.cache.set(cacheKey, {
              data: rawData,
              timestamp: Date.now()
            });
            
            return rawData;
          } else {
            const errorText = await response.text();
            console.warn(`⚠️ ${formatNames[i]} falhou (${response.status}):`, errorText);
            lastError = new Error(`HTTP ${response.status}: ${errorText}`);
          }
        } catch (error) {
          console.warn(`⚠️ Erro com ${formatNames[i]}:`, error.message);
          lastError = error;
        }
      }

      // Se chegou aqui, todos os formatos falharam
      console.error('❌ Todos os formatos falharam!');
      throw lastError || new Error('Falha ao carregar aba "in" com todos os formatos testados');
      
    } catch (error) {
      console.error('❌ Erro geral ao carregar aba "in":', error);
      throw error;
    }
  }

  // Processar dados de ordens de serviço
  processServiceOrderData(rawData) {
    if (!rawData || rawData.length < 2) {
      console.warn('⚠️ Dados insuficientes');
      return { orders: [], summary: {} };
    }

    try {
      const headers = rawData[0];
      const orders = [];
      
      // Mapear índices das colunas
      const columnMap = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();
        if (normalizedHeader.includes('concluído')) columnMap.concluido = index;
        if (normalizedHeader.includes('ordem de serviço')) columnMap.ordemServico = index;
        if (normalizedHeader.includes('cliente1')) columnMap.cliente1 = index;
        if (normalizedHeader.includes('cliente2')) columnMap.cliente2 = index;
        if (normalizedHeader.includes('tipo de demanda')) columnMap.tipoDemanda = index;
        if (normalizedHeader.includes('criado por')) columnMap.criadoPor = index;
        if (normalizedHeader.includes('data de início')) columnMap.dataInicio = index;
        if (normalizedHeader.includes('data de entrega')) columnMap.dataEntrega = index;
        if (normalizedHeader.includes('quem executa')) columnMap.quemExecuta = index;
        if (normalizedHeader.includes('status')) columnMap.status = index;
        if (normalizedHeader.includes('complexidade')) columnMap.complexidade = index;
        if (normalizedHeader.includes('prioridade')) columnMap.prioridade = index;
      });

      console.log('📋 Mapeamento de colunas:', columnMap);

      // Processar cada linha
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row[columnMap.ordemServico] && !row[columnMap.cliente1]) continue;

        const order = {
          id: i,
          concluido: row[columnMap.concluido] || '',
          ordemServico: row[columnMap.ordemServico] || '',
          cliente1: row[columnMap.cliente1] || '',
          cliente2: row[columnMap.cliente2] || '',
          tipoDemanda: row[columnMap.tipoDemanda] || '',
          criadoPor: row[columnMap.criadoPor] || '',
          dataInicio: row[columnMap.dataInicio] || '',
          dataEntrega: row[columnMap.dataEntrega] || '',
          quemExecuta: row[columnMap.quemExecuta] || '',
          status: row[columnMap.status] || '',
          complexidade: row[columnMap.complexidade] || '',
          prioridade: row[columnMap.prioridade] || '',
          
          // Campos processados
          isConcluido: (row[columnMap.concluido] || '').toLowerCase() === 'yes',
          isRelatorio: (row[columnMap.tipoDemanda] || '').toLowerCase().includes('relatório') || 
                      (row[columnMap.tipoDemanda] || '').toLowerCase().includes('relatorio'),
          dataEntregaDate: this.parseDate(row[columnMap.dataEntrega]),
          dataInicioDate: this.parseDate(row[columnMap.dataInicio])
        };

        // Verificar se está em atraso
        if (order.dataEntregaDate) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          order.isAtrasado = order.dataEntregaDate < hoje && !order.isConcluido;
        }

        orders.push(order);
      }

      // Calcular métricas
      const summary = this.calculateMetrics(orders);

      console.log(`✅ Processadas ${orders.length} ordens de serviço`);
      console.log('📊 Resumo:', summary);

      return { orders, summary };

    } catch (error) {
      console.error('❌ Erro ao processar dados:', error);
      return { orders: [], summary: {} };
    }
  }

  // Função auxiliar para parsear datas
  parseDate(dateString) {
    if (!dateString) return null;
    
    // Tentar diferentes formatos de data
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY ou MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        // Assumir formato DD/MM/YYYY para o primeiro padrão
        if (format === formats[0]) {
          const [, day, month, year] = match;
          return new Date(year, month - 1, day);
        } else {
          const [, year, month, day] = match;
          return new Date(year, month - 1, day);
        }
      }
    }

    return null;
  }

  // Calcular métricas
  calculateMetrics(orders) {
    const totalDemandas = orders.length;
    const totalRelatorios = orders.filter(o => o.isRelatorio).length;
    const relatoriosPendentes = orders.filter(o => o.isRelatorio && !o.isConcluido).length;
    const relatoriosAtrasados = orders.filter(o => o.isAtrasado).length;
    const totalConcluidos = orders.filter(o => o.isConcluido).length;
    
    const taxaConclusao = totalDemandas > 0 ? (totalConcluidos / totalDemandas * 100) : 0;

    // Clientes únicos
    const clientesUnicos = [...new Set(orders
      .map(o => o.cliente1)
      .filter(c => c && c.trim())
    )];

    // Tipos de demanda únicos
    const tiposDemanda = [...new Set(orders
      .map(o => o.tipoDemanda)
      .filter(t => t && t.trim())
    )];

    // Separar por ano baseado na data de entrega
    const orders2024 = orders.filter(o => o.dataEntregaDate && o.dataEntregaDate.getFullYear() === 2024);
    const orders2025 = orders.filter(o => o.dataEntregaDate && o.dataEntregaDate.getFullYear() === 2025);

    return {
      totalDemandas,
      totalRelatorios,
      relatoriosPendentes,
      relatoriosAtrasados,
      totalConcluidos,
      taxaConclusao: Math.round(taxaConclusao * 100) / 100,
      clientesUnicos,
      tiposDemanda,
      totalClientes: clientesUnicos.length,
      orders2024: orders2024.length,
      orders2025: orders2025.length,
      crescimentoPercentual: orders2024.length > 0 ? 
        Math.round(((orders2025.length - orders2024.length) / orders2024.length) * 10000) / 100 : 0
    };
  }

  // Extrair tipos únicos de demanda
  extractUniqueContentTypes(orders) {
    const uniqueTypes = [...new Set(orders
      .map(order => order.tipoDemanda)
      .filter(tipo => tipo && tipo.trim() !== '')
      .map(tipo => tipo.trim())
    )].sort();

    console.log('🏷️ Tipos únicos extraídos da coluna "Tipo de demanda":', uniqueTypes);
    
    return uniqueTypes.map(tipo => ({
      id: tipo.toLowerCase().replace(/\s+/g, '_'), // ID para filtros
      label: tipo,                                  // Texto para exibir
      value: tipo                                   // Valor original
    }));
  }

  // Converter para formato esperado pelo dashboard
  convertToClientsFormat(orders, summary) {
    // Criar "clientes" fictícios baseados nos dados reais
    const clienteStats = {};

    // Agrupar por cliente
    orders.forEach(order => {
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

      // Distribuir por ano
      if (order.dataEntregaDate) {
        const year = order.dataEntregaDate.getFullYear();
        if (year === 2024) stats['2024']++;
        if (year === 2025) stats['2025']++;

        // Distribuir por mês (baseado na data de entrega)
        const month = order.dataEntregaDate.getMonth();
        const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
                           'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        if (monthNames[month]) {
          stats[monthNames[month]]++;
        }
      }
    });

    return Object.values(clienteStats);
  }

  // Carregar dados do dashboard
  async getDashboardData(useCache = true) {
    console.log('📊 Carregando dashboard de ordens de serviço...');
    
    if (!this.checkCredentials()) {
      throw new Error('Credenciais não configuradas');
    }

    const cacheKey = 'dashboard_service_orders';
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Usando cache do dashboard');
        return cached.data;
      }
    }

    try {
      const rawData = await this.getInSheetData();
      const { orders, summary } = this.processServiceOrderData(rawData);
      const clientsData = this.convertToClientsFormat(orders, summary);

      // Extrair tipos únicos de conteúdo
      const uniqueContentTypes = this.extractUniqueContentTypes(orders);

      const dashboardData = {
        totalSheets: 1,
        loadedAt: new Date().toISOString(),
        sheetName: 'in',
        
        // Dados originais para referência
        originalOrders: orders,
        metrics: summary,
        contentTypes: uniqueContentTypes, // tipos extraídos da planilha
        
        // Formato esperado pelo dashboard (todas as categorias usam os mesmos dados)
        visaoGeral: clientsData,
        visaoGeral2024: clientsData.filter(c => c['2024'] > 0),
        diarios: clientsData,
        diarios2024: clientsData.filter(c => c['2024'] > 0),
        semanais: clientsData,
        semanais2024: clientsData.filter(c => c['2024'] > 0),
        mensais: clientsData,
        mensais2024: clientsData.filter(c => c['2024'] > 0),
        especiais: clientsData,
        especiais2024: clientsData.filter(c => c['2024'] > 0),
        diagnosticos: clientsData,
        diagnosticos2024: clientsData.filter(c => c['2024'] > 0),
        design: clientsData
      };

      console.log('🎉 DASHBOARD CARREGADO:', {
        totalOrdens: orders.length,
        totalClientes: summary.totalClientes,
        tiposDemanda: summary.tiposDemanda,
        metricas: {
          totalRelatorios: summary.totalRelatorios,
          pendentes: summary.relatoriosPendentes,
          atrasados: summary.relatoriosAtrasados,
          taxaConclusao: summary.taxaConclusao
        }
      });

      this.cache.set(cacheKey, {
        data: dashboardData,
        timestamp: Date.now()
      });

      return dashboardData;

    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      throw error;
    }
  }

  // Limpar cache
  clearCache() {
    console.log('🧹 Limpando cache');
    this.cache.clear();
  }

  // Teste de conexão
  async testConnection() {
    try {
      const data = await this.getInSheetData();
      const { orders, summary } = this.processServiceOrderData(data);
      
      return {
        success: true,
        sheetName: 'in',
        totalRows: data.length,
        totalOrders: orders.length,
        summary,
        message: `✅ Conectado - ${orders.length} ordens de serviço processadas`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new GoogleSheetsService();