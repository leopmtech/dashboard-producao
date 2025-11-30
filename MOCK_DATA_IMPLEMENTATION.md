# 🔧 Implementação de Mock Data para Desenvolvimento

## ✅ Solução Implementada

Foi implementado um sistema de **mock data** que permite desenvolvimento local sem necessidade do Netlify Dev rodando.

## 📁 Arquivos Criados/Modificados

### 1. `src/services/mockData.js` (NOVO)
- Contém dados mock no formato esperado pela aplicação
- Inclui `originalOrders`, `metrics`, `visaoGeral`, `contentTypes`, etc.
- Função `shouldUseMockData()` para detectar quando usar mock
- Função `simulateNetworkDelay()` para simular latência de rede

### 2. `src/hooks/useDashboardData.js` (MODIFICADO)
- Importa `MOCK_NOTION_DATA`, `shouldUseMockData`, `simulateNetworkDelay`
- Detecta automaticamente se deve usar mock data
- Usa mock quando:
  - `NODE_ENV === 'development'`
  - Porta é `3000` (React dev server)
  - Porta NÃO é `8888` (Netlify Dev)

## 🚀 Como Funciona

### Cenário 1: Desenvolvimento com React apenas (porta 3000)
```bash
npm run start:react-only
# ou
npm run start:react
```
- ✅ Detecta automaticamente que Netlify Dev não está rodando
- ✅ Usa dados mock automaticamente
- ✅ Mostra mensagem no console: "🔧 [DEV MODE] Usando dados mock"
- ✅ Simula delay de rede (800ms)

### Cenário 2: Desenvolvimento com Netlify Dev (porta 8888)
```bash
npm start
# ou
npm run dev
```
- ✅ Detecta que Netlify Dev está rodando
- ✅ Usa funções reais do Netlify
- ✅ Faz requisições para `/.netlify/functions/notion`

### Cenário 3: Produção
```bash
npm run build
netlify deploy
```
- ✅ Usa funções reais do Netlify
- ✅ Não usa mock data

## 📊 Estrutura dos Dados Mock

Os dados mock incluem:
- **5 orders** de exemplo com diferentes clientes e tipos
- **3 clientes** (Cliente A, Cliente B, Cliente C)
- **4 tipos de demanda** (Design, Desenvolvimento, Revisão, Diagnóstico)
- **Métricas** calculadas
- **visaoGeral** com dados mensais
- **contentTypes** com tipos únicos

## 🔍 Detecção Automática

A função `shouldUseMockData()` verifica:
```javascript
- process.env.NODE_ENV === 'development'
- window.location.port === '3000' (React dev server)
- window.location.port !== '8888' (não é Netlify Dev)
```

## 💡 Vantagens

1. **Desenvolvimento sem dependências**: Pode desenvolver sem Netlify Dev
2. **Feedback imediato**: Dados aparecem instantaneamente
3. **Estrutura realista**: Dados mock seguem a mesma estrutura dos dados reais
4. **Transparente**: Console mostra claramente quando está usando mock
5. **Fallback automático**: Se Netlify Dev não estiver disponível, usa mock

## 🐛 Troubleshooting

### Mock data não está sendo usado
**Verifique**:
1. Console do navegador - deve mostrar "🔧 [DEV MODE]"
2. Porta do navegador - deve ser `3000` (não `8888`)
3. `NODE_ENV` - deve ser `development`

### Quer usar dados reais em desenvolvimento
**Execute**:
```bash
npm start  # Isso inicia Netlify Dev na porta 8888
```

### Quer personalizar dados mock
**Edite**: `src/services/mockData.js`
- Adicione mais orders ao array `originalOrders`
- Modifique clientes, tipos, datas, etc.
- Ajuste métricas e visaoGeral conforme necessário

## ✅ Status

- ✅ Mock data implementado
- ✅ Detecção automática funcionando
- ✅ Estrutura de dados compatível
- ✅ Logging claro no console
- ✅ Simulação de delay de rede
- ✅ Fallback para produção mantido

