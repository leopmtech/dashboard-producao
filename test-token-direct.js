#!/usr/bin/env node

/**
 * Script para testar o token do Notion exatamente como o curl que funciona
 * 
 * Uso:
 *   node test-token-direct.js SEU_TOKEN_AQUI
 *   ou
 *   NOTION_TOKEN=seu_token node test-token-direct.js
 */

const token = process.argv[2] || process.env.NOTION_TOKEN || process.env.REACT_APP_NOTION_TOKEN;
const databaseId = process.argv[3] || process.env.NOTION_DATABASE_ID || '37f13b4723764d5db4ec94b259430b7c';

if (!token) {
  console.error('❌ Token não fornecido!');
  console.log('\n📝 Como usar:');
  console.log('   node test-token-direct.js SEU_TOKEN_AQUI [DATABASE_ID]');
  console.log('   ou');
  console.log('   NOTION_TOKEN=seu_token node test-token-direct.js');
  process.exit(1);
}

// Limpar o token (remover espaços e quebras de linha)
const cleanToken = String(token).trim();

console.log('🔍 Testando token do Notion (igual ao curl)...\n');
console.log('📋 Token (primeiros 20 chars):', cleanToken.substring(0, 20));
console.log('📋 Token (últimos 10 chars):', '...' + cleanToken.substring(cleanToken.length - 10));
console.log('📋 Token length:', cleanToken.length);
console.log('📋 Database ID:', databaseId);
console.log('');

// Verificar se há espaços ou quebras de linha
if (token !== cleanToken) {
  console.warn('⚠️  Token tinha espaços/quebras de linha - foi limpo');
  console.warn('   Original length:', token.length);
  console.warn('   Cleaned length:', cleanToken.length);
  console.log('');
}

async function testToken() {
  try {
    const url = `https://api.notion.com/v1/databases/${databaseId}`;
    console.log('🔍 Fazendo requisição para:', url);
    console.log('🔍 Headers:');
    console.log('   Authorization: Bearer', cleanToken.substring(0, 20) + '...');
    console.log('   Notion-Version: 2025-09-03');
    console.log('');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status HTTP:', response.status);
    console.log('📊 Status Text:', response.statusText);
    console.log('');

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ SUCESSO! Token está funcionando corretamente!\n');
      console.log('📋 Informações do Database:');
      console.log('   - ID:', data.id);
      console.log('   - Título:', data.title?.[0]?.plain_text || 'Sem título');
      console.log('   - URL:', data.url || 'N/A');
      console.log('');
      console.log('✅ O token está válido e tem acesso ao database!');
      console.log('');
      console.log('💡 Se ainda houver erro 400 no código, verifique:');
      console.log('   1. Se o token no .env ou Netlify está sem espaços/quebras de linha');
      console.log('   2. Se a variável NOTION_TOKEN está configurada corretamente');
      console.log('   3. Se há algum caractere especial ou encoding incorreto');
    } else {
      const errorText = await response.text();
      console.error('❌ ERRO! Token não está funcionando\n');
      console.error('📋 Resposta:', errorText.substring(0, 500));
      console.log('');
      
      if (response.status === 401) {
        console.error('❌ Token inválido ou expirado');
        console.error('💡 Gere um novo token em https://www.notion.so/my-integrations');
      } else if (response.status === 404) {
        console.error('❌ Database não encontrado');
        console.error('💡 Verifique se o Database ID está correto');
      } else if (response.status === 400) {
        console.error('❌ Requisição inválida (400)');
        console.error('💡 Pode ser problema com o formato do token ou Database ID');
        console.error('💡 Verifique se o token não tem espaços ou caracteres especiais');
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao testar token:', error.message);
    console.error('📋 Stack:', error.stack);
    process.exit(1);
  }
}

testToken().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
