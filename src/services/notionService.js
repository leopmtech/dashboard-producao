// src/services/notionService.js
class NotionService {
  constructor() {
    this.baseURL = 'https://api.notion.com/v1';
    this.token = process.env.REACT_APP_NOTION_TOKEN;
    this.databaseId = process.env.REACT_APP_NOTION_DATABASE_ID;
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    };
  }

  async getDatabaseData(filters = {}) {
    try {
      console.log('🔍 Buscando dados do Notion...');
      
      const requestBody = {
        page_size: 100,
        ...this.buildFilters(filters)
      };

      const response = await fetch(`${this.baseURL}/databases/${this.databaseId}/query`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Notion: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ ${data.results.length} registros encontrados no Notion`);
      
      return this.transformNotionData(data.results);
      
    } catch (error) {
      console.error('❌ Erro ao buscar dados do Notion:', error);
      throw new Error(`Falha ao conectar com Notion: ${error.message}`);
    }
  }

  async getRecentUpdates(since) {
    try {
      console.log('🔄 Buscando atualizações recentes do Notion desde:', since);
      
      const sinceDate = new Date(since).toISOString();
      
      const requestBody = {
        filter: {
          and: [
            {
              timestamp: "last_edited_time",
              last_edited_time: {
                after: sinceDate
              }
            }
          ]
        },
        sorts: [
          {
            timestamp: "last_edited_time",
            direction: "descending"
          }
        ],
        page_size: 100
      };

      const response = await fetch(`${this.baseURL}/databases/${this.databaseId}/query`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Notion: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ ${data.results.length} atualizações recentes encontradas`);
      
      return this.transformNotionData(data.results);
      
    } catch (error) {
      console.error('❌ Erro ao buscar atualizações do Notion:', error);
      throw error;
    }
  }

  buildFilters(filters) {
    const notionFilters = [];
    
    // Adicionar filtros baseados nos parâmetros
    if (filters.startDate) {
      notionFilters.push({
        property: 'Data de Criação', // Ajustar nome da propriedade
        date: { after: filters.startDate }
      });
    }
    
    if (filters.endDate) {
      notionFilters.push({
        property: 'Data de Criação',
        date: { before: filters.endDate }
      });
    }
    
    if (filters.cliente && filters.cliente !== 'todos') {
      notionFilters.push({
        property: 'Cliente', // Ajustar nome da propriedade
        select: { equals: filters.cliente }
      });
    }

    return notionFilters.length > 0 ? { filter: { and: notionFilters } } : {};
  }

  transformNotionData(notionResults) {
    try {
      const transformedData = notionResults.map(page => {
        const properties = page.properties;
        
        // Mapear propriedades do Notion para o formato esperado
        // Ajuste estes nomes conforme suas propriedades do Notion
        return {
          id: page.id,
          cliente: this.extractProperty(properties, 'Cliente', 'select'),
          demanda: this.extractProperty(properties, 'Demanda', 'title'),
          status: this.extractProperty(properties, 'Status', 'select'),
          dataInicio: this.extractProperty(properties, 'Data de Início', 'date'),
          dataEntrega: this.extractProperty(properties, 'Data de Entrega', 'date'),
          tipoDemanda: this.extractProperty(properties, 'Tipo de Demanda', 'select'),
          responsavel: this.extractProperty(properties, 'Responsável', 'people'),
          prioridade: this.extractProperty(properties, 'Prioridade', 'select'),
          observacoes: this.extractProperty(properties, 'Observações', 'rich_text'),
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time
        };
      });

      console.log('🔄 Dados transformados do Notion:', transformedData.length);
      return transformedData;
      
    } catch (error) {
      console.error('❌ Erro ao transformar dados do Notion:', error);
      throw error;
    }
  }

  extractProperty(properties, propertyName, type) {
    try {
      const property = properties[propertyName];
      if (!property) return null;

      switch (type) {
        case 'title':
          return property.title?.[0]?.plain_text || '';
        case 'rich_text':
          return property.rich_text?.[0]?.plain_text || '';
        case 'select':
          return property.select?.name || '';
        case 'multi_select':
          return property.multi_select?.map(item => item.name) || [];
        case 'date':
          return property.date?.start || null;
        case 'people':
          return property.people?.map(person => person.name).join(', ') || '';
        case 'number':
          return property.number || 0;
        case 'checkbox':
          return property.checkbox || false;
        default:
          return property[type] || null;
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao extrair propriedade ${propertyName}:`, error);
      return null;
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testando conexão com Notion...');
      
      const response = await fetch(`${this.baseURL}/databases/${this.databaseId}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const database = await response.json();
      console.log('✅ Conexão com Notion estabelecida:', database.title?.[0]?.plain_text);
      
      return {
        success: true,
        databaseName: database.title?.[0]?.plain_text || 'Database',
        properties: Object.keys(database.properties)
      };
      
    } catch (error) {
      console.error('❌ Falha na conexão com Notion:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new NotionService();