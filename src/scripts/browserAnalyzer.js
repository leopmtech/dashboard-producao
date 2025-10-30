/**
 * @fileoverview Analyzer para uso no Browser Console
 * @description Versão simplificada para executar no console do DevTools
 * 
 * USO NO BROWSER:
 *   1. Abra o DevTools (F12)
 *   2. Cole o conteúdo completo deste arquivo no Console
 *   3. Execute: browserAnalyzer.analyze()
 */

import DataAnalyzer from './dataAnalyzer.js';

/**
 * Classe wrapper para facilitar uso no browser
 */
class BrowserAnalyzer {
  constructor() {
    this.analyzer = new DataAnalyzer();
  }

  /**
   * Executa a análise completa
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyze() {
    console.log('🌐 Executando análise no browser...');
    return await this.analyzer.executarAnaliseCompleta();
  }

  /**
   * Executa análise rápida (sem relatórios detalhados)
   * @returns {Promise<Object>} Resultado resumido
   */
  async quickAnalyze() {
    const resultado = await this.analyze();
    return {
      totalRegistros: resultado.notion.total + resultado.sheets.total,
      matches: resultado.correspondencias.encontradas,
      percentual: resultado.correspondencias.percentual,
      qualidade: resultado.resumo.qualidadeDados
    };
  }
}

// Criar instância global para uso no console
window.browserAnalyzer = new BrowserAnalyzer();

// Exportar para uso em módulos
export default BrowserAnalyzer;

