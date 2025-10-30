# Função de Contagem com Awareness de Fontes

Esta funcionalidade permite realizar contagens padronizadas de dados com consciência das diferentes fontes (Google Sheets e Notion), incluindo validação de integridade e cache inteligente.

## Características Principais

- **Awareness de Fontes**: Distingue entre dados históricos (Sheets) e dados atuais (Notion)
- **Filtros Avançados**: Suporte a múltiplos filtros simultâneos
- **Cache Inteligente**: Evita recálculos desnecessários
- **Validação de Integridade**: Detecta duplicações e sobreposições entre fontes
- **Logging Detalhado**: Acompanha cada passo do processamento

## Como Usar

### Importação

```javascript
import { dataStandardizer } from './src/utils/dataStandardization.js';
```

### Contagem Básica

```javascript
// Contagem total com breakdown por fonte
const result = dataStandardizer.getStandardizedCount(data);
console.log(result);
// Output: { total: 100, breakdown: { sheets: 60, notion: 40 }, ... }
```

### Filtros Disponíveis

```javascript
const filters = {
  source: 'notion',        // 'notion', 'sheets', 'all'
  year: '2024',            // ano específico ou 'all'
  type: 'relatorios',      // 'relatorios' ou 'all'
  cliente: 'Empresa A',    // cliente específico ou 'all'
  dateRange: 'all',        // range de datas ou 'all'
  showBreakdown: true      // mostrar detalhamento por fonte
};

const result = dataStandardizer.getStandardizedCount(data, filters);
```

### Validação de Integridade

```javascript
// Verifica duplicações e cobertura temporal
const integrity = dataStandardizer.validateDataIntegrity(allData);
console.log(integrity);
// Output: { totalBreakdown: {...}, duplicates: [...], sheetsRange: {...}, notionRange: {...} }
```

### Gerenciamento de Cache

```javascript
// Limpar cache
dataStandardizer.clearCache();

// Ver estatísticas do cache
const stats = dataStandardizer.getCacheStats();
console.log(stats);
```

## Estrutura de Retorno

A função retorna um objeto com a seguinte estrutura:

```javascript
{
  total: 100,                    // Total de registros após filtros
  data: [...],                   // Array com os dados filtrados
  breakdown: {                   // Contagem por fonte
    sheets: 60,
    notion: 40,
    unknown: 0
  },
  steps: [...],                  // Log dos passos de filtro
  filters: {...},                // Filtros aplicados
  sourceDefinitions: {...}       // Definições das fontes
}
```

## Definições das Fontes

```javascript
sourceDefinitions: {
  sheets: {
    name: 'Dados Retroativos (Sheets)',
    description: 'Demandas históricas exportadas',
    expectedPeriod: 'até data X',
    isLegacy: true
  },
  notion: {
    name: 'Dados Atuais (Notion)',
    description: 'Sistema ativo atual', 
    expectedPeriod: 'após data X',
    isActive: true
  }
}
```

## Exemplos Práticos

### 1. Dashboard de Relatórios
```javascript
// Contar relatórios por fonte
const reportsBySource = dataStandardizer.getStandardizedCount(data, {
  type: 'relatorios',
  showBreakdown: true
});
```

### 2. Análise por Cliente
```javascript
// Contar demandas de um cliente específico
const clientDemands = dataStandardizer.getStandardizedCount(data, {
  cliente: 'Empresa A',
  source: 'all'
});
```

### 3. Comparação Temporal
```javascript
// Comparar dados históricos vs atuais
const historicalData = dataStandardizer.getStandardizedCount(data, {
  source: 'sheets'
});

const currentData = dataStandardizer.getStandardizedCount(data, {
  source: 'notion'
});
```

## Logging

A função gera logs detalhados com o prefixo `📊 [STANDARD COUNT]`:

- Cache hits/misses
- Passos de filtro aplicados
- Breakdown por fonte
- Validações de integridade
- Avisos sobre duplicações

## Integração com RankingTable

Para integrar com o componente `RankingTable` existente, você pode usar a função para:

1. **Validar dados antes do processamento**:
```javascript
const integrity = dataStandardizer.validateDataIntegrity(data);
if (integrity.duplicates.length > 0) {
  console.warn('Duplicações detectadas:', integrity.duplicates);
}
```

2. **Contar demandas por cliente**:
```javascript
const clientCounts = {};
data.forEach(item => {
  const count = dataStandardizer.getStandardizedCount(data, {
    cliente: item.cliente
  });
  clientCounts[item.cliente] = count.total;
});
```

3. **Análise de crescimento por fonte**:
```javascript
const growthAnalysis = dataStandardizer.getStandardizedCount(data, {
  year: '2024',
  showBreakdown: true
});
```

## Considerações de Performance

- **Cache**: Resultados são cacheados automaticamente
- **Filtros**: Aplicados sequencialmente para otimizar performance
- **Validação**: Executada apenas quando necessário
- **Logging**: Pode ser desabilitado em produção se necessário

## Troubleshooting

### Problemas Comuns

1. **Dados sem `_source`**: Serão classificados como 'unknown'
2. **Datas inválidas**: Filtros de data ignoram registros com datas inválidas
3. **Cache cheio**: Use `clearCache()` para liberar memória
4. **Duplicações**: Use `validateDataIntegrity()` para detectar

### Debug

```javascript
// Ativar logs detalhados
console.log('Cache stats:', dataStandardizer.getCacheStats());
console.log('Integrity check:', dataStandardizer.validateDataIntegrity(data));
```
