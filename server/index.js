// server/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const notionRoutes = require('./routes/notion');

const app = express();
app.use(cors());
app.use(express.json());

// REGISTRAR ROTAS
app.use('/api/notion', notionRoutes);

// ROTA RAIZ DE TESTE
app.get('/', (req, res) => {
  res.json({ 
    message: 'Notion API Server',
    version: '1.0.0',
    endpoints: {
      orders: '/api/notion/orders',
      records: '/api/notion/records',
      health: '/api/notion/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ [SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`🚀 Notion API server rodando em http://localhost:${port}`));
