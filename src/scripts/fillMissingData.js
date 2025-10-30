import { config } from '../config/analysisConfig.js';

class DataFiller {
  constructor(options = {}) {
    this.dryRun = options.dryRun !== false;
    this.batchSize = options.batchSize || 30;
    this.debug = options.debug || false;
    this.sheetTitleField = options.sheetTitleField || 'Ordem de Serviço'; // Campo do Sheets para título
    this.stats = {
      notionRecords: 0,
      sheetsRecords: 0,
      matches: 0,
      filled: 0,
      errors: 0
    };
  }

  // 🔧 Normalizar strings para comparação
  normalizeString(str) {
    if (!str) return '';
    return str.toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
  }

  // 🔍 Validar dados antes do matching
  validarDados(data, source) {
    console.log(`\n🔍 [VALIDATE] Validando dados de ${source}:`);
    console.log(`📊 Total de registros: ${data.length}`);
    
    if (data.length === 0) {
      console.log(`❌ [VALIDATE] Nenhum dado encontrado em ${source}`);
      return false;
    }
    
    const firstItem = data[0];
    console.log(`📋 [VALIDATE] Campos disponíveis: ${Object.keys(firstItem).join(', ')}`);
    console.log(`📝 [VALIDATE] Amostra do primeiro item:`, JSON.stringify(firstItem, null, 2).slice(0, 500));
    
    return true;
  }

  // 📊 Carregar dados do Notion
  async carregarDadosNotion() {
    console.log('📊 [NOTION] Carregando dados...');
    
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const body = {
        page_size: 100,
        ...(startCursor && { start_cursor: startCursor })
      };

      const response = await fetch(config.notion.endpoint, {
        method: 'POST',
        headers: config.notion.headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      allResults = allResults.concat(data.results);
      
      hasMore = data.has_more;
      startCursor = data.next_cursor;

      console.log(`📥 [NOTION] ${allResults.length} registros carregados...`);
    }

    this.stats.notionRecords = allResults.length;
    console.log(`✅ [NOTION] Total: ${allResults.length} registros`);
    return allResults;
  }

  // 📋 Carregar dados da planilha
  async carregarDadosPlanilha() {
    console.log('📋 [SHEETS] Carregando dados...');
    
    const response = await fetch(config.sheets.endpoint);
    const data = await response.json();
    
    if (!data.values) {
      throw new Error('Nenhum dado encontrado na planilha');
    }

    const headers = data.values[0];
    const rows = data.values.slice(1);
    
    const dadosFormatados = rows.map(row => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    });

    this.stats.sheetsRecords = dadosFormatados.length;
    console.log(`✅ [SHEETS] Total: ${dadosFormatados.length} registros`);
    return dadosFormatados;
  }

  // 🔍 Extrair texto de propriedades do Notion
  extrairTexto(property) {
    if (!property) return '';
    
    if (property.title && property.title[0]) {
      return property.title[0].text.content;
    }
    if (property.rich_text && property.rich_text[0]) {
      return property.rich_text[0].text.content;
    }
    if (property.multi_select) {
      return property.multi_select.map(item => item.name).join(', ');
    }
    if (property.select) {
      return property.select.name;
    }
    if (property.date) {
      return property.date.start;
    }
    return '';
  }

  // 🔗 Fazer match entre Notion e Planilha por título/ordem de serviço
  encontrarMatches(notionRecords, sheetsRecords) {
    console.log('\n🔗 [MATCH] Procurando correspondências...');
    console.log(`📊 Notion: ${notionRecords.length} registros`);
    console.log(`📋 Sheets: ${sheetsRecords.length} registros`);
    console.log(`🎯 Estratégia: Matching por título (Notion.titulo ↔ Sheets.${this.sheetTitleField})`);
    
    // Debug: amostra de dados
    if (this.debug) {
      console.log('\n📝 [DEBUG] Amostra Sheets (primeiro 3):');
      sheetsRecords.slice(0, 3).forEach((sheet, idx) => {
        const data = this.extrairDadosPlanilha(sheet);
        const titulo = sheet[this.sheetTitleField] || '';
        console.log(`  ${idx + 1}. ${this.sheetTitleField}: "${titulo}" | Cliente: "${data.cliente}"`);
      });
      
      console.log('\n📝 [DEBUG] Amostra Notion (primeiro 3):');
      notionRecords.slice(0, 3).forEach((record, idx) => {
        const data = this.extrairDadosNotion(record);
        console.log(`  ${idx + 1}. Título: "${data.titulo}" | Cliente: "${data.cliente}"`);
      });
    }
    
    const matches = [];
    let matchCount = 0;
    
    notionRecords.forEach((notionRecord, index) => {
      const notionData = this.extrairDadosNotion(notionRecord);
      const notionTitle = this.normalizeString(notionData.titulo);
      
      // Procurar por título/ordem de serviço
      const sheetsMatch = sheetsRecords.find(sheetsRecord => {
        const sheetTitle = this.normalizeString(sheetsRecord[this.sheetTitleField] || '');
        
        // Match exato ou parcial do título
        if (notionTitle && sheetTitle) {
          return notionTitle === sheetTitle || 
                 notionTitle.includes(sheetTitle) || 
                 sheetTitle.includes(notionTitle);
        }
        
        return false;
      });

      if (sheetsMatch) {
        matchCount++;
        const sheetsData = this.extrairDadosPlanilha(sheetsMatch);
        
        if (matchCount <= 5) {
          console.log(`\n✅ [MATCH ${matchCount}] Encontrado:`);
          console.log(`   Notion: "${notionData.titulo}"`);
          console.log(`   Sheets: "${sheetsMatch[this.sheetTitleField]}"`);
        }
        
        matches.push({
          notion: notionRecord,
          notionData,
          sheets: sheetsMatch,
          sheetsData
        });
      } else if (index < 5 && this.debug) {
        console.log(`\n❌ [NO MATCH ${index + 1}] Notion: "${notionData.titulo}" (sem correspondência)`);
      }
    });

    this.stats.matches = matches.length;
    console.log(`\n✅ [MATCH] ${matches.length} correspondências encontradas de ${notionRecords.length} possíveis`);
    return matches;
  }

  // 📝 Extrair dados do registro do Notion
  extrairDadosNotion(record) {
    return {
      id: record.id,
      titulo: this.extrairTexto(record.properties["Ordem de Serviço"]),
      cliente: this.extrairTexto(record.properties["Cliente"]),
      data: this.extrairTexto(record.properties["Data de entrega"]),
      tipo: this.extrairTexto(record.properties["Tipo de demanda"]),
      complexidade: this.extrairTexto(record.properties["Complexidade"]),
      quemExecuta: this.extrairTexto(record.properties["Quem executa"]) 
    };
  }

  // 📊 Extrair dados da planilha
  extrairDadosPlanilha(record) {
    return {
      cliente: record["Cliente"] || record["cliente"] || '',
      data: record["Data de entrega"] || record["data"] || '',
      tipo: record["Tipo de demanda"] || record["tipo"] || '',
      complexidade: record["Complexidade"] || record["complexidade"] || '',
      quemExecuta: record["Quem executa"] || record["executor"] || ''
    };
  }

  // 🔍 Verificar se clientes fazem match
  clientesMatch(notionCliente, sheetsCliente) {
    if (!notionCliente || !sheetsCliente) return false;
    
    const n1 = this.normalizeString(notionCliente);
    const s1 = this.normalizeString(sheetsCliente);
    
    // Match exato
    if (n1 === s1) return true;
    
    // Match por inclusão (uma string contém a outra)
    if (n1 && s1 && (n1.includes(s1) || s1.includes(n1))) return true;
    
    // Match por palavras-chave
    const keywords = ['inpacto', 'in.pacto', 'governo', 'goias', 'midr', 'mda'];
    return keywords.some(keyword => n1.includes(keyword) && s1.includes(keyword));
  }

  // 🔧 Atualizar registro no Notion
  async atualizarNotion(match) {
    const { notion, notionData, sheetsData } = match;
    
    console.log(`\n🔍 [AUDIT] Analisando: "${notionData.titulo}"`);
    
    const updateData = { properties: {} };
    let hasUpdates = false;

    // Verificar e preencher campos vazios
    const campos = [
      { notion: "Tipo de demanda", sheets: "tipo", notionField: "tipo", type: "select" },
      { notion: "Complexidade", sheets: "complexidade", notionField: "complexidade", type: "select" },
      { notion: "Quem executa", sheets: "quemExecuta", notionField: "quemExecuta", type: "rich_text" }
    ];

    console.log(`  📋 Status dos campos:`);
    campos.forEach(campo => {
      const valorAtual = notionData[campo.notionField];
      const valorPlanilha = sheetsData[campo.sheets];
      
      // Log ANTES de decidir atualizar
      const status = !valorAtual ? 'VAZIO' : 'PREENCHIDO';
      const icon = !valorAtual && valorPlanilha ? '✅ PREENCHER' : valorAtual ? '🔒 PROTEGIDO' : '➖ SEM DADOS';
      
      console.log(`    ${icon} ${campo.notion}:`);
      console.log(`       📋 NOTION: "${valorAtual || 'VAZIO'}"`);
      console.log(`       💾 SHEETS: "${valorPlanilha || 'VAZIO'}"`);
      
      // Se campo está vazio no Notion e tem valor na planilha
      if (!valorAtual && valorPlanilha) {
        hasUpdates = true;
        
        // Preparar dados de atualização conforme o tipo
        if (campo.type === 'rich_text') {
          updateData.properties[campo.notion] = {
            rich_text: [{ text: { content: valorPlanilha } }]
          };
        } else if (campo.type === 'select') {
          updateData.properties[campo.notion] = {
            select: { name: valorPlanilha }
          };
        }
      }
    });

    if (!hasUpdates) {
      return { success: true, updated: false };
    }

    if (this.dryRun) {
      console.log(`🧪 [DRY-RUN] ${notionData.titulo}:`);
      console.log(`   Preencheria: ${Object.keys(updateData.properties).join(', ')}`);
      return { success: true, updated: true, simulated: true };
    }

    try {
      const response = await fetch(`https://api.notion.com/v1/pages/${notion.id}`, {
        method: 'PATCH',
        headers: config.notion.headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`✅ [UPDATE] ${notionData.titulo}`);
      return { success: true, updated: true };

    } catch (error) {
      console.error(`❌ [ERROR] ${notionData.titulo}: ${error.message}`);
      return { success: false, error };
    }
  }

  // 🚀 Executar preenchimento
  async executarPreenchimento() {
    console.log('�� [START] Iniciando preenchimento automático...');
    console.log(`🧪 [MODE] Modo: ${this.dryRun ? 'TESTE' : 'EXECUÇÃO REAL'}\n`);

    try {
      // 1. Carregar dados
      const [notionRecords, sheetsRecords] = await Promise.all([
        this.carregarDadosNotion(),
        this.carregarDadosPlanilha()
      ]);

      // 2. Encontrar matches
      const matches = this.encontrarMatches(notionRecords, sheetsRecords);

      if (matches.length === 0) {
        console.log('❌ Nenhuma correspondência encontrada!');
        return { success: false };
      }

      // 3. Processar atualizações
      console.log(`\n🔧 [UPDATE] Processando ${matches.length} registros...\n`);
      
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        
        if (i > 0 && i % this.batchSize === 0) {
          console.log(`⏳ [BATCH] Aguardando 2 segundos...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const resultado = await this.atualizarNotion(match);
        
        if (resultado.success && resultado.updated) {
          this.stats.filled++;
        } else if (!resultado.success) {
          this.stats.errors++;
        }

        if ((i + 1) % 10 === 0) {
          console.log(`📊 [PROGRESS] ${i + 1}/${matches.length} processados`);
        }
      }

      this.gerarRelatorioFinal();
      return { success: true };

    } catch (error) {
      console.error('❌ [FATAL] Erro no preenchimento:', error);
      return { success: false, error };
    }
  }

  // 📊 Relatório final
  gerarRelatorioFinal() {
    console.log('\n📊 === RELATÓRIO FINAL ===');
    console.log(`📥 Registros Notion: ${this.stats.notionRecords}`);
    console.log(`📋 Registros Planilha: ${this.stats.sheetsRecords}`);
    console.log(`🔗 Correspondências: ${this.stats.matches}`);
    console.log(`✅ Preenchidos: ${this.stats.filled}`);
    console.log(`❌ Erros: ${this.stats.errors}`);
    console.log(`📈 Taxa de sucesso: ${this.stats.matches > 0 ? ((this.stats.filled / this.stats.matches) * 100).toFixed(1) : 0}%`);
    
    if (this.dryRun) {
      console.log('\n🧪 MODO TESTE - Use --execute para aplicar');
    } else {
      console.log('\n✅ PREENCHIMENTO CONCLUÍDO!');
    }
    console.log('═══════════════════════════════════');
  }
}

export { DataFiller };


