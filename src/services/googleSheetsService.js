// ==========================================
// src/services/googleSheetsService.js - VERSÃO ORDENS DE SERVIÇO (REVISADA)
// ==========================================

class GoogleSheetsService {
  constructor() {
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    this.sheetsId = process.env.REACT_APP_GOOGLE_SHEETS_ID;
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;

    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos

    // aba padrão usada hoje
    this.sheetName = 'in';
  }

  // ---------------------------
  // Credenciais
  // ---------------------------
  checkCredentials() {
    const hasId = !!this.sheetsId && this.sheetsId !== 'SUA_PLANILHA_ID_AQUI';
    const hasKey = !!this.apiKey && this.apiKey !== 'SUA_API_KEY_AQUI';

    if (!hasId || !hasKey) {
      console.warn('🔒 Credenciais ausentes/inválidas', {
        sheetsId: hasId ? 'ok' : 'faltando',
        apiKey: hasKey ? 'ok' : 'faltando',
      });
    }

    return hasId && hasKey;
  }

  // ---------------------------
  // Helpers HTTP
  // ---------------------------
  async fetchRange(sheetName, range = 'A:Z') {
    if (!this.checkCredentials()) {
      throw new Error('Credenciais não configuradas');
    }

    // Formato oficial da API:
    // GET /v4/spreadsheets/{spreadsheetId}/values/{range}?key=API_KEY
    // onde range = "'Aba'!A:Z" (aspas simples necessárias se houver espaços)
    const safeSheet = sheetName.includes(' ') || sheetName.includes("'")
      ? `'${sheetName.replace(/'/g, "''")}'`
      : sheetName;

    const url = `${this.baseUrl}/${this.sheetsId}/values/${safeSheet}!${range}?key=${this.apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    const json = await res.json();
    return json.values || [];
  }

  // ---------------------------
  // Ler aba "in" com cache
  // ---------------------------
  async getInSheetData() {
    const cacheKey = 'in_sheet_raw_data';
    const now = Date.now();

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Usando cache da aba "in"');
        return cached.data;
      }
    }

    try {
      console.log('📊 Carregando dados da aba "in"...');
      const rawData = await this.fetchRange(this.sheetName, 'A:Z');

      if (Array.isArray(rawData) && rawData.length > 0) {
        console.log(`✅ "in" carregada (${rawData.length} linhas). Headers:`, rawData[0]);
      } else {
        console.warn('⚠️ "in" sem linhas retornadas.');
      }

      this.cache.set(cacheKey, { data: rawData, timestamp: now });
      return rawData;
    } catch (err) {
      console.error('❌ Falha ao carregar aba "in":', err);
      throw err;
    }
  }

  // ---------------------------
  // Tipos únicos de "Tipo de demanda"
  // ---------------------------
  async getUniqueDemandTypes({ sheetName = this.sheetName, range = 'A:Z', columnName = 'Tipo de demanda' } = {}) {
    try {
      const raw = sheetName === this.sheetName ? await this.getInSheetData() : await this.fetchRange(sheetName, range);
      if (!raw || raw.length < 2) return [];

      // Descobre índice da coluna (case-insensitive)
      const headers = raw[0] || [];
      const normalize = (s) => (s || '').toString().trim().toLowerCase();
      const idx = headers.findIndex((h) => normalize(h) === normalize(columnName));

      if (idx === -1) {
        console.warn(`⚠️ Coluna "${columnName}" não encontrada em "${sheetName}".`, headers);
        return [];
      }

      const set = new Set();
      for (const row of raw.slice(1)) {
        const v = row[idx];
        if (!v) continue;
        const val = v.toString().trim();
        if (val) set.add(val);
      }

      const result = Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      console.log(`🏷️ ${result.length} tipos únicos de "${columnName}" encontrados.`);
      return result;
    } catch (e) {
      console.error('❌ Erro ao obter tipos únicos de demanda:', e);
      return [];
    }
  }

  // ---------------------------
  // Processamento da planilha de OS
  // ---------------------------
  processServiceOrderData(rawData) {
    if (!rawData || rawData.length < 2) {
      console.warn('⚠️ Dados insuficientes');
      return { orders: [], summary: {} };
    }

    try {
      const headers = rawData[0].map((h) => (h || '').toString().trim());
      const orders = [];

      const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Mapeamento tolerante
      const columnMap = {};
      headers.forEach((header, index) => {
        const h = norm(header);
        if (h.includes('conclu')) columnMap.concluido = index; // concluído/concluida
        if (h.includes('ordem') && h.includes('serv')) columnMap.ordemServico = index;
        if (h.includes('cliente1') || h === 'cliente' || h.includes('cliente 1')) columnMap.cliente1 = index;
        if (h.includes('cliente2') || h.includes('cliente 2')) columnMap.cliente2 = index;
        if (h.includes('tipo') && h.includes('demanda')) columnMap.tipoDemanda = index;
        if (h.includes('criado por') || h.includes('criador')) columnMap.criadoPor = index;
        if (h.includes('data') && (h.includes('inicio') || h.includes('início'))) columnMap.dataInicio = index;
        if (h.includes('data') && (h.includes('entrega') || h.includes('prazo'))) columnMap.dataEntrega = index;
        if (h.includes('quem executa') || h.includes('responsavel') || h.includes('responsável')) columnMap.quemExecuta = index;
        if (h.includes('status')) columnMap.status = index;
        if (h.includes('complexidade')) columnMap.complexidade = index;
        if (h.includes('prioridade')) columnMap.prioridade = index;
      });

      // Processa linhas
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        const hasOsOrClient = (columnMap.ordemServico != null && row[columnMap.ordemServico]) ||
                              (columnMap.cliente1 != null && row[columnMap.cliente1]);
        if (!hasOsOrClient) continue;

        const concluidoRaw = columnMap.concluido != null ? (row[columnMap.concluido] || '').toString().trim() : '';
        const concluidoNorm = norm(concluidoRaw);
        const isConcluido =
          ['sim', 'yes', 'true', '1', 'concluido', 'concluida', 'ok', 'feito'].some((k) => concluidoNorm.includes(k));

        const order = {
          id: i,
          concluido: concluidoRaw,
          ordemServico: columnMap.ordemServico != null ? (row[columnMap.ordemServico] || '') : '',
          cliente1: columnMap.cliente1 != null ? (row[columnMap.cliente1] || '') : '',
          cliente2: columnMap.cliente2 != null ? (row[columnMap.cliente2] || '') : '',
          tipoDemanda: columnMap.tipoDemanda != null ? (row[columnMap.tipoDemanda] || '') : '',
          criadoPor: columnMap.criadoPor != null ? (row[columnMap.criadoPor] || '') : '',
          dataInicio: columnMap.dataInicio != null ? (row[columnMap.dataInicio] || '') : '',
          dataEntrega: columnMap.dataEntrega != null ? (row[columnMap.dataEntrega] || '') : '',
          quemExecuta: columnMap.quemExecuta != null ? (row[columnMap.quemExecuta] || '') : '',
          status: columnMap.status != null ? (row[columnMap.status] || '') : '',
          complexidade: columnMap.complexidade != null ? (row[columnMap.complexidade] || '') : '',
          prioridade: columnMap.prioridade != null ? (row[columnMap.prioridade] || '') : '',

          // Derivados
          isConcluido,
          isRelatorio: norm(columnMap.tipoDemanda != null ? row[columnMap.tipoDemanda] : '').includes('relatorio'),
          dataEntregaDate: this.parseDate(columnMap.dataEntrega != null ? row[columnMap.dataEntrega] : ''),
          dataInicioDate: this.parseDate(columnMap.dataInicio != null ? row[columnMap.dataInicio] : ''),
        };

        if (order.dataEntregaDate) {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          order.isAtrasado = order.dataEntregaDate < hoje && !order.isConcluido;
        }

        orders.push(order);
      }

      const summary = this.calculateMetrics(orders);
      console.log(`✅ Processadas ${orders.length} ordens de serviço`);
      return { orders, summary };
    } catch (error) {
      console.error('❌ Erro ao processar dados:', error);
      return { orders: [], summary: {} };
    }
  }

  // ---------------------------
  // Datas (serial, YYYY-MM-DD, DD/MM/YYYY)
  // ---------------------------
  parseDate(value) {
    if (value == null || value === '') return null;

    // número serial (Google/Excel)
    if (!isNaN(value) && typeof value !== 'string') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const ms = Number(value) * 24 * 60 * 60 * 1000;
      return new Date(excelEpoch.getTime() + ms);
    }

    const s = String(value).trim();

    // YYYY-MM-DD
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    let m = s.match(iso);
    if (m) {
      const [, y, mo, d] = m;
      return new Date(Number(y), Number(mo) - 1, Number(d));
    }

    // DD/MM/YYYY
    const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    m = s.match(br);
    if (m) {
      const [, d, mo, y] = m;
      return new Date(Number(y), Number(mo) - 1, Number(d));
    }

    // tenta Date nativo
    const t = new Date(s);
    return isNaN(t.getTime()) ? null : t;
  }

  // ---------------------------
  // Métricas
  // ---------------------------
  calculateMetrics(orders) {
    const totalDemandas = orders.length;
    const totalRelatorios = orders.filter((o) => o.isRelatorio).length;
    const relatoriosPendentes = orders.filter((o) => o.isRelatorio && !o.isConcluido).length;
    const relatoriosAtrasados = orders.filter((o) => o.isAtrasado).length;
    const totalConcluidos = orders.filter((o) => o.isConcluido).length;

    const taxaConclusao = totalDemandas > 0 ? (totalConcluidos / totalDemandas) * 100 : 0;

    const clientesUnicos = [...new Set(orders.map((o) => o.cliente1).filter((c) => (c || '').trim()))];
    const tiposDemanda = [...new Set(orders.map((o) => o.tipoDemanda).filter((t) => (t || '').trim()))];

    const orders2024 = orders.filter((o) => o.dataEntregaDate && o.dataEntregaDate.getFullYear() === 2024);
    const orders2025 = orders.filter((o) => o.dataEntregaDate && o.dataEntregaDate.getFullYear() === 2025);

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
      crescimentoPercentual:
        orders2024.length > 0
          ? Math.round(((orders2025.length - orders2024.length) / orders2024.length) * 10000) / 100
          : 0,
    };
  }

  // ---------------------------
  // Tipos únicos para o dashboard (com id/label/value)
  // ---------------------------
  extractUniqueContentTypes(orders) {
    const uniqueTypes = [...new Set(
      orders
        .map((o) => (o.tipoDemanda || '').toString().trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'pt-BR'));

    console.log('🏷️ Tipos únicos extraídos da coluna "Tipo de demanda":', uniqueTypes);

    return uniqueTypes.map((tipo) => ({
      id: tipo.toLowerCase().replace(/\s+/g, '_'),
      label: tipo,
      value: tipo,
    }));
  }

  // ---------------------------
  // Formato por cliente (compatível com seu dashboard)
  // ---------------------------
  convertToClientsFormat(orders) {
    const clienteStats = {};
    const monthNames = [
      'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];

    orders.forEach((order) => {
      const cliente = (order.cliente1 || '').toString().trim();
      if (!cliente) return;

      if (!clienteStats[cliente]) {
        clienteStats[cliente] = {
          cliente,
          total: 0,
          concluidos: 0,
          pendentes: 0,
          atrasados: 0,
          2024: 0,
          2025: 0,
          janeiro: 0, fevereiro: 0, marco: 0, abril: 0, maio: 0, junho: 0,
          julho: 0, agosto: 0, setembro: 0, outubro: 0, novembro: 0, dezembro: 0,
        };
      }

      const stats = clienteStats[cliente];
      stats.total += 1;
      if (order.isConcluido) stats.concluidos += 1; else stats.pendentes += 1;
      if (order.isAtrasado) stats.atrasados += 1;

      if (order.dataEntregaDate) {
        const y = order.dataEntregaDate.getFullYear();
        if (y === 2024) stats['2024'] += 1;
        if (y === 2025) stats['2025'] += 1;

        const m = order.dataEntregaDate.getMonth();
        const key = monthNames[m];
        if (key) stats[key] += 1;
      }
    });

    return Object.values(clienteStats);
  }

  // ---------------------------
  // Carregar dados do dashboard (com cache)
  // ---------------------------
  async getDashboardData(useCache = true) {
    console.log('📊 Carregando dashboard de ordens de serviço...');
    if (!this.checkCredentials()) throw new Error('Credenciais não configuradas');

    const cacheKey = 'dashboard_service_orders';
    const now = Date.now();

    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Usando cache do dashboard');
        return cached.data;
      }
    }

    try {
      const rawData = await this.getInSheetData();
      const { orders, summary } = this.processServiceOrderData(rawData);
      const clientsData = this.convertToClientsFormat(orders);
      const uniqueContentTypes = this.extractUniqueContentTypes(orders);

      const dashboardData = {
        totalSheets: 1,
        loadedAt: new Date().toISOString(),
        sheetName: this.sheetName,

        originalOrders: orders,
        metrics: summary,
        contentTypes: uniqueContentTypes,

        visaoGeral: clientsData,
        visaoGeral2024: clientsData.filter((c) => c['2024'] > 0),
        diarios: clientsData,
        diarios2024: clientsData.filter((c) => c['2024'] > 0),
        semanais: clientsData,
        semanais2024: clientsData.filter((c) => c['2024'] > 0),
        mensais: clientsData,
        mensais2024: clientsData.filter((c) => c['2024'] > 0),
        especiais: clientsData,
        especiais2024: clientsData.filter((c) => c['2024'] > 0),
        diagnosticos: clientsData,
        diagnosticos2024: clientsData.filter((c) => c['2024'] > 0),
        design: clientsData,
      };

      this.cache.set(cacheKey, { data: dashboardData, timestamp: now });
      console.log('🎉 Dashboard montado:', {
        ordens: orders.length,
        clientes: summary.totalClientes,
        tipos: summary.tiposDemanda?.length || 0,
      });

      return dashboardData;
    } catch (error) {
      console.error('❌ Erro ao carregar dashboard:', error);
      throw error;
    }
  }

  // ---------------------------
  // Utilidades
  // ---------------------------
  clearCache() {
    console.log('🧹 Limpando cache');
    this.cache.clear();
  }

  async testConnection() {
    try {
      const data = await this.getInSheetData();
      const { orders, summary } = this.processServiceOrderData(data);
      return {
        success: true,
        sheetName: this.sheetName,
        totalRows: data.length,
        totalOrders: orders.length,
        summary,
        message: `✅ Conectado - ${orders.length} ordens de serviço processadas`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new GoogleSheetsService();
