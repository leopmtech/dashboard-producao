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

  // Validação rigorosa que sempre retorna um array
  ensureValidArray(data, functionName = 'unknown') {
    console.log(`${this.logPrefix} [${functionName}] Validando entrada:`, {
      type: typeof data,
      isArray: Array.isArray(data),
      isNull: data === null,
      isUndefined: data === undefined,
      constructor: data?.constructor?.name
    });

    if (!data) {
      console.warn(`${this.logPrefix} [${functionName}] ⚠️ Dados null/undefined, retornando []`);
      return [];
    }

    if (Array.isArray(data)) {
      console.log(`${this.logPrefix} [${functionName}] ✅ Array válido com ${data.length} itens`);
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      console.log(`${this.logPrefix} [${functionName}] 🔍 Tentando extrair array do objeto...`);
      
      const arrayKeys = ['data', 'items', 'records', 'results', 'list', 'rows', 'entries'];
      
      for (const key of arrayKeys) {
        if (data[key] && Array.isArray(data[key])) {
          console.log(`${this.logPrefix} [${functionName}] ✅ Array encontrado em '${key}' com ${data[key].length} itens`);
          return data[key];
        }
      }

      const keys = Object.keys(data);
      for (const key of keys) {
        if (Array.isArray(data[key]) && data[key].length >= 0) {
          console.log(`${this.logPrefix} [${functionName}] ✅ Array encontrado em '${key}' com ${data[key].length} itens`);
          return data[key];
        }
      }

      console.warn(`${this.logPrefix} [${functionName}] ⚠️ Objeto sem arrays válidos:`, keys);
      return [];
    }

    console.warn(`${this.logPrefix} [${functionName}] ⚠️ Tipo inválido, retornando []`);
    return [];
  }

  getStandardizedCount(data, filters = {}) {
    console.log(`${this.logPrefix} === INÍCIO getStandardizedCount ===`);
    
    const validatedData = this.ensureValidArray(data, 'getStandardizedCount');
    
    if (validatedData.length === 0) {
      console.warn(`${this.logPrefix} Retornando resultado vazio - dados inválidos`);
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
      console.log(`${this.logPrefix} Cache hit: ${countKey}`);
      return this.processedCounts[countKey];
    }

    const result = this.calculateCountWithSourceAwareness(validatedData, filters);
    this.processedCounts[countKey] = result;
    
    console.log(`${this.logPrefix} ${countKey} = Total: ${result.total}`);
    return result;
  }

  calculateCountWithSourceAwareness(data, filters) {
    console.log(`${this.logPrefix} === INÍCIO calculateCountWithSourceAwareness ===`);
    
    const safeData = this.ensureValidArray(data, 'calculateCountWithSourceAwareness');
    
    if (safeData.length === 0) {
      console.warn(`${this.logPrefix} Dados inválidos em calculateCountWithSourceAwareness`);
      return {
        total: 0,
        data: [],
        breakdown: { sheets: 0, notion: 0, unknown: 0 },
        steps: ['Dados inválidos na função de cálculo'],
        filters: filters,
        sourceDefinitions: this.sourceDefinitions
      };
    }

    const {
      source = 'all',
      year = 'all',        
      type = 'all',        
      cliente = 'all'
    } = filters;

    let filteredData;
    try {
      filteredData = [...safeData];
      console.log(`${this.logPrefix} Spread realizado com sucesso: ${filteredData.length} itens`);
    } catch (error) {
      console.error(`${this.logPrefix} ERRO no spread:`, error);
      return {
        total: 0,
        data: [],
        breakdown: { sheets: 0, notion: 0, unknown: 0 },
        steps: [`Erro no spread: ${error.message}`],
        filters: filters,
        sourceDefinitions: this.sourceDefinitions
      };
    }

    let steps = [];
    
    const initialBreakdown = this.getSourceBreakdown(filteredData);
    steps.push(`Inicial: ${filteredData.length} (Sheets: ${initialBreakdown.sheets}, Notion: ${initialBreakdown.notion})`);

    if (source !== 'all') {
      try {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(item => item && item._source === source);
        steps.push(`Filtro fonte (${source}): ${filteredData.length} (removidos: ${beforeCount - filteredData.length})`);
      } catch (error) {
        console.error(`${this.logPrefix} Erro no filtro de fonte:`, error);
        steps.push(`Erro no filtro de fonte: ${error.message}`);
      }
    }

    if (year !== 'all') {
      try {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(item => {
          if (!item || !item.dataEntrega) return false;
          
          try {
            const itemYear = new Date(item.dataEntrega).getFullYear();
            return itemYear === parseInt(year);
          } catch (dateError) {
            return false;
          }
        });
        steps.push(`Filtro ano (${year}): ${filteredData.length} (removidos: ${beforeCount - filteredData.length})`);
      } catch (error) {
        console.error(`${this.logPrefix} Erro no filtro de ano:`, error);
        steps.push(`Erro no filtro de ano: ${error.message}`);
      }
    }

    if (type === 'relatorios') {
      try {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(item => item && item.isRelatorio === true);
        steps.push(`Filtro relatórios: ${filteredData.length} (removidos: ${beforeCount - filteredData.length})`);
      } catch (error) {
        console.error(`${this.logPrefix} Erro no filtro de relatórios:`, error);
        steps.push(`Erro no filtro de relatórios: ${error.message}`);
      }
    }

    if (cliente !== 'all') {
      try {
        const beforeCount = filteredData.length;
        filteredData = filteredData.filter(item => item && item.cliente === cliente);
        steps.push(`Filtro cliente (${cliente}): ${filteredData.length} (removidos: ${beforeCount - filteredData.length})`);
      } catch (error) {
        console.error(`${this.logPrefix} Erro no filtro de cliente:`, error);
        steps.push(`Erro no filtro de cliente: ${error.message}`);
      }
    }

    const breakdown = this.getSourceBreakdown(filteredData);

    console.log(`${this.logPrefix} Passos executados:`, steps);
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
    const safeData = this.ensureValidArray(data, 'getSourceBreakdown');
    
    return safeData.reduce((acc, item) => {
      if (!item || typeof item !== 'object') {
        acc.unknown += 1;
        return acc;
      }
      
      const source = item._source || 'unknown';
      if (!acc[source]) acc[source] = 0;
      acc[source] += 1;
      return acc;
    }, { sheets: 0, notion: 0, unknown: 0 });
  }

  generateCountKey(filters) {
    return Object.keys(filters)
      .sort()
      .map(key => `${key}:${filters[key]}`)
      .join('|');
  }

  // FUNÇÃO QUE ESTAVA FALTANDO: validateDataIntegrity
  validateDataIntegrity(allData) {
    console.log(`${this.logPrefix} === VALIDAÇÃO DE INTEGRIDADE ===`);
    
    try {
      const safeData = this.ensureValidArray(allData, 'validateDataIntegrity');
      
      if (safeData.length === 0) {
        console.warn(`${this.logPrefix} ⚠️ Não há dados para validar`);
        return {
          totalBreakdown: { sheets: 0, notion: 0, unknown: 0 },
          duplicates: [],
          sheetsRange: null,
          notionRange: null,
          isValid: false,
          message: 'Dados vazios ou inválidos'
        };
      }

      const totalBreakdown = this.getSourceBreakdown(safeData);
      console.log(`${this.logPrefix} Total por fonte:`, totalBreakdown);

      // Validar se há sobreposição (mesmo ID em ambas as fontes)
      const sheetsData = safeData.filter(item => item && item._source === 'sheets');
      const notionData = safeData.filter(item => item && item._source === 'notion');
      
      const sheetsIds = new Set(sheetsData.map(item => item.id).filter(Boolean));
      const notionIds = new Set(notionData.map(item => item.id).filter(Boolean));
      
      const overlap = [...sheetsIds].filter(id => notionIds.has(id));
      
      if (overlap.length > 0) {
        console.warn(`${this.logPrefix} ⚠️ ATENÇÃO: ${overlap.length} registros duplicados entre fontes:`, overlap);
      } else {
        console.log(`${this.logPrefix} ✅ Sem duplicações entre fontes`);
      }

      // Validar cobertura temporal
      let sheetsRange = null;
      let notionRange = null;

      try {
        const sheetsDates = sheetsData
          .map(item => item.dataEntrega)
          .filter(Boolean)
          .map(date => new Date(date))
          .filter(date => !isNaN(date));

        if (sheetsDates.length > 0) {
          sheetsRange = { 
            min: new Date(Math.min(...sheetsDates)), 
            max: new Date(Math.max(...sheetsDates)) 
          };
        }

        const notionDates = notionData
          .map(item => item.dataEntrega)
          .filter(Boolean)
          .map(date => new Date(date))
          .filter(date => !isNaN(date));

        if (notionDates.length > 0) {
          notionRange = { 
            min: new Date(Math.min(...notionDates)), 
            max: new Date(Math.max(...notionDates)) 
          };
        }

        if (sheetsRange && notionRange) {
          console.log(`${this.logPrefix} Cobertura temporal:`);
          console.log(`${this.logPrefix} Sheets: ${sheetsRange.min.toISOString().split('T')[0]} a ${sheetsRange.max.toISOString().split('T')[0]}`);
          console.log(`${this.logPrefix} Notion: ${notionRange.min.toISOString().split('T')[0]} a ${notionRange.max.toISOString().split('T')[0]}`);
        }
      } catch (dateError) {
        console.warn(`${this.logPrefix} Erro ao processar datas:`, dateError);
      }

      return {
        totalBreakdown,
        duplicates: overlap,
        sheetsRange,
        notionRange,
        isValid: true,
        message: 'Validação concluída com sucesso'
      };

    } catch (error) {
      console.error(`${this.logPrefix} Erro na validação de integridade:`, error);
      return {
        totalBreakdown: { sheets: 0, notion: 0, unknown: 0 },
        duplicates: [],
        sheetsRange: null,
        notionRange: null,
        isValid: false,
        message: `Erro na validação: ${error.message}`
      };
    }
  }

  // FUNÇÃO ADICIONAL: auditCounts
  auditCounts() {
    console.log(`${this.logPrefix} === AUDITORIA DE CONTAGENS ===`);
    console.log(`${this.logPrefix} Total de contagens calculadas: ${Object.keys(this.processedCounts).length}`);
    
    Object.entries(this.processedCounts).forEach(([key, result]) => {
      console.log(`${this.logPrefix} ${key} = ${result.total}`);
    });
  }

  // FUNÇÃO ADICIONAL: debugDataStructure
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

  // FUNÇÃO DE EMERGÊNCIA
  safeCount(data) {
    try {
      const validArray = this.ensureValidArray(data, 'safeCount');
      return validArray.length;
    } catch (error) {
      console.error(`${this.logPrefix} Erro em safeCount:`, error);
      return 0;
    }
  }
}

export const dataStandardizer = new DataStandardization();