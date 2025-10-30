# Configuração de Fontes de Dados

## 📋 Visão Geral

O dashboard foi configurado para usar **APENAS Notion** como fonte principal de dados, enquanto o Google Sheets permanece disponível apenas para scripts de preenchimento automático.

## 📁 Arquivos de Configuração

### 1. `dataSources.js` - Configuração do Dashboard

Arquivo principal para configuração de fontes de dados do dashboard.

```javascript
const config = {
  googleSheets: {
    enabled: false,  // ❌ DESABILITADO no dashboard
  },
  
  notion: {
    enabled: true,    // ✅ FONTE ÚNICA
    isPrimarySource: true,
    databaseId: process.env.NOTION_DATABASE_ID,
    token: process.env.NOTION_TOKEN
  },
  
  dashboard: {
    dataSource: 'notion',
    refreshInterval: 300000 // 5 minutos
  }
};
```

### 2. `analysisConfig.js` - Configuração para Scripts

Configuração usada pelos scripts de análise e preenchimento automático.

```javascript
export const config = {
  notion: {
    enabled: true,
    // ... configurações do Notion
  },
  
  sheets: {
    enabled: false,  // ❌ DESABILITADO (mas mantido para scripts)
    // ... configurações do Google Sheets
  },
  
  analysis: {
    primaryDataSource: 'notion' // ✅ FONTE ÚNICA
  }
};
```

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Notion Configuration
NOTION_TOKEN=seu_token_aqui
NOTION_DATABASE_ID=seu_database_id_aqui

# Google Sheets (opcional - apenas para scripts)
GOOGLE_SHEETS_API_KEY=sua_api_key_aqui
```

## ✅ Status Atual

| Fonte | Dashboard | Scripts | Status |
|-------|-----------|---------|--------|
| **Notion** | ✅ Ativo | ✅ Ativo | Fonte principal |
| **Google Sheets** | ❌ Desabilitado | ⚠️ Usado apenas para preenchimento | Backup/migração |

## 📝 Notas Importantes

1. **Dashboard**: Usa apenas Notion como fonte de dados
2. **Scripts de Preenchimento**: Podem usar Google Sheets para migrar dados antigos
3. **Rate Limiting**: Notion (3 req/s), Sheets reduzido (5 req/s)
4. **Cache**: Habilitado para melhor performance (5 minutos)

## 🚀 Como Usar

### Dashboard
```javascript
import decribeSource from './config/dataSources.js';

if (config.notion.enabled) {
  // Carregar dados do Notion
}
```

### Scripts
```javascript
import { config } from './config/analysisConfig.js';

if (config.notion.enabled) {
  // Usar Notion
}

if (config.sheets.enabled) {
  // Usar Sheets (apenas scripts)
}
```

