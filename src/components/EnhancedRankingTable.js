// Exemplo de integração com RankingTable
import React from 'react';
import RankingTable from '../src/components/RankingTable.js';
import { dataStandardizer } from '../src/utils/dataStandardization.js';

// Componente que integra a função de contagem com o RankingTable
const EnhancedRankingTable = ({ 
  data, 
  orders, 
  title, 
  subtitle, 
  dataKey = "media2025",
  totalUniqueClients = null,
  pageSize = 10,
  initialPage = 1,
  showSourceBreakdown = true // Nova prop para mostrar breakdown por fonte
}) => {
  
  // Validar integridade dos dados antes de processar
  const [integrityCheck, setIntegrityCheck] = React.useState(null);
  const [sourceStats, setSourceStats] = React.useState(null);
  
  React.useEffect(() => {
    if (data && data.length > 0) {
      // Executar validação de integridade
      const integrity = dataStandardizer.validateDataIntegrity(data);
      setIntegrityCheck(integrity);
      
      // Obter estatísticas por fonte
      const stats = dataStandardizer.getStandardizedCount(data, {
        showBreakdown: true
      });
      setSourceStats(stats);
      
      console.log('🔍 [ENHANCED RANKING] Validação de integridade:', integrity);
      console.log('📊 [ENHANCED RANKING] Estatísticas por fonte:', stats);
    }
  }, [data]);
  
  // Função para obter contagem de demandas por cliente com awareness de fonte
  const getClientDemandCount = React.useCallback((cliente) => {
    if (!data) return 0;
    
    const count = dataStandardizer.getStandardizedCount(data, {
      cliente: cliente,
      showBreakdown: true
    });
    
    return count.total;
  }, [data]);
  
  // Função para obter estatísticas de crescimento por fonte
  const getGrowthStatsBySource = React.useCallback(() => {
    if (!data) return null;
    
    const sheetsData = dataStandardizer.getStandardizedCount(data, {
      source: 'sheets',
      showBreakdown: true
    });
    
    const notionData = dataStandardizer.getStandardizedCount(data, {
      source: 'notion', 
      showBreakdown: true
    });
    
    return {
      sheets: sheetsData,
      notion: notionData,
      total: sheetsData.total + notionData.total
    };
  }, [data]);
  
  // Renderizar avisos de integridade se necessário
  const renderIntegrityWarnings = () => {
    if (!integrityCheck) return null;
    
    const warnings = [];
    
    if (integrityCheck.duplicates.length > 0) {
      warnings.push(
        <div key="duplicates" style={{
          padding: '12px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          marginBottom: '16px',
          color: '#DC2626'
        }}>
          ⚠️ <strong>Atenção:</strong> {integrityCheck.duplicates.length} registros duplicados entre fontes detectados.
        </div>
      );
    }
    
    if (integrityCheck.sheetsRange && integrityCheck.notionRange) {
      const sheetsEnd = new Date(integrityCheck.sheetsRange.max);
      const notionStart = new Date(integrityCheck.notionRange.min);
      
      if (sheetsEnd >= notionStart) {
        warnings.push(
          <div key="overlap" style={{
            padding: '12px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FED7AA',
            borderRadius: '8px',
            marginBottom: '16px',
            color: '#D97706'
          }}>
            ⚠️ <strong>Aviso:</strong> Sobreposição temporal detectada entre fontes.
          </div>
        );
      }
    }
    
    return warnings.length > 0 ? (
      <div style={{ marginBottom: '20px' }}>
        {warnings}
      </div>
    ) : null;
  };
  
  // Renderizar estatísticas por fonte
  const renderSourceStats = () => {
    if (!sourceStats || !showSourceBreakdown) return null;
    
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#F0F9FF',
          border: '1px solid #7DD3FC',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284C7' }}>
            {sourceStats.breakdown.sheets}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#0369A1' }}>
            📊 Dados Históricos (Sheets)
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>
            {sourceStats.breakdown.notion}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#059669' }}>
            📝 Dados Atuais (Notion)
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6B7280' }}>
            {sourceStats.total}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
            📈 Total Geral
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div>
      {/* Avisos de integridade */}
      {renderIntegrityWarnings()}
      
      {/* Estatísticas por fonte */}
      {renderSourceStats()}
      
      {/* RankingTable original */}
      <RankingTable
        data={data}
        orders={orders}
        title={title}
        subtitle={subtitle}
        dataKey={dataKey}
        totalUniqueClients={totalUniqueClients}
        pageSize={pageSize}
        initialPage={initialPage}
      />
      
      {/* Informações adicionais sobre fontes */}
      {sourceStats && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#6B7280',
          textAlign: 'center'
        }}>
          📊 Dados processados com awareness de fontes • 
          Sheets: {sourceStats.breakdown.sheets} registros • 
          Notion: {sourceStats.breakdown.notion} registros • 
          Cache: {dataStandardizer.getCacheStats().processedCounts} entradas
        </div>
      )}
    </div>
  );
};

export default EnhancedRankingTable;
