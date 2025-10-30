import notionService from './notionService';

class DataSourceService {
  async getUnifiedData(useCache = true) {
    try {
      console.log('�� Carregando dados do Notion...');
      return await notionService.getDashboardData(useCache);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      return {
        originalOrders: [],
        visaoGeral: [],
        source: 'notion',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

export default new DataSourceService();