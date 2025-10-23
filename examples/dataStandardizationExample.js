// dataStandardization.js
class DataStandardization {
  constructor() {
    this.rawCounts = {};
    this.processedCounts = {};
    this.logPrefix = '📊 [STANDARD COUNT]';
    
    this.sourceDefinitions = {
      sheets: {
        name: 'Dados Retroativos (Sheets)',
        description: 'Demandas históricas exportadas',
        expectedPeriod: 'até data X',
        isLegacy: true
      },
      notion: {
        name: 'Dados Atuais (Notion)', 
        description: 'Sistema ativo atual',
        expectedPeriod: 'após data X',
        isActive: true
      }
    };
  }

  // Função para validar e normalizar os dados de entrada
  validateAndNormalizeData(data) {
    // Log do que estamos recebendo
    console.log(`${this.logPrefix} Validando dados recebidos:`, {
      type: typeof data,
      isArray: Array.isArray(data),
      isNull: data === null,
      isUndefined: data === undefined,
      length: data?.length,
      keys: data ? Object.keys(data).slice(0, 5) : 'N/A'
    });

    // Caso 1: data é undefined ou null
    if (!data) {
      console.warn(`${this.logPrefix} ⚠️ Dados são null/undefined, retornando array vazio`);
      return [];
    }

    // Caso 2: data já é um array
    if (Array.isArray(data)) {
      console.log(`${this.logPrefix} ✅ Dados são um array com ${data.length} itens`);
      return data;
    }

    // Caso 3: data é um objeto com propriedades que podem conter arrays
    if (typeof data === 'object') {
      console.log(`${this.logPrefix} 🔍 Dados são um objeto, tentando extrair arrays...`);
      
      // Tentar encontrar arrays dentro do objeto
      const possibleArrayKeys = ['data', 'items', 'records', 'results', 'list'];
      
      for (const key of possibleArrayKeys) {
        if (data[key] && Array.isArray(data[key])) {
          console.log(`${this.logPrefix} ✅ Encontrado array em data.${key} com ${data[key].length} itens`);
          return data[key];
        }
      }

      // Se não encontrou arrays nas chaves comuns, verificar todas as chaves
      const allKeys = Object.keys(data);
      for (const key of allKeys) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          console.log(`${this.logPrefix} ✅ Encontrado array em data.${key} com ${data[key].length} itens`);
          return data[key];
        }
      }

      // Se chegou aqui, o objeto não tem arrays úteis
      console.warn(`${this.logPrefix} ⚠️ Objeto não contém arrays válidos. Chaves disponíveis:`, allKeys);
      return [];
    }

    // Caso 4: data é outro tipo primitivo
    console.warn(`${this.logPrefix} ⚠️ Tipo de dados não suportado:`, typeof data);
    return [];
  }

  getStandardizedCount(data, filters = {}) {
    // Validar dados antes de processar
    const validatedData = this.validateAndNormalizeData(data);
    
    if (validatedData.length === 0) {
      console.warn(`${this.logPrefix} ⚠️ Dados validados resultaram em array vazio`);
      return {
        total: 0,
        data: [],
        breakdown: { sheets: 0, notion: 0, unknown: 0 },
        steps: ['Dados vazios ou inválidos'],
        filters: filters,
        sourceDefinitions: this.sourceDefinitions
      };
    }

    const countKey = this.generateCountKey(filters);
    
    if (this.processedCounts[countKey]) {
      console.log(`${this.logPrefix} Cache hit para: ${countKey}`);
      return this.processedCounts[countKey];
    }

    const result = this.calculateCountWithSourceAwareness(validatedData, filters);
    this.processedCounts[countKey] = result;
    
    console.log(`${this.logPrefix} ${countKey} = Total: ${result.total} | Sheets: ${result.breakdown.sheets} | Notion: ${result.breakdown.notion}`);
    return result;
  }

  calculateCountWithSourceAwareness(data, filters) {
    // Agora podemos ter certeza de que data é um array válido
    const {
      source = 'all',
      year = 'all',        
      type = 'all',        
      cliente = 'all',     
      dateRange = 'all',
      showBreakdown = true
    } = filters;

    let filteredData = [...data]; // Agora é seguro fazer spread
    let breakdown = { sheets: 0, notion: 0, unknown: 0 };
    let steps = [];

    // Log inicial com breakdown por fonte
    const initialBreakdown = this.getSourceBreakdown(filteredData);
    steps.push(`Inicial: ${filteredData.length} (Sheets: ${initialBreakdown.sheets}, Notion: ${initialBreakdown.notion})`);

    // Aplicar filtros...
    if (source !== 'all') {
      const beforeCount = filteredData.length;
      filteredData = filteredData.filter(item => item._source === source);
      steps.push(`Após filtro fonte (${source}): ${filteredData.length} (removidos: ${beforeCount - filteredData.length})`);
    }

    if (year !== 'all') {
      const beforeCount = filteredData.length;
      filteredData = filteredData.filter(item => {
        const itemDate = item.dataEntrega;
        if (!itemDate) return false;
        
        try {
          const itemYear = new Date(itemDate).getFullYear();
          return itemYear === parseInt(year);
        } catch (error) {
          console.warn(`${this.logPrefix} Data inválida encontrada:`, itemDate);
          return false;
        }
      });
      const yearBreakdown = this.getSourceBreakdown(filteredData);
      steps.push(`Após filtro ano (${year}): ${filteredData.length} (removidos: ${beforeCount - filteredData.length}) - Sheets: ${yearBreakdown.sheets}, Notion: ${yearBreakdown.notion}`);
    }

    if (type === 'relatorios') {
      const beforeCount = filteredData.length;
      filteredData = filteredData.filter(item => item.isRelatorio === true);
      steps.push(`Após filtro relatórios: ${filteredData.length} (removidos: ${beforeCount - filteredData.length})`);
    }

    if (cliente !== 'all') {
      const beforeCount = filteredData.length;
      filteredData = filteredData.filter(item => item.cliente === cliente);
      steps.push(`Após filtro cliente (${cliente}): ${filteredData.length} (removidos: ${beforeCount - filteredData.length})`);
    }

    // Breakdown final
    breakdown = this.getSourceBreakdown(filteredData);

    // Log detalhado
    console.log(`${this.logPrefix} Passos de filtro:`, steps);
    console.log(`${this.logPrefix} Breakdown final:`, breakdown);

    return {
      total: filteredData.length,
      data: filteredData,
      breakdown: breakdown,
      steps: steps,
      filters: filters,
      sourceDefinitions: this.sourceDefinitions
    };
  }

  getSourceBreakdown(data) {
    // Validar se data é array antes de processar
    if (!Array.isArray(data)) {
      console.warn(`${this.logPrefix} getSourceBreakdown: data não é array`, typeof data);
      return { sheets: 0, notion: 0, unknown: 0 };
    }

    return data.reduce((acc, item) => {
      if (!item || typeof item !== 'object') {
        acc.unknown += 1;
        return acc;
      }
      
      const source = item._source || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, { sheets: 0, notion: 0, unknown: 0 });
  }

  generateCountKey(filters) {
    return Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
  }

  // Função de debug melhorada
  debugDataStructure(data, label = 'Unknown') {
    console.log(`${this.logPrefix} === DEBUG ${label} ===`);
    console.log(`Type:`, typeof data);
    console.log(`Is Array:`, Array.isArray(data));
    console.log(`Is Null:`, data === null);
    console.log(`Is Undefined:`, data === undefined);
    
    if (data && typeof data === 'object') {
      console.log(`Keys:`, Object.keys(data));
      if (Array.isArray(data)) {
        console.log(`Length:`, data.length);
        console.log(`First 3 items:`, data.slice(0, 3));
      }
    }
    
    console.log(`${this.logPrefix} === END DEBUG ${label} ===`);
  }
}

export const dataStandardizer = new DataStandardization();