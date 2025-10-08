// src/services/dataSourceService.js
import googleSheetsService from './googleSheetsService';
import notionService from './notionService';
import { DataProcessingService } from './dataProcessingService';

class DataSourceService {
  constructor() {
    this.cutoffDate = process.env.REACT_APP_DATA_CUTOFF_DATE || '2024-01-01';
    this.syncInterval = parseInt(process.env.REACT_APP_SYNC_INTERVAL) || 30000;
  }

  async getUnifiedData(useCache = true) {
    try {
      console.log('🔄 Iniciando busca de dados unificados...');
      
      // Buscar dados de ambas as fontes em paralelo
      const [googleSheetsData, notionData] = await Promise.all([
        this.getGoogleSheetsData(useCache),
        this.getNotionData()
      ]);

      // Mesclar os dados
      const unifiedData = this.mergeDataSources(googleSheetsData, notionData);
      
      console.log('✅ Dados unificados processados com sucesso');
      return unifiedData;
      
    } catch (error) {
      console.error('❌ Erro ao obter dados unificados:', error);
      
      // Fallback: tentar apenas Google Sheets
      console.log('🔄 Tentando fallback para Google Sheets...');
      try {
        return await this.getGoogleSheetsData(useCache);
      } catch (fallbackError) {
        console.error('❌ Fallback também falhou:', fallbackError);
        throw new Error('Falha em ambas as fontes de dados');
      }
    }
  }

  async getGoogleSheetsData(useCache) {
    try {
      console.log('📊 Buscando dados do Google Sheets...');
      const data = await googleSheetsService.getDashboardData(useCache);
      
      // Adicionar metadados da fonte
      return {
        ...data,
        source: 'google_sheets',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao buscar Google Sheets:', error);
      throw error;
    }
  }

  async getNotionData() {
    try {
      console.log('�� Buscando dados do Notion...');
      
      // Buscar apenas dados recentes do Notion
      const recentData = await notionService.getRecentUpdates(this.cutoffDate);
      
      // Transformar dados do Notion para o formato esperado
      const processedData = this.transformNotionToSheetFormat(recentData);
      
      return {
        ...processedData,
        source: 'notion',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao buscar Notion:', error);
      // Retornar estrutura vazia em caso de erro
      return {
        originalOrders: [],
        visaoGeral: [],
        source: 'notion',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  transformNotionToSheetFormat(notionData) {
    try {
      // Transformar dados do Notion para o mesmo formato do Google Sheets
      const originalOrders = notionData.map(item => ({
        cliente: item.cliente,
        demanda: item.demanda,
        status: item.status,
        dataInicio: item.dataInicio,
        dataEntrega: item.dataEntrega,
        tipoDemanda: item.tipoDemanda,
        responsavel: item.responsavel,
        source: 'notion' // Identificador da fonte
      }));

      // Gerar visão geral baseada nos dados do Notion
      const visaoGeral = DataProcessingService.generateClientSummary(originalOrders);

      return {
        originalOrders,
        visaoGeral
      };
    } catch (error) {
      console.error('❌ Erro ao transformar dados do Notion:', error);
      return {
        originalOrders: [],
        visaoGeral: []
      };
    }
  }

  mergeDataSources(googleSheetsData, notionData) {
    try {
      console.log('🔗 Mesclando dados das fontes...');
      
      // Combinar originalOrders
      const mergedOrders = [
        ...(googleSheetsData.originalOrders || []),
        ...(notionData.originalOrders || [])
      ];

      // Remover duplicatas baseado em critério único (ex: cliente + demanda)
      const uniqueOrders = this.removeDuplicates(mergedOrders);

      // Regenerar visão geral com dados mesclados
      const mergedVisaoGeral = DataProcessingService.generateClientSummary(uniqueOrders);

      return {
        originalOrders: uniqueOrders,
        visaoGeral: mergedVisaoGeral,
        sources: {
          googleSheets: {
            count: googleSheetsData.originalOrders?.length || 0,
            timestamp: googleSheetsData.timestamp
          },
          notion: {
            count: notionData.originalOrders?.length || 0,
            timestamp: notionData.timestamp,
            error: notionData.error
          }
        },
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao mesclar dados:', error);
      // Retornar apenas dados do Google Sheets em caso de erro
      return googleSheetsData;
    }
  }

  removeDuplicates(orders) {
    const seen = new Set();
    return orders.filter(order => {
      // Criar chave única baseada em cliente + demanda + data
      const key = `${order.cliente}-${order.demanda}-${order.dataInicio}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async testConnections() {
    const results = {
      googleSheets: { success: false },
      notion: { success: false }
    };

    try {
      // Testar Google Sheets
      await googleSheetsService.getDashboardData(true);
      results.googleSheets = { success: true };
    } catch (error) {
      results.googleSheets = { success: false, error: error.message };
    }

    try {
      // Testar Notion
      const notionTest = await notionService.testConnection();
      results.notion = notionTest;
    } catch (error) {
      results.notion = { success: false, error: error.message };
    }

    return results;
  }
}

export default new DataSourceService();