import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DataProcessingService } from '../services/dataProcessingService';

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

  // 🎯 Filtrar demandas do Gustavo Oliveira (a partir de orders)
  const filterGustavoOliveiraData = (rawData) => {
    console.log('👨‍🎨 [GUSTAVO FILTER] Filtrando dados do Gustavo Oliveira...');
    
    if (!rawData || !Array.isArray(rawData)) {
      console.log('👨‍🎨 [GUSTAVO FILTER] ⚠️ Dados inválidos ou não é array');
      return [];
    }

    // Variações do nome para busca flexível
    const nomeVariacoes = [
      'gustavo oliveira',
      // manter variação curta por compatibilidade com dados antigos, mas priorizar match completo
      'gustavo',
    ];

    const dadosGustavo = rawData.filter(item => {
      if (!item || typeof item !== 'object') return false;

      // Campos onde o nome pode aparecer
      const camposParaBuscar = [
        item.quemExecuta,
        item.criadoPor,
        item.responsavel,
        item.designer,
        item.profissional,
        item.executor,
        item.analista,
        item.autor,
        item.equipe,
        item['Quem executa'],
        item['Criado por'],
        item['Responsável'],
        item['Designer'],
        item['Profissional']
      ];

      // Buscar em todos os campos possíveis
      const encontrado = camposParaBuscar.some(campo => {
        if (!campo) return false;
        
        const campoLower = String(campo).toLowerCase();
        
        // Verificar se alguma variação do nome está no campo
        return nomeVariacoes.some(nome => campoLower.includes(nome));
      });

      if (encontrado) {
        console.log('👨‍🎨 [GUSTAVO FILTER] ✅ Encontrado registro do Gustavo:', {
          id: item.id,
          cliente: item.cliente,
          tipoDemanda: item.tipoDemanda,
          quemExecuta: item.quemExecuta,
          criadoPor: item.criadoPor,
          dataEntrega: item.dataEntrega
        });
      }

      return encontrado;
    });

    console.log(`👨‍🎨 [GUSTAVO FILTER] Resultado: ${dadosGustavo.length} registros do Gustavo de ${rawData.length} totais`);
    console.log('👨‍🎨 [GUSTAVO FILTER] Clientes com trabalho do Gustavo:', 
      [...new Set(dadosGustavo.map(item => item.cliente))].filter(Boolean)
    );

    return dadosGustavo;
  };

  // ✅ Reproduz o cálculo de “Clientes Únicos Disponíveis” (App.js):
  // DataProcessingService.getUniqueClients({ originalOrders })
  // Aqui aplicado apenas às demandas do Gustavo (e respeitando o período do filtro).
  const clientesAtendidosCount = React.useMemo(() => {
    try {
      const baseOrders = Array.isArray(data?.originalOrders) ? data.originalOrders : (Array.isArray(data) ? data : []);
      if (!baseOrders || baseOrders.length === 0) return 0;

      const gustavoOrders = filterGustavoOliveiraData(baseOrders);

      const periodo = filters?.periodo || '2025';
      const byPeriod = gustavoOrders.filter(o => {
        const v = o?.dataEntregaDate || o?.dataEntrega;
        if (!v) return false; // sem data -> não entra em recortes por ano
        const s = String(v);
        const year = /^\d{4}-/.test(s) ? parseInt(s.slice(0, 4), 10) : new Date(v).getFullYear();
        if (periodo === 'ambos') return year === 2024 || year === 2025;
        if (periodo === '2024') return year === 2024;
        if (periodo === '2025') return year === 2025;
        return true;
      });

      return DataProcessingService.getUniqueClients({ originalOrders: byPeriod }).length || 0;
    } catch (e) {
      console.warn('⚠️ [GUSTAVO] Falha ao calcular clientes atendidos:', e?.message || e);
      return 0;
    }
  }, [data, filters?.periodo]);

  // Função para processar dados de design (MODIFICADA PARA GUSTAVO)
  const processDesignData = (rawData) => {
    console.log('🎨 Processando produção do Gustavo - fonte:', {
      hasOriginalOrders: !!rawData?.originalOrders,
      originalOrdersCount: rawData?.originalOrders?.length || 0,
      hasDesign: !!rawData?.design,
      isArray: Array.isArray(rawData),
      hasDataArray: Array.isArray(rawData?.data),
    });
    
    if (!rawData) {
      console.log('⚠️ Sem dados de design, usando fallback');
      return getFallbackDataGustavoCorretos();
    }

    // ✅ Fonte correta: sempre usar as demandas (orders)
    // `data.design` no app é uma coleção agregada por cliente, NÃO são as demandas.
    let dadosParaProcessar = [];
    if (rawData.originalOrders && Array.isArray(rawData.originalOrders)) {
      dadosParaProcessar = rawData.originalOrders;
    } else if (Array.isArray(rawData)) {
      dadosParaProcessar = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      dadosParaProcessar = rawData.data;
    } else {
      console.log('⚠️ Estrutura de dados não reconhecida (sem originalOrders), usando fallback');
      return getFallbackDataGustavoCorretos();
    }

    // 🎯 FILTRAR APENAS TRABALHOS DO GUSTAVO
    const dadosGustavo = filterGustavoOliveiraData(dadosParaProcessar);
    
    if (dadosGustavo.length === 0) {
      console.log('⚠️ Nenhum registro do Gustavo encontrado, usando fallback');
      return getFallbackDataGustavoCorretos();
    }

    // Agrupar por cliente e calcular totais
    const clientesMap = {};

    dadosGustavo.forEach(item => {
      const cliente = (item.cliente || item.cliente1 || '').toString().trim() || 'Cliente Não Informado';
      if (cliente === 'Total') return;
      if (!clientesMap[cliente]) {
        clientesMap[cliente] = {
          nome: cliente,
          total2024: 0,
          total2025: 0,
          jan2025: 0,
          fev2025: 0,
          mar2025: 0,
          abr2025: 0,
          mai2025: 0,
          jun2025: 0,
          jul2025: 0,
          ago2025: 0,
          set2025: 0,
          out2025: 0,
          nov2025: 0,
          dez2025: 0
        };
      }

      // Determinar o ano
      let ano = null;
      const dataEntrega = item.dataEntregaDate || item.dataEntrega;
      if (dataEntrega) {
        try {
          const dt = (dataEntrega instanceof Date) ? dataEntrega : new Date(dataEntrega);
          ano = Number.isNaN(dt.getTime()) ? null : dt.getFullYear();
        } catch (error) {
          console.warn('Data inválida:', dataEntrega);
        }
      }

      // Contar por ano
      if (ano === 2024) {
        clientesMap[cliente].total2024++;
      } else if (ano === 2025) {
        clientesMap[cliente].total2025++;
        
        // Contar por mês (2025)
        try {
          const dt = (dataEntrega instanceof Date) ? dataEntrega : new Date(dataEntrega);
          const mes = dt.getMonth();
          const meses = ['jan2025', 'fev2025', 'mar2025', 'abr2025', 'mai2025', 
                        'jun2025', 'jul2025', 'ago2025', 'set2025', 'out2025', 'nov2025', 'dez2025'];
          if (meses[mes]) {
            clientesMap[cliente][meses[mes]]++;
          }
        } catch (error) {
          console.warn('Erro ao processar mês:', dataEntrega);
        }
      }
    });

    // Converter para array e calcular crescimento
    const designData = Object.values(clientesMap).map(item => {
      const crescimento = item.total2024 > 0 ? 
        Math.round(((item.total2025 - item.total2024) / item.total2024) * 100) : 
        (item.total2025 > 0 ? 100 : 0);

      console.log(`📊 Cliente ${item.nome} (Gustavo): 2024=${item.total2024}, 2025=${item.total2025}`);

      return { ...item, crescimento };
    });

    const totalCalculado2025 = designData.reduce((sum, client) => sum + client.total2025, 0);
    console.log('✅ Dados de design do Gustavo processados:', designData.length, 'clientes');
    console.log(`📈 Total 2025 do Gustavo: ${totalCalculado2025} projetos`);
    
    return designData;
  };

  // Dados de fallback específicos do Gustavo (ATUALIZE COM DADOS REAIS)
  const getFallbackDataGustavoCorretos = () => {
    console.log('👨‍🎨 [FALLBACK] Usando dados de fallback do Gustavo Oliveira');
    
    return [
      { nome: 'In.Pacto', total2024: 12, total2025: 14, crescimento: 17, jan2025: 1, fev2025: 4, mar2025: 3, abr2025: 2, mai2025: 2, jun2025: 2 },
      { nome: 'STA', total2024: 3, total2025: 4, crescimento: 33, jan2025: 2, fev2025: 1, mar2025: 1, abr2025: 0, mai2025: 0, jun2025: 0 },
      { nome: 'MIDR', total2024: 1, total2025: 3, crescimento: 200, jan2025: 0, fev2025: 0, mar2025: 1, abr2025: 1, mai2025: 0, jun2025: 1 },
      { nome: 'ANP', total2024: 2, total2025: 2, crescimento: 0, jan2025: 0, fev2025: 1, mar2025: 0, abr2025: 0, mai2025: 1, jun2025: 0 },
      { nome: 'MS', total2024: 1, total2025: 2, crescimento: 100, jan2025: 0, fev2025: 1, mar2025: 0, abr2025: 1, mai2025: 0, jun2025: 0 },
      { nome: 'CFQ', total2024: 2, total2025: 1, crescimento: -50, jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 1, jun2025: 0 },
      { nome: 'GOVGO', total2024: 4, total2025: 1, crescimento: -75, jan2025: 1, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0 }
    ];
  };

  const processedData = processDesignData(data);

  // Calcular totais e estatísticas (agora apenas do Gustavo)
  const totalDesign2024 = processedData.reduce((sum, client) => sum + client.total2024, 0);
  const totalDesign2025 = processedData.reduce((sum, client) => sum + client.total2025, 0);
  const crescimentoGeral = totalDesign2024 > 0 ? Math.round(((totalDesign2025 - totalDesign2024) / totalDesign2024) * 100) : 0;

  // Top 3 clientes do Gustavo em 2025
  const top3Clientes = [...processedData]
    .filter(c => c.total2025 > 0)
    .sort((a, b) => b.total2025 - a.total2025)
    .slice(0, 3);

  // Função para obter dados baseados no filtro (com debug do Gustavo)
  const getVisualizationData = (data, filters) => {
    const filteredData = data.filter(c => c.nome !== 'Total');
    
    console.log('🔍 Debug getVisualizationData (Gustavo):');
    console.log('- Filtro atual:', filters.periodo);
    console.log('- Dados filtrados do Gustavo:', filteredData);
    console.log('- Total 2025 do Gustavo:', filteredData.reduce((sum, c) => sum + c.total2025, 0));
    
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
      console.log('- Dados 2024 do Gustavo:', result);
      return result;
    }
    
    const result = filteredData.sort((a, b) => b.total2025 - a.total2025);
    console.log('- Dados 2025 do Gustavo:', result);
    return result;
  };

  const visualizationData = getVisualizationData(processedData, filters);

  // Componente de gráfico comparativo para o filtro "ambos"
  const ComparativeChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <defs>
          <linearGradient id="gustavo2024Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.tertiary} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={colors.tertiary} stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="gustavo2025Gradient" x1="0" y1="0" x2="0" y2="1">
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
          labelFormatter={(label) => `Cliente: ${label} (Designer: Gustavo Oliveira)`}
        />
        <Legend />
        <Bar 
          dataKey="total2024" 
          fill="url(#gustavo2024Gradient)" 
          name="2024"
          radius={[4, 4, 0, 0]}
        />
        <Bar 
          dataKey="total2025" 
          fill="url(#gustavo2025Gradient)" 
          name="2025"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  // Componente de tabela para períodos individuais
  const ClientTable = ({ data, year }) => {
    const tableData = year === '2024' ? 
      data.filter(client => client.nome !== 'Total' && client.total2024 > 0) :
      data.filter(client => client.nome !== 'Total');
    
    const allClientsData = data.filter(client => client.nome !== 'Total');
    const totalYear = year === '2024' ? 
      allClientsData.reduce((sum, client) => sum + client.total2024, 0) :
      allClientsData.reduce((sum, client) => sum + client.total2025, 0);
    
    console.log(`📊 ClientTable Debug Gustavo (${year}):`);
    console.log('- Dados da tabela do Gustavo:', tableData.length, 'clientes');
    console.log('- Total do Gustavo:', totalYear);
    
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
          👨‍🎨 Produção de Design - Gustavo Oliveira - {year}
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
                    opacity: projetos === 0 ? 0.6 : 1
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
            Clientes atendidos pelo Gustavo: {tableData.filter(c => year === '2024' ? c.total2024 > 0 : c.total2025 > 0).length}
          </span>
          <span style={{ fontWeight: '700', color: colors.primary, fontSize: '18px' }}>
            {totalYear} projetos do Gustavo
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
      
      {/* Header criativo com identificação do Gustavo */}
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
          ��‍🎨 {title} - Gustavo Oliveira
        </h3>
        <p style={{
          fontSize: '16px',
          color: colors.textSecondary,
          margin: '0',
          lineHeight: '1.5'
        }}>
          {subtitle} | Portfólio exclusivo dos projetos de design executados por Gustavo Oliveira
        </p>
        
        {/* Badge indicativo */}
        <div style={{
          marginTop: '12px',
          display: 'inline-block',
          padding: '8px 16px',
          backgroundColor: `${colors.creative}15`,
          border: `1px solid ${colors.creative}30`,
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '600',
          color: colors.creative
        }}>
        </div>
      </div>

      {/* Renderização baseada no filtro */}
      {filters.periodo === 'ambos' ? (
        <>
          <ComparativeChart data={visualizationData} />
          
          {/* Card Top 3 Clientes do Gustavo */}
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
              🏆 Top 3 Clientes - Portfólio Design
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
                    {cliente.total2024 + cliente.total2025} projetos do Gustavo
                  </div>
                </div>
              ))}
            </div>
            
            {/* Resumo geral do Gustavo */}
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
                📊 Portfólio Completo
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
                    Projetos 2024
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
                    Projetos 2025
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
                    {clientesAtendidosCount || 0}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: colors.textSecondary,
                    fontWeight: '600'
                  }}>
                    Clientes Atendidos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <ClientTable data={visualizationData} year={filters.periodo} />
      )}
    </div>
  );
};

export default DesignProductionChart;