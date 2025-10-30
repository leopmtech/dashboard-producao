import { config } from '../config/analysisConfig.js';

class ClientSeparatorFixed {
  constructor(options = {}) {
    this.dryRun = options.dryRun !== false;
    this.batchSize = options.batchSize || 50;
    this.stats = {
      total: 0,
      comMultiplosClientes: 0,
      semCliente: 0,
      jaTemCliente1: 0,
      precisamAtualizacao: 0,
      processados: 0
    };
  }

  // 📊 Carregar dados do Notion
  async carregarDadosNotion() {
    console.log('📊 [LOAD] Carregando dados do Notion...');
    
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      try {
        const body = {
          page_size: 100,
          ...(startCursor && { start_cursor: startCursor })
        };

        const response = await fetch(config.notion.endpoint, {
          method: 'POST',
          headers: config.notion.headers,
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        allResults = allResults.concat(data.results);
        
        hasMore = data.has_more;
        startCursor = data.next_cursor;

        console.log(`📥 [LOAD] Carregados ${allResults.length} registros...`);
      } catch (error) {
        console.error('❌ [ERROR] Erro ao carregar dados:', error);
        throw error;
      }
    }

    console.log(`✅ [LOAD] Total de ${allResults.length} registros carregados`);
    return allResults;
  }

  // 🔍 Extrair valores do multi_select
  extrairMultiSelect(property) {
    if (!property || !property.multi_select) return [];
    return property.multi_select.map(item => item.name);
  }

  // �� Extrair texto de rich_text
  extrairRichText(property) {
    if (!property || !property.rich_text || !property.rich_text[0]) return '';
    return property.rich_text[0].text.content;
  }

  // 📝 Extrair título
  extrairTitulo(property) {
    if (!property || !property.title || !property.title[0]) return '';
    return property.title[0].text.content;
  }

  // 🔍 Analisar registro
  analisarRegistro(page) {
    const clientesArray = this.extrairMultiSelect(page.properties["Cliente"]);
    const cliente1Atual = this.extrairRichText(page.properties["Cliente1"]);
    const cliente2Atual = this.extrairRichText(page.properties["Cliente2"]);
    const titulo = this.extrairTitulo(page.properties["Ordem de Serviço"]);
    
    const cliente1Novo = clientesArray[0] || '';
    const cliente2Novo = clientesArray[1] || '';
    
    const precisaAtualizacao = 
      (cliente1Novo && cliente1Novo !== cliente1Atual) ||
      (cliente2Novo && cliente2Novo !== cliente2Atual) ||
      (!cliente1Atual && cliente1Novo);
    
    return {
      id: page.id,
      titulo: titulo || 'Sem título',
      clientesOriginais: clientesArray,
      cliente1Atual,
      cliente2Atual,
      cliente1Novo,
      cliente2Novo,
      precisaAtualizacao,
      temMultiplosClientes: clientesArray.length > 1
    };
  }

  // 🔧 Atualizar registro no Notion
  async atualizarRegistro(analise) {
    const updateData = {
      properties: {}
    };

    // Adicionar Cliente1 (sempre)
    if (analise.cliente1Novo) {
      updateData.properties["Cliente1"] = {
        rich_text: [{
          text: { content: analise.cliente1Novo }
        }]
      };
    }

    // Adicionar Cliente2 (se existir)
    if (analise.cliente2Novo) {
      updateData.properties["Cliente2"] = {
        rich_text: [{
          text: { content: analise.cliente2Novo }
        }]
      };
    }

    if (this.dryRun) {
      console.log(`🧪 [DRY-RUN] ${analise.titulo}:`);
      console.log(`   Clientes originais: [${analise.clientesOriginais.join(', ')}]`);
      console.log(`   Cliente1: "${analise.cliente1Novo}"`);
      console.log(`   Cliente2: "${analise.cliente2Novo}"`);
      return { success: true, simulated: true };
    }

    try {
      const response = await fetch(`https://api.notion.com/v1/pages/${analise.id}`, {
        method: 'PATCH',
        headers: config.notion.headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ [UPDATE] ${analise.titulo}: Cliente1="${analise.cliente1Novo}", Cliente2="${analise.cliente2Novo}"`);
      return { success: true };

    } catch (error) {
      console.error(`❌ [ERROR] Falha ao atualizar ${analise.titulo}:`, error);
      return { success: false, error };
    }
  }

  // 📊 Executar separação completa
  async executarSeparacao() {
    console.log('🚀 [START] Iniciando separação de clientes...');
    console.log(`🧪 [MODE] Modo: ${this.dryRun ? 'TESTE (DRY-RUN)' : 'EXECUÇÃO REAL'}`);
    
    try {
      // 1. Carregar dados
      const pages = await this.carregarDadosNotion();
      
      // 2. Analisar todos os registros
      console.log('\n🔍 [ANALYZE] Analisando registros...');
      const analises = [];
      
      for (const page of pages) {
        const analise = this.analisarRegistro(page);
        analises.push(analise);
        
        // Estatísticas
        this.stats.total++;
        if (analise.temMultiplosClientes) this.stats.comMultiplosClientes++;
        if (analise.clientesOriginais.length === 0) this.stats.semCliente++;
        if (analise.cliente1Atual) this.stats.jaTemCliente1++;
        if (analise.precisaAtualizacao) this.stats.precisamAtualizacao++;
      }

      // 3. Relatório inicial
      this.gerarRelatorioAnalise(analises);

      // 4. Processar atualizações
      const paraAtualizar = analises.filter(a => a.precisaAtualizacao);
      
      if (paraAtualizar.length === 0) {
        console.log('✅ [COMPLETE] Nenhum registro precisa de atualização!');
        return { success: true, updated: 0 };
      }

      console.log(`\n🔧 [UPDATE] Processando ${paraAtualizar.length} atualizações...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < paraAtualizar.length; i++) {
        const analise = paraAtualizar[i];
        
        if (i > 0 && i % this.batchSize === 0) {
          console.log(`⏳ [BATCH] Processando lote ${Math.floor(i/this.batchSize) + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const resultado = await this.atualizarRegistro(analise);
        
        if (resultado.success) {
          successCount++;
        } else {
          errorCount++;
        }

        if ((i + 1) % 10 === 0) {
          console.log(`📊 [PROGRESS] ${i + 1}/${paraAtualizar.length} processados`);
        }
      }

      // 5. Relatório final
      this.gerarRelatorioFinal(paraAtualizar.length, successCount, errorCount);
      
      return {
        success: true,
        total: paraAtualizar.length,
        updated: successCount,
        errors: errorCount
      };

    } catch (error) {
      console.error('❌ [FATAL] Erro na separação:', error);
      return { success: false, error };
    }
  }

  // 📋 Gerar relatório de análise
  gerarRelatorioAnalise(analises) {
    console.log('\n📋 === RELATÓRIO DE ANÁLISE ===');
    console.log(`📊 Total de registros: ${this.stats.total}`);
    console.log(`👥 Com múltiplos clientes: ${this.stats.comMultiplosClientes}`);
    console.log(`🚫 Sem cliente: ${this.stats.semCliente}`);
    console.log(`✅ Já têm Cliente1: ${this.stats.jaTemCliente1}`);
    console.log(`🔧 Precisam atualização: ${this.stats.precisamAtualizacao}`);
    
    // Exemplos de separação
    console.log('\n📝 EXEMPLOS DE SEPARAÇÃO:');
    const exemplos = analises
      .filter(a => a.temMultiplosClientes)
      .slice(0, 5);
      
    exemplos.forEach(ex => {
      console.log(`   "${ex.titulo}"`);
      console.log(`      Original: [${ex.clientesOriginais.join(', ')}]`);
      console.log(`      → Cliente1: "${ex.cliente1Novo}" | Cliente2: "${ex.cliente2Novo}"`);
    });
    
    console.log('═══════════════════════════════════\n');
  }

  // 📊 Gerar relatório final
  gerarRelatorioFinal(totalProcessado, successCount, errorCount) {
    console.log('\n🎉 === RELATÓRIO FINAL ===');
    console.log(`📊 Total para processar: ${totalProcessado}`);
    console.log(`✅ Atualizados com sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📈 Taxa de sucesso: ${totalProcessado > 0 ? ((successCount / totalProcessado) * 100).toFixed(1) : 0}%`);
    
    if (this.dryRun) {
      console.log('\n🧪 MODO TESTE ATIVO - Nenhuma alteração foi feita');
      console.log('💡 Execute com --execute para aplicar as mudanças');
    } else {
      console.log('\n✅ EXECUÇÃO COMPLETA - Alterações aplicadas!');
      console.log('🎯 Dashboard agora terá campos Cliente1 e Cliente2 separados');
    }
    
    console.log('═══════════════════════════════════');
  }
}

export { ClientSeparatorFixed };