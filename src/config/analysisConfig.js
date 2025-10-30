// Configuração para scripts de análise e preenchimento
export const config = {
  notion: {
    enabled: true, // ✅ ÚNICA FONTE DE DADOS
    token: process.env.NOTION_TOKEN,
    databaseId: process.env.NOTION_DATABASE_ID,
    endpoint: `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  },
  
  sheets: {
    enabled: false, // ❌ DESABILITADO (usado apenas para scripts de preenchimento)
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    apiKey: process.env.GOOGLE_API_KEY,
    endpoint: process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_API_KEY
      ? `https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEETS_ID}/values/in?key=${process.env.GOOGLE_API_KEY}`
      : undefined,
    range: "in!A1:Z1000"
  },
  
  // Configurações de análise
  analysis: {
    logLevel: 'debug',
    saveReports: true,
    batchSize: 50,
    similarityThreshold: 0.75,
    primaryDataSource: 'notion' // ✅ FONTE ÚNICA
  },

  // Rate limiting
  rateLimit: {
    notion: 3, // requests per second
    sheets: 5 // requests per second (reduzido - apenas para scripts)
  }
};