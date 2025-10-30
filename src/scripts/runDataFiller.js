import { DataFiller } from './fillMissingData.js';

// MAPEAMENTO CORRETO DOS CAMPOS
const FIELD_MAPPING = {
  notion: {
    title: 'titulo',
    client: 'cliente', 
    startDate: 'data',
    type: 'tipo',
    createdBy: 'criado_por',
    completed: 'concluido'
  },
  sheets: {
    title: 'Ordem de Serviço',
    client1: 'Cliente1',
    client2: 'Cliente2',
    type: 'Tipo de demanda',
    createdBy: 'Criado por',
    startDate: 'Data de início',
    completed: 'Concluído'
  }
};

// Função auxiliar para normalizar strings
function normalizeString(str) {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  console.log('🎯 === PREENCHIMENTO AUTOMÁTICO ===\n');
  
  if (dryRun) {
    console.log('🧪 MODO TESTE ATIVO');
    console.log('💡 Use --execute para aplicar as mudanças reais\n');
  }

  const debug = process.env.DEBUG === 'true';
  
  const filler = new DataFiller({ 
    dryRun,
    batchSize: 30,
    debug,
    sheetTitleField: 'Ordem de Serviço' // Campo do Sheets para título
  });

  // ADICIONAR LOGS DE DEBUG - Inserir após carregar dados do Notion e Sheets
  if (process.env.DEBUG === 'true') {
    try {
      const [notionRecords, sheetsRecords] = await Promise.all([
        filler.carregarDadosNotion(),
        filler.carregarDadosPlanilha()
      ]);

      // Derivar visões simplificadas para análise
      const notionData = Array.isArray(notionRecords)
        ? notionRecords.map(r => filler.extrairDadosNotion(r))
        : [];
      const sheetsData = Array.isArray(sheetsRecords)
        ? sheetsRecords.map(r => filler.extrairDadosPlanilha(r))
        : [];

      console.log('🔍 [DEBUG] === ANÁLISE DE DADOS ===');
      
      // Mostrar estrutura dos dados
      if (notionData && notionData.length > 0) {
        console.log('📋 [DEBUG] Campos disponíveis Notion:', Object.keys(notionData[0]));
        console.log('🔍 [DEBUG] Amostra Notion (primeiros 3):');
        notionData.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i + 1}:`, JSON.stringify(item, null, 2));
        });
      }
      
      if (sheetsData && sheetsData.length > 0) {
        console.log('📋 [DEBUG] Campos disponíveis Sheets:', Object.keys(sheetsData[0]));
        console.log('🔎 [DEBUG] Amostra Sheets (primeiros 3):');
        sheetsData.slice(0, 3).forEach((item, i) => {
          console.log(`  ${i + 1}:`, JSON.stringify(item, null, 2));
        });
      }
      
      // ANALISAR MATCHING POR TÍTULO
      console.log('\n🔍 [DEBUG] === ANÁLISE DE TÍTULOS ===');
      
      const notionTitles = notionData.slice(0, 5).map(item => item[FIELD_MAPPING.notion.title]).filter(t => t);
      const sheetTitles = sheetsData.slice(0, 5).map(item => item[FIELD_MAPPING.sheets.title] || item["Ordem de Serviço"] || item["ordem"] || "").filter(t => t);
      
      console.log('📝 [DEBUG] Títulos Notion:', notionTitles);
      console.log('📝 [DEBUG] Ordens de Serviço Sheets:', sheetTitles);
      
      console.log('\n🔗 [DEBUG] Campos disponíveis para preenchimento:');
      console.log('  - Cliente (Sheets → Notion)');
      console.log('  - Data de início (Sheets → Notion)'); 
      console.log('  - Tipo de demanda (Sheets → Notion)');
      console.log('  - Criado por (Sheets → Notion)');
      console.log('  - Status Concluído (Sheets → Notion)');
      
      console.log('\n🔍 [DEBUG] === FIM ANÁLISE ===');
    } catch (e) {
      console.warn('⚠️  [DEBUG] Falha ao carregar dados para debug:', e?.message || e);
    }
  }

  const resultado = await filler.executarPreenchimento();
  
  if (resultado.success) {
    console.log('\n🎉 Preenchimento concluído com sucesso!');
    process.exit(0);
  } else {
    console.log('\n❌ Falha no preenchimento');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});


