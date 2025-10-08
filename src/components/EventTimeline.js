import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Grid, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  UserPlus, 
  UserMinus, 
  FileText,
  Star,
  Milestone,
  Clock,
  BarChart3
} from 'lucide-react';

const EventTimeline = ({ data, title = "📅 Timeline de Eventos", onEventClick }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('ambos');
  const [viewMode, setViewMode] = useState('timeline');

  // Extrair dados da planilha - estrutura correta
  const planilhaData = useMemo(() => {
    if (!data) return { dados2024: [], dados2025: [] };
    
    return {
      dados2024: data.visaoGeral2024 || [],
      dados2025: data.visaoGeral || []
    };
  }, [data]);

const verificarChavesMeses = (dados2025) => {
  if (dados2025.length > 0) {
    const primeiroCliente = dados2025[0];
    console.log('Chaves disponíveis no cliente:', Object.keys(primeiroCliente));
    
    // Verificar se existe 'junho' vs outras variações
    const chavesJunho = Object.keys(primeiroCliente).filter(key => 
      key.toLowerCase().includes('jun')
    );
    console.log('Chaves relacionadas a junho:', chavesJunho);
  }
};

// 2. Função para normalizar chaves de meses
const normalizarChaveMes = (mes) => {
  const mapeamento = {
    'janeiro': ['janeiro', 'jan', 'january'],
    'fevereiro': ['fevereiro', 'fev', 'february'],
    'marco': ['março', 'mar', 'marco', 'march'],
    'abril': ['abril', 'abr', 'april'],
    'maio': ['maio', 'mai', 'may'],
    'junho': ['junho', 'jun', 'june'],
    'julho': ['julho', 'jul', 'july'],
    'agosto': ['agosto', 'ago', 'august'],
    'setembro': ['setembro', 'set', 'september'],
    'outubro': ['outubro', 'out', 'october'],
    'novembro': ['novembro', 'nov', 'november'],
    'dezembro': ['dezembro', 'dez', 'december']
  };
  
  for (const [chaveNormalizada, variacoes] of Object.entries(mapeamento)) {
    if (variacoes.includes(mes.toLowerCase())) {
      return chaveNormalizada;
    }
  }
  return mes;
};

// 3. Correção robusta para processar junho
const processarMeses2025 = (dados2025) => {
  const mesesInfo = [
    { nome: 'Janeiro', key: 'janeiro', num: '01' },
    { nome: 'Fevereiro', key: 'fevereiro', num: '02' },
    { nome: 'Março', key: 'marco', num: '03' },
    { nome: 'Abril', key: 'abril', num: '04' },
    { nome: 'Maio', key: 'maio', num: '05' },
    { nome: 'Junho', key: 'junho', num: '06' }
  ];

  // Verificar quais meses têm dados
  const mesesComDados = mesesInfo.filter(mes => {
    const total = dados2025.reduce((sum, cliente) => {
      const valor = cliente[mes.key] || 0;
      return sum + valor;
    }, 0);
    
    console.log(`${mes.nome} (${mes.key}): ${total} relatórios`);
    return total > 0;
  });

  console.log('Meses com dados disponíveis:', mesesComDados.map(m => m.nome));
  return mesesComDados;
};


  // Gerar eventos da timeline
  const timelineEvents = useMemo(() => {
    const { dados2024, dados2025 } = planilhaData;
    const eventos = [];

    const mesesInfo = [
      { nome: 'Janeiro', key: 'janeiro', num: '01' },
      { nome: 'Fevereiro', key: 'fevereiro', num: '02' },
      { nome: 'Março', key: 'marco', num: '03' },
      { nome: 'Abril', key: 'abril', num: '04' },
      { nome: 'Maio', key: 'maio', num: '05' },
      { nome: 'Junho', key: 'junho', num: '06' },
      { nome: 'Julho', key: 'julho', num: '07' },
      { nome: 'Agosto', key: 'agosto', num: '08' },
      { nome: 'Setembro', key: 'setembro', num: '09' },
      { nome: 'Outubro', key: 'outubro', num: '10' },
      { nome: 'Novembro', key: 'novembro', num: '11' },
      { nome: 'Dezembro', key: 'dezembro', num: '12' }
    ];

    // Marco da Nova Gestão (abril 2024)
    if (selectedPeriod === '2024' || selectedPeriod === 'ambos') {
      eventos.push({
        id: 'nova-gestao-2024',
        date: '2024-04-01',
        title: '🚀 Nova Gestão in.Pacto',
        description: 'Início da nova diretoria - marco transformacional',
        type: 'milestone',
        ano: 2024,
        mes: 'Abril',
        detalhes: 'Marco inicial da nova gestão da empresa'
      });
    }

    // Processar eventos de 2024
    if (selectedPeriod === '2024' || selectedPeriod === 'ambos') {
      mesesInfo.forEach((mes, index) => {
        const totalMes = dados2024.reduce((sum, cliente) => sum + (cliente[mes.key] || 0), 0);
        
        if (totalMes > 0) {
          // Analisar movimentações de clientes no mês
          const novosClientes = [];
          const clientesRetorno = [];
          const clientesParada = [];
          const clientesCrescimento = [];

          dados2024.forEach(cliente => {
            const producaoMes = cliente[mes.key] || 0;
            const producaoMesAnterior = index > 0 ? (cliente[mesesInfo[index-1].key] || 0) : 0;
            
            // Detectar retornos (estava zerado e voltou) - não em janeiro
            if (index > 0 && producaoMesAnterior === 0 && producaoMes >= 5) {
              clientesRetorno.push(`${cliente.cliente} (${producaoMes} relatórios)`);
            }
            
            // Detectar paradas (tinha produção e zerou)
            if (producaoMesAnterior >= 10 && producaoMes === 0) {
              clientesParada.push(`${cliente.cliente} (era ${producaoMesAnterior})`);
            }
            
            // Detectar crescimento significativo
            if (producaoMesAnterior > 0 && producaoMes > producaoMesAnterior * 2 && producaoMes >= 20) {
              clientesCrescimento.push(`${cliente.cliente} (${producaoMesAnterior}→${producaoMes})`);
            }
          });

          // Criar descrição consolidada
          let descricao = `${totalMes} relatórios produzidos`;
          const detalhes = [];
          
          if (clientesRetorno.length > 0) {
            detalhes.push(`🔄 Retornos: ${clientesRetorno.join(', ')}`);
          }
          if (clientesParada.length > 0) {
            detalhes.push(`⏸️ Paradas: ${clientesParada.join(', ')}`);
          }
          if (clientesCrescimento.length > 0) {
            detalhes.push(`📈 Crescimentos: ${clientesCrescimento.join(', ')}`);
          }

          // Determinar tipo do evento
          let tipo = 'production';
          if (mes.key === 'abril' || mes.key === 'maio') {
            tipo = 'post_management'; // Período pós nova gestão
          } else if (clientesCrescimento.length > 0) {
            tipo = 'growth';
          } else if (clientesParada.length > clientesRetorno.length) {
            tipo = 'decline';
          }

          eventos.push({
            id: `2024-${mes.key}`,
            date: `2024-${mes.num}-01`,
            title: `📊 ${mes.nome} 2024`,
            description: descricao,
            type: tipo,
            valor: totalMes,
            ano: 2024,
            mes: mes.nome,
            detalhes: detalhes.length > 0 ? detalhes.join(' • ') : undefined,
            movimentacoes: {
              retornos: clientesRetorno.length,
              paradas: clientesParada.length,
              crescimentos: clientesCrescimento.length
            }
          });
        }
      });
    }

    // Processar eventos de 2025
    if (selectedPeriod === '2025' || selectedPeriod === 'ambos') {
      // Apenas até junho 2025 (dados disponíveis)
      mesesInfo.slice(0, 7).forEach((mes, index) => {
        const totalMes = dados2025.reduce((sum, cliente) => sum + (cliente[mes.key] || 0), 0);
        
        if (totalMes > 0) {
          // Comparar com mesmo mês de 2024 para calcular crescimento
          const totalMes2024 = dados2024.reduce((sum, cliente) => sum + (cliente[mes.key] || 0), 0);
          const crescimento = totalMes2024 > 0 ? ((totalMes - totalMes2024) / totalMes2024) * 100 : 100;

          // Analisar movimentações de clientes no mês
          const novosClientes = [];
          const clientesRetorno = [];
          const clientesParada = [];
          const clientesCrescimento = [];

          dados2025.forEach(cliente => {
            const producaoMes = cliente[mes.key] || 0;
            const clienteEm2024 = dados2024.find(c => c.cliente === cliente.cliente);
            
            // Cliente novo em 2025 (não existia em 2024)
            if (!clienteEm2024 && producaoMes >= 5) {
              novosClientes.push(`${cliente.cliente} (${producaoMes} relatórios)`);
            }
            
            // Cliente que retornou
            if (clienteEm2024) {
              const producaoMesAnterior = index > 0 ? (cliente[mesesInfo[index-1].key] || 0) : (clienteEm2024['dezembro'] || 0);
              
              // Retomada de atividade
              if (producaoMesAnterior === 0 && producaoMes >= 5) {
                clientesRetorno.push(`${cliente.cliente} (${producaoMes} relatórios)`);
              }
              
              // Parada de atividade
              if (producaoMesAnterior >= 10 && producaoMes === 0) {
                clientesParada.push(`${cliente.cliente} (era ${producaoMesAnterior})`);
              }
            }
          });

          // Detectar clientes que saíram (apenas no primeiro mês de 2025)
          if (index === 0) {
            dados2024.forEach(cliente2024 => {
              const cliente2025 = dados2025.find(c => c.cliente === cliente2024.cliente);
              const producaoDez2024 = cliente2024['dezembro'] || 0;
              
              if (!cliente2025 && producaoDez2024 > 0) {
                clientesParada.push(`${cliente2024.cliente} (saiu em 2025)`);
              }
            });
          }

          // Criar descrição consolidada
          let descricao = `${totalMes} relatórios (${crescimento > 0 ? '+' : ''}${Math.round(crescimento)}% vs 2024)`;
          const detalhes = [];
          
          if (novosClientes.length > 0) {
            detalhes.push(`🌟 Novos: ${novosClientes.join(', ')}`);
          }
          if (clientesRetorno.length > 0) {
            detalhes.push(`🔄 Retornos: ${clientesRetorno.join(', ')}`);
          }
          if (clientesParada.length > 0) {
            detalhes.push(`👋 Saídas: ${clientesParada.join(', ')}`);
          }

          // Determinar tipo do evento
          let tipo = crescimento > 15 ? 'growth' : crescimento < -15 ? 'decline' : 'production';
          if (novosClientes.length > 0) {
            tipo = 'client_return';
          } else if (clientesParada.length > clientesRetorno.length) {
            tipo = 'client_exit';
          }

          eventos.push({
            id: `2025-${mes.key}`,
            date: `2025-${mes.num}-01`,
            title: `📈 ${mes.nome} 2025`,
            description: descricao,
            type: tipo,
            valor: totalMes,
            ano: 2025,
            mes: mes.nome,
            crescimento: Math.round(crescimento),
            detalhes: detalhes.length > 0 ? detalhes.join(' • ') : `Comparação com ${mes.nome} 2024: ${totalMes2024} → ${totalMes}`,
            movimentacoes: {
              novos: novosClientes.length,
              retornos: clientesRetorno.length,
              saidas: clientesParada.length
            }
          });
        }
      });
    }

    return eventos.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [planilhaData, selectedPeriod]);

  // Configurações visuais dos eventos
  const getEventConfig = (event) => {
    const configs = {
      milestone: {
        color: '#8B5CF6',
        icon: Milestone,
        bgColor: '#8B5CF620',
        borderColor: '#8B5CF6'
      },
      client_exit: {
        color: '#EF4444',
        icon: UserMinus,
        bgColor: '#EF444420',
        borderColor: '#EF4444'
      },
      client_return: {
        color: '#10B981',
        icon: UserPlus,
        bgColor: '#10B98120',
        borderColor: '#10B981'
      },
      client_reduction: {
        color: '#F59E0B',
        icon: TrendingDown,
        bgColor: '#F59E0B20',
        borderColor: '#F59E0B'
      },
      client_peak: {
        color: '#06B6D4',
        icon: TrendingUp,
        bgColor: '#06B6D420',
        borderColor: '#06B6D4'
      },
      growth: {
        color: '#10B981',
        icon: TrendingUp,
        bgColor: '#10B98120',
        borderColor: '#10B981'
      },
      decline: {
        color: '#EF4444',
        icon: TrendingDown,
        bgColor: '#EF444420',
        borderColor: '#EF4444'
      },
      production: {
        color: '#6B7280',
        icon: FileText,
        bgColor: '#6B728020',
        borderColor: '#6B7280'
      },
      post_management: {
        color: '#8B5CF6',
        icon: Star,
        bgColor: '#8B5CF620',
        borderColor: '#8B5CF6'
      }
    };
    
    return configs[event.type] || configs.production;
  };

  // Formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Renderizar timeline
  const renderTimeline = () => {
    if (timelineEvents.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6B7280'
        }}>
          <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Nenhum evento encontrado para o período selecionado</p>
          <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
            Verifique se os dados da planilha estão carregados corretamente
          </p>
        </div>
      );
    }

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ position: 'relative', paddingLeft: '30px' }}>
          {/* Linha da timeline */}
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '0',
            bottom: '0',
            width: '2px',
            background: 'linear-gradient(to bottom, #E5E7EB, #9CA3AF, #E5E7EB)',
            borderRadius: '1px'
          }} />

          {/* Eventos */}
          {timelineEvents.map((event, index) => {
            const config = getEventConfig(event);
            const IconComponent = config.icon;

            return (
              <div
                key={event.id}
                className="timeline-event"
                style={{
                  position: 'relative',
                  marginBottom: index === timelineEvents.length - 1 ? '0' : '24px',
                  cursor: 'pointer'
                }}
                onClick={() => onEventClick && onEventClick(event)}
              >
                {/* Ícone do evento */}
                <div style={{
                  position: 'absolute',
                  left: '-23px',
                  top: '8px',
                  width: '16px',
                  height: '16px',
                  background: config.color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 2
                }}>
                  <IconComponent size={8} color="white" />
                </div>

                {/* Card do evento */}
                <div style={{
                  background: 'white',
                  border: `1px solid ${config.borderColor}`,
                  borderRadius: '12px',
                  padding: '16px',
                  marginLeft: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
                >
                  {/* Faixa colorida */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: config.color,
                    borderRadius: '12px 12px 0 0'
                  }} />

                  {/* Cabeçalho */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1F2937',
                      lineHeight: '1.4'
                    }}>
                      {event.title}
                    </h4>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      background: '#F3F4F6',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px'
                    }}>
                      {formatDate(event.date)}
                    </span>
                  </div>

                  {/* Descrição */}
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.875rem',
                    color: '#4B5563',
                    lineHeight: '1.4'
                  }}>
                    {event.description}
                  </p>

                  {/* Detalhes extras */}
                  {event.detalhes && (
                    <p style={{
                      margin: 0,
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      fontStyle: 'italic'
                    }}>
                      {event.detalhes}
                    </p>
                  )}

                  {/* Métricas */}
                  {(event.valor || event.crescimento !== undefined) && (
                    <div style={{
                      marginTop: '12px',
                      padding: '8px',
                      background: config.bgColor,
                      borderRadius: '6px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}>
                      {event.valor && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: config.color
                        }}>
                          📊 {event.valor} relatórios
                        </span>
                      )}
                      {event.crescimento !== undefined && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: event.crescimento > 0 ? '#10B981' : event.crescimento < 0 ? '#EF4444' : '#6B7280'
                        }}>
                          {event.crescimento > 0 ? '📈' : event.crescimento < 0 ? '📉' : '➖'} {event.crescimento}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar calendário
  const renderCalendar = () => {
    const eventsByMonth = {};
    
    timelineEvents.forEach(event => {
      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!eventsByMonth[key]) {
        eventsByMonth[key] = [];
      }
      eventsByMonth[key].push(event);
    });

    const months = [];
    const startYear = selectedPeriod === '2025' ? 2025 : 2024;
    const endYear = selectedPeriod === '2024' ? 2024 : 2025;
    
    for (let year = startYear; year <= endYear; year++) {
      const maxMonth = year === 2025 ? 6 : 12; // Apenas até junho de 2025
      for (let month = 1; month <= maxMonth; month++) {
        const key = `${year}-${month.toString().padStart(2, '0')}`;
        months.push({
          key,
          year,
          month,
          name: new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long' }),
          events: eventsByMonth[key] || []
        });
      }
    }

    return (
      <div style={{
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {months.map(month => (
          <div
            key={month.key}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            {/* Cabeçalho do mês */}
            <div style={{
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#1F2937',
                textTransform: 'capitalize'
              }}>
                {month.name}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#6B7280'
              }}>
                {month.year}
              </p>
            </div>

            {/* Eventos do mês */}
            {month.events.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {month.events.slice(0, 5).map(event => {
                  const config = getEventConfig(event);
                  const IconComponent = config.icon;

                  return (
                    <div
                      key={event.id}
                      style={{
                        padding: '8px 12px',
                        background: config.bgColor,
                        border: `1px solid ${config.borderColor}20`,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => onEventClick && onEventClick(event)}
                      onMouseEnter={(e) => {
                        e.target.style.background = config.borderColor + '30';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = config.bgColor;
                      }}
                    >
                      <IconComponent size={14} color={config.color} />
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#374151',
                        fontWeight: '500',
                        flex: 1
                      }}>
                        {event.title.replace(/📈|📉|👋|🎉|🚀|⏸️|🌟|🔄|🎯/, '').trim()}
                      </span>
                    </div>
                  );
                })}
                
                {month.events.length > 5 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    fontSize: '0.75rem',
                    color: '#6B7280'
                  }}>
                    +{month.events.length - 5} eventos
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: '#9CA3AF',
                fontSize: '0.875rem'
              }}>
                <Clock size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                Nenhum evento
              </div>
            )}

            {/* Estatísticas do mês */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#F9FAFB',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '0.75rem',
                color: '#6B7280'
              }}>
                Total de eventos
              </span>
              <span style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                {month.events.length}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      border: '1px solid #E5E7EB'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Calendar size={28} />
              {title}
            </h3>
            <p style={{
              margin: 0,
              opacity: 0.9,
              fontSize: '0.875rem'
            }}>
              Timeline com detecção inteligente de entrada/saída de clientes
            </p>
          </div>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            <RefreshCw size={14} style={{ marginRight: '6px' }} />
            Conectado à planilha
          </div>
        </div>

        {/* Controles */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Seletor de período */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px'
          }}>
            {['2024', '2025', 'ambos'].map(periodo => (
              <button
                key={periodo}
                onClick={() => setSelectedPeriod(periodo)}
                style={{
                  padding: '8px 16px',
                  background: selectedPeriod === periodo ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: selectedPeriod === periodo ? '600' : '400',
                  transition: 'all 0.2s ease'
                }}
              >
                {periodo === 'ambos' ? '2024 + 2025' : periodo}
              </button>
            ))}
          </div>

          {/* Seletor de visualização */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '8px 12px',
                background: viewMode === 'timeline' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Calendar size={14} />
              Timeline
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '8px 12px',
                background: viewMode === 'calendar' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <Grid size={14} />
              Calendário
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '16px',
        padding: '20px',
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>
            {timelineEvents.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Total Eventos
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
            {timelineEvents.filter(e => e.type === 'client_return').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Novos Clientes
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444' }}>
            {timelineEvents.filter(e => e.type === 'client_exit').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Saídas
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#06B6D4' }}>
            {timelineEvents.filter(e => e.type === 'growth' || e.type === 'client_peak').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Crescimentos
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div style={{ minHeight: '400px' }}>
        {viewMode === 'timeline' ? renderTimeline() : renderCalendar()}
      </div>

      {/* Footer com informações */}
      <div style={{
        background: '#F8FAFC',
        padding: '16px 24px',
        borderTop: '1px solid #E2E8F0'
      }}>
        <div style={{
          fontSize: '0.85rem',
          color: '#6B7280',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span>📊 Dados extraídos da planilha</span>
          <span>•</span>
          <span>📈 Comparação entre períodos</span>
          <span>•</span>
          <span>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};

// CSS adicional para animações
const timelineStyles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .timeline-event {
    animation: fadeIn 0.3s ease-out;
  }
  
  .timeline-event:hover {
    transform: translateX(4px);
    transition: transform 0.2s ease;
  }
`;

// Adicionar estilos ao document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = timelineStyles;
  document.head.appendChild(styleSheet);
}

export default EventTimeline;