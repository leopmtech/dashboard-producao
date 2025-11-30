# 🚀 Guia de Desenvolvimento Local

## ⚠️ IMPORTANTE: Use Netlify Dev para Funções

Para que as funções Netlify funcionem localmente, você **DEVE** usar `netlify dev` em vez de `npm start` diretamente.

## 📋 Comandos Disponíveis

### Desenvolvimento com Funções Netlify (RECOMENDADO)
```bash
npm start
# ou
npm run dev
# ou diretamente
netlify dev
```

Isso irá:
- Iniciar o servidor Netlify Dev na porta **8888**
- Fazer proxy para o React na porta **3000**
- Disponibilizar as funções em `/.netlify/functions/*`

### Apenas React (sem funções)
```bash
npm run start:react
```

Isso inicia apenas o React na porta 3000, mas **as funções Netlify não estarão disponíveis**.

## 🔧 Configuração

### netlify.toml
- `[dev]` configurado para rodar React na porta 3000
- Netlify Dev faz proxy na porta 8888
- Funções disponíveis em `http://localhost:8888/.netlify/functions/*`

### Tratamento de Erros
- O código inclui `fetchWithFallback` para lidar com interferência de extensões do Chrome
- Se `fetch` falhar, automaticamente tenta com `XMLHttpRequest`

## 🧪 Testando

### Testar função health:
```bash
curl "http://localhost:8888/.netlify/functions/notion?route=health"
```

### Testar função orders:
```bash
curl "http://localhost:8888/.netlify/functions/notion?route=orders"
```

## 🐛 Troubleshooting

### Erro "Failed to fetch"
1. Certifique-se de estar usando `netlify dev` (não `npm start` diretamente)
2. Verifique se a porta 8888 está disponível
3. O código tem fallback automático para XMLHttpRequest se houver interferência de extensões

### Funções não encontradas
1. Verifique se `netlify/functions/notion.js` existe
2. Verifique se `netlify.toml` tem `functions = "netlify/functions"`
3. Reinicie o `netlify dev`

### Porta já em uso
```bash
# Matar processo na porta 8888
lsof -ti:8888 | xargs kill -9

# Ou na porta 3000
lsof -ti:3000 | xargs kill -9
```

## 📝 Variáveis de Ambiente

Certifique-se de ter configurado:
- `NOTION_TOKEN` - Token da API do Notion
- `NOTION_DATABASE_ID` - ID do banco de dados do Notion

Crie um arquivo `.env` na raiz do projeto ou configure no Netlify.

