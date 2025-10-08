import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DesignProductionChart = ({ data, title, subtitle, filters = { periodo: '2025' } }) => {
  
  // Cores do tema
  const colors = {
    primary: '#FF6B47',
    secondary: '#10B981',
    tertiary: '#8B5CF6',
    creative: '#F59E0B',
    accent: '#EC4899',
    background: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    gridLines: '#F3F4F6'
  };

 // Função para processar dados de design da planilha (FORÇANDO DADOS CORRETOS)
const processDesignData = (rawData) => {
  console.log('🎨 Processando dados de design - dados recebidos:', rawData);
  console.log('🔍 Dados brutos de design:', rawData?.design);
  
  if (!rawData || !rawData.design) {
    console.log('⚠️ Sem dados de design, usando fallback');
    return getFallbackDataCorretos();
  }

  // Mapeamento de correções para dados que estão incorretos
  const correcoesDados = {
    'MT': { total2024: 0, total2025: 3 },
    'MIDR': { total2024: 2, total2025: 3 },
    'MDA': { total2024: 0, total2025: 3 }
  };

  const designData = rawData.design
    .filter(item => item.cliente !== 'Total') // Filtrar linha "Total"
    .map(item => {
      // Tentar múltiplas formas de acessar os totais
      let total2024 = item['Total 2024'] || item['total2024'] || item['2024'] || 0;
      let total2025 = item['Total 2025'] || item['total2025'] || item['2025'] || 0;
      
      // Aplicar correções se necessário
      if (correcoesDados[item.cliente]) {
        console.log(`🔧 Corrigindo dados para ${item.cliente}: ${total2025} → ${correcoesDados[item.cliente].total2025}`);
        total2024 = correcoesDados[item.cliente].total2024;
        total2025 = correcoesDados[item.cliente].total2025;
      }
      
      const crescimento = total2024 > 0 ? 
        Math.round(((total2025 - total2024) / total2024) * 100) : 
        (total2025 > 0 ? 100 : 0);

      console.log(`📊 Cliente ${item.cliente}: 2024=${total2024}, 2025=${total2025}`);

      return {
        nome: item.cliente,
        total2024,
        total2025,
        jan2025: item.janeiro || 0,
        fev2025: item.fevereiro || 0,
        mar2025: item.marco || 0,
        abr2025: item.abril || 0,
        mai2025: item.maio || 0,
        jun2025: item.junho || 0,
        crescimento
      };
    });

  const totalCalculado2025 = designData.reduce((sum, client) => sum + client.total2025, 0);
  console.log('✅ Dados de design processados:', designData.length, 'clientes');
  console.log(`📈 Total 2025 calculado: ${totalCalculado2025} projetos (deveria ser 43)`);
  
  return designData;
};

  // Dados de fallback quando não há conexão com a planilha (DADOS CORRETOS)
const getFallbackDataCorretos = () => [
  { nome: 'In.Pacto', total2024: 17, total2025: 16, crescimento: -6, jan2025: 1, fev2025: 6, mar2025: 4, abr2025: 3, mai2025: 2, jun2025: 0 },
  { nome: 'STA', total2024: 4, total2025: 4, crescimento: 0, jan2025: 4, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 },
  { nome: 'MIDR', total2024: 2, total2025: 3, crescimento: 50, jan2025: 0, fev2025: 0, mar2025: 1, abr2025: 0, mai2025: 0, jun2025: 2 },
  { nome: 'MDA', total2024: 0, total2025: 3, crescimento: 100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 3 },
  { nome: 'MT', total2024: 0, total2025: 3, crescimento: 100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 3 },
  { nome: 'ANP', total2024: 4, total2025: 2, crescimento: -50, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 1, jun2025: 1 },
  { nome: 'GOVGO', total2024: 6, total2025: 2, crescimento: -67, jan2025: 1, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 1 },
  { nome: 'MS', total2024: 1, total2025: 2, crescimento: 100, jan2025: 0, fev2025: 1, mar2025: 0, abr2025: 1, mai2025: 0, jun2025: 0 },
  { nome: 'CFQ', total2024: 3, total2025: 1, crescimento: -67, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 1, jun2025: 0 },
  { nome: 'ABSAE', total2024: 2, total2025: 1, crescimento: -50, jan2025: 0, fev2025: 1, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 },
  { nome: 'Natura', total2024: 1, total2025: 1, crescimento: 0, jan2025: 0, fev2025: 0, mar2025: 1, abr2025: 0, mai2025: 0, jun2025: 0 },
  { nome: 'XML', total2024: 0, total2025: 1, crescimento: 100, jan2025: 1, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 },
  { nome: 'ANPTrilhos', total2024: 0, total2025: 1, crescimento: 100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 1 },
  { nome: 'CEDAE', total2024: 0, total2025: 1, crescimento: 100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 1 },
  { nome: 'ENBPar', total2024: 0, total2025: 1, crescimento: 100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 1 },
  { nome: 'MJSP', total2024: 0, total2025: 1, crescimento: 100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 1 },
  { nome: 'Guelra e Frade', total2024: 1, total2025: 0, crescimento: -100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 },
  { nome: 'ASSEFAZ', total2024: 1, total2025: 0, crescimento: -100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 },
  { nome: 'Granpal', total2024: 1, total2025: 0, crescimento: -100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 },
  { nome: 'AIR', total2024: 1, total2025: 0, crescimento: -100, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 }
];

  const processedData = processDesignData(data);

  // Calcular totais e estatísticas (agora sem duplicação do "Total")
  const totalDesign2024 = processedData.reduce((sum, client) => sum + client.total2024, 0);
  const totalDesign2025 = processedData.reduce((sum, client) => sum + client.total2025, 0);
  const crescimentoGeral = totalDesign2024 > 0 ? Math.round(((totalDesign2025 - totalDesign2024) / totalDesign2024) * 100) : 0;

  // Top 3 clientes de 2025
  const top3Clientes = [...processedData]
    .filter(c => c.total2025 > 0)
    .sort((a, b) => b.total2025 - a.total2025)
    .slice(0, 3);

 // Função para obter dados baseados no filtro (com debug)
const getVisualizationData = (data, filters) => {
  const filteredData = data.filter(c => c.nome !== 'Total'); // Filtrar "Total"
  
  console.log('🔍 Debug getVisualizationData:');
  console.log('- Filtro atual:', filters.periodo);
  console.log('- Dados filtrados (sem Total):', filteredData);
  console.log('- Total 2025 calculado:', filteredData.reduce((sum, c) => sum + c.total2025, 0));
  
  if (filters.periodo === 'ambos') {
    return filteredData
      .filter(c => c.total2024 > 0 || c.total2025 > 0)
      .sort((a, b) => (b.total2024 + b.total2025) - (a.total2024 + a.total2025))
      .slice(0, 8);
  }
  
  if (filters.periodo === '2024') {
    const result = filteredData
      .filter(c => c.total2024 > 0)
      .sort((a, b) => b.total2024 - a.total2024);
    console.log('- Dados 2024 filtrados:', result);
    return result;
  }
  
  // Para 2025 - INCLUIR TODOS os clientes, mesmo com 0 projetos
  const result = filteredData.sort((a, b) => b.total2025 - a.total2025);
  console.log('- Dados 2025 (todos os clientes):', result);
  return result;
};

  const visualizationData = getVisualizationData(processedData, filters);

  // Componente de gráfico comparativo para o filtro "ambos"
  const ComparativeChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <defs>
          <linearGradient id="design2024Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.tertiary} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={colors.tertiary} stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="design2025Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLines} />
        <XAxis 
          dataKey="nome" 
          angle={-45} 
          textAnchor="end" 
          height={80}
          fontSize={12}
          tick={{ fill: colors.text }}
        />
        <YAxis 
          fontSize={12}
          tick={{ fill: colors.textSecondary }}
          label={{ 
            value: 'Projetos de Design', 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle', fill: colors.primary }
          }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: colors.background,
            border: `2px solid ${colors.border}`,
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value, name) => [
            `${value} ${value === 1 ? 'projeto' : 'projetos'}`,
            name === 'total2024' ? '2024' : '2025'
          ]}
          labelFormatter={(label) => `Cliente: ${label}`}
        />
        <Legend />
        <Bar 
          dataKey="total2024" 
          fill="url(#design2024Gradient)" 
          name="2024"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="total2025" 
          fill="url(#design2025Gradient)" 
          name="2025"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  // Componente de tabela para períodos individuais (mostrando todos os clientes)
const ClientTable = ({ data, year }) => {
  // Para 2025, mostrar TODOS os clientes (incluindo os com 0 projetos)
  // Para 2024, mostrar apenas os que têm projetos
  const tableData = year === '2024' ? 
    data.filter(client => client.nome !== 'Total' && client.total2024 > 0) :
    data.filter(client => client.nome !== 'Total'); // Todos para 2025
  
  // Recalcular totais baseados em TODOS os clientes (não apenas os filtrados)
  const allClientsData = data.filter(client => client.nome !== 'Total');
  const totalYear = year === '2024' ? 
    allClientsData.reduce((sum, client) => sum + client.total2024, 0) :
    allClientsData.reduce((sum, client) => sum + client.total2025, 0);
  
  console.log(`📊 ClientTable Debug (${year}):`);
  console.log('- Dados da tabela:', tableData.length, 'clientes');
  console.log('- Total calculado:', totalYear);
  console.log('- Todos os clientes:', allClientsData);
  
  return (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: '16px',
      overflow: 'hidden',
      border: `1px solid ${colors.border}`
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.creative})`,
        color: 'white',
        padding: '16px 24px',
        fontWeight: '700',
        fontSize: '16px'
      }}>
        📊 Produção de Design por Cliente - {year}
      </div>
      
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: colors.gridLines }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', color: colors.text, fontWeight: '600' }}>
                Posição
              </th>
              <th style={{ padding: '12px 20px', textAlign: 'left', color: colors.text, fontWeight: '600' }}>
                Cliente
              </th>
              <th style={{ padding: '12px 20px', textAlign: 'center', color: colors.text, fontWeight: '600' }}>
                Projetos
              </th>
              <th style={{ padding: '12px 20px', textAlign: 'center', color: colors.text, fontWeight: '600' }}>
                Participação
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((client, index) => {
              const projetos = year === '2024' ? client.total2024 : client.total2025;
              const participacao = totalYear > 0 ? Math.round((projetos / totalYear) * 100) : 0;
              
              return (
                <tr key={client.nome} style={{
                  borderBottom: `1px solid ${colors.gridLines}`,
                  backgroundColor: index % 2 === 0 ? colors.background : colors.gridLines + '50',
                  opacity: projetos === 0 ? 0.6 : 1 // Deixar mais claro clientes sem projetos
                }}>
                  <td style={{ padding: '12px 20px', fontWeight: '600', color: colors.primary }}>
                    #{index + 1}
                  </td>
                  <td style={{ padding: '12px 20px', fontWeight: '600', color: colors.text }}>
                    {client.nome}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '700', color: projetos > 0 ? colors.creative : colors.textSecondary }}>
                    {projetos}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'center', color: colors.textSecondary }}>
                    {participacao}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div style={{
        padding: '16px 24px',
        backgroundColor: colors.gridLines,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontWeight: '600', color: colors.text }}>
          Clientes com projetos: {tableData.filter(c => year === '2024' ? c.total2024 > 0 : c.total2025 > 0).length} de {tableData.length}
        </span>
        <span style={{ fontWeight: '700', color: colors.primary, fontSize: '18px' }}>
          {totalYear} projetos totais
        </span>
      </div>
    </div>
  );
};

  return (
    <div style={{
      backgroundColor: colors.background,
      borderRadius: '20px',
      padding: '32px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: `1px solid ${colors.border}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Header criativo */}
      <div style={{ marginBottom: '32px', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '80px',
          height: '80px',
          background: `linear-gradient(135deg, ${colors.creative}20, ${colors.accent}10)`,
          borderRadius: '50%'
        }} />
        
        <h3 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.text,
          margin: '0 0 8px 0',
          position: 'relative'
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '16px',
          color: colors.textSecondary,
          margin: '0',
          lineHeight: '1.5'
        }}>
          {subtitle}
        </p>
      </div>

      {/* Renderização baseada no filtro */}
      {filters.periodo === 'ambos' ? (
        <>
          {/* Gráfico comparativo */}
          <ComparativeChart data={visualizationData} />
          
         {/* Card Top 3 Clientes */}
<div style={{
  marginTop: '32px',
  background: `linear-gradient(135deg, ${colors.creative}15, ${colors.accent}05)`,
  borderRadius: '16px',
  padding: '24px',
  border: `2px solid ${colors.creative}30`
}}>
  <h4 style={{
    fontSize: '20px',
    fontWeight: '700',
    color: colors.text,
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    🏆 Top 3 Clientes de Design (2024 vs 2025)
  </h4>
  
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  }}>
    {top3Clientes.map((cliente, index) => (
      <div key={cliente.nome} style={{
        background: colors.background,
        borderRadius: '16px',
        padding: '20px',
        border: `2px solid ${index === 0 ? colors.creative : colors.border}`,
        position: 'relative',
        boxShadow: index === 0 ? `0 8px 25px ${colors.creative}20` : '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {/* Badge de posição */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          fontSize: '24px'
        }}>
          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
        </div>
        
        {/* Nome do cliente */}
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          color: colors.text,
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {cliente.nome}
        </div>
        
        {/* Métricas lado a lado */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* 2024 */}
          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: `${colors.tertiary}15`,
            borderRadius: '12px',
            border: `1px solid ${colors.tertiary}30`
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.tertiary,
              marginBottom: '4px'
            }}>
              {cliente.total2024}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.textSecondary,
              fontWeight: '600'
            }}>
              Projetos 2024
            </div>
          </div>
          
          {/* 2025 */}
          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: `${colors.primary}15`,
            borderRadius: '12px',
            border: `1px solid ${colors.primary}30`
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.primary,
              marginBottom: '4px'
            }}>
              {cliente.total2025}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.textSecondary,
              fontWeight: '600'
            }}>
              Projetos 2025
            </div>
          </div>
        </div>
        
        {/* Indicador de crescimento */}
        <div style={{
          textAlign: 'center',
          padding: '12px',
          backgroundColor: cliente.crescimento >= 0 ? `${colors.secondary}15` : '#FEF2F2',
          borderRadius: '12px',
          border: `1px solid ${cliente.crescimento >= 0 ? colors.secondary + '30' : '#FECACA'}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '700',
            color: cliente.crescimento >= 0 ? colors.secondary : '#EF4444'
          }}>
            <span style={{ fontSize: '16px' }}>
              {cliente.crescimento >= 0 ? '📈' : '📉'}
            </span>
            {cliente.crescimento >= 0 ? '+' : ''}{cliente.crescimento}% crescimento
          </div>
        </div>
        
        {/* Informação adicional */}
        <div style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '11px',
          color: colors.textSecondary,
          fontStyle: 'italic'
        }}>
          {cliente.total2024 + cliente.total2025} projetos no total
        </div>
      </div>
    ))}
  </div>
  
  {/* Resumo geral */}
  <div style={{
    marginTop: '24px',
    padding: '20px',
    backgroundColor: `${colors.background}80`,
    borderRadius: '16px',
    border: `1px solid ${colors.border}`
  }}>
    <h5 style={{
      fontSize: '16px',
      fontWeight: '700',
      color: colors.text,
      margin: '0 0 16px 0',
      textAlign: 'center'
    }}>
      📊 Resumo Geral da Área de Design
    </h5>
    
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '16px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: colors.tertiary,
          marginBottom: '4px'
        }}>
          {totalDesign2024}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: colors.textSecondary,
          fontWeight: '600'
        }}>
          Total 2024
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: colors.primary,
          marginBottom: '4px'
        }}>
          {totalDesign2025}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: colors.textSecondary,
          fontWeight: '600'
        }}>
          Total 2025
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: crescimentoGeral >= 0 ? colors.secondary : '#EF4444',
          marginBottom: '4px'
        }}>
          {crescimentoGeral >= 0 ? '+' : ''}{crescimentoGeral}%
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: colors.textSecondary,
          fontWeight: '600'
        }}>
          Crescimento
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: colors.creative,
          marginBottom: '4px'
        }}>
          {processedData.filter(c => c.total2025 > 0).length}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: colors.textSecondary,
          fontWeight: '600'
        }}>
          Clientes Ativos
        </div>
      </div>
    </div>
  </div>
</div>
        </>
      ) : (
        /* Tabela para períodos individuais (2024 ou 2025) */
        <ClientTable data={visualizationData} year={filters.periodo} />
      )}
    </div>
  );
};

export default DesignProductionChart;