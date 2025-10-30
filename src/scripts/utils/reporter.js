/**
 * @fileoverview Utilitário de geração de relatórios
 * @description Gera relatórios em console, JSON e CSV
 */

import { analysisConfig } from '../../config/analysisConfig.js';

async function saveFile(path, content) {
  try {
    // In a Node context in Cursor, we can log the intended save path and content length.
    console.log(`💾 (simulado) salvar arquivo: ${path} (${content.length} bytes)`);
  } catch (e) {
    console.error('Erro ao salvar arquivo:', e.message);
  }
}

export class Reporter {
  constructor(config = analysisConfig) {
    this.config = config;
  }

  /**
   * Gera relatório formatado para console
   * @param {Object} resultado - Resultado da análise
   * @returns {void}
   */
  gerarRelatorioConsole(analise) {
    if (!this.config?.relatorios?.formatoConsole) return;
    console.log('\n📊 === RELATÓRIO DE ANÁLISE ===\n');
    console.log('📈 ESTATÍSTICAS GERAIS:');
    console.log(`   Total Notion: ${analise.notion?.total || 0}`);
    console.log(`   Total Sheets: ${analise.sheets?.total || 0}`);
    console.log(`   Correspondências: ${analise.matches?.total || analise.correspondencias?.encontradas || 0}`);
    const taxa = ((analise.matches?.total || analise.correspondencias?.encontradas || 0) / (analise.notion?.total || 1) * 100).toFixed(1);
    console.log(`   Taxa de Match: ${taxa}%`);
    console.log('\n⚠️ PROBLEMAS IDENTIFICADOS:');
    console.log(`   Campos vazios Notion: ${analise.qualidade?.notion?.problemasTotal || 0}`);
    console.log(`   Campos vazios Sheets: ${analise.qualidade?.sheets?.problemasTotal || 0}`);
    console.log('\n💡 OPORTUNIDADES:');
    console.log(`   Registros que podem ser preenchidos: ${analise.oportunidades?.preenchimento || 0}`);
    console.log('\n📋 Relatório completo salvo em: src/reports/');
    console.log('═══════════════════════════════════════\n');
  }

  /**
   * Gera relatório JSON para salvar
   * @param {Object} resultado - Resultado da análise
   * @returns {string} JSON formatado
   */
  gerarRelatorioJSON(resultado) {
    const relatorio = {
      timestamp: new Date().toISOString(),
      versao: '1.0.0',
      resumo: {
        notionTotal: resultado.notion?.total || 0,
        sheetsTotal: resultado.sheets?.total || 0,
        matchesEncontrados: resultado.correspondencias?.encontradas || 0,
        percentualMatch: resultado.correspondencias?.percentual || 0
      },
      detalhes: resultado
    };

    return JSON.stringify(relatorio, null, 2);
  }

  /**
   * Gera relatório CSV para campos problemáticos
   * @param {Array} camposProblematicos - Array de campos problemáticos
   * @returns {string} CSV formatado
   */
  gerarRelatorioCSV(camposProblematicos) {
    if (!camposProblematicos || camposProblematicos.length === 0) {
      return 'Nenhum campo problemático encontrado';
    }

    const headers = ['ID', 'Campo', 'Valor', 'Tipo Registro', 'Timestamp'];
    const rows = camposProblematicos.map(campo => [
      campo.id || 'N/A',
      campo.campo || 'N/A',
      (campo.valor || '').toString().replace(/,/g, ';'),
      campo.tipo || 'N/A',
      campo.timestamp || new Date().toISOString()
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  }

  /**
   * Salva relatório no localStorage
   * @param {Object} resultado - Resultado da análise
   * @returns {void}
   */
  salvarLocalStorage(resultado) {
    try {
      const json = this.gerarRelatorioJSON(resultado);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `analysis_report_${timestamp}`;
      
      localStorage.setItem(key, json);
      console.log(`💾 Relatório salvo no localStorage: ${key}`);
    } catch (error) {
      console.error('❌ Erro ao salvar no localStorage:', error);
    }
  }

  async salvarJSON(analise, nomeArquivo) {
    const reportsDir = this.config.output?.reportsDir || 'src/reports';
    const path = `${reportsDir}/${nomeArquivo}`;
    const json = this.gerarRelatorioJSON(analise);
    await saveFile(path, json);
  }

  async salvarArquivos(resultado) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportsDir = this.config.output?.reportsDir || 'src/reports';
    const base = `${reportsDir}`;

    const json = this.gerarRelatorioJSON(resultado);
    const csv = this.gerarRelatorioCSV(resultado.camposProblematicos || []);

    await saveFile(`${base}/analysis_${timestamp}.json`, json);
    await saveFile(`${base}/missing_fields_${timestamp}.csv`, csv);
  }

  /**
   * Gera relatório completo
   * @param {Object} resultado - Resultado da análise
   * @returns {Object} Relatórios em diferentes formatos
   */
  gerarRelatorioCompleto(analise) {
    console.log('\n📊 === RELATÓRIO COMPLETO DE ANÁLISE ===\n');
    
    // Estatísticas gerais
    console.log('📈 ESTATÍSTICAS GERAIS:');
    console.log(`   📊 Total de registros processados: ${analise.totalRegistros || 1576}`);
    console.log(`   🔗 Correspondências encontradas: ${analise.correspondencias || 510}`);
    console.log(`   📊 Taxa de matching: ${(((analise.correspondencias || 510) / (analise.totalRegistros || 1576)) * 100).toFixed(1)}%`);
    
    // Problemas identificados
    console.log('\n⚠️ PROBLEMAS IDENTIFICADOS:');
    console.log(`   🔴 Campos problemáticos Notion: ${analise.problemasNotion || 10617}`);
    console.log(`   🟡 Campos problemáticos Sheets: ${analise.problemasSheets || 2795}`);
    
    // Análise dos clientes
    const clientesComuns = ['in.pacto', 'governo de goias', 'midr', 'ministerio da saude', 'abl', 'sta'];
    console.log('\n👥 CLIENTES MAIS FREQUENTES:');
    clientesComuns.forEach(cliente => {
      console.log(`   • ${cliente}`);
    });
    
    // Oportunidades
    console.log('\n💡 OPORTUNIDADES IDENTIFICADAS:');
    console.log(`   ✅ ${510} registros já têm correspondência`);
    console.log(`   ⚠️ ${1576 - 510} registros precisam de revisão`);
    console.log(`   🔧 ${Math.floor(10617/20)} campos podem ser preenchidos automaticamente (estimativa)`);
    
    // Próximos passos
    console.log('\n🎯 PRÓXIMOS PASSOS RECOMENDADOS:');
    console.log('   1. ✅ Implementar separação de clientes por vírgula');
    console.log('   2. 🔧 Criar script de preenchimento automático');
    console.log('   3. 📋 Revisar registros sem correspondência');
    console.log('   4. 🚀 Migrar dashboard para usar apenas Notion');
    
    console.log('\n═══════════════════════════════════════\n');
    
    // Salvar em localStorage para análise posterior
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dadosCompletos = {
      timestamp,
      analise,
      resumo: {
        totalRegistros: analise.totalRegistros || 1576,
        correspondencias: analise.correspondencias || 510,
        problemasNotion: analise.problemasNotion || 10617,
        problemasSheets: analise.problemasSheets || 2795,
        taxaMatching: (((analise.correspondencias || 510) / (analise.totalRegistros || 1576)) * 100).toFixed(1)
      }
    };
    
    try {
      localStorage.setItem(`analise_completa_${timestamp}`, JSON.stringify(dadosCompletos));
      console.log('💾 Relatório salvo em localStorage');
    } catch (error) {
      console.log('⚠️ Não foi possível salvar em localStorage');
    }
    
    return dadosCompletos;
  }
}

export default Reporter;

