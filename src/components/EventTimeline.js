// ==========================================
// src/components/EventTimeline.js - VERSÃO CORRIGIDA
// Timeline de eventos com dados reais da planilha
// ==========================================

import React, { useState, useMemo } from 'react';
import { Calendar, Clock, TrendingUp, Users, Filter, Search } from 'lucide-react';

const EventTimeline = ({ data, onEventClick, title = "Timeline de Eventos" }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('2025');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Processar dados para timeline
  const timelineEvents = useMemo(() => {
    if (!data) return [];

    const events = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Função para processar dados de um ano específico
    const processYearData = (yearData, year, clientName = null) => {
      if (!yearData) return;

      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthKeys = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
                        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      
      const getMonthTotal = (monthKey) => {
        if (!clientName) {
          // Geral: soma de todos os clientes
          return yearData.reduce((sum, client) => sum + (Number(client?.[monthKey]) || 0), 0);
        }
        // Cliente selecionado: soma apenas das linhas que batem o nome (pode haver duplicatas)
        return yearData
          .filter((c) => String(c?.cliente || '').trim() === String(clientName).trim())
          .reduce((sum, client) => sum + (Number(client?.[monthKey]) || 0), 0);
      };

      // Compilar total de demandas por mês
      monthKeys.forEach((monthKey, monthIndex) => {
        // Para 2025, só mostrar dados até o mês atual
        if (year === 2025 && monthIndex > currentMonth) return;
        
        const totalMonth = getMonthTotal(monthKey);
        
        if (totalMonth > 0) {
          events.push({
            id: `total-${clientName || 'geral'}-${year}-${monthIndex}`,
            date: new Date(year, monthIndex, 15), // 15º dia do mês
            month: monthNames[monthIndex],
            year: year,
            value: totalMonth,
            // ✅ Alinhar thresholds com o filtro da UI:
            // - high: 5+
            // - medium: 2-4
            // - low: 1
            type: totalMonth >= 5 ? 'high' : totalMonth >= 2 ? 'medium' : 'low',
            title: clientName
              ? `📊 ${clientName} • ${monthNames[monthIndex]} ${year}`
              : `📊 ${monthNames[monthIndex]} ${year}`,
            description: clientName
              ? `${clientName}: ${totalMonth} relatório${totalMonth > 1 ? 's' : ''} no mês`
              : `Total de ${totalMonth} relatório${totalMonth > 1 ? 's' : ''} produzido${totalMonth > 1 ? 's' : ''}`,
            isCompiled: true,
            client: clientName || 'Geral'
          });
        }
      });
    };


    // Processar dados de 2024
    if (selectedPeriod === 'all' || selectedPeriod === '2024') {
      processYearData(data.visaoGeral2024, 2024, selectedClient);
    }

    // Processar dados de 2025
    if (selectedPeriod === 'all' || selectedPeriod === '2025') {
      processYearData(data.visaoGeral, 2025, selectedClient);
    }
    
    // Compilar eventos e marcos importantes
    if (data.marcos) {
      data.marcos.forEach(marco => {
        events.push({
          id: `marco-${marco.id || Math.random().toString(36).substr(2, 9)}`,
          date: new Date(marco.data),
          month: new Date(marco.data).toLocaleString('pt-BR', {month: 'long'}),
          year: new Date(marco.data).getFullYear(),
          value: marco.valor || 0,
          type: marco.tipo || 'medium',
          title: marco.titulo,
          description: marco.descricao,
          isNewClient: marco.novoCliente || false,
          isNovaGestao: marco.novaGestao || false,
          client: marco.cliente || 'Geral'
        });
      });
    }

    // Filtrar por tipo de evento
    let filteredEvents = events;
    if (selectedEventType !== 'all') {
      filteredEvents = filteredEvents.filter(event => event.type === selectedEventType);
    }

    // Filtrar por cliente selecionado (marcos ainda podem estar fora)
    if (selectedClient) filteredEvents = filteredEvents.filter(event => event.client === selectedClient);

    // Filtrar por termo de busca
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        String(event.client || '').toLowerCase().includes(q) ||
        String(event.month || '').toLowerCase().includes(q) ||
        String(event.title || '').toLowerCase().includes(q) ||
        String(event.description || '').toLowerCase().includes(q)
      );
    }

    // Ordenar por data
    return filteredEvents.sort((a, b) => b.date - a.date);
  }, [data, selectedPeriod, selectedEventType, selectedClient, searchTerm]);

  // Obter estatísticas
  const stats = useMemo(() => {
    return {
      totalEvents: timelineEvents.length,
      totalClients: new Set(timelineEvents.map(e => e.client)).size,
      totalReports: timelineEvents.reduce((sum, e) => sum + e.value, 0),
      highValue: timelineEvents.filter(e => e.type === 'high').length,
      newClients: timelineEvents.filter(e => e.isNewClient).length
    };
  }, [timelineEvents]);

  // Obter cor do evento
  const getEventColor = (event) => {
    if (event.isNewClient) return '#10B981'; // Verde para novos clientes
    if (event.isNovaGestao) return '#8B5CF6'; // Roxo para nova gestão
    
    switch (event.type) {
      case 'high': return '#EF4444'; // Vermelho para alta produção
      case 'medium': return '#F59E0B'; // Amarelo para média produção
      case 'low': return '#6B7280'; // Cinza para baixa produção
      default: return '#FF6B47'; // Cor padrão in.Pacto
    }
  };

  // Obter ícone do evento
  const getEventIcon = (event) => {
    if (event.isNewClient) return '🆕';
    if (event.isNovaGestao) return '🚀';
    if (event.type === 'high') return '📈';
    if (event.type === 'medium') return '📊';
    return '📋';
  };

  // Obter clientes únicos para filtro
  const uniqueClients = useMemo(() => {
    const clients = new Set();
    if (data?.visaoGeral) {
      data.visaoGeral.forEach(client => client?.cliente && clients.add(client.cliente));
    }
    if (data?.visaoGeral2024) {
      data.visaoGeral2024.forEach(client => client?.cliente && clients.add(client.cliente));
    }
    return Array.from(clients).sort();
  }, [data]);

  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  return (
    <div className="chart-container modern timeline">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div>
          <h3 className="chart-title">{title}</h3>
          <p className="chart-subtitle">
            Cronologia de eventos e marcos importantes • {stats.totalEvents} eventos
          </p>
        </div>

        {/* Controles */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Busca */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#6B7280'
            }} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px 8px 36px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.875rem',
                minWidth: '200px'
              }}
            />
          </div>

          {/* Filtro de Cliente */}
          <select
            value={selectedClient || ''}
            onChange={(e) => setSelectedClient(e.target.value || null)}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              background: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Todos os Clientes</option>
            {uniqueClients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>

          {/* Filtro de Período */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              background: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">Todos os Anos</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          {/* Filtro de Tipo */}
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              background: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">Todos os Tipos</option>
            <option value="high">Alta Produção (5+)</option>
            <option value="medium">Média Produção (2-4)</option>
            <option value="low">Baixa Produção (1)</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedClient(null);
              setSelectedPeriod('2025');
              setSelectedEventType('all');
            }}
            style={{
              padding: '8px 12px',
              background: '#FF6B47',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Filter size={14} />
            Limpar
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(255, 107, 71, 0.05)',
        border: '1px solid rgba(255, 107, 71, 0.2)',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FF6B47' }}>
            {stats.totalEvents}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Eventos
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
            {stats.totalClients}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Clientes
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B5CF6' }}>
            {stats.totalReports}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Relatórios
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444' }}>
            {stats.highValue}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Alta Produção
          </div>
        </div>

        {selectedPeriod === 'all' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
              {stats.newClients}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Novos 2025
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Linha vertical da timeline */}
        <div style={{
          position: 'absolute',
          left: '24px',
          top: '0',
          bottom: '0',
          width: '2px',
          background: 'linear-gradient(to bottom, #FF6B47, #FF8A6B)',
          zIndex: 1
        }} />

        {/* Eventos */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {timelineEvents.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#6B7280'
            }}>
              <Calendar size={48} style={{ margin: '0 auto 16px', color: '#D1D5DB' }} />
              <div style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>
                Nenhum evento encontrado
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                Ajuste os filtros para ver mais eventos
              </div>
            </div>
          ) : (
            timelineEvents.map((event, index) => (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  marginBottom: '24px',
                  paddingLeft: '56px',
                  position: 'relative'
                }}
              >
                {/* Marcador do evento */}
                <div style={{
                  position: 'absolute',
                  left: '16px',
                  top: '8px',
                  width: '16px',
                  height: '16px',
                  background: getEventColor(event),
                  borderRadius: '50%',
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px'
                }} />

                {/* Conteúdo do evento */}
                <div
                  style={{
                    flex: 1,
                    background: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                  onClick={() => handleEventClick(event)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>{getEventIcon(event)}</span>
                        {event.title}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6B7280'
                      }}>
                        {event.description}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.75rem',
                      color: '#9CA3AF'
                    }}>
                      <Clock size={12} />
                      {event.date.toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>

                  {/* Tags do evento */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: getEventColor(event),
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {event.value} relatório{event.value > 1 ? 's' : ''}
                    </span>

                    {event.isNewClient && (
                      <span style={{
                        padding: '4px 8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#059669',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        🆕 Novo Cliente
                      </span>
                    )}

                    {event.isNovaGestao && (
                      <span style={{
                        padding: '4px 8px',
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#7C3AED',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        🚀 Nova Gestão
                      </span>
                    )}

                    <span style={{
                      padding: '4px 8px',
                      background: '#F3F4F6',
                      color: '#6B7280',
                      borderRadius: '12px',
                      fontSize: '0.75rem'
                    }}>
                      {event.year}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legenda */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#F8FAFC',
        borderRadius: '8px',
        border: '1px solid #E2E8F0'
      }}>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '12px'
        }}>
          Legenda
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: '#EF4444',
              borderRadius: '50%'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Alta Produção (5+)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: '#F59E0B',
              borderRadius: '50%'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Média Produção (2-4)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: '#6B7280',
              borderRadius: '50%'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Baixa Produção (1)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: '#10B981',
              borderRadius: '50%'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Novo Cliente 2025
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              background: '#8B5CF6',
              borderRadius: '50%'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              Nova Gestão (Abr 2024+)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTimeline;