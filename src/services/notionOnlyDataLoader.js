// src/services/notionOnlyDataLoader.js - CARREGADOR DE DADOS APENAS DO NOTION
import { config } from '../config/analysisConfig.js';

class NotionOnlyDataLoader {
  constructor() {
    this.cache = null;
    this.lastUpdate = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    this.apiConfig = config.notion;
  }

  // Carregar todos os registros do Notion
  async getAllRecords() {
    console.log('📊 [NOTION] Carregando dados...');
    
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const body = {
        page_size: 100,
        ...(startCursor && { start_cursor: startCursor })
      };

      const response = await fetch(this.apiConfig.endpoint, {
        method: 'POST',
        headers: this.apiConfig.headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      allResults = allResults.concat(data.results);
      
      hasMore = data.has_more;
      startCursor = data.next_cursor;

      console.log(`📥 [NOTION] ${allResults.length} registros carregados...`);
    }

    console.log(`✅ [NOTION] Total: ${allResults.length} registros`);
    return allResults;
  }

  // Extrair dados estruturados dos registros
  extrairDados(records) {
    const extractText = (property) => {
      if (!property) return '';
      if (property.title && property.title[0]) return property.title[0].text.content;
      if (property.rich_text && property.rich_text[0]) return property.rich_text[0].text.content;
      if (property.multi_select) return property.multi_select.map(item => item.name).join(', ');
      if (property.select) return property.select.name;
      if (property.date) return property.date.start;
      return '';
    };

    return records.map(record => {
      return {
        id: record.id,
        titulo: extractText(record.properties["Ordem de Serviço"]),
        cliente: extractText(record.properties["Cliente"]),
        cliente2: extractText(record.properties["Cliente 2"]),
        data: extractText(record.properties["Data de entrega"]),
        tipo: extractText(record.properties["Tipo de demanda"]),
        complexidade: extractText(record.properties["Complexidade"]),
        quemExecuta: extractText(record.properties["Quem executa"]),
        criadoPor: extractText(record.properties["Criado por"]),
        concluido: extractText(record.properties["Concluído"]),
        status: extractText(record.properties["Status"])
      };
    });
  }

  // Carregar dados com cache
  async loadData(forceRefresh = false) {
    const now = Date.now();
    
    // Usar cache se disponível e válido
    if (!forceRefresh && this.cache && this.lastUpdate && 
        (now - this.lastUpdate) < this.cacheTimeout) {
      console.log('📊 Usando dados em cache do Notion');
      return this.cache;
    }
    
    console.log('🔄 Carregando dados do Notion...');
    const records = await this.getAllRecords();
    const data = this.extrairDados(records);
    
    // Processar dados para dashboard
    const processedData = this.processForDashboard(data);
    
    // Atualizar cache
    this.cache = processedData;
    this.lastUpdate = now;
    
    console.log(`✅ Dashboard atualizado: ${data.length} registros do Notion`);
    return processedData;
  }

  // Processar dados para formato do dashboard
  processForDashboard(data) {
    const estatisticas = {
      total: data.length,
      porCliente: this.groupBy(data, 'cliente'),
      porTipo: this.groupBy(data, 'tipo'),
      porMes: this.groupByMonth(data),
      porExecutor: this.groupBy(data, 'quemExecuta'),
      porComplexidade: this.groupBy(data, 'complexidade')
    };

    return {
      projetos: data,
      estatisticas,
      originalOrders: data,
      visaoGeral: this.buildVisaoGeral(data),
      metrics: {
        totalProjects: data.length,
        uniqueClients: Object.keys(estatisticas.porCliente).length,
        uniqueTypes: Object.keys(estatisticas.porTipo).length
      },
      ultimaAtualizacao: new Date().toISOString(),
      source: 'notion'
    };
  }

  // Construir visão geral por cliente
  buildVisaoGeral(data) {
    const visaoGeral = {};
    
    data.forEach(item => {
      const cliente = item.cliente || 'Não informado';
      if (!visaoGeral[cliente]) {
        visaoGeral[cliente] = {
          cliente,
          total: 0,
          tipos: {}
        };
      }
      
      visaoGeral[cliente].total++;
      const tipo = item.tipo || 'Não informado';
      visaoGeral[cliente].tipos[tipo] = (visaoGeral[cliente].tipos[tipo] || 0) + 1;
    });
    
    return Object.values(visaoGeral);
  }

  // Agrupar por campo
  groupBy(data, field) {
    const grouped = {};
    data.forEach(item => {
      const value = item[field] || 'Não informado';
      // Tratar múltiplos valores (ex: executores separados por vírgula)
      if (field === 'quemExecuta' && value.includes(',')) {
        value.split(',').forEach(val => {
          const cleanVal = val.trim();
          grouped[cleanVal] = (grouped[cleanVal] || 0) + 1;
        });
      } else {
        grouped[value] = (grouped[value] || 0) + 1;
      }
    });
    return grouped;
  }

  // Agrupar por mês
  groupByMonth(data) {
    const grouped = {};
    data.forEach(item => {
      if (item.data) {
        const month = item.data.substring(0, 7); // YYYY-MM
        grouped[month] = (grouped[month] || 0) + 1;
      }
    });
    return grouped;
  }

  // Limpar cache
  clearCache() {
    this.cache = null;
    this.lastUpdate = null;
    console.log('🗑️ Cache limpo');
  }
}

// Exportar singleton
export default new NotionOnlyDataLoader();

