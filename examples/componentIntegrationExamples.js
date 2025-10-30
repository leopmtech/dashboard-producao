// Exemplo prático de uso da funcionalidade de awareness de fontes nos componentes
import React from 'react';
import { dataStandardizer } from './src/utils/dataStandardization.js';
import SourceAwareKPI from './src/components/SourceAwareKPI.js';
import EnhancedRankingTable from './src/components/EnhancedRankingTable.js';

// ==========================================
// EXEMPLO 1: Uso básico em componente
// ==========================================
const ExemploComponenteBasico = ({ allData }) => {
  // Contagem com awareness de fonte
  const result = dataStandardizer.getStandardizedCount(allData, {
    year: 2025,
    type: 'relatorios'
  });

  console.log(`Total: ${result.total}`);
  console.log(`Retroativos (Sheets): ${result.breakdown.sheets}`);
  console.log(`Atuais (Notion): ${result.breakdown.notion}`);

  return (
    <div>
      <h3>📊 Análise com Awareness de Fonte</h3>
      <p>Total de relatórios 2025: {result.total}</p>
      <p>📊 Dados históricos (Sheets): {result.breakdown.sheets}</p>
      <p>📝 Dados atuais (Notion): {result.breakdown.notion}</p>
    </div>
  );
};

// ==========================================
// EXEMPLO 2: Dashboard com KPIs com awareness de fonte
// ==========================================
const DashboardComAwareness = ({ data }) => {
  // Métricas com awareness de fonte
  const metrics = React.useMemo(() => {
    const sourceAwareCount = dataStandardizer.getStandardizedCount(data, {
      year: 'all',
      type: 'all',
      showBreakdown: true
    });

    return {
      totalRelatorios: sourceAwareCount.total,
      sourceBreakdown: sourceAwareCount.breakdown,
      sourceDefinitions: sourceAwareCount.sourceDefinitions,
      integrityCheck: dataStandardizer.validateDataIntegrity(data)
    };
  }, [data]);

  return (
    <div className="dashboard">
      <h2>📊 Dashboard com Awareness de Fontes</h2>
      
      {/* KPIs com breakdown por fonte */}
      <div className="kpis-grid">
        <SourceAwareKPI
          title="Total de Relatórios"
          value={metrics.totalRelatorios}
          icon={FileText}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          subtitle="Todos os períodos"
          sourceBreakdown={metrics.sourceBreakdown}
          sourceDefinitions={metrics.sourceDefinitions}
        />
      </div>

      {/* Avisos de integridade */}
      {metrics.integrityCheck?.duplicates?.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ {metrics.integrityCheck.duplicates.length} registros duplicados detectados
        </div>
      )}
    </div>
  );
};

// ==========================================
// EXEMPLO 3: Análise comparativa por fonte
// ==========================================
const AnaliseComparativa = ({ data }) => {
  const [filtroAtivo, setFiltroAtivo] = React.useState('all');

  // Análise por fonte
  const analisePorFonte = React.useMemo(() => {
    const sheetsData = dataStandardizer.getStandardizedCount(data, {
      source: 'sheets',
      year: filtroAtivo === 'all' ? 'all' : filtroAtivo,
      showBreakdown: true
    });

    const notionData = dataStandardizer.getStandardizedCount(data, {
      source: 'notion',
      year: filtroAtivo === 'all' ? 'all' : filtroAtivo,
      showBreakdown: true
    });

    return {
      sheets: sheetsData,
      notion: notionData,
      total: sheetsData.total + notionData.total
    };
  }, [data, filtroAtivo]);

  return (
    <div className="analise-comparativa">
      <h3>📈 Análise Comparativa por Fonte</h3>
      
      <div className="filtros">
        <button 
          onClick={() => setFiltroAtivo('all')}
          className={filtroAtivo === 'all' ? 'active' : ''}
        >
          Todos os Anos
        </button>
        <button 
          onClick={() => setFiltroAtivo('2024')}
          className={filtroAtivo === '2024' ? 'active' : ''}
        >
          2024
        </button>
        <button 
          onClick={() => setFiltroAtivo('2025')}
          className={filtroAtivo === '2025' ? 'active' : ''}
        >
          2025
        </button>
      </div>

      <div className="comparacao-grid">
        <div className="fonte-card sheets">
          <h4>📊 Dados Históricos (Sheets)</h4>
          <div className="valor">{analisePorFonte.sheets.total}</div>
          <div className="descricao">Registros históricos</div>
        </div>
        
        <div className="fonte-card notion">
          <h4>📝 Dados Atuais (Notion)</h4>
          <div className="valor">{analisePorFonte.notion.total}</div>
          <div className="descricao">Registros atuais</div>
        </div>
        
        <div className="fonte-card total">
          <h4>📈 Total Geral</h4>
          <div className="valor">{analisePorFonte.total}</div>
          <div className="descricao">Todos os registros</div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// EXEMPLO 4: RankingTable com awareness de fonte
// ==========================================
const RankingComAwareness = ({ data, orders }) => {
  return (
    <div>
      <h3>🏆 Ranking com Awareness de Fonte</h3>
      <EnhancedRankingTable
        data={data}
        orders={orders}
        title="Ranking de Clientes"
        subtitle="Com breakdown por fonte de dados"
        dataKey="media2025"
        showSourceBreakdown={true}
      />
    </div>
  );
};

// ==========================================
// EXEMPLO 5: Monitoramento de integridade
// ==========================================
const MonitorIntegridade = ({ data }) => {
  const [integrityStatus, setIntegrityStatus] = React.useState(null);

  React.useEffect(() => {
    if (data && data.length > 0) {
      const integrity = dataStandardizer.validateDataIntegrity(data);
      setIntegrityStatus(integrity);
    }
  }, [data]);

  if (!integrityStatus) return null;

  return (
    <div className="monitor-integridade">
      <h3>🔍 Monitor de Integridade</h3>
      
      <div className="status-grid">
        <div className="status-card">
          <h4>📊 Total por Fonte</h4>
          <div className="breakdown">
            <div>Sheets: {integrityStatus.totalBreakdown.sheets}</div>
            <div>Notion: {integrityStatus.totalBreakdown.notion}</div>
            <div>Unknown: {integrityStatus.totalBreakdown.unknown}</div>
          </div>
        </div>

        <div className="status-card">
          <h4>⚠️ Duplicações</h4>
          <div className="duplicates">
            {integrityStatus.duplicates.length > 0 ? (
              <div className="alert alert-danger">
                {integrityStatus.duplicates.length} duplicações encontradas
              </div>
            ) : (
              <div className="alert alert-success">
                ✅ Nenhuma duplicação detectada
              </div>
            )}
          </div>
        </div>

        <div className="status-card">
          <h4>📅 Cobertura Temporal</h4>
          <div className="coverage">
            {integrityStatus.sheetsRange && (
              <div>Sheets: {integrityStatus.sheetsRange.min.toLocaleDateString()} a {integrityStatus.sheetsRange.max.toLocaleDateString()}</div>
            )}
            {integrityStatus.notionRange && (
              <div>Notion: {integrityStatus.notionRange.min.toLocaleDateString()} a {integrityStatus.notionRange.max.toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// EXEMPLO 6: Hook personalizado para awareness de fonte
// ==========================================
const useSourceAwareness = (data, filters = {}) => {
  return React.useMemo(() => {
    if (!data || data.length === 0) {
      return {
        total: 0,
        breakdown: { sheets: 0, notion: 0, unknown: 0 },
        sourceDefinitions: null,
        integrityCheck: null
      };
    }

    const sourceAwareCount = dataStandardizer.getStandardizedCount(data, {
      ...filters,
      showBreakdown: true
    });

    const integrityCheck = dataStandardizer.validateDataIntegrity(data);

    return {
      ...sourceAwareCount,
      integrityCheck
    };
  }, [data, filters]);
};

// Exemplo de uso do hook
const ComponenteComHook = ({ data }) => {
  const sourceAwareness = useSourceAwareness(data, {
    year: 2025,
    type: 'relatorios'
  });

  return (
    <div>
      <h3>📊 Usando Hook Personalizado</h3>
      <p>Total: {sourceAwareness.total}</p>
      <p>Sheets: {sourceAwareness.breakdown.sheets}</p>
      <p>Notion: {sourceAwareness.breakdown.notion}</p>
    </div>
  );
};

// ==========================================
// EXPORTAÇÕES
// ==========================================
export {
  ExemploComponenteBasico,
  DashboardComAwareness,
  AnaliseComparativa,
  RankingComAwareness,
  MonitorIntegridade,
  useSourceAwareness,
  ComponenteComHook
};
