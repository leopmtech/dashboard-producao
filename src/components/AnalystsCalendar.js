// src/components/AnalystsCalendar.js
import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  User, 
  Clock, 
  ArrowRight, 
  Filter, 
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  Download,
  TrendingUp
} from 'lucide-react';

const AnalystsCalendar = ({ data, title = "📅 Calendário dos Analistas", onEventClick }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedAnalyst, setSelectedAnalyst] = useState('todos');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'list', 'timeline'
  
  // Novos filtros avançados
  const [statusFilter, setStatusFilter] = useState('todos');
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [dateRange, setDateRange] = useState('mes_atual');

  // ✅ FUNÇÃO AUXILIAR PARA CONVERTER DATAS COM SEGURANÇA
  const safeDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Se já é um objeto Date válido
    if (dateValue instanceof Date && !isNaN(dateValue)) {
      return dateValue;
    }
    
    // Se é string, tenta converter
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      return !isNaN(parsed) ? parsed : null;
    }
    
    // Se é timestamp
    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      return !isNaN(parsed) ? parsed : null;
    }
    
    return null;
  };

  // ✅ FUNÇÃO PARA VALIDAR E PROCESSAR DADOS
  const processOrderData = (orders) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    return orders.map(item => {
      // Processar datas com segurança
      const dataInicioSafe = safeDate(item.dataInicioDate || item.dataInicio || item.data_inicio);
      const dataEntregaSafe = safeDate(item.dataEntregaDate || item.dataEntrega || item.data_entrega);
      
      return {
        ...item,
        // Garantir que sempre temos objetos Date válidos
        dataInicio: dataInicioSafe || new Date(),
        dataEntrega: dataEntregaSafe || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias a partir de hoje
        
        // Garantir campos obrigatórios
        id: item.id || Math.random().toString(36).substr(2, 9),
        analista: item.quemExecuta || item.analista || item.responsavel || 'Não definido',
        projeto: item.tipoDemanda || item.tipo || 'Demanda geral',
        cliente: item.cliente1 || item.cliente || 'Cliente não informado',
        status: item.status || 'Em andamento',
        isConcluido: item.isConcluido || false,
        isAtrasado: item.isAtrasado || false,
        prioridade: item.prioridade || 'Normal',
        complexidade: item.complexidade || 'Média',
        ordemServico: item.ordemServico || 'N/A'
      };
    });
  };

  // Função para calcular progresso
  const calculateProgress = (task) => {
    if (!task.dataInicio || !task.dataEntrega) return 0;
    
    const now = new Date();
    const start = task.dataInicio.getTime();
    const end = task.dataEntrega.getTime();
    const current = now.getTime();
    
    if (current < start) return 0;
    if (current > end) return 100;
    
    return Math.round(((current - start) / (end - start)) * 100);
  };

  // ✅ PROCESSAR DADOS COM VALIDAÇÃO
  const analystsData = useMemo(() => {
    try {
      if (!data || !data.originalOrders) return [];

      const processedOrders = processOrderData(data.originalOrders);
      
      return processedOrders
        .filter(order => 
          order.analista && 
          order.analista.trim() !== '' &&
          order.analista !== 'Não definido' &&
          !order.isConcluido && // Apenas demandas em andamento
          order.dataEntrega // Tem data de entrega
        )
        .map(order => {
          const task = {
            id: order.id,
            analista: order.analista.trim(),
            projeto: order.projeto,
            cliente: order.cliente,
            dataInicio: order.dataInicio,
            dataEntrega: order.dataEntrega,
            status: order.status,
            complexidade: order.complexidade,
            prioridade: order.prioridade,
            isAtrasado: order.isAtrasado,
            ordemServico: order.ordemServico
          };
          
          // Calcular progresso
          task.progress = calculateProgress(task);
          
          // Determinar se está próximo do vencimento (3 dias)
          const today = new Date();
          const threeDaysFromNow = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
          task.isUpcoming = task.dataEntrega >= today && task.dataEntrega <= threeDaysFromNow;
          
          return task;
        });
    } catch (error) {
      console.error('Erro ao processar dados do calendário:', error);
      return [];
    }
  }, [data]);

  // Lista única de analistas
  const analysts = useMemo(() => {
    const uniqueAnalysts = [...new Set(analystsData.map(item => item.analista))]
      .filter(name => name && name.trim() !== '')
      .sort();
    
    return uniqueAnalysts;
  }, [analystsData]);

  // Cores para cada analista
  const analystColors = useMemo(() => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    
    const colorMap = {};
    analysts.forEach((analyst, index) => {
      colorMap[analyst] = colors[index % colors.length];
    });
    
    return colorMap;
  }, [analysts]);

  // ✅ FILTRAR DADOS COM VALIDAÇÃO
  const filteredData = useMemo(() => {
    try {
      return analystsData.filter(item => {
        // Filtro por analista
        if (selectedAnalyst !== 'todos' && item.analista !== selectedAnalyst) {
          return false;
        }

        // Filtro por status
        if (statusFilter !== 'todos') {
          switch (statusFilter) {
            case 'no_prazo':
              if (item.isAtrasado) return false;
              break;
            case 'atrasado':
              if (!item.isAtrasado) return false;
              break;
            case 'proximo_vencimento':
              if (!item.isUpcoming) return false;
              break;
            default:
              break;
          }
        }

        // Filtro por prioridade
        if (priorityFilter !== 'todas') {
          const priority = item.prioridade?.toLowerCase() || 'normal';
          if (priorityFilter === 'alta' && !priority.includes('urgent') && !priority.includes('alta')) {
            return false;
          }
          if (priorityFilter === 'normal' && priority.includes('urgent')) {
            return false;
          }
        }

        // Filtro por período - VALIDAÇÃO SEGURA DAS DATAS
        if (!item.dataEntrega || !(item.dataEntrega instanceof Date) || isNaN(item.dataEntrega)) {
          console.warn('Data inválida encontrada:', item);
          return false;
        }

        const itemMonth = item.dataEntrega.getMonth();
        const itemYear = item.dataEntrega.getFullYear();
        
        switch (dateRange) {
          case 'mes_atual':
            return itemMonth === selectedMonth && itemYear === selectedYear;
          case 'proximos_30_dias':
            const today = new Date();
            const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
            return item.dataEntrega >= today && item.dataEntrega <= thirtyDaysFromNow;
          case 'todos':
            return true;
          default:
            return itemMonth === selectedMonth && itemYear === selectedYear;
        }
      });
    } catch (error) {
      console.error('Erro ao filtrar dados:', error);
      return [];
    }
  }, [analystsData, selectedAnalyst, selectedMonth, selectedYear, statusFilter, priorityFilter, dateRange]);

  // Gerar calendário do mês
  const generateCalendar = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const calendar = [];
    const current = new Date(startDate);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(current);
        const isCurrentMonth = date.getMonth() === selectedMonth;
        const isToday = date.toDateString() === new Date().toDateString();
        
        // Encontrar demandas para este dia
        const dayTasks = filteredData.filter(task => {
          const taskDate = new Date(task.dataEntrega);
          return taskDate.toDateString() === date.toDateString();
        });
        
        weekDays.push({
          date: new Date(date),
          isCurrentMonth,
          isToday,
          tasks: dayTasks
        });
        
        current.setDate(current.getDate() + 1);
      }
      calendar.push(weekDays);
    }
    
    return calendar;
  }, [selectedMonth, selectedYear, filteredData]);

  // Calcular métricas
  const metrics = useMemo(() => {
    const total = filteredData.length;
    const atrasados = filteredData.filter(t => t.isAtrasado).length;
    const urgentes = filteredData.filter(t => t.prioridade?.toLowerCase().includes('urgent')).length;
    const proximoVencimento = filteredData.filter(t => t.isUpcoming).length;
    const analystCount = new Set(filteredData.map(t => t.analista)).size;
    const progressoMedio = total > 0 ? Math.round(filteredData.reduce((acc, t) => acc + t.progress, 0) / total) : 0;
    
    return { total, atrasados, urgentes, proximoVencimento, analystCount, progressoMedio };
  }, [filteredData]);

  // Nova visualização Timeline
  const renderTimelineView = () => {
    if (filteredData.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6B7280'
        }}>
          <BarChart3 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Nenhuma demanda encontrada para este período</p>
        </div>
      );
    }

    const sortedTasks = filteredData.sort((a, b) => a.dataInicio - b.dataInicio);
    const minDate = Math.min(...sortedTasks.map(t => t.dataInicio?.getTime() || Date.now()));
    const maxDate = Math.max(...sortedTasks.map(t => t.dataEntrega?.getTime() || Date.now()));
    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    
    // Gerar escala de datas (a cada semana)
    const dateScale = [];
    const scaleStart = new Date(minDate);
    const scaleEnd = new Date(maxDate);
    const current = new Date(scaleStart);
    
    while (current <= scaleEnd) {
      dateScale.push(new Date(current));
      current.setDate(current.getDate() + 7); // A cada semana
    }

    return (
      <div style={{ padding: '20px', overflowX: 'auto', minWidth: '800px' }}>
        {/* Cabeçalho da timeline com escala de datas */}
        <div style={{
          display: 'flex',
          marginBottom: '20px',
          borderBottom: '2px solid #E5E7EB',
          paddingBottom: '10px'
        }}>
          <div style={{ minWidth: '150px', fontWeight: '600', color: '#374151' }}>
            Analista
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            {dateScale.map((date, index) => {
              const position = ((date.getTime() - minDate) / (maxDate - minDate)) * 100;
              return (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    left: `${position}%`,
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    transform: 'translateX(-50%)'
                  }}
                >
                  {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline por analista */}
        {analysts
          .filter(analyst => filteredData.some(t => t.analista === analyst))
          .map(analyst => {
            const analystTasks = sortedTasks.filter(t => t.analista === analyst);
            
            return (
              <div key={analyst} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', minHeight: '60px' }}>
                  {/* Nome do analista */}
                  <div style={{
                    minWidth: '150px',
                    paddingRight: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: analystColors[analyst]
                      }}
                    />
                    <span style={{
                      fontWeight: '600',
                      color: '#374151',
                      fontSize: '0.875rem'
                    }}>
                      {analyst}
                    </span>
                  </div>

                  {/* Timeline das tarefas */}
                  <div style={{
                    flex: 1,
                    position: 'relative',
                    height: '50px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0'
                  }}>
                    {/* Linha de hoje */}
                    {(() => {
                      const today = new Date();
                      if (today.getTime() >= minDate && today.getTime() <= maxDate) {
                        const todayPosition = ((today.getTime() - minDate) / (maxDate - minDate)) * 100;
                        return (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${todayPosition}%`,
                              top: 0,
                              bottom: 0,
                              width: '2px',
                              background: '#EF4444',
                              zIndex: 10
                            }}
                          />
                        );
                      }
                      return null;
                    })()}

                    {analystTasks.map((task, taskIndex) => {
                      const startOffset = ((task.dataInicio?.getTime() - minDate) / (maxDate - minDate)) * 100;
                      const endOffset = ((task.dataEntrega?.getTime() - minDate) / (maxDate - minDate)) * 100;
                      const duration = endOffset - startOffset;
                      
                      return (
                        <div
                          key={task.id}
                          style={{
                            position: 'absolute',
                            left: `${startOffset}%`,
                            width: `${duration}%`,
                            height: '32px',
                            top: `${8 + (taskIndex * 36)}px`,
                            background: task.isAtrasado ? '#FEE2E2' : analystColors[analyst] + '20',
                            border: `2px solid ${task.isAtrasado ? '#EF4444' : analystColors[analyst]}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: task.isAtrasado ? '#DC2626' : '#374151',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                            zIndex: 5
                          }}
                          onClick={() => onEventClick && onEventClick(task)}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                            e.target.style.zIndex = '20';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                            e.target.style.zIndex = '5';
                          }}
                          title={`${task.projeto} - ${task.cliente}\nInício: ${task.dataInicio?.toLocaleDateString('pt-BR')}\nEntrega: ${task.dataEntrega?.toLocaleDateString('pt-BR')}\nProgresso: ${task.progress}%`}
                        >
                          {/* Barra de progresso dentro da tarefa */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${task.progress}%`,
                              background: task.isAtrasado ? '#EF4444' : analystColors[analyst],
                              borderRadius: '4px',
                              opacity: 0.3,
                              transition: 'width 0.3s ease'
                            }}
                          />
                          
                          <span style={{
                            position: 'relative',
                            zIndex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {task.projeto} ({task.progress}%)
                          </span>

                          {task.isUpcoming && (
                            <AlertCircle
                              size={12}
                              color="#F59E0B"
                              style={{ marginLeft: '4px', flexShrink: 0 }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

        {/* Legenda */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#F8FAFC',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: '#6B7280'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '2px', height: '16px', background: '#EF4444' }} />
              Hoje
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '16px', background: '#FEE2E2', border: '2px solid #EF4444', borderRadius: '4px' }} />
              Atrasado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={12} color="#F59E0B" />
              Próximo ao vencimento
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '8px', background: 'linear-gradient(to right, #3B82F6, #93C5FD)', borderRadius: '4px' }} />
              Barra de progresso
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar card de tarefa com progresso
  const renderTaskCard = (task, isCompact = false) => {
    const color = analystColors[task.analista] || '#6B7280';
    
    return (
      <div
        key={task.id}
        style={{
          background: color + '15',
          border: `1px solid ${color}40`,
          borderLeft: `4px solid ${color}`,
          borderRadius: '6px',
          padding: isCompact ? '4px 6px' : '8px 10px',
          marginBottom: isCompact ? '2px' : '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: isCompact ? '0.7rem' : '0.75rem'
        }}
        onClick={() => onEventClick && onEventClick(task)}
        onMouseEnter={(e) => {
          e.target.style.background = color + '25';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = color + '15';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isCompact ? '2px' : '4px'
        }}>
          <span style={{
            fontWeight: '600',
            color: '#374151',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1
          }}>
            {task.analista}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {task.isUpcoming && <AlertCircle size={12} color="#F59E0B" />}
            {task.isAtrasado && <AlertCircle size={12} color="#EF4444" />}
          </div>
        </div>
        
        <div style={{
          color: '#6B7280',
          lineHeight: '1.2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: isCompact ? '2px' : '4px'
        }}>
          {task.projeto}
        </div>

        {/* Barra de progresso */}
        {!isCompact && (
          <div style={{
            marginBottom: '4px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2px'
            }}>
              <span style={{ fontSize: '0.65rem', color: '#6B7280' }}>
                Progresso
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: '600', color: '#374151' }}>
                {task.progress}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              background: '#E5E7EB',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div
                style={{
                  width: `${task.progress}%`,
                  height: '100%',
                  background: task.isAtrasado ? '#EF4444' : color,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        )}
        
        {!isCompact && (
          <div style={{
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#9CA3AF',
            fontSize: '0.65rem'
          }}>
            <Briefcase size={10} />
            {task.cliente}
          </div>
        )}
      </div>
    );
  };

  // Renderizar visualização em calendário
  const renderCalendarView = () => (
    <div style={{ padding: '20px' }}>
      {/* Cabeçalho do calendário */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px',
        marginBottom: '1px'
      }}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div
            key={day}
            style={{
              background: '#F3F4F6',
              padding: '12px 8px',
              textAlign: 'center',
              fontWeight: '600',
              fontSize: '0.875rem',
              color: '#374151',
              border: '1px solid #E5E7EB'
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Dias do calendário */}
      {generateCalendar.map((week, weekIndex) => (
        <div
          key={weekIndex}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            marginBottom: '1px'
          }}
        >
          {week.map((day, dayIndex) => (
            <div
              key={dayIndex}
              style={{
                background: day.isCurrentMonth ? 'white' : '#F9FAFB',
                border: '1px solid #E5E7EB',
                minHeight: '120px',
                padding: '8px',
                position: 'relative',
                opacity: day.isCurrentMonth ? 1 : 0.6
              }}
            >
              {/* Número do dia */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: day.isToday ? '700' : '500',
                  color: day.isToday ? '#EF4444' : '#374151',
                  background: day.isToday ? '#FEF2F2' : 'transparent',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: day.isToday ? '1px solid #FCA5A5' : 'none'
                }}>
                  {day.date.getDate()}
                </span>
                
                {day.tasks.length > 0 && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: '#3B82F6',
                    color: 'white',
                    padding: '2px 5px',
                    borderRadius: '10px',
                    minWidth: '16px',
                    textAlign: 'center'
                  }}>
                    {day.tasks.length}
                  </span>
                )}
              </div>

              {/* Tarefas do dia */}
              <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                {day.tasks.slice(0, 3).map(task => renderTaskCard(task, true))}
                {day.tasks.length > 3 && (
                  <div style={{
                    fontSize: '0.65rem',
                    color: '#6B7280',
                    textAlign: 'center',
                    padding: '2px',
                    background: '#F3F4F6',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}>
                    +{day.tasks.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // Renderizar visualização em lista
  const renderListView = () => (
    <div style={{ padding: '20px' }}>
      {filteredData.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6B7280'
        }}>
          <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Nenhuma demanda encontrada para este período</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredData
            .sort((a, b) => a.dataEntrega - b.dataEntrega)
            .map(task => (
              <div
                key={task.id}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px'
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: analystColors[task.analista] || '#6B7280'
                        }}
                      />
                      {task.analista}
                    </h4>
                    <p style={{
                      margin: '0 0 8px 0',
                      color: '#6B7280',
                      fontSize: '0.875rem'
                    }}>
                      {task.projeto} • {task.cliente}
                    </p>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {task.isUpcoming && (
                      <span style={{
                        background: '#FEF3C7',
                        color: '#92400E',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertCircle size={12} />
                        Vence em breve
                      </span>
                    )}
                    
                    {task.isAtrasado && (
                      <span style={{
                        background: '#FEF2F2',
                        color: '#DC2626',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertCircle size={12} />
                        Atrasado
                      </span>
                    )}
                    
                    <span style={{
                      background: '#F3F4F6',
                      color: '#374151',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem'
                    }}>
                      {task.dataEntrega?.toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      Progresso da tarefa
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                      {task.progress}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#E5E7EB',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        width: `${task.progress}%`,
                        height: '100%',
                        background: task.isAtrasado ? '#EF4444' : analystColors[task.analista] || '#6B7280',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
                
                {/* Timeline visual */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    background: '#10B981',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}>
                    Início: {task.dataInicio?.toLocaleDateString('pt-BR') || 'N/A'}
                  </div>
                  
                  <ArrowRight size={16} color="#6B7280" />
                  
                  <div style={{
                    background: task.isAtrasado ? '#EF4444' : '#3B82F6',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem'
                  }}>
                    Entrega: {task.dataEntrega?.toLocaleDateString('pt-BR')}
                  </div>
                  
                  <div style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <span style={{
                      background: '#E5E7EB',
                      color: '#374151',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem'
                    }}>
                      {task.complexidade}
                    </span>
                    <span style={{
                      background: '#E5E7EB',
                      color: '#374151',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem'
                    }}>
                      {task.prioridade}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const selectStyle = {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    fontSize: '0.875rem',
    cursor: 'pointer'
  };

  // ✅ VERIFICAÇÃO DE DADOS INICIAL
  if (!data) {
    return (
      <div style={{
        padding: '40px',
        background: 'white',
        margin: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px solid #EF4444'
      }}>
        <h2 style={{ color: '#EF4444' }}>⚠️ Dados não encontrados</h2>
        <p>O componente não recebeu dados válidos.</p>
      </div>
    );
  }

  if (analystsData.length === 0) {
    return (
      <div style={{
        padding: '40px',
        background: 'white',
        margin: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px solid #F59E0B'
      }}>
        <h2 style={{ color: '#F59E0B' }}>📋 Nenhuma demanda encontrada</h2>
        <p>Não há demandas de analistas para exibir no momento.</p>
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666', textAlign: 'left' }}>
          <p><strong>Debug - Dados recebidos:</strong></p>
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
            {JSON.stringify(data, null, 2).substring(0, 500)}...
          </pre>
        </div>
      </div>
    );
  }

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
        background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        color: 'white',
        padding: '24px'
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
              <Users size={28} />
              {title}
            </h3>
            <p style={{
              margin: 0,
              opacity: 0.9,
              fontSize: '0.875rem'
            }}>
              Demandas em andamento por analista • {metrics.total} tarefas ativas • {metrics.progressoMedio}% progresso médio
            </p>
          </div>

          {/* Alerta de vencimentos próximos */}
          {metrics.proximoVencimento > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <AlertCircle size={16} />
              {metrics.proximoVencimento} vencem em 3 dias
            </div>
          )}
        </div>

        {/* Controles */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Filtros de período - só mostrar se não estiver em dateRange personalizado */}
          {dateRange === 'mes_atual' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={selectStyle}
              >
                {[
                  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ].map((month, index) => (
                  <option key={index} value={index} style={{ color: '#374151' }}>
                    {month}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={selectStyle}
              >
                <option value={2024} style={{ color: '#374151' }}>2024</option>
                <option value={2025} style={{ color: '#374151' }}>2025</option>
              </select>
            </div>
          )}

          {/* Filtro por período */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            style={selectStyle}
          >
            <option value="mes_atual" style={{ color: '#374151' }}>Mês Atual</option>
            <option value="proximos_30_dias" style={{ color: '#374151' }}>Próximos 30 dias</option>
            <option value="todos" style={{ color: '#374151' }}>Todos os períodos</option>
          </select>

          {/* Filtro por analista */}
          <select
            value={selectedAnalyst}
            onChange={(e) => setSelectedAnalyst(e.target.value)}
            style={{ ...selectStyle, minWidth: '150px' }}
          >
            <option value="todos" style={{ color: '#374151' }}>Todos os analistas</option>
            {analysts.map(analyst => (
              <option key={analyst} value={analyst} style={{ color: '#374151' }}>
                {analyst}
              </option>
            ))}
          </select>

          {/* Filtro por status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="todos" style={{ color: '#374151' }}>Todos os Status</option>
            <option value="no_prazo" style={{ color: '#374151' }}>No Prazo</option>
            <option value="atrasado" style={{ color: '#374151' }}>Atrasados</option>
            <option value="proximo_vencimento" style={{ color: '#374151' }}>Próximo ao Vencimento</option>
          </select>

          {/* Filtro por prioridade */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="todas" style={{ color: '#374151' }}>Todas as Prioridades</option>
            <option value="alta" style={{ color: '#374151' }}>Alta Prioridade</option>
            <option value="normal" style={{ color: '#374151' }}>Prioridade Normal</option>
          </select>

          {/* Seletor de visualização */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '2px'
          }}>
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
                gap: '6px'
              }}
            >
              <Calendar size={14} />
              Calendário
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 12px',
                background: viewMode === 'list' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Users size={14} />
              Lista
            </button>
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
                gap: '6px'
              }}
            >
              <BarChart3 size={14} />
              Timeline
            </button>
          </div>
        </div>
      </div>

      {/* Métricas rápidas */}
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
            {metrics.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Demandas Ativas
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444' }}>
            {metrics.atrasados}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Atrasadas
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#F59E0B' }}>
            {metrics.proximoVencimento}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Vencem em breve
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
            {metrics.analystCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Analistas Ativos
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#8B5CF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            {metrics.progressoMedio}%
            <TrendingUp size={20} />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase' }}>
            Progresso Médio
          </div>
        </div>
      </div>

      {/* Legenda de cores dos analistas - só mostrar se há analistas */}
      {analysts.length > 0 && (
        <div style={{
          padding: '16px 20px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              Analistas:
            </span>
            {analysts.map(analyst => (
              <div
                key={analyst}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  background: selectedAnalyst === analyst ? analystColors[analyst] + '20' : 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedAnalyst(selectedAnalyst === analyst ? 'todos' : analyst)}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: analystColors[analyst]
                  }}
                />
                <span style={{
                  fontSize: '0.75rem',
                  color: '#374151',
                  fontWeight: selectedAnalyst === analyst ? '600' : '400'
                }}>
                  {analyst}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div style={{ minHeight: '400px' }}>
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'timeline' && renderTimelineView()}
      </div>
    </div>
  );
};

export default AnalystsCalendar;