# 🔍 Notion API - Logging Diagnóstico Implementado

## ✅ Melhorias Implementadas

### 1. **Logging Abrangente na Função Netlify** (`netlify/functions/notion.js`)

#### Início da Função
- ✅ Log do método HTTP
- ✅ Log dos query parameters
- ✅ Log dos headers
- ✅ Verificação de disponibilidade do Client

#### Construção do Cliente
- ✅ Log ao construir cliente Notion
- ✅ Log do Database ID (parcial, por segurança)
- ✅ Verificação de token e client disponíveis

#### Fetch de Dados
- ✅ Log antes de cada query
- ✅ Log do método usado (SDK vs REST)
- ✅ Log de tentativas com/sem sort
- ✅ Log de cada página buscada
- ✅ Log do total de resultados

#### Processamento
- ✅ Log de cada order processado (primeiros 3)
- ✅ Log de erros ao processar páginas individuais
- ✅ Log de estatísticas (orders com cliente, tipo, etc.)
- ✅ Log de summary, clientsData, contentTypes

#### Payload Final
- ✅ Log da estrutura final do payload
- ✅ Log de contagens de cada seção

#### Tratamento de Erros
- ✅ Log detalhado de todos os erros
- ✅ Log de código, status, body do erro
- ✅ Log do stack trace completo
- ✅ Retorno estruturado com detalhes de debug

### 2. **Logging Melhorado no Frontend** (`src/hooks/useDashboardData.js`)

#### Recepção de Dados
- ✅ Log da resposta raw completa
- ✅ Log do tipo de dados
- ✅ Log da estrutura detalhada:
  - `success`, `data`, `originalOrders`
  - Contagens de arrays
  - Primeiro item como amostra
  - Informações de debug

#### Validação de Estrutura
- ✅ Detecção de wrapper `{ success, data }`
- ✅ Aviso se estrutura não corresponde ao esperado
- ✅ Log de erros da API

## 📊 O Que Será Logado

### No Console do Netlify (Função Serverless)
```
🔍 [NOTION] ========== Starting function ==========
🔍 [NOTION] HTTP Method: GET
🔍 [NOTION] Query params: {"route":"orders"}
🔍 [NOTION] Building Notion client...
✅ [NOTION] Client built successfully
🔍 [NOTION] Database ID: abc12345...
🔍 [NOTION] Token exists: true
🔍 [NOTION] Route: orders
🔍 [NOTION] Fetching data from database...
🔍 [FETCH] Starting fetchNotionData...
🔍 [FETCH] Using Notion Client SDK...
🔍 [FETCH] Attempting query with sort...
✅ [FETCH] Query successful with sort
✅ [FETCH] Page 1 fetched: { results_count: 100, has_more: true }
✅ [FETCH] All pages fetched: { total_results: 250, total_pages: 3 }
✅ [NOTION] Raw results fetched: { count: 250, ... }
🔍 [NOTION] Processing results with rowToOrder...
🔍 [NOTION] Processed order 1: { id: "...", cliente: "...", ... }
✅ [NOTION] Orders processed: { total: 250, withCliente: 245, ... }
✅ [NOTION] Payload built: { originalOrders_count: 250, ... }
🔍 [NOTION] ========== Function completed successfully ==========
```

### No Console do Navegador (Frontend)
```
🔍 [PROD] Raw data received: { success: true, originalOrders: [...], ... }
✅ [PROD] Data type: object
✅ [PROD] Data structure: {
  success: true,
  hasOriginalOrders: true,
  ordersCount: 250,
  has_metrics: true,
  visaoGeral_count: 15,
  first_order: { id: "...", cliente: "...", ... }
}
```

## 🐛 Diagnóstico de Problemas

### Se não houver dados:
1. **Verifique logs do Netlify**:
   - Database ID está correto?
   - Token existe?
   - Query foi bem-sucedida?
   - Quantos resultados foram retornados?

2. **Verifique logs do navegador**:
   - Resposta foi recebida?
   - Estrutura está correta?
   - `originalOrders` existe?

### Se houver erro:
1. **Logs mostrarão**:
   - Tipo de erro
   - Código do erro
   - Mensagem detalhada
   - Stack trace (em desenvolvimento)

2. **Erros comuns**:
   - `ENV_VARS_MISSING`: Variáveis de ambiente não configuradas
   - `INVALID_DB_ID`: Database ID inválido
   - `HTTP_QUERY_FAILED`: Erro na query do Notion
   - `UNKNOWN_ERROR`: Erro não categorizado

## 🔧 Como Usar

1. **Execute a aplicação**:
   ```bash
   npm start  # Netlify Dev
   # ou
   npm run start:react-only  # Apenas React (usa mock)
   ```

2. **Abra o console do navegador** (F12)
   - Veja logs detalhados da requisição
   - Veja estrutura dos dados recebidos

3. **Verifique logs do Netlify**:
   - Se usando Netlify Dev: logs no terminal
   - Se em produção: logs no dashboard do Netlify

## 📝 Próximos Passos

1. Execute a aplicação e verifique os logs
2. Identifique onde o problema está ocorrendo:
   - Na query do Notion?
   - No processamento dos dados?
   - Na estrutura da resposta?
3. Use os logs para diagnosticar o problema específico

## ✅ Status

- ✅ Logging abrangente implementado
- ✅ Tratamento de erros melhorado
- ✅ Estrutura de dados validada
- ✅ Debug information incluída nas respostas

