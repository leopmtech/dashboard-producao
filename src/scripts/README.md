# Script de Análise - Consolidação Notion + Planilha Retroativa

## 📋 Descrição

Sistema de análise para identificar diferenças entre dados do Notion Database e planilha retroativa, preparando para usar apenas o Notion como fonte única.

## 🎯 Funcionalidades

- ✅ 4 estratégias de matching (ID Direto, Ordem de Serviço, Data+Cliente, Fuzzy)
- ✅ Análise de campos essenciais
- ✅ Detecção de valores problemáticos
- ✅ Relatórios em múltiplos formatos (Console, JSON, CSV)
- ✅ Salvamento em localStorage
- ✅ Logs detalhados com emojis

## 📁 Estrutura de Arquivos

```
src/
├── scripts/
│   ├── dataAnalyzer.js          # Classe principal de análise
│   ├── runAnalysis.js           # Executor principal (Node.js)
│   ├── browserAnalyzer.js       # Versão para browser console
│   ├── utils/
│   │   ├── dataLoader.js        # Carregamento de dados
│   │   ├── normalizer.js        # Normalização e comparação
│   │   └── reporter.js          # Geração de relatórios
│   └── README.md                # Esta documentação
├── config/
│   └── analysisConfig.js        # Configurações e endpoints
└── reports/                     # Relatórios gerados
    └── .gitkeep
```

## 🚀 Uso

### 1. Via Browser (Console do DevTools)

1. Abra o DevTools do navegador (F12)
2. Vá para a aba Console
3. Execute o código:
   ```javascript
   // Importar e executar
   import('./scripts/browserAnalyzer.js').then(module => {
     window.browserAnalyzer = new module.default();
     return window.browserAnalyzer.analyze();
   }).then(resultado => {
     console.log('Análise completa!', resultado);
   });
   ```

4. Ou simplesmente:
   ```javascript
   browserAnalyzer.analyze()
   ```

### 2. Via Node.js

```bash
# Na raiz do projeto
node src/scripts/runAnalysis.js
```

### 3. Integrado ao React

```javascript
import DataAnalyzer from './scripts/dataAnalyzer.js';

const analyzer = new DataAnalyzer();
const resultado = await analyzer.executarAnaliseCompleta();
console.log('Resultado:', resultado);
```

## ⚙️ Configuração

Edite `src/config/analysisConfig.js` para personalizar:

- **Endpoints**: URLs das APIs
- **Campos Essenciais**: Campos a serem analisados
- **Valores Problemáticos**: Valores considerados vazios/inválidos
- **Fuzzy Matching**: Threshold de similaridade
- **Relatórios**: Formatos de output desejados

## 📊 Estratégias de Matching

### 1. ID Direto (Prioridade 1)
Match por ID único se existir em ambos os datasets.

### 2. Ordem de Serviço (Prioridade 2)
Match pelo campo "Ordem de Serviço" (campo único com alta confiabilidade).

### 3. Data + Cliente (Prioridade 3)
Match pela combinação de Data de Entrega + Cliente (normalizado).

### 4. Similaridade Fuzzy (Prioridade 4)
Match por algoritmo Levenshtein com threshold configurável (padrão: 0.85).

## 📈 Saída

### Console
- Estatísticas gerais
- Correspondências por estratégia
- Campos problemáticos
- Registros não encontrados

### JSON (localStorage)
Relatório completo com timestamp em `localStorage['analysis_report_[timestamp]']`

### CSV
Lista de campos problemáticos em formato CSV para análise manual

## 🔍 Campos Analisados

- `tipoDemanda` - Tipo de demanda
- `cliente` / `cliente1` / `cliente2` - Informações de cliente
- `dataEntrega` - Data de entrega
- `criadoPor` - Pessoa que criou
- `status` - Status do registro
- `complexidade` - Nível de complexidade
- `prioridade` - Nível de prioridade
- `ordemServico` - Ordem de serviço

## 🛠️ Tratamento de Erros

- Continuidade: Análise continua mesmo com erros pontuais
- Timeout: Configurável (padrão: 30s)
- Fallbacks: Endpoints alternativos
- Logs: Níveis DEBUG, INFO, WARN, ERROR

## 📝 Notas Técnicas

- **Performance**: Processamento em lotes de 100 registros
- **Memory**: Usa structures nativas do JavaScript
- **Normas**: Normaliza textos, datas e caracteres especiais
- **Robustez**: Valida dados de entrada e trata edge cases

## 🐛 Troubleshooting

### "Falha ao carregar Notion"
- Verifique se o servidor está rodando: `npm run server`
- Confirme a URL em `analysisConfig.js`

### "Nenhuma correspondência encontrada"
- Ajuste o threshold de similaridade fuzzy
- Verifique se os campos de matching estão preenchidos

### "Muitos campos problemáticos"
- Revise a lista de valores problemáticos em `analysisConfig.js`
- Verifique a qualidade dos dados na fonte

## 📄 Licença

Este projeto faz parte do Dashboard Social BI.

