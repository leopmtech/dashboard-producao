#!/usr/bin/env node

/**
 * Script para verificar e diagnosticar problemas com variáveis de ambiente do Notion
 * 
 * Uso:
 *   node verify-env.js
 *   
 * Este script verifica:
 *   1. Se as variáveis de ambiente existem
 *   2. Se há caracteres invisíveis ou problemas de encoding
 *   3. Se o formato do token e database ID estão corretos
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

// Função para detectar caracteres invisíveis
function detectInvisibleChars(str, name) {
  const issues = [];
  
  // BOM
  if (str.charCodeAt(0) === 0xFEFF) {
    issues.push('Contém BOM (Byte Order Mark) no início');
  }
  
  // Quebras de linha
  if (str.includes('\n')) {
    issues.push(`Contém ${(str.match(/\n/g) || []).length} quebra(s) de linha`);
  }
  if (str.includes('\r')) {
    issues.push(`Contém ${(str.match(/\r/g) || []).length} carriage return(s)`);
  }
  
  // Espaços no início/fim
  if (str !== str.trim()) {
    const leadingSpaces = str.length - str.trimStart().length;
    const trailingSpaces = str.length - str.trimEnd().length;
    if (leadingSpaces > 0) issues.push(`${leadingSpaces} espaço(s) no início`);
    if (trailingSpaces > 0) issues.push(`${trailingSpaces} espaço(s) no fim`);
  }
  
  // Tabulações
  if (str.includes('\t')) {
    issues.push(`Contém ${(str.match(/\t/g) || []).length} tabulação(ões)`);
  }
  
  // Caracteres de controle
  const controlChars = str.match(/[\x00-\x1F\x7F]/g);
  if (controlChars && controlChars.length > 0) {
    issues.push(`Contém ${controlChars.length} caractere(s) de controle`);
  }
  
  // Espaços Unicode invisíveis
  const unicodeSpaces = str.match(/[\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/g);
  if (unicodeSpaces && unicodeSpaces.length > 0) {
    issues.push(`Contém ${unicodeSpaces.length} espaço(s) Unicode invisível(is)`);
  }
  
  return issues;
}

// Função para limpar string
function cleanString(str) {
  return str
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/[\r\n]+/g, '')
    .replace(/\t/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, '');
}

// Verificar arquivo .env
function checkEnvFile() {
  log.title('VERIFICANDO ARQUIVO .env');
  
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    log.error('Arquivo .env não encontrado!');
    log.info('Crie um arquivo .env com as seguintes variáveis:');
    console.log(`
NOTION_TOKEN=seu_token_aqui
NOTION_DATABASE_ID=seu_database_id_aqui
`);
    return null;
  }
  
  log.success('Arquivo .env encontrado');
  
  // Ler conteúdo do arquivo
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  const envVars = {};
  
  lines.forEach((line, index) => {
    // Ignorar comentários e linhas vazias
    if (line.trim().startsWith('#') || !line.trim()) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      envVars[key.trim()] = {
        raw: value,
        cleaned: cleanString(value),
        lineNumber: index + 1
      };
    }
  });
  
  return envVars;
}

// Verificar variáveis específicas do Notion
function checkNotionVars(envVars) {
  log.title('VERIFICANDO VARIÁVEIS DO NOTION');
  
  const requiredVars = ['NOTION_TOKEN', 'NOTION_DATABASE_ID'];
  const alternativeVars = {
    'NOTION_TOKEN': ['REACT_APP_NOTION_TOKEN', 'NOTION_API_KEY'],
    'NOTION_DATABASE_ID': ['REACT_APP_NOTION_DATABASE_ID']
  };
  
  requiredVars.forEach(varName => {
    let found = envVars && envVars[varName];
    let usedName = varName;
    
    // Verificar alternativas
    if (!found && alternativeVars[varName]) {
      for (const alt of alternativeVars[varName]) {
        if (envVars && envVars[alt]) {
          found = envVars[alt];
          usedName = alt;
          break;
        }
      }
    }
    
    if (!found) {
      log.error(`${varName} não encontrada`);
      if (alternativeVars[varName]) {
        log.info(`  Alternativas aceitas: ${alternativeVars[varName].join(', ')}`);
      }
      return;
    }
    
    log.success(`${usedName} encontrada (linha ${found.lineNumber})`);
    
    // Verificar caracteres invisíveis
    const issues = detectInvisibleChars(found.raw, usedName);
    if (issues.length > 0) {
      log.warn(`  Problemas detectados em ${usedName}:`);
      issues.forEach(issue => console.log(`    - ${issue}`));
      log.info(`  Valor original: "${found.raw.substring(0, 30)}..."`);
      log.info(`  Valor limpo: "${found.cleaned.substring(0, 30)}..."`);
    }
    
    // Verificações específicas
    if (usedName.includes('TOKEN')) {
      if (!found.cleaned.startsWith('ntn_') && !found.cleaned.startsWith('secret_')) {
        log.warn(`  Token não começa com 'ntn_' ou 'secret_' - verifique se está correto`);
      }
      log.info(`  Token length: ${found.cleaned.length}`);
      log.info(`  Token começa com: ${found.cleaned.substring(0, 10)}...`);
      log.info(`  Token termina com: ...${found.cleaned.substring(found.cleaned.length - 10)}`);
    }
    
    if (usedName.includes('DATABASE_ID')) {
      const cleanId = found.cleaned.replace(/-/g, '');
      if (cleanId.length !== 32) {
        log.warn(`  Database ID deve ter 32 caracteres hexadecimais (encontrado: ${cleanId.length})`);
      }
      if (!/^[0-9a-fA-F-]+$/.test(found.cleaned)) {
        log.warn(`  Database ID contém caracteres inválidos`);
      }
      log.info(`  Database ID: ${found.cleaned.substring(0, 8)}...${found.cleaned.substring(found.cleaned.length - 4)}`);
    }
  });
}

// Gerar arquivo .env limpo
function generateCleanEnv(envVars) {
  log.title('GERANDO .env LIMPO');
  
  if (!envVars) {
    log.error('Não foi possível gerar .env limpo (variáveis não encontradas)');
    return;
  }
  
  const cleanEnvPath = path.join(process.cwd(), '.env.clean');
  let cleanContent = '# Arquivo .env limpo gerado automaticamente\n';
  cleanContent += `# Data: ${new Date().toISOString()}\n\n`;
  
  Object.entries(envVars).forEach(([key, value]) => {
    cleanContent += `${key}=${value.cleaned}\n`;
  });
  
  fs.writeFileSync(cleanEnvPath, cleanContent, 'utf8');
  log.success(`Arquivo .env.clean gerado`);
  log.info(`Para usar: mv .env.clean .env`);
}

// Executar verificações
function main() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║${colors.reset}          VERIFICADOR DE AMBIENTE NOTION                    ${colors.cyan}║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  const envVars = checkEnvFile();
  checkNotionVars(envVars);
  
  if (envVars) {
    // Verificar se há problemas
    let hasIssues = false;
    Object.entries(envVars).forEach(([key, value]) => {
      const issues = detectInvisibleChars(value.raw, key);
      if (issues.length > 0) hasIssues = true;
    });
    
    if (hasIssues) {
      generateCleanEnv(envVars);
    } else {
      log.title('RESULTADO');
      log.success('Nenhum problema detectado nas variáveis de ambiente!');
    }
  }
  
  log.title('PRÓXIMOS PASSOS');
  log.info('1. Se houver problemas, use o arquivo .env.clean gerado');
  log.info('2. Reinicie o servidor: npm run dev');
  log.info('3. Teste a API: node test-token-direct.js');
  console.log('');
}

main();
