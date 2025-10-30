/**
 * @fileoverview Utilitário de normalização de dados
 * @description Normaliza textos, datas e calcula similaridade entre strings
 */

/**
 * Normaliza texto removendo acentos, convertendo para minúsculas e removendo espaços extras
 * @param {string} texto - Texto a ser normalizado
 * @returns {string} Texto normalizado
 */
export function normalizarTexto(texto) {
  if (!texto) return '';
  
  return String(texto)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Normaliza cliente (Notion usa vírgula, planilha usa cliente1/cliente2)
 * @param {string} clienteNotion - Cliente do Notion (separado por vírgula)
 * @param {string} cliente1Sheet - Cliente1 da planilha
 * @param {string} cliente2Sheet - Cliente2 da planilha
 * @returns {Object} Clientes normalizados
 */
export function normalizarCliente(clienteNotion, cliente1Sheet, cliente2Sheet) {
  const clientesNotion = clienteNotion
    ? clienteNotion.split(',').map(c => normalizarTexto(c))
    : [];

  const clientesSheet = [
    normalizarTexto(cliente1Sheet),
    normalizarTexto(cliente2Sheet)
  ].filter(Boolean);

  return {
    notion: clientesNotion,
    sheets: clientesSheet,
    todos: [...new Set([...clientesNotion, ...clientesSheet])]
  };
}

/**
 * Normaliza data para formato ISO (YYYY-MM-DD)
 * @param {any} data - Data em qualquer formato
 * @returns {string|null} Data normalizada ou null
 */
export function normalizarData(data) {
  if (!data) return null;

  // Se já é formato ISO
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }

  // Se é número serial Excel/Google Sheets
  if (typeof data === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = data * 24 * 60 * 60 * 1000;
    const d = new Date(excelEpoch.getTime() + ms);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Tentar parsear como data
  const dateObj = new Date(data);
  if (!isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Formato DD/MM/YYYY
  const matchBR = String(data).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchBR) {
    const [, day, month, year] = matchBR;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Calcula similaridade entre duas strings usando algoritmo Levenshtein
 * @param {string} str1 - Primeira string
 * @param {string} str2 - Segunda string
 * @returns {number} Similaridade (0-1)
 */
export function calcularSimilaridade(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const s1 = normalizarTexto(str1);
  const s2 = normalizarTexto(str2);

  if (s1 === s2) return 0.95;

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return len1 === 0 ? 1 : 0;

  // Matriz de distância Levenshtein
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Inicializar primeira linha e coluna
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Calcular distância
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Verifica se um valor é considerado problemático/vazio
 * @param {any} valor - Valor a verificar
 * @param {string[]} valoresProblemas - Lista de valores problemáticos
 * @returns {boolean} True se o valor é problemático
 */
export function ehValorProblema(valor, valoresProblemas = ['', 'undefined', 'null', 'N/A']) {
  if (!valor) return true;
  const valorLower = String(valor).toLowerCase().trim();
  return valoresProblemas.some(v => v.toLowerCase() === valorLower);
}

/**
 * Gera chave única para matching baseado em campos
 * @param {Object} registro - Registro a processar
 * @returns {string} Chave única
 */
export function gerarChave(registro) {
  const campos = [
    registro.ordemServico,
    registro.cliente1,
    registro.cliente,
    registro.dataEntrega
  ].filter(Boolean);

  return campos.join('||').toLowerCase();
}

/**
 * Compara dois registros e retorna similares
 * @param {Object} reg1 - Primeiro registro
 * @param {Object} reg2 - Segundo registro
 * @param {number} threshold - Limiar de similaridade
 * @returns {boolean} True se são similares
 */
export function compararRegistros(reg1, reg2, threshold = 0.85) {
  // Match por Ordem de Serviço (prioridade 1)
  if (reg1.ordemServico && reg2.ordemServico) {
    const similaridade = calcularSimilaridade(reg1.ordemServico, reg2.ordemServico);
    if (similaridade >= 0.95) return true;
  }

  // Match por Data + Cliente (prioridade 2)
  const data1 = normalizarData(reg1.dataEntrega);
  const data2 = normalizarData(reg2.dataEntrega);
  
  if (data1 && data2 && data1 === data2) {
    const cliente1 = normalizarTexto(reg1.cliente1 || reg1.cliente);
    const cliente2 = normalizarTexto(reg2.cliente1 || reg2.cliente);
    
    if (cliente1 && cliente2 && cliente1 === cliente2) {
      return true;
    }
  }

  // Match fuzzy (prioridade 3)
  const campos1 = [reg1.ordemServico, reg1.cliente1, reg1.cliente].filter(Boolean).join(' ');
  const campos2 = [reg2.ordemServico, reg2.cliente1, reg2.cliente].filter(Boolean).join(' ');
  
  if (campos1 && campos2) {
    const similaridade = calcularSimilaridade(campos1, campos2);
    return similaridade >= threshold;
  }

  return false;
}

export default {
  normalizarTexto,
  normalizarCliente,
  normalizarData,
  calcularSimilaridade,
  ehValorProblema,
  gerarChave,
  compararRegistros
};

