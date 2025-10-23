// Teste completo da funcionalidade de contagem com awareness de fontes
import { dataStandardizer } from '../src/utils/dataStandardization.js';

// Dados de exemplo mais realistas
const realisticData = [
  // Dados históricos do Google Sheets (até 2024-06-30)
  { id: 'ORD-2024-001', cliente: 'Empresa A', dataEntrega: '2024-01-15', isRelatorio: true, _source: 'sheets', valor: 5000 },
  { id: 'ORD-2024-002', cliente: 'Empresa B', dataEntrega: '2024-02-20', isRelatorio: false, _source: 'sheets', valor: 3000 },
  { id: 'ORD-2024-003', cliente: 'Empresa A', dataEntrega: '2024-03-10', isRelatorio: true, _source: 'sheets', valor: 4500 },
  { id: 'ORD-2024-004', cliente: 'Empresa C', dataEntrega: '2024-04-05', isRelatorio: false, _source: 'sheets', valor: 2000 },
  { id: 'ORD-2024-005', cliente: 'Empresa D', dataEntrega: '2024-05-12', isRelatorio: true, _source: 'sheets', valor: 6000 },
  { id: 'ORD-2024-006', cliente: 'Empresa B', dataEntrega: '2024-06-18', isRelatorio: false, _source: 'sheets', valor: 3500 },
  
  // Dados atuais do Notion (após 2024-07-01)
  { id: 'ORD-2024-007', cliente: 'Empresa A', dataEntrega: '2024-07-15', isRelatorio: true, _source: 'notion', valor: 5500 },
  { id: 'ORD-2024-008', cliente: 'Empresa E', dataEntrega: '2024-08-20', isRelatorio: false, _source: 'notion', valor: 4000 },
  { id: 'ORD-2024-009', cliente: 'Empresa C', dataEntrega: '2024-09-10', isRelatorio: true, _source: 'notion', valor: 4800 },
  { id: 'ORD-2024-010', cliente: 'Empresa F', dataEntrega: '2024-10-05', isRelatorio: false, _source: 'notion', valor: 3200 },
  { id: 'ORD-2024-011', cliente: 'Empresa A', dataEntrega: '2024-11-12', isRelatorio: true, _source: 'notion', valor: 6200 },
  { id: 'ORD-2024-012', cliente: 'Empresa G', dataEntrega: '2024-12-18', isRelatorio: false, _source: 'notion', valor: 2800 },
  
  // Dados sem fonte (para testar unknown)
  { id: 'ORD-2024-013', cliente: 'Empresa H', dataEntrega: '2024-12-20', isRelatorio: true, valor: 5000 },
];

console.log('🚀 === TESTE COMPLETO DA FUNCIONALIDADE ===\n');

// 1. Validação inicial de integridade
console.log('1. VALIDAÇÃO DE INTEGRIDADE INICIAL:');
const integrity = dataStandardizer.validateDataIntegrity(realisticData);
console.log('✅ Integridade:', integrity);
console.log('');

// 2. Análise por fonte
console.log('2. ANÁLISE POR FONTE:');
const sheetsAnalysis = dataStandardizer.getStandardizedCount(realisticData, { source: 'sheets' });
const notionAnalysis = dataStandardizer.getStandardizedCount(realisticData, { source: 'notion' });
const unknownAnalysis = dataStandardizer.getStandardizedCount(realisticData, { source: 'unknown' });

console.log('📊 Sheets (Históricos):', sheetsAnalysis.total, 'registros');
console.log('📝 Notion (Atuais):', notionAnalysis.total, 'registros');
console.log('❓ Unknown:', unknownAnalysis.total, 'registros');
console.log('');

// 3. Análise por tipo de relatório
console.log('3. ANÁLISE POR TIPO DE RELATÓRIO:');
const reportsAnalysis = dataStandardizer.getStandardizedCount(realisticData, { type: 'relatorios' });
const nonReportsAnalysis = dataStandardizer.getStandardizedCount(realisticData, { type: 'all' });

console.log('📋 Relatórios:', reportsAnalysis.total, 'registros');
console.log('📊 Breakdown por fonte:', reportsAnalysis.breakdown);
console.log('');

// 4. Análise por cliente específico
console.log('4. ANÁLISE POR CLIENTE (Empresa A):');
const clientAAnalysis = dataStandardizer.getStandardizedCount(realisticData, { cliente: 'Empresa A' });
console.log('🏢 Empresa A:', clientAAnalysis.total, 'registros');
console.log('📊 Breakdown por fonte:', clientAAnalysis.breakdown);
console.log('📈 Crescimento:', {
  sheets: clientAAnalysis.breakdown.sheets,
  notion: clientAAnalysis.breakdown.notion,
  crescimento: clientAAnalysis.breakdown.notion > clientAAnalysis.breakdown.sheets ? '📈 Crescendo' : '📉 Declinando'
});
console.log('');

// 5. Análise temporal (por trimestre)
console.log('5. ANÁLISE TEMPORAL POR TRIMESTRE:');
const q1Data = realisticData.filter(item => {
  const month = new Date(item.dataEntrega).getMonth() + 1;
  return month >= 1 && month <= 3;
});
const q2Data = realisticData.filter(item => {
  const month = new Date(item.dataEntrega).getMonth() + 1;
  return month >= 4 && month <= 6;
});
const q3Data = realisticData.filter(item => {
  const month = new Date(item.dataEntrega).getMonth() + 1;
  return month >= 7 && month <= 9;
});
const q4Data = realisticData.filter(item => {
  const month = new Date(item.dataEntrega).getMonth() + 1;
  return month >= 10 && month <= 12;
});

console.log('Q1 2024:', q1Data.length, 'registros');
console.log('Q2 2024:', q2Data.length, 'registros');
console.log('Q3 2024:', q3Data.length, 'registros');
console.log('Q4 2024:', q4Data.length, 'registros');
console.log('');

// 6. Análise de crescimento por fonte
console.log('6. ANÁLISE DE CRESCIMENTO POR FONTE:');
const growthAnalysis = dataStandardizer.getStandardizedCount(realisticData, { showBreakdown: true });
console.log('📊 Total geral:', growthAnalysis.total);
console.log('📈 Breakdown:', growthAnalysis.breakdown);
console.log('🔄 Transição:', {
  de: 'Google Sheets (histórico)',
  para: 'Notion (atual)',
  registrosSheets: growthAnalysis.breakdown.sheets,
  registrosNotion: growthAnalysis.breakdown.notion,
  percentualNotion: Math.round((growthAnalysis.breakdown.notion / growthAnalysis.total) * 100) + '%'
});
console.log('');

// 7. Teste de performance com cache
console.log('7. TESTE DE PERFORMANCE COM CACHE:');
const startTime = Date.now();

// Primeira execução (sem cache)
const firstRun = dataStandardizer.getStandardizedCount(realisticData, { source: 'notion' });
const firstRunTime = Date.now() - startTime;

// Segunda execução (com cache)
const secondStartTime = Date.now();
const secondRun = dataStandardizer.getStandardizedCount(realisticData, { source: 'notion' });
const secondRunTime = Date.now() - secondStartTime;

console.log('⏱️ Primeira execução:', firstRunTime, 'ms');
console.log('⚡ Segunda execução (cache):', secondRunTime, 'ms');
console.log('🚀 Melhoria de performance:', Math.round((firstRunTime / secondRunTime) * 100) + '%');
console.log('');

// 8. Estatísticas finais do cache
console.log('8. ESTATÍSTICAS FINAIS DO CACHE:');
const finalCacheStats = dataStandardizer.getCacheStats();
console.log('📊 Cache stats:', finalCacheStats);
console.log('💾 Uso de memória:', Math.round(finalCacheStats.memoryUsage / 1024) + ' KB');
console.log('');

// 9. Resumo executivo
console.log('9. RESUMO EXECUTIVO:');
console.log('📈 Total de registros processados:', realisticData.length);
console.log('📊 Registros históricos (Sheets):', sheetsAnalysis.total);
console.log('📝 Registros atuais (Notion):', notionAnalysis.total);
console.log('❓ Registros sem fonte:', unknownAnalysis.total);
console.log('📋 Total de relatórios:', reportsAnalysis.total);
console.log('🏢 Clientes únicos:', new Set(realisticData.map(item => item.cliente)).size);
console.log('⚡ Entradas no cache:', finalCacheStats.processedCounts);
console.log('');

console.log('✅ === TESTE COMPLETO FINALIZADO ===');
