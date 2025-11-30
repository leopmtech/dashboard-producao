# 🔧 Fix: Connection Refused - Netlify Functions

## ✅ Correções Aplicadas

### 1. **Função `fetchWithRetryAndFallback`**
Implementada função inteligente que:
- Tenta múltiplas URLs automaticamente
- Em desenvolvimento: tenta `localhost:8888` primeiro, depois URL relativa, depois produção (se configurada)
- Em produção: usa URL relativa
- Detecta erros de conexão e tenta próxima URL automaticamente
- Mostra mensagens de erro claras

### 2. **Fallback para Extensões Chrome**
- Função `fetchWithFallback` já implementada
- Se `fetch` falhar, tenta automaticamente com `XMLHttpRequest`
- Resolve problemas de interferência de extensões do Chrome

### 3. **Scripts Atualizados**
- `npm start` → usa `netlify dev` (recomendado)
- `npm run start:react-only` → apenas React (sem funções)
- `npm run dev` → alias para `netlify dev`

## 🚀 Como Usar

### Opção 1: Com Netlify Dev (RECOMENDADO)
```bash
npm start
# ou
npm run dev
```

Isso inicia:
- Netlify Dev na porta 8888
- Proxy para React na porta 3000
- Funções disponíveis em `/.netlify/functions/*`

### Opção 2: Apenas React (sem funções)
```bash
npm run start:react-only
```

⚠️ **Nota**: As funções não estarão disponíveis, mas o código tentará automaticamente:
1. `localhost:8888` (falhará se Netlify dev não estiver rodando)
2. URL relativa (falhará em desenvolvimento)
3. URL de produção (se `REACT_APP_NETLIFY_URL` estiver configurada)

## 🔍 Comportamento Automático

O código agora:
1. **Tenta localhost:8888 primeiro** (se em desenvolvimento)
2. **Se falhar com connection refused**, tenta URL relativa
3. **Se ainda falhar**, tenta URL de produção (se configurada)
4. **Mostra erro claro** se todas as tentativas falharem

## 📝 Variáveis de Ambiente Opcionais

Para fallback para produção em desenvolvimento, adicione ao `.env`:
```env
REACT_APP_NETLIFY_URL=https://seu-site.netlify.app
```

## 🐛 Troubleshooting

### Erro: "Não foi possível conectar à API"
**Solução**: Execute `npm start` (não `npm run start:react-only`)

### Erro: "ERR_CONNECTION_REFUSED"
**Causa**: Netlify Dev não está rodando
**Solução**: 
1. Execute `npm start`
2. Aguarde até ver "Netlify Dev server is ready"
3. Acesse `http://localhost:8888`

### Funções não encontradas
**Verifique**:
1. `netlify/functions/notion.js` existe
2. `netlify.toml` tem `functions = "netlify/functions"`
3. Reinicie o `netlify dev`

## ✅ Status

- ✅ Retry automático implementado
- ✅ Fallback para produção configurável
- ✅ Tratamento de erros melhorado
- ✅ Mensagens de erro claras
- ✅ Suporte a extensões Chrome

