// config/dataSources.js - CONFIGURAÇÃO DE FONTES DE DADOS DO DASHBOARD
const config = {
  // DESABILITAR Google Sheets
  googleSheets: {
    enabled: false, // ❌ DESABILITADO
    keepForReference: true, // Manter config para referência
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    apiKey: process.env.GOOGLE_API_KEY
  },
  
  // NOTION COMO FONTE ÚNICA
  notion: {
    enabled: true, // ✅ ÚNICA FONTE
    isPrimarySource: true,
    token: process.env.NOTION_TOKEN,
    databaseId: process.env.NOTION_DATABASE_ID,
    endpoint: `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json'
    },
    fields: {
      id: 'id',
      titulo: 'titulo', 
      cliente: 'cliente',
      data: 'data',
      tipo: 'tipo',
      complexidade: 'complexidade',
      quemExecuta: 'quemExecuta',
      status: 'status'
    }
  },
  
  // CONFIGURAÇÃO DO DASHBOARD
  dashboard: {
    dataSource: 'notion', // ✅ FONTE ÚNICA
    refreshInterval: 300000, // 5 minutos
    cacheEnabled: true
  }
};

export default config;

