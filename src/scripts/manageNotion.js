import { config } from '../config/analysisConfig.js';

// Classe para gerenciar dados do Notion
class NotionManager {
  constructor() {
    this.apiConfig = config.notion;
  }

  // Carregar todos os dados do Notion
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
    return records.map(record => {
      const extractText = (property) => {
        if (!property) return '';
        if (property.title && property.title[0]) return property.title[0].text.content;
        if (property.rich_text && property.rich_text[0]) return property.rich_text[0].text.content;
        if (property.multi_select) return property.multi_select.map(item => item.name).join(', ');
        if (property.select) return property.select.name;
        if (property.date) return property.date.start;
        return '';
      };

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

  // Carregar todos os dados estruturados
  async getAllData() {
    console.log('📊 Carregando dados do Notion...');
    const records = await this.getAllRecords();
    const data = this.extrairDados(records);
    console.log(`✅ ${data.length} registros processados`);
    return data;
  }

  // Obter estatísticas
  async getStatistics() {
    const data = await this.getAllData();
    
    const stats = {
      total: data.length,
      porCliente: this.groupBy(data, 'cliente'),
      porTipo: this.groupBy(data, 'tipo'),
      porComplexidade: this.groupBy(data, 'complexidade'),
      porExecutor: this.groupBy(data, 'quemExecuta'),
      porMes: this.groupByMonth(data),
      preenchimento: this.getCompleteness(data)
    };
    
    this.printStatistics(stats);
    return stats;
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

  // Calcular completude de campos
  getCompleteness(data) {
    const fields = ['cliente', 'tipo', 'complexidade', 'quemExecuta', 'data'];
    const completeness = {};
    
    fields.forEach(field => {
      const filled = data.filter(item => item[field] && item[field].trim() !== '').length;
      completeness[field] = {
        filled,
        percentage: data.length > 0 ? Math.round((filled / data.length) * 100) : 0
      };
    });
    
    return completeness;
  }

  // Imprimir estatísticas
  printStatistics(stats) {
    console.log('\n📊 === ESTATÍSTICAS NOTION ===');
    console.log(`📋 Total de registros: ${stats.total}`);
    
    console.log('\n👥 Por Cliente (Top 5):');
    Object.entries(stats.porCliente)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([cliente, count]) => {
        console.log(`  ${cliente}: ${count} projetos`);
      });
    
    console.log('\n📝 Por Tipo (Top 5):');
    Object.entries(stats.porTipo)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([tipo, count]) => {
        console.log(`  ${tipo}: ${count} projetos`);
      });
    
    console.log('\n📊 Por Complexidade:');
    Object.entries(stats.porComplexidade)
      .sort(([,a], [,b]) => b - a)
      .forEach(([complex, count]) => {
        console.log(`  ${complex}: ${count} projetos`);
      });
    
    console.log('\n👤 Por Executor (Top 5):');
    Object.entries(stats.porExecutor)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([executor, count]) => {
        console.log(`  ${executor}: ${count} projetos`);
      });
    
    console.log('\n📈 Por Mês (últimos 6 meses):');
    Object.entries(stats.porMes)
      .sort()
      .slice(-6)
      .forEach(([month, count]) => {
        console.log(`  ${month}: ${count} projetos`);
      });
    
    console.log('\n✅ Preenchimento de Campos:');
    Object.entries(stats.preenchimento).forEach(([field, data]) => {
      const icon = data.percentage === 100 ? '✅' : data.percentage >= 80 ? '⚠️' : '❌';
      console.log(`  ${icon} ${field}: ${data.filled}/${stats.total} (${data.percentage}%)`);
    });
  }

  // Buscar projetos por critérios
  async searchProjects(criteria) {
    const data = await this.getAllData();
    return data.filter(item => {
      return Object.entries(criteria).every(([field, value]) => {
        const itemValue = item[field]?.toLowerCase() || '';
        return itemValue.includes(value.toLowerCase());
      });
    });
  }

  // Obter projetos por período
  async getProjectsByDate(startDate, endDate) {
    const data = await this.getAllData();
    return data.filter(item => {
      if (!item.data) return false;
      return item.data >= startDate && item.data <= endDate;
    });
  }
}

// FUNÇÕES DE USO
async function manageNotionOnly() {
  const manager = new NotionManager();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch(command) {
    case 'stats':
      await manager.getStatistics();
      break;
      
    case 'search':
      const criteria = {};
      if (args[1]) criteria.cliente = args[1];
      if (args[2]) criteria.tipo = args[2];
      const results = await manager.searchProjects(criteria);
      console.log(`\n🔍 Encontrados ${results.length} projetos`);
      results.slice(0, 10).forEach(r => {
        console.log(`  "${r.titulo}" - ${r.cliente} - ${r.quemExecuta}`);
      });
      break;
      
    case 'recent':
      const days = parseInt(args[1]) || 30;
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recent = await manager.getProjectsByDate(startDate, endDate);
      console.log(`\n📅 ${recent.length} projetos nos últimos ${days} dias`);
      recent.slice(0, 10).forEach(r => {
        console.log(`  "${r.titulo}" - ${r.data} - ${r.cliente}`);
      });
      break;
      
    case 'list':
      const allData = await manager.getAllData();
      console.log(`\n📋 Listando todos os ${allData.length} projetos:\n`);
      allData.forEach((item, index) => {
        console.log(`${index + 1}. ${item.titulo}`);
        console.log(`   Cliente: ${item.cliente || 'Não informado'}`);
        console.log(`   Tipo: ${item.tipo || 'Não informado'}`);
        console.log(`   Complexidade: ${item.complexidade || 'Não informado'}`);
        console.log(`   Executor: ${item.quemExecuta || 'Não informado'}`);
        console.log(`   Data: ${item.data || 'Não informado'}`);
        console.log('');
      });
      break;
      
    default:
      console.log('📊 Comandos disponíveis:');
      console.log('  stats    - Estatísticas gerais');
      console.log('  search   - Buscar projetos (ex: search "Cliente" "Tipo")');
      console.log('  recent   - Projetos recentes (ex: recent 30)');
      console.log('  list     - Listar todos os projetos');
      console.log('\n💡 Exemplo: node src/scripts/manageNotion.js stats');
  }
}

// Executar se chamado diretamente
manageNotionOnly().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});

export { NotionManager };

