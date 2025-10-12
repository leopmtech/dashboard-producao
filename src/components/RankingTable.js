// ==========================================
// src/components/RankingTable.jsx
// Ranking com coluna extra "🧾 Demandas"
// ==========================================
import React from 'react';

const RankingTable = ({ data, title, subtitle, dataKey = "media2025", orders = null }) => {
  console.log('📋 [RANKING TABLE v2] Dados recebidos:', {
    length: data?.length || 0,
    dataKey,
    orders: Array.isArray(orders) ? orders.length : '—'
  });

  // Mapa Cliente -> nº de demandas a partir das ordens originais
  const demandasPorCliente = React.useMemo(() => {
    if (!orders || !Array.isArray(orders)) return null;
    const map = {};
    for (const o of orders) {
      const nome = (o?.cliente1 || '').trim();
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

    const processed = data.map((item, index) => {
      const clienteNome = item.cliente || `Cliente ${index + 1}`;
      // Preferir contagem vinda das ordens; se não houver, usar total agregado como fallback
      const demandas = (demandasPorCliente && demandasPorCliente[clienteNome]) ?? item.total ?? 0;

      if (dataKey === "media2025") {
        const media2025 = item.media2025 || (item.total ? Math.round((item.total / 5) * 10) / 10 : 0);
        const media2024 = item.media2024 || 0;
        const crescimento = media2024 > 0 ? Math.round(((media2025 - media2024) / media2024) * 100) : 0;

        return {
          ranking: index + 1,
          cliente: clienteNome,
          media2024,
          media2025,
          crescimento,
          total2024: item.total2024 || 0,
          total2025: item.total2025 || item.total || 0,
          demandas, // 👈 nova info
        };
      } else {
        const valor = item.total || item.valor || 0;
        const media = item.media || (valor > 0 ? Math.round((valor / 5) * 10) / 10 : 0);

        return {
          ranking: index + 1,
          cliente: clienteNome,
          total: valor,
          media,
          valor,
          demandas, // 👈 nova info
        };
      }
    });

    // Ordenar por média 2025 ou total conforme o caso
    const sorted = processed
      .filter(item => (dataKey === "media2025" ? item.media2025 > 0 : item.total > 0))
      .sort((a, b) => (dataKey === "media2025" ? b.media2025 - a.media2025 : b.total - a.total))
      .map((item, idx) => ({ ...item, ranking: idx + 1 }));

    console.log('📋 Dados processados para tabela:', sorted);
    return sorted;
  }, [data, dataKey, demandasPorCliente]);

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
      {subtitle && <p className="chart-subtitle">{subtitle}</p>
      }

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
                    📈 Média 2025<br />
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
            {processedData.map((item, index) => (
              <tr
                key={`${item.cliente}-${index}`}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  backgroundColor: index % 2 === 0 ? '#FAFBFC' : 'white',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.target.parentElement.style.backgroundColor = '#F0F9FF')}
                onMouseLeave={(e) => (e.target.parentElement.style.backgroundColor = index % 2 === 0 ? '#FAFBFC' : 'white')}
              >
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : '#6B7280',
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
                      {item.media2024.toFixed(1)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#FF6B47', fontWeight: '600' }}>
                      {item.media2025.toFixed(1)}
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
                      {item.total.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#6B7280' }}>
                      {item.media.toFixed(1)}
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

      {/* Resumo Estatístico */}
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
            {processedData.length}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
            Clientes Analisados
          </div>
        </div>

        {dataKey === "media2025" && (
          <>
            <div style={{
              padding: '16px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
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
                {Math.round(processedData.reduce((sum, item) => sum + item.crescimento, 0) / processedData.length)}%
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
        border: '1px solid #E2E8F0',
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
