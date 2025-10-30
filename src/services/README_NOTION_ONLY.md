# Notion Only Data Loader

## 📋 Visão Geral

O `notionOnlyDataLoader.js` foi criado para carregar dados **apenas do Notion**, sem depender do Google Sheets.

## 🔧 Como Usar

### 1. Importar no seu componente

```javascript
import notionOnlyLoader from './services/notionOnlyDataLoader';
```

### 2. Carregar dados

```javascript
// Carregar dados com cache automático (5 minutos)
const data = await notionOnlyLoader.loadData();

// Forçar atualização
const freshData = await notionOnlyLoader.loadData(true);
```

### 3. Estrutura dos Dados Retornados

```javascript
{
  projetos: [...],              // Array de todos os projetos
  estatisticas: {
    total: 1583,
    porCliente: {...},
    porTipo: {...},
    porMes: {...},
    porExecutor: {...},
    porComplexidade: {...}
  },
  originalOrders: [...],        // Mesmo que projetos
  visaoGeral: [...],            // Visão por cliente
  metrics: {
    totalProjects: 1583,
    uniqueClients: 25,
    uniqueTypes: 12
  },
  ultimaAtualizacao: "2024-01-15T10:30:00.000Z",
  source: "notion"
}
```

## 🎯 Exemplo de Uso no Dashboard

### Substituir fetchData atual:

```javascript
// ANTES (consolidando Notion + Sheets)
const fetchData = async () => {
  const [notionRes, sheetsRes] = await Promise.allSettled([
    notionService.getDashboardData(),
    googleSheetsService.getDashboardData()
  ]);
  // ... lógica de merge
};

// DEPOIS (apenas Notion)
const fetchData = async () => {
  try {
    const data = await notionOnlyLoader.loadData();
    setData(data);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
};
```

## 📊 Recursos

### ✅ Cache Automático
- Cache de 5 minutos por padrão
- Reduz chamadas à API do Notion
- Melhora performance

### 📈 Estatísticas Automáticas
- Total de projetos
- Distribuição por cliente
- Distribuição por tipo
- Distribuição por mês
- Distribuição por executor
- Distribuição por complexidade

### 🔄 Atualização Forçada
```javascript
// Limpar cache e recarregar
notionOnlyLoader.clearCache();
const freshData = await notionOnlyLoader.loadData(true);
```

## 🔑 Integração com Configuração

Usa automaticamente a configuração de `src/config/analysisConfig.js`:

```javascript
import { config } from '../config/analysisConfig.js';

// Usa config.notion.endpoint, config.notion.headers, etc.
```

## 🚀 Exemplo Completo

```javascript
import { useState, useEffect } from 'react';
import notionOnlyLoader from './services/notionOnlyDataLoader';

function MyDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dashboardData = await notionOnlyLoader.loadData();
        setData(dashboardData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h1>Dashboard Notion</h1>
      <p>Total de Projetos: {data.metrics.totalProjects}</p>
      <p>Clientes Únicos: {data.metrics.uniqueClients}</p>
      {/* Renderizar gráficos e tabelas */}
    </div>
  );
}
```

