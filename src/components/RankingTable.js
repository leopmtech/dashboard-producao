// ==========================================
// src/components/RankingTable.js
// Ranking com coluna extra "🧾 Demandas" + Paginação + Cálculo de médias robusto
// ==========================================
import React from 'react';

const MONTH_KEYS = [
  'janeiro','fevereiro','marco','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro'
];

/** Conta meses com dado (>0) dentro de um item (caso ele traga os meses) */
function inferMesesValidosPorItem(item) {
  try {
    const hasMonthKeys = MONTH_KEYS.some(k => k in (item || {}));
    if (!hasMonthKeys) return 0;
    return MONTH_KEYS.reduce((acc, k) => acc + ((item?.[k] || 0) > 0 ? 1 : 0), 0);
  } catch {
    return 0;
  }
}

/** Conta meses com dado (>0) no dataset inteiro (se houver colunas mensais nos itens) */
function inferMesesValidosGlobal(data = []) {
  try {
    if (!Array.isArray(data) || data.length === 0) return 0;
    return MONTH_KEYS.reduce((acc, k) => {
      const hasAny = data.some(d => (d?.[k] || 0) > 0);
      return acc + (hasAny ? 1 : 0);
    }, 0);
  } catch {
    return 0;
  }
}

/** Fallback seguro para calcular média mensal quando não vier pronta */
function calcularMediaMensalFallback(item, total, dataset) {
  // Prioriza metadados caso já venham no item
  const metaMeses = item?.mesesComDados || item?._meses || item?.divisorMeses || 0;
  let meses = Number(metaMeses) || inferMesesValidosPorItem(item) || inferMesesValidosGlobal(dataset);
  if (!meses || meses <= 0) meses = 5; // fallback final para compat com UI existente
  return total > 0 ? Math.round((total / meses) * 10) / 10 : 0;
}

const RankingTable = ({
  data,
  title,
  subtitle,
  dataKey = "media2025",
  orders = null,
  totalUniqueClients = null,
  pageSize = 10,            // ✅ paginação configurável
  initialPage = 1           // ✅ permite iniciar em outra página
}) => {
  console.log('📋 [RANKING TABLE v3] Dados recebidos:', {
    length: data?.length || 0,
    dataKey,
    orders: Array.isArray(orders) ? orders.length : '—',
    totalUniqueClients,
    pageSize
  });

  const [currentPage, setCurrentPage] = React.useState(initialPage);
  const [activeTab, setActiveTab] = React.useState('todos'); // Nova aba ativa

  // Empresas do grupo - exatamente essas 4 empresas únicas
  const empresasGrupo = ['Inpacto', 'STA', 'Listening', 'Holding'];
  
  // Mapa Cliente -> nº de demandas a partir das ordens originais
  const demandasPorCliente = React.useMemo(() => {
    if (!orders || !Array.isArray(orders)) return null;
    const map = {};
    for (const o of orders) {
      const nome = (o?.cliente1 || o?.cliente || '').trim();
      if (!nome) continue;
      map[nome] = (map[nome] || 0) + 1;
    }
    return map;
  }, [orders]);

  // Processar dados da planilha Google Sheets
  const processedData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('📋 Nenhum dado válido recebido');
      return [];
    }

    // Filtrar dados baseado na aba ativa
    let filteredData = data;
    if (activeTab === 'grupo') {
      filteredData = data.filter(item => {
        const clienteNome = (item.cliente || '').trim();
        // Busca exata por nome da empresa (case-insensitive)
        return empresasGrupo.some(empresa => 
          clienteNome.toLowerCase() === empresa.toLowerCase()
        );
      });
      
      console.log('🏢 [EMPRESAS DO GRUPO] Filtradas:', {
        totalOriginal: data.length,
        filtradas: filteredData.length,
        empresasEncontradas: filteredData.map(item => item.cliente)
      });
    }

    const processed = filteredData.map((item, index) => {
      const clienteNome = item.cliente || `Cliente ${index + 1}`;
      // Preferir contagem vinda das ordens; se não houver, usar total agregado como fallback
      const demandas = (demandasPorCliente && demandasPorCliente[clienteNome]) ?? item.total ?? 0;

      if (dataKey === "media2025") {
        // Preferir valores já processados pelo serviço
        const media2025 =
          typeof item.media2025 === 'number'
            ? item.media2025
            : calcularMediaMensalFallback(item, (item.total2025 ?? item.total ?? 0), data);

        const media2024 =
          typeof item.media2024 === 'number'
            ? item.media2024
            : calcularMediaMensalFallback(item, (item.total2024 ?? 0), data);

        const crescimento = media2024 > 0
          ? Math.round(((media2025 - media2024) / media2024) * 100)
          : (media2025 > 0 ? 100 : 0);

        return {
          ranking: index + 1,
          cliente: clienteNome,
          media2024: Number.isFinite(media2024) ? media2024 : 0,
          media2025: Number.isFinite(media2025) ? media2025 : 0,
          crescimento,
          total2024: item.total2024 || 0,
          total2025: item.total2025 || item.total || 0,
          demandas, // 👈 nova info
        };
      } else {
        const valor = item.total ?? item.valor ?? 0;
        const media =
          typeof item.media === 'number'
            ? item.media
            : calcularMediaMensalFallback(item, valor, data);

        return {
          ranking: index + 1,
          cliente: clienteNome,
          total: valor,
          media: Number.isFinite(media) ? media : 0,
          valor,
          demandas, // 👈 nova info
        };
      }
    });

    // Ordenar por média 2025 ou total conforme o caso (sem limite de 10!)
    const sorted = processed
      .filter(item => (dataKey === "media2025" ? item.media2025 > 0 : item.total > 0))
      .sort((a, b) => (dataKey === "media2025" ? b.media2025 - a.media2025 : b.total - a.total))
      .map((item, idx) => ({ ...item, ranking: idx + 1 }));

    console.log('📋 Dados processados para tabela:', sorted.length);
    return sorted;
  }, [data, dataKey, demandasPorCliente, activeTab]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil((processedData.length || 0) / pageSize));
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return processedData.slice(start, end);
  }, [processedData, currentPage, pageSize]);

  React.useEffect(() => {
    // Se a página atual ficou fora do total após filtros, volta para 1
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  React.useEffect(() => {
    // Resetar página quando a aba muda
    setCurrentPage(1);
  }, [activeTab]);

  // Função para determinar cor baseada no crescimento
  const getGrowthColor = (crescimento) => {
    if (crescimento >= 50) return '#10B981'; // Verde - Excelente
    if (crescimento >= 20) return '#F59E0B'; // Amarelo - Bom
    if (crescimento >= 0) return '#6B7280';  // Cinza - Estável
    return '#EF4444'; // Vermelho - Declínio
  };

  // Função para obter ícone de crescimento
  const getGrowthIcon = (crescimento) => {
    if (crescimento >= 20) return '🚀';
    if (crescimento > 0) return '📈';
    if (crescimento === 0) return '➡️';
    return '📉';
  };

  if (!processedData || processedData.length === 0) {
    return (
      <div className="chart-container modern">
        <h3 className="chart-title">{title}</h3>
        {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        <div style={{
          height: '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          border: '2px dashed #D1D5DB',
          borderRadius: '12px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ fontSize: '3rem' }}>📊</div>
          <div style={{ color: '#6B7280', fontSize: '1.1rem', fontWeight: '500' }}>
            Aguardando dados da planilha Google Sheets
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>
            Verifique a conectividade com a API
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container modern">
      <h3 className="chart-title">{title}</h3>
      {subtitle && <p className="chart-subtitle">{subtitle}</p>}

      {/* Sistema de Abas */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => setActiveTab('todos')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            background: activeTab === 'todos' ? '#FF6B47' : '#F8FAFC',
            color: activeTab === 'todos' ? 'white' : '#6B7280',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'todos' ? '2px solid #FF6B47' : '2px solid transparent'
          }}
        >
          📊 Todos os Clientes
        </button>
        <button
          onClick={() => setActiveTab('grupo')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            background: activeTab === 'grupo' ? '#FF6B47' : '#F8FAFC',
            color: activeTab === 'grupo' ? 'white' : '#6B7280',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            borderBottom: activeTab === 'grupo' ? '2px solid #FF6B47' : '2px solid transparent'
          }}
        >
          🏢 Empresas do Grupo
        </button>
      </div>

      {/* Tabela de Ranking */}
      <div style={{
        overflowX: 'auto',
        marginBottom: '20px',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        backgroundColor: 'white'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.9rem'
        }}>
          <thead style={{ backgroundColor: '#FF6B47', color: 'white' }}>
            <tr>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600' }}>🏆 Ranking</th>
              <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '600' }}>🏢 Cliente</th>

              {dataKey === "media2025" ? (
                <>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '600' }}>
                    📊 Média 2024<br />
                    <span style={{ fontSize: '0.75rem', opacity: '0.9' }}>(rel/mês)</span>
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '600' }}>
                    📊 Média 2025<br />
                    <span style={{ fontSize: '0.75rem', opacity: '0.9' }}>(rel/mês)</span>
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '600' }}>
                    📈 Crescimento
                  </th>
                  {/* NOVA COLUNA */}
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '600' }}>
                    🧾 Demandas
                  </th>
                </>
              ) : (
                <>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '600' }}>
                    📊 Total
                  </th>
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '600' }}>
                    📈 Média/Mês
                  </th>
                  {/* NOVA COLUNA */}
                  <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '600' }}>
                    🧾 Demandas
                  </th>
                </>
              )}
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((item, index) => (
              <tr
                key={`${item.cliente}-${(currentPage - 1) * pageSize + index}`}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: index % 2 === 0 ? '#FAFBFC' : 'white',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0F9FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#FAFBFC' : 'white')}
              >
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: item.ranking <= 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][item.ranking - 1] : '#6B7280',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    margin: '0 auto'
                  }}>
                    {item.ranking}
                  </div>
                </td>

                <td style={{ padding: '12px', fontWeight: '600', color: '#2C3E50' }}>
                  {item.cliente}
                </td>

                {dataKey === "media2025" ? (
                  <>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6B7280' }}>
                      {Number(item.media2024 || 0).toFixed(1)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#FF6B47', fontWeight: '600' }}>
                      {Number(item.media2025 || 0).toFixed(1)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        color: getGrowthColor(item.crescimento),
                        fontWeight: '600'
                      }}>
                        <span>{getGrowthIcon(item.crescimento)}</span>
                        <span>{item.crescimento > 0 ? '+' : ''}{item.crescimento}%</span>
                      </div>
                    </td>
                    {/* Célula de Demandas */}
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                      {Number(item.demandas || 0).toLocaleString('pt-BR')}
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#FF6B47', fontWeight: '600' }}>
                      {Number(item.total || 0).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6B7280' }}>
                      {Number(item.media || 0).toFixed(1)}
                    </td>
                    {/* Célula de Demandas */}
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>
                      {Number(item.demandas || 0).toLocaleString('pt-BR')}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação - Mesmo padrão da tabela de tipos */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          padding: '12px 16px',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{ color: '#64748B', fontSize: '0.9rem' }}>
            Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, processedData.length)} de {processedData.length} clientes
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                background: currentPage === 1 ? '#F3F4F6' : '#FFF',
                color: currentPage === 1 ? '#9CA3AF' : '#374151',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              ««
            </button>
            
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                background: currentPage === 1 ? '#F3F4F6' : '#FFF',
                color: currentPage === 1 ? '#9CA3AF' : '#374151',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              «
            </button>

            {/* Páginas numeradas */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    background: currentPage === pageNum ? '#FF6B47' : '#FFF',
                    color: currentPage === pageNum ? '#FFF' : '#374151',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    minWidth: '40px'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                background: currentPage === totalPages ? '#F3F4F6' : '#FFF',
                color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              »
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                background: currentPage === totalPages ? '#F3F4F6' : '#FFF',
                color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              »»
            </button>
          </div>
        </div>
      )}

      {/* 🔧 RESUMO ESTATÍSTICO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginTop: '20px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF6B47' }}>
            {totalUniqueClients || processedData.length}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
            Clientes Únicos Disponíveis
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#E0F2FE',
          border: '1px solid #7DD3FC',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0284C7' }}>
            {processedData.length}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#0369A1' }}>
            No Ranking Atual
          </div>
        </div>

        {dataKey === "media2025" && (
          <>
            <div style={{
              padding: '16px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',   // ✅ corrigido (sem aspas aninhadas)
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>
                {processedData.filter(item => item.crescimento > 0).length}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#059669' }}>
                Em Crescimento
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FED7AA',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F59E0B' }}>
                {Math.round(processedData.reduce((sum, item) => sum + (item.crescimento || 0), 0) / processedData.length)}%
              </div>
              <div style={{ fontSize: '0.9rem', color: '#D97706' }}>
                Crescimento Médio
              </div>
            </div>
          </>
        )}

        <div style={{
          padding: '16px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#EF4444' }}>
            {processedData[0]?.cliente || 'N/A'}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#DC2626' }}>
            Líder do Ranking
          </div>
        </div>
      </div>

      {/* Fonte dos dados */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',  // ✅ conferido
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#6B7280',
        textAlign: 'center'
      }}>
        📊 Dados atualizados em tempo real via Google Sheets API •
        Última sincronização: {new Date().toLocaleString('pt-BR')}
      </div>
    </div>
  );
};

export default RankingTable;
