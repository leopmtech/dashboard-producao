/**
 * @fileoverview Classe principal de análise de dados
 * @description Analisa dados do Notion vs Planilha com 4 estratégias de matching
 */

import { analysisConfig } from '../config/analysisConfig.js';
import DataLoader from './utils/dataLoader.js';
import Reporter from './utils/reporter.js';
import {
  normalizarTexto,
  normalizarCliente,
  normalizarData,
  calcularSimilaridade,
  ehValorProblema,
  compararRegistros
} from './utils/normalizer.js';

/**
 * Classe principal de análise de dados
 */
export class DataAnalyzer {
  constructor(config = analysisConfig) {
    this.config = config;
    this.loader = new DataLoader(config);
    this.reporter = new Reporter(config);
    this.logs = [];
  }

  /**
   * Adiciona log estruturado
   * @param {string} nivel - Nível do log (INFO, WARN, ERROR, DEBUG)
   * @param {string} mensagem - Mensagem do log
   */
  log(nivel, mensagem) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, nivel, mensagem };
    this.logs.push(logEntry);

    const emojis = {
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌',
      DEBUG: '🔍',
      SUCCESS: '✅'
    };

    const emoji = emojis[nivel] || '';
    console.log(`${emoji} [${nivel}] ${mensagem}`);
  }

  /**
   * Estratégia 1: Match por ID Direto
   * @param {Object} registroNotion - Registro do Notion
   * @param {Object} registroSheets - Registro do Sheets
   * @returns {boolean} True se encontrou match
   */
  estrategiaIdDireto(registroNotion, registroSheets) {
    if (!registroNotion.id || !registroSheets.id) return false;
    
    const match = registroNotion.id === registroSheets.id;
    if (match) {
      this.log('DEBUG', `Match ID Direto: ${registroNotion.id}`);
    }
    return match;
  }

  /**
   * Estratégia 2: Match por Ordem de Serviço
   * @param {Object} registroNotion - Registro do Notion
   * @param {Object} registroSheets - Registro do Sheets
   * @returns {boolean} True se encontrou match
   */
  estrategiaOrdemServico(registroNotion, registroSheets) {
    const osNotion = normalizarTexto(registroNotion.ordemServico);
    const osSheets = normalizarTexto(registroSheets.ordemServico);

    if (!osNotion || !osSheets) return false;

    // Match exato ou com alta trailer (>= 0.95)
    const similaridade = calcularSimilaridade(osNotion, osSheets);
    const match = similaridade >= 0.95;

    if (match) {
      this.log('DEBUG', `Match Ordem de Serviço: ${osNotion} (similaridade: ${similaridade.toFixed(2)})`);
    }
    return match;
  }

  /**
   * Estratégia 3: Match por Data + Cliente
   * @param {Object} registroNotion - Registro do Notion
   * @param {Object} registroSheets - Registro do Sheets
   * @returns {boolean} True se encontrou match
   */
  estrategiaDataCliente(registroNotion, registroSheets) {
    const dataNotion = normalizarData(registroNotion.dataEntrega);
    const dataSheets = normalizarData(registroSheets.dataEntrega);

    if (!dataNotion || !dataSheets || dataNotion !== dataSheets) {
      return false;
    }

    // Normalizar clientes
    const clienteInfo = normalizarCliente(
      registroNotion.cliente || registroNotion.cliente1,
      registroSheets.cliente1,
      registroSheets.cliente2
    );

    // Verificar se há overlap nos clientes
    const hasMatch = clienteInfo.notion.some(cn =>
      clienteInfo.sheets.some(cs => cn === cs)
    ) || clienteInfo.notion.length === 0 || clienteInfo.sheets.length === 0;

    if (hasMatch) {
      this.log('DEBUG', `Match Data + Cliente: ${dataNotion} - ${clienteInfo.todos.join(', ')}`);
    }
    return hasMatch;
  }

  /**
   * Estratégia 4: Match por Similaridade Fuzzy
   * @param {Object} registroNotion - Registro do Notion
   * @param {Object} registroSheets - Registro do Sheets
   * @returns {boolean} True se encontrou match
   */
  estrategiaSimilaridadeFuzzy(registroNotion, registroSheets) {
    const camposNotion = [
      registroNotion.ordemServico,
      registroNotion.cliente1 || registroNotion.cliente,
      registroNotion.dataEntrega
    ].filter(Boolean).join(' ');

    const camposSheets = [
      registroSheets.ordemServico,
      registroSheets.cliente1 || registroSheets.cliente,
      registroSheets.dataEntrega
    ].filter(Boolean).join(' ');

    if (!camposNotion || !camposSheets) return false;

    const similaridade = calcularSimilaridade(camposNotion, camposSheets);
    const match = similaridade >= this.config.fuzzy.threshold;

    if (match) {
      this.log('DEBUG', `Match Fuzzy: similaridade ${similaridade.toFixed(2)}`);
    }
    return match;
  }

  /**
   * Tenta fazer match entre dois registros usando todas as estratégias
   * @param {Object} registroNotion - Registro do Notion
   * @param {Object} registroSheets - Registro do Sheets
   * @returns {Object|null} Objeto com estratégia e similaridade ou null
   */
  tentarMatch(registroNotion, registroSheets) {
    // Estratégia 1: ID Direto (prioridade 1)
    if (this.estrategiaIdDireto(registroNotion, registroSheets)) {
      return { estrategia: 'ID Direto', similaridade: 1.0 };
    }

    // Estratégia 2: Ordem de Serviço (prioridade 2)
    if (this.estrategiaOrdemServico(registroNotion, registroSheets)) {
      return { estrategia: 'Ordem de Serviço', similaridade: 0.95 };
    }

    // Estratégia 3: Data + Cliente (prioridade 3)
    if (this.estrategiaDataCliente(registroNotion, registroSheets)) {
      return { estrategia: 'Data + Cliente', similaridade: 0.90 };
    }

    // Estratégia 4: Similaridade Fuzzy (prioridade 4)
    const similaridade = calcularSimilaridade(
      [registroNotion.ordemServico, registroNotion.cliente1].filter(Boolean).join(' '),
      [registroSheets.ordemServico, registroSheets.cliente1].filter(Boolean).join(' ')
    );

    if (similaridade >= this.config.fuzzy.threshold) {
      this.estrategiaSimilaridadeFuzzy(registroNotion, registroSheets);
      return { estrategia: 'Similaridade Fuzzy', similaridade };
    }

    return null;
  }

  /**
   * Encontra correspondências entre Notion e Sheets
   * @param {Array} dadosNotion - Array de registros do Notion
   * @param {Array} dadosSheets - Array de registros do Sheets
   * @returns {Object} Resultado das correspondências
   */
  encontrarCorrespondencias(dadosNotion, dadosSheets) {
    this.log('INFO', 'Iniciando busca de correspondências...');

    const correspondencias = {
      encontradas: 0,
      percentual: 0,
      porEstrategia: {},
      pares: []
    };

    const notionEncontrados = new Set();
    const sheetsEncontrados = new Set();

    dadosNotion.forEach((regNotion, idxNotion) => {
      if (idxNotion % 100 === 0) {
        this.log('DEBUG', `Processando registro ${idxNotion}/${dadosNotion.length}`);
      }

      let melhorMatch = null;
      let melhorIdx = -1;

      dadosSheets.forEach((regSheets, idxSheets) => {
        const match = this.tentarMatch(regNotion, regSheets);
        if (match && (!melhorMatch || match.similaridade > melhorMatch.similaridade)) {
          melhorMatch = match;
          melhorIdx = idxSheets;
        }
      });

      if (melhorMatch) {
        correspondencias.encontradas++;
        notionEncontrados.add(idxNotion);
        sheetsEncontrados.add(melhorIdx);

        const estrategia = melhorMatch.estrategia;
        correspondencias.porEstrategia[estrategia] =
          (correspondencias.porEstrategia[estrategia] || 0) + 1;

        correspondencias.pares.push({
          notionIdx: idxNotion,
          sheetsIdx: melhorIdx,
          estrategia,
          similaridade: melhorMatch.similaridade,
          notion: regNotion,
          sheets: dadosSheets[melhorIdx]
        });
      }
    });

    correspondencias.percentual = dadosNotion.length > 0
      ? Math.round((correspondencias.encontradas / dadosNotion.length) * 100)
      : 0;

    correspondencias.notionNaoEncontrados = Array.from(
      { length: dadosNotion.length },
      (_, i) => i
    ).filter(i => !notionEncontrados.has(i)).map(i => dadosNotion[i]);

    correspondencias.sheetsNaoEncontrados = Array.from(
      { length: dadosSheets.length },
      (_, i) => i
    ).filter(i => !sheetsEncontrados.has(i)).map(i => dadosSheets[i]);

    this.log('SUCCESS', `Correspondências encontradas: ${correspondencias.encontradas}`);
    return correspondencias;
  }

  /**
   * Analisa campos problemáticos
   * @param {Array} registros - Registros a analisar
   * @param {string} tipo - Tipo de registro ('notion' ou 'sheets')
   * @returns {Array} Array de campos problemáticos
   */
  analisarCamposProblematicos(registros, tipo) {
    this.log('INFO', `Analisando campos problemáticos em ${tipo}...`);

    const problematicos = [];
    const valoresProblemas = this.config.valoresProblemas;

    registros.forEach(reg => {
      this.config.camposEssenciais.forEach(campo => {
        const valor = reg[campo];
        const camposEspecificos = valoresProblemas[campo] || valoresProblemas.tiposDemanda;

        if (ehValorProblema(valor, camposEspecificos)) {
          problematicos.push({
            id: reg.id || 'N/A',
            campo,
            valor: valor || '(vazio)',
            tipo,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    this.log('WARN', `Encontrados ${problematicos.length} campos problemáticos em ${tipo}`);
    return problematicos;
  }

  /**
   * Executa análise completa
   * @returns {Promise<Object>} Resultado completo da análise
   */
  async executarAnaliseCompleta() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 INICIANDO ANÁLISE DE DADOS');
    console.log('='.repeat(80) + '\n');

    try {
      // 1. Carregar dados
      this.log('INFO', 'Carregando datasets...');
      const { notion, sheets, sucessoTotal } = await this.loader.carregarTodos();

      if (!sucessoTotal) {
        this.log('ERROR', 'Falha ao carregar um ou mais datasets');
        return { erro: 'Falha no carregamento de dados' };
      }

      const dadosNotion = notion.data;
      const dadosSheets = sheets.data;

      // 2. Encontrar correspondências
      this.log('INFO', 'Buscando correspondências...');
      const correspondencias = this.encontrarCorrespondencias(dadosNotion, dadosSheets);

      // 3. Analisar campos problemáticos
      this.log('INFO', 'Analisando qualidade dos dados...');
      const camposProblematicosNotion = this.analisarCamposProblematicos(dadosNotion, 'notion');
      const camposProblematicosSheets = this.analisarCamposProblematicos(dadosSheets, 'sheets');

      // 4. Montar resultado
      const resultado = {
        timestamp: new Date().toISOString(),
        notion: {
          total: dadosNotion.length,
          problemáticos: camposProblematicosNotion.length
        },
        sheets: {
          total: dadosSheets.length,
          problemáticos: camposProblematicosSheets.length
        },
        correspondencias,
        camposProblematicos: [
          ...camposProblematicosNotion,
          ...camposProblematicosSheets
        ],
        registrosNaoEncontrados: correspondencias.notionNaoEncontrados,
        resumo: {
          totalRegistros: dadosNotion.length + dadosSheets.length,
          matchesEncontrados: correspondencias.encontradas,
          percentualSucesso: correspondencias.percentual,
          qualidadeDados: {
            notion: Math.round((1 - camposProblematicosNotion.length / dadosNotion.length) * 100),
            sheets: Math.round((1 - camposProblematicosSheets.length / dadosSheets.length) * 100)
          }
        }
      };

      // 5. Gerar relatórios
      this.log('INFO', 'Gerando relatórios...');
      this.reporter.gerarRelatorioCompleto(resultado);

      this.log('SUCCESS', 'Análise completa!');
      return resultado;

    } catch (error) {
      this.log('ERROR', `Erro na análise: ${error.message}`);
      console.error('Stack trace:', error.stack);
      return { erro: error.message, stack: error.stack };
    }
  }
}

export default DataAnalyzer;

