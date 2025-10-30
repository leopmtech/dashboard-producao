/**
 * @fileoverview Script de debug para descobrir a estrutura real do Notion
 * USO: node src/scripts/debugNotionStructure.js
 */

import { analysisConfig } from '../config/analysisConfig.js';

// Ajuste local de config
const config = {
  notion: {
    endpoint: analysisConfig.credentials?.notion?.endpointQuery,
    headers: {
      'Authorization': `Bearer ${analysisConfig.credentials?.notion?.token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  }
};

async function debugNotionStructure() {
  console.log('🔍 === DEBUG ESTRUTURA NOTION ===\n');
  
  try {
    // Carregar apenas os primeiros 3 registros
    const response = await fetch(config.notion.endpoint, {
      method: 'POST',
      headers: config.notion.headers,
      body: JSON.stringify({
        page_size: 3
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log(`📊 Total de registros retornados: ${data.results?.length || 0}\n`);
    
    // Analisar cada registro
    if (Array.isArray(data.results)) {
      data.results.forEach((page, index) => {
        console.log(`📄 === REGISTRO ${index + 1} ===`);
        console.log(`ID: ${page.id}`);
        console.log(`Object: ${page.object}`);
        console.log(`Created: ${page.created_time}`);
        console.log(`URL: ${page.url}`);
        
        console.log('\n🔑 PROPRIEDADES DISPONÍVEIS:');
        
        // Listar todas as propriedades
        const props = page?.properties || {};
        Object.keys(props).forEach(key => {
          const prop = props[key];
          console.log(`   "${key}": tipo = ${prop?.type || 'undefined'}`);
          
          // Mostrar valor baseado no tipo
          let valor = '';
          switch(prop?.type) {
            case 'title':
              valor = prop.title?.[0]?.text?.content || prop.title?.[0]?.plain_text || '[vazio]';
              break;
            case 'rich_text':
              valor = prop.rich_text?.[0]?.text?.content || prop.rich_text?.[0]?.plain_text || '[vazio]';
              break;
            case 'select':
              valor = prop.select?.name || '[vazio]';
              break;
            case 'multi_select':
              valor = prop.multi_select?.map(s => s.name).join(', ') || '[vazio]';
              break;
            case 'people':
              valor = prop.people?.map(p => p.name || p.id).join(', ') || '[vazio]';
              break;
            case 'date':
              valor = prop.date?.start || '[vazio]';
              break;
            case 'checkbox':
              valor = prop.checkbox;
              break;
            case 'number':
              valor = prop.number || '[vazio]';
              break;
            case 'url':
              valor = prop.url || '[vazio]';
              break;
            case 'email':
              valor = prop.email || '[vazio]';
              break;
            case 'phone_number':
              valor = prop.phone_number || '[vazio]';
              break;
            default:
              valor = prop?.type ? '[tipo não suportado]' : '[sem tipo]';
          }
          
          console.log(`      valor: "${valor}"`);
        });
        
        console.log('\n' + '─'.repeat(50) + '\n');
      });
      
      // Resumo das propriedades mais comuns
      console.log('📋 RESUMO DE CAMPOS ENCONTRADOS:');
      const allProperties = new Set();
      data.results.forEach(page => {
        Object.keys(page?.properties || {}).forEach(key => {
          allProperties.add(key);
        });
      });
      
      console.log('Campos disponíveis:', Array.from(allProperties).sort());
      
      // Verificar campos que esperávamos
      const expectedFields = ['Título', 'Cliente', 'Cliente1', 'Cliente2', 'Tipo de demanda', 'Data de entrega'];
      console.log('\n🎯 VERIFICAÇÃO DE CAMPOS ESPERADOS:');
      expectedFields.forEach(field => {
        const exists = allProperties.has(field);
        console.log(`   "${field}": ${exists ? '✅ EXISTE' : '❌ NÃO ENCONTRADO'}`);
      });
    } else {
      console.log('⚠️ Nenhum resultado retornado');
    }
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message);
    console.error(error.stack);
  }
}

debugNotionStructure().catch(err => {
  console.error('💥 Erro fatal:', err);
  process.exit(1);
});

