#!/usr/bin/env node
// Atualiza o campo "Cliente" no Notion usando dados da planilha Google Sheets retroativa
// Busca páginas SEM cliente no Notion e atualiza com dados da planilha
// Uso:
//   node src/scripts/updateNotionClients.js [--dry] [--csv=/path/csv] [--sheets]

require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Usar a versão do server (mesma estrutura que funciona em server/routes/notion.js)
const { Client } = require('../../server/node_modules/@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const GOOGLE_SHEETS_ID = process.env.REACT_APP_GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEETS_ID;
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;

if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
  console.error('❌ NOTION_TOKEN ou NOTION_DATABASE_ID ausente no .env');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { dry: false, source: 'sheets', batchSize: 50 }; // Padrão: Google Sheets, 50 por lote
  for (const a of args) {
    if (a.startsWith('--csv=')) {
      out.csv = a.substring(6);
      out.source = 'csv';
    }
    if (a === '--dry') out.dry = true;
    if (a === '--sheets') out.source = 'sheets';
    if (a.startsWith('--batch=')) {
      out.batchSize = parseInt(a.substring(8)) || 50;
    }
  }
  return out;
}

function parseCSV(content) {
  // CSV com cabeçalho: "Ordem de serviço", e "Cliente" OU "Cliente 1"/"Cliente 2"
  // Pode ter vírgulas internas entre aspas, então parse melhorado
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return new Map();
  
  // Detectar cabeçalho
  const header = lines[0].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
  const idxOS = header.findIndex(h => 
    h.toLowerCase().includes('ordem') && h.toLowerCase().includes('serviço') ||
    h.toLowerCase().includes('ordem') && h.toLowerCase().includes('servico')
  );
  const idxCliente = header.findIndex(h => h.toLowerCase() === 'cliente');
  const idxCliente1 = header.findIndex(h => h.toLowerCase() === 'cliente 1' || h.toLowerCase() === 'cliente1');
  const idxCliente2 = header.findIndex(h => h.toLowerCase() === 'cliente 2' || h.toLowerCase() === 'cliente2');
  
  if (idxOS === -1 || (idxCliente === -1 && idxCliente1 === -1 && idxCliente2 === -1)) {
    throw new Error(`Cabeçalho do CSV deve conter colunas: "Ordem de serviço" e "Cliente" (ou Cliente 1 / Cliente 2)\nEncontrado: ${header.join(', ')}`);
  }
  
  // Criar mapa: Ordem de serviço -> Cliente
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse simples (assumindo vírgula como separador, sem vírgulas dentro dos valores)
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    
    if (cols.length < idxOS + 1) continue;
    
    const ordemServico = cols[idxOS]?.trim();
    const c = (idxCliente !== -1 ? cols[idxCliente] : "")?.trim();
    const c1 = (idxCliente1 !== -1 ? cols[idxCliente1] : "")?.trim();
    const c2 = (idxCliente2 !== -1 ? cols[idxCliente2] : "")?.trim();
    
    if (!ordemServico) continue;
    
    const clients = normalizeClients(c1 || c, c2);
    if (clients.length === 0) continue;
    map.set(ordemServico, clients);
  }
  
  return map;
}

async function fetchFromGoogleSheets() {
  const baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const sheetName = 'in'; // Aba padrão
  const range = 'A:Z';
  
  const safeSheet = sheetName.includes(' ') || sheetName.includes("'")
    ? `'${sheetName.replace(/'/g, "''")}'`
    : sheetName;
  
  const params = new URLSearchParams({
    key: GOOGLE_API_KEY,
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  });
  
  const url = `${baseUrl}/${GOOGLE_SHEETS_ID}/values/${safeSheet}!${range}?${params.toString()}`;
  
  console.log('📊 Buscando dados do Google Sheets...');
  console.log(`  Spreadsheet ID: ${GOOGLE_SHEETS_ID}`);
  console.log(`  Aba: ${sheetName}`);
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.values) {
            reject(new Error('Resposta do Google Sheets sem valores'));
            return;
          }
          resolve(json.values);
        } catch (error) {
          reject(new Error(`Erro ao parsear resposta: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Erro HTTP: ${error.message}`));
    });
  });
}

function parseGoogleSheetsData(rawData) {
  if (!rawData || rawData.length < 2) {
    throw new Error('Planilha sem dados suficientes');
  }
  
  const headers = rawData[0].map((h) => (h || '').toString().trim());
  
  // Encontrar índices das colunas
  const idxOS = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower.includes('ordem') && (hLower.includes('serviço') || hLower.includes('servico'));
  });
  const idxCliente = headers.findIndex(h => h.toLowerCase() === 'cliente');
  const idxCliente1 = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower === 'cliente 1' || hLower === 'cliente1';
  });
  const idxCliente2 = headers.findIndex(h => {
    const hLower = h.toLowerCase();
    return hLower === 'cliente 2' || hLower === 'cliente2';
  });
  
  if (idxOS === -1 || (idxCliente === -1 && idxCliente1 === -1 && idxCliente2 === -1)) {
    throw new Error(`Colunas não encontradas. Encontradas: ${headers.join(', ')}\nEsperado: "Ordem de serviço" e "Cliente" (ou Cliente 1 / Cliente 2)`);
  }
  
  const map = new Map();
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length < idxOS + 1) continue;
    
    const ordemServico = (row[idxOS] || '').toString().trim();
    const cliente = (idxCliente !== -1 ? row[idxCliente] : '').toString().trim();
    const cliente1 = (idxCliente1 !== -1 ? row[idxCliente1] : '').toString().trim();
    const cliente2 = (idxCliente2 !== -1 ? row[idxCliente2] : '').toString().trim();
    
    if (!ordemServico) continue;
    const clients = normalizeClients(cliente1 || cliente, cliente2);
    if (clients.length === 0) continue;
    map.set(ordemServico, clients);
  }
  
  return map;
}

async function fetchAllPages(databaseId) {
  const pages = [];
  let cursor = undefined;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`📄 Carregando página ${pageCount}...`);
    
    // Usar a API correta do Notion client
    const res = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: cursor,
    });
    
    if (!res || !res.results) {
      console.warn(`⚠️ Resposta inválida do Notion na página ${pageCount}`);
      break;
    }
    
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
    
    // Pequeno delay entre requisições
    if (cursor) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } while (cursor);
  
  return pages;
}

function getText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return (prop.title || []).map(t => t.plain_text).join('').trim();
  if (prop.type === 'rich_text') return (prop.rich_text || []).map(t => t.plain_text).join('').trim();
  if (Array.isArray(prop)) return prop.map(x => x?.plain_text || '').join('').trim();
  return '';
}

function getSelect(prop) {
  if (!prop) return '';
  if (prop.type === 'select') return prop.select?.name || '';
  if (prop.type === 'multi_select') return (prop.multi_select || []).map(x => x.name).join(', ');
  return '';
}

function isClienteVazio(cliente) {
  if (!cliente) return true;
  const str = String(cliente).trim().toLowerCase();
  return !str || 
         str === 'null' || 
         str === 'undefined' || 
         str === 'n/a' || 
         str === '-' || 
         str === '' ||
         str.includes('não informado') ||
         str.includes('nao informado');
}

function normalizeClients(primary, secondary = '') {
  const out = new Set();
  const seps = [',', '/', '|', ';', '+', '&', ' e ', ' E '];
  function addPieces(s) {
    if (!s || typeof s !== 'string') return;
    let pieces = [s];
    for (const sep of seps) {
      if (s.includes(sep)) { pieces = s.split(sep); break; }
    }
    pieces.map(v => v.trim()).filter(Boolean).forEach(v => {
      if (v && v.toLowerCase() !== 'cliente não informado' && v !== '-') out.add(v);
    });
  }
  addPieces(primary);
  addPieces(secondary);
  return Array.from(out);
}

async function updateCliente(pageId, newValue) {
  // O campo "Cliente" no Notion é multi_select
  // Se o valor contém vírgula, pode ser múltiplos clientes
  const clientes = Array.isArray(newValue) ? newValue : newValue.split(',').map(c => c.trim()).filter(Boolean);
  
  // Tentativa 1: atualizar como multi_select
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: {
        'Cliente': { 
          multi_select: clientes.map(cliente => ({ name: cliente }))
        }
      }
    });
    return 'multi_select';
  } catch (errMulti) {
    // Tentativa 2: atualizar como select (fallback)
    try {
      await notion.pages.update({
        page_id: pageId,
        properties: {
          'Cliente': { 
            select: { name: clientes[0] } // Primeiro cliente se multi_select não funcionar
          }
        }
      });
      return 'select';
    } catch (errSelect) {
      // Tentativa 3: atualizar como rich_text (último recurso)
      try {
        await notion.pages.update({
          page_id: pageId,
          properties: {
            'Cliente': { 
              rich_text: [{ 
                type: 'text', 
                text: { content: newValue } 
              }] 
            }
          }
        });
        return 'rich_text';
      } catch (errText) {
        throw new Error(`Erro ao atualizar: multi_select=${errMulti.message}, select=${errSelect.message}, rich_text=${errText.message}`);
      }
    }
  }
}

(async () => {
  const { csv, dry, source } = parseArgs();
  let dataMap = new Map();
  
  // Buscar dados do CSV ou Google Sheets
  if (source === 'csv') {
    if (!csv) {
      console.error('❌ Uso com CSV: node src/scripts/updateNotionClients.js --csv=/abs/path/retroativo.csv [--dry]');
      process.exit(1);
    }
    
    const csvPath = path.isAbsolute(csv) ? csv : path.join(process.cwd(), csv);
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ CSV não encontrado: ${csvPath}`);
      process.exit(1);
    }
    
    console.log('📄 Lendo CSV retroativo...');
    const content = fs.readFileSync(csvPath, 'utf8');
    dataMap = parseCSV(content);
  } else {
    // Buscar do Google Sheets
    try {
      const rawData = await fetchFromGoogleSheets();
      dataMap = parseGoogleSheetsData(rawData);
      console.log(`✅ Planilha Google Sheets carregada: ${rawData.length} linhas`);
    } catch (error) {
      console.error(`❌ Erro ao buscar do Google Sheets: ${error.message}`);
      console.error('💡 Certifique-se de que GOOGLE_SHEETS_ID e GOOGLE_API_KEY estão configurados');
      process.exit(1);
    }
  }
  
  if (dataMap.size === 0) {
    console.error('❌ Nenhum dado válido encontrado');
    process.exit(1);
  }
  
  console.log(`✅ Dados carregados: ${dataMap.size} ordens de serviço com cliente`);
  console.log(`📋 Exemplo: ${Array.from(dataMap.entries()).slice(0, 3).map(([os, cl]) => `${os}→${cl}`).join(', ')}`);
  
  console.log('\n🔎 Carregando páginas do Notion...');
  const pages = await fetchAllPages(NOTION_DATABASE_ID);
  console.log(`✅ ${pages.length} páginas carregadas do Notion`);

  // Processar páginas SEM cliente preenchido
  const pagesSemCliente = [];
  let jaPreenchidas = 0;
  let semOrdemServico = 0;
  let exemploClienteVazio = null;
  let exemploClientePreenchido = null;
  
  // Debug: ver primeiras páginas para entender estrutura
  if (pages.length > 0) {
    const primeiraPage = pages[0];
    const props = primeiraPage.properties || {};
    console.log('\n🔍 Debug - Nomes das propriedades na primeira página:');
    console.log('  Propriedades disponíveis:', Object.keys(props).slice(0, 10).join(', '), '...');
    if (props['Ordem de serviço']) {
      console.log('  ✅ Campo "Ordem de serviço" encontrado');
      console.log('  Tipo:', props['Ordem de serviço'].type);
    } else {
      console.log('  ⚠️  Campo "Ordem de serviço" NÃO encontrado');
      // Tentar variações
      const varNames = ['Ordem de serviço', 'Ordem de Serviço', 'ordemServico', 'OrdemServico', 'Ordem'];
      for (const name of varNames) {
        if (props[name]) {
          console.log(`  ✅ Campo "${name}" encontrado!`);
          break;
        }
      }
    }
  }
  
  for (const page of pages) {
    const props = page.properties || {};
    // Tentar múltiplos nomes possíveis (corrigido para "Ordem de Serviço" com S maiúsculo)
    let ordemServico = getText(props['Ordem de Serviço']) ||
                       getText(props['Ordem de serviço']) || 
                       getText(props['ordemServico']) ||
                       getText(props['OrdemServico']) ||
                       getText(props['Ordem']);
    
    if (!ordemServico) {
      semOrdemServico++;
      continue; // Pula se não tem ordem de serviço
    }
    
    const clienteAtual = getSelect(props['Cliente']) || getText(props['Cliente']);
    const isVazio = isClienteVazio(clienteAtual);
    
    if (isVazio) {
      // Cliente vazio ou "Não Informado" - precisa atualizar
      if (!exemploClienteVazio) {
        exemploClienteVazio = { ordemServico, clienteAtual: clienteAtual || '(vazio)', pageId: page.id };
      }
      pagesSemCliente.push({
        pageId: page.id,
        ordemServico,
        clienteAtual: clienteAtual || '(vazio)'
      });
    } else {
      if (!exemploClientePreenchido) {
        exemploClientePreenchido = { ordemServico, clienteAtual };
      }
      jaPreenchidas++;
    }
  }
  
  // Debug
  if (pagesSemCliente.length === 0 && exemploClienteVazio) {
    console.log('ℹ️  Debug: Encontrado exemplo de cliente vazio:', exemploClienteVazio);
  }
  if (exemploClientePreenchido) {
    console.log('ℹ️  Debug: Exemplo de cliente preenchido:', exemploClientePreenchido);
  }
  
  console.log(`\n📊 Análise:`);
  console.log(`  ✅ Páginas com cliente preenchido: ${jaPreenchidas}`);
  console.log(`  ⚠️  Páginas SEM cliente: ${pagesSemCliente.length}`);
  console.log(`  📋 Páginas sem "Ordem de serviço": ${semOrdemServico}`);
  
  if (pagesSemCliente.length === 0) {
    console.log('\n✅ Não há páginas sem cliente para atualizar!');
    process.exit(0);
  }
  
  // Para cada página sem cliente, buscar no CSV
  let atualizados = 0;
  let naoEncontrados = 0;
  let erros = 0;
  const batchSize = parseArgs().batchSize;
  
  // Filtrar apenas páginas que podem ser atualizadas (encontradas na fonte de dados)
  const pagesParaAtualizar = [];
  for (const page of pagesSemCliente) {
    const { ordemServico } = page;
    const clientesDaFonte = dataMap.get(ordemServico);
    if (clientesDaFonte && clientesDaFonte.length > 0) {
      pagesParaAtualizar.push({ ...page, clientesDaFonte });
    } else {
      naoEncontrados++;
      if (naoEncontrados <= 5) {
        console.warn(`  ⚠️  Ordem de serviço não encontrada na fonte de dados: "${ordemServico}"`);
      }
    }
  }
  
  console.log(`\n${dry ? '🔍 [DRY-RUN]' : '✏️  [ATUALIZAÇÃO]'} Processando ${pagesParaAtualizar.length} páginas em lotes de ${batchSize}...`);
  
  if (!dry && pagesParaAtualizar.length > 0) {
    console.log(`\n⚠️  ATENÇÃO: ${pagesParaAtualizar.length} páginas serão atualizadas no Notion!`);
    console.log('   Pressione Ctrl+C em até 5 segundos para cancelar...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Processar em lotes
  const totalBatches = Math.ceil(pagesParaAtualizar.length / batchSize);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, pagesParaAtualizar.length);
    const batch = pagesParaAtualizar.slice(batchStart, batchEnd);
    
    console.log(`\n📦 Lote ${batchIndex + 1}/${totalBatches} (páginas ${batchStart + 1}-${batchEnd} de ${pagesParaAtualizar.length})...`);
    
    for (let i = 0; i < batch.length; i++) {
      const { pageId, ordemServico, clienteAtual, clientesDaFonte } = batch[i];
      const globalIndex = batchStart + i + 1;
      
      console.log(`  ${globalIndex}/${pagesParaAtualizar.length} ${dry ? '[DRY]' : '✓'} "${ordemServico}" → [${clientesDaFonte.join(', ')}] (antes: ${clienteAtual})`);
      
      if (!dry) {
        try {
          await updateCliente(pageId, clientesDaFonte);
          atualizados++;
          
          // Delay entre atualizações para não sobrecarregar a API
          if (i < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          erros++;
          console.error(`  ❌ Erro ao atualizar "${ordemServico}": ${error.message}`);
          
          // Se houver muitos erros, pausar
          if (erros > 10 && erros % 10 === 0) {
            console.warn(`\n⚠️  ${erros} erros acumulados. Pausando por 2 segundos...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        atualizados++;
      }
    }
    
    // Pausa entre lotes (exceto no último)
    if (batchIndex < totalBatches - 1 && !dry) {
      console.log(`\n⏸️  Pausa de 1 segundo entre lotes...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTADO FINAL:');
  console.log(`  ✅ Atualizados: ${atualizados}`);
  console.log(`  ⏭️  Ignorados (já preenchidos no Notion): ${jaPreenchidas}`);
  console.log(`  ❓ Não encontrados na fonte de dados: ${naoEncontrados}`);
  if (erros > 0) {
    console.log(`  ❌ Erros: ${erros}`);
  }
  console.log('='.repeat(50));
  
  if (dry) {
    console.log('\nℹ️  Modo DRY-RUN: nenhuma página foi alterada no Notion.');
    console.log('💡 Execute sem --dry para aplicar as atualizações.');
  } else {
    console.log('\n✔️  Concluído! Páginas atualizadas no Notion.');
    console.log(`📉 Redução esperada de "Cliente Não Informado": ${atualizados} registros`);
  }
})();


