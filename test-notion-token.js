#!/usr/bin/env node

/**
 * Script para testar se o token do Notion está válido
 * 
 * Uso:
 *   node test-notion-token.js SEU_TOKEN_AQUI
 *   ou
 *   NOTION_TOKEN=seu_token node test-notion-token.js
 */

const token = process.argv[2] || process.env.NOTION_TOKEN || process.env.REACT_APP_NOTION_TOKEN;

if (!token) {
  console.error('❌ Token não fornecido!');
  console.log('\n📝 Como usar:');
  console.log('   node test-notion-token.js SEU_TOKEN_AQUI');
  console.log('   ou');
  console.log('   NOTION_TOKEN=seu_token node test-notion-token.js');
  process.exit(1);
}

console.log('🔍 Testando token do Notion...');
console.log('📋 Token (primeiros 10 caracteres):', token.substring(0, 10) + '...');
console.log('');

// Teste 1: Verificar se o token tem formato válido
console.log('✅ Teste 1: Formato do token');
if (token.length < 20) {
  console.error('   ❌ Token muito curto (mínimo 20 caracteres)');
  process.exit(1);
}
console.log('   ✅ Formato parece válido');

// Teste 2: Verificar acesso à API do Notion
async function testToken() {
  console.log('\n✅ Teste 2: Acesso à API do Notion');
  
  try {
    // Teste básico: buscar informações do usuário/bot
    const response = await fetch('https://api.notion.com/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    console.log('   📊 Status HTTP:', status);
    
    if (status === 401) {
      console.error('   ❌ Token INVÁLIDO ou EXPIRADO');
      console.error('   💡 Solução: Gere um novo token em https://www.notion.so/my-integrations');
      process.exit(1);
    }
    
    if (status === 200) {
      const data = await response.json();
      console.log('   ✅ Token VÁLIDO!');
      console.log('   📋 Informações da integração:');
      console.log('      - Tipo:', data.type || 'N/A');
      console.log('      - Nome:', data.name || 'N/A');
      console.log('      - ID:', data.id || 'N/A');
      
      // Teste 3: Verificar se consegue listar databases
      console.log('\n✅ Teste 3: Listar databases acessíveis');
      try {
        const dbResponse = await fetch('https://api.notion.com/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter: {
              property: 'object',
              value: 'database'
            },
            page_size: 5
          })
        });

        if (dbResponse.ok) {
          const dbData = await dbResponse.json();
          console.log('   ✅ Consegue acessar databases');
          console.log('   📊 Databases encontrados:', dbData.results?.length || 0);
          
          if (dbData.results && dbData.results.length > 0) {
            console.log('   📋 Primeiros databases:');
            dbData.results.slice(0, 3).forEach((db, i) => {
              const title = db.title?.[0]?.plain_text || 'Sem título';
              console.log(`      ${i + 1}. ${title} (${db.id.substring(0, 8)}...)`);
            });
          } else {
            console.log('   ⚠️  Nenhum database encontrado');
            console.log('   💡 Certifique-se de que a integração tem acesso aos databases');
          }
        } else {
          const errorText = await dbResponse.text();
          console.error('   ❌ Erro ao listar databases:', dbResponse.status);
          console.error('   📋 Resposta:', errorText.substring(0, 200));
        }
      } catch (dbError) {
        console.error('   ❌ Erro ao testar acesso a databases:', dbError.message);
      }
      
      console.log('\n✅ RESUMO: Token está VÁLIDO e funcionando!');
      console.log('   💡 Se ainda houver problemas no Netlify, verifique:');
      console.log('      1. Se a variável NOTION_TOKEN está configurada corretamente');
      console.log('      2. Se o Database ID está correto');
      console.log('      3. Se a integração tem acesso ao database específico');
      
    } else {
      console.error('   ❌ Erro inesperado:', status);
      const errorText = await response.text();
      console.error('   📋 Resposta:', errorText.substring(0, 500));
      process.exit(1);
    }
    
  } catch (error) {
    console.error('   ❌ Erro ao testar token:', error.message);
    console.error('   📋 Stack:', error.stack);
    process.exit(1);
  }
}

testToken().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});

