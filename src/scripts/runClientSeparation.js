import { ClientSeparatorFixed } from './clientSeparator.js';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  
  console.log('🎯 === SEPARAÇÃO DE CLIENTES (CORRIGIDO) ===\n');
  
  if (dryRun) {
    console.log('🧪 MODO TESTE ATIVO');
    console.log('💡 Use --execute para aplicar as mudanças reais\n');
  }

  const separator = new ClientSeparatorFixed({ 
    dryRun,
    batchSize: 50 
  });

  const resultado = await separator.executarSeparacao();
  
  if (resultado.success) {
    console.log('\n🎉 Separação concluída com sucesso!');
    process.exit(0);
  } else {
    console.log('\n❌ Falha na separação');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});