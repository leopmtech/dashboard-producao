/**
 * @fileoverview Executor principal da análise
 * @description Script para executar análise de dados via Node.js
 * 
 * USO:
 *   node src/scripts/runAnalysis.js
 */

import DataAnalyzer from './dataAnalyzer.js';
import SchemaDiscovery from './schemaDiscovery.js';

async function main() {
  console.log('🚀 Iniciando análise de dados...\n');

  try {
    // 1) Descoberta de schema
    console.log('🔎 Descobrindo schemas (Notion + Sheets)...');
    const schemaAnalyzer = new SchemaDiscovery();
    const schemas = await schemaAnalyzer.discoverAll();
    console.log(`✅ Notion fields: ${schemas.notion.fields.length} | Sheets columns: ${schemas.sheets.columns.length}`);

    // 2) Execução da análise
    const analyzer = new DataAnalyzer();
    const resultado = await analyzer.executarAnaliseCompleta();

    if (resultado.erro) {
      console.error('❌ Análise falhou:', resultado.erro);
      process.exit(1);
    }

    console.log('\n📊 Resultado da Análise:');
    console.log(JSON.stringify({
      resumo: resultado.resumo,
      correspondencias: {
        encontradas: resultado.correspondencias.encontradas,
        percentual: resultado.correspondencias.percentual,
        porEstrategia: resultado.correspondencias.porEstrategia
      }
    }, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();

