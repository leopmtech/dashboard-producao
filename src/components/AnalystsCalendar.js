// ==========================================
// src/components/AnalystsCalendar.js - VERSÃO REFORMULADA
// Tabela de analistas com gerenciamento de demandas
// ==========================================

import React, { useState, useMemo } from 'react';
import { User, Clock, AlertTriangle, CheckCircle, X, Eye } from 'lucide-react';

const AnalystsCalendar = ({ data, onEventClick, title = "Visão Geral de Analistas" }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAnalystDetails, setSelectedAnalystDetails] = useState(null);

  // Dados dos analistas reais baseados na coluna "Quem executa"
  const analystsData = useMemo(() => {
    if (!data || !data.originalOrders) return [];

    // Cores para os analistas
    const colors = [
      '#FF6B47', '#10B981', '#8B5CF6', '#F59E0B', 
      '#3B82F6', '#EC4899', '#14B8A6', '#6366F1',
      '#D946EF', '#F43F5E', '#0EA5E9', '#84CC16'
    ];
    
    // Avatares para os analistas
    const avatars = ['👩‍💼', '👨‍💻', '👩‍🔬', '👨‍💼', '👩‍💻', '👨‍🔬', '👩‍🏫', '👨‍🏫'];
    
    // Extrair todos os analistas únicos da coluna "Quem executa"
    const uniqueAnalystNames = new Set();
    
    data.originalOrders.forEach(order => {
      // Verificar se é um relatório baseado na coluna "Tipo de Demanda"
      const isReportType = order.tipoDemanda && (
        order.tipoDemanda.toLowerCase().includes('relatório diário') || 
        order.tipoDemanda.toLowerCase().includes('relatorio diario') || 
        order.tipoDemanda.toLowerCase().includes('relatório semanal') || 
        order.tipoDemanda.toLowerCase().includes('relatorio semanal') || 
        order.tipoDemanda.toLowerCase().includes('relatório mensal') ||
        order.tipoDemanda.toLowerCase().includes('relatorio mensal') ||
        order.tipoDemanda.toLowerCase().includes('relatórios diários') ||
        order.tipoDemanda.toLowerCase().includes('relatorios diarios') ||
        order.tipoDemanda.toLowerCase().includes('relatórios semanais') ||
        order.tipoDemanda.toLowerCase().includes('relatorios semanais') ||
        order.tipoDemanda.toLowerCase().includes('relatórios mensais') ||
        order.tipoDemanda.toLowerCase().includes('relatorios mensais') ||
        order.tipoDemanda.toLowerCase().includes('relatório') ||
        order.tipoDemanda.toLowerCase().includes('relatorio')
      );
      
      // Pular se for um relatório
      if (isReportType) return;
      
      // Pular se estiver concluído (múltiplas verificações)
      if (order.concluida === "YES" || order.concluido === "YES" || 
          order.concluída === "YES" || order.concluido === true ||
          order.status === "Concluído" || order.status === "Concluido" ||
          order.status === "CONCLUÍDO" || order.status === "CONCLUIDO" ||
          order.status === "concluído" || order.status === "concluido" ||
          order.status === "CONCLUÍDO" || order.status === "CONCLUIDO" ||
          order.status === "FINALIZADO" || order.status === "finalizado" ||
          order.status === "COMPLETO" || order.status === "completo" ||
          order.status === "DONE" || order.status === "done") {
        return;
      }
      
      // Obter o nome do analista da coluna "Quem executa"
      const analystField = order.quemExecuta || order.analista || order.responsavel;
      
      if (analystField) {
        // Tratar casos onde múltiplos analistas estão separados por vírgula, "e", "&", etc.
        const analystNames = analystField.split(/[,;&\/]|\se\s|\sE\s/).map(name => name.trim());
        
        // Adicionar cada analista individualmente
        analystNames.forEach(name => {
          if (name && name.trim() !== '' && name.trim() !== 'Não definido') {
            uniqueAnalystNames.add(name.trim());
          }
        });
      }
    });
    
    // Converter para array e ordenar
    const analystNamesArray = Array.from(uniqueAnalystNames).sort();
    
    // Criar objetos para cada analista
    const analysts = analystNamesArray.map((name, index) => {
      return {
        id: index + 1,
        name: name,
        role: 'Analista',
        color: colors[index % colors.length],
        avatar: avatars[index % avatars.length],
        specialty: 'Análise de Dados'
      };
    });

    return analysts;
  }, [data]);

  // Processar demandas por analista
  const analystDemands = useMemo(() => {
    if (!data || !data.originalOrders || !analystsData.length) return {};

    const demands = {};
    
    // Inicializar estrutura para cada analista
    analystsData.forEach(analyst => {
      demands[analyst.id] = {
        inProgress: [],
        overdue: []
      };
    });
    
    // Processar as ordens originais
    data.originalOrders.forEach(order => {
      // Verificar se é um relatório baseado na coluna "Tipo de Demanda"
      const isReportType = order.tipoDemanda && (
        order.tipoDemanda.toLowerCase().includes('relatório diário') || 
        order.tipoDemanda.toLowerCase().includes('relatorio diario') || 
        order.tipoDemanda.toLowerCase().includes('relatório semanal') || 
        order.tipoDemanda.toLowerCase().includes('relatorio semanal') || 
        order.tipoDemanda.toLowerCase().includes('relatório mensal') ||
        order.tipoDemanda.toLowerCase().includes('relatorio mensal') ||
        order.tipoDemanda.toLowerCase().includes('relatórios diários') ||
        order.tipoDemanda.toLowerCase().includes('relatorios diarios') ||
        order.tipoDemanda.toLowerCase().includes('relatórios semanais') ||
        order.tipoDemanda.toLowerCase().includes('relatorios semanais') ||
        order.tipoDemanda.toLowerCase().includes('relatórios mensais') ||
        order.tipoDemanda.toLowerCase().includes('relatorios mensais') ||
        order.tipoDemanda.toLowerCase().includes('relatório') ||
        order.tipoDemanda.toLowerCase().includes('relatorio')
      );
      
      if (isReportType) return;
      
      // Pular se estiver concluído
      if (order.concluida === "YES" || order.concluido === "YES" || 
          order.concluída === "YES" || order.concluido === true ||
          order.status === "Concluído" || order.status === "Concluido" ||
          order.status === "CONCLUÍDO" || order.status === "CONCLUIDO" ||
          order.status === "concluído" || order.status === "concluido" ||
          order.status === "FINALIZADO" || order.status === "finalizado" ||
          order.status === "COMPLETO" || order.status === "completo" ||
          order.status === "DONE" || order.status === "done") {
        return;
      }
      
      const analystField = order.quemExecuta || order.analista || order.responsavel;
      if (!analystField) return;
      
      const analystNames = analystField.split(/[,;&\/]|\se\s|\sE\s/).map(name => name.trim());
      
      analystNames.forEach(name => {
        if (name && name.trim() !== '' && name.trim() !== 'Não definido') {
          const analyst = analystsData.find(a => a.name === name.trim());
          if (!analyst) return;
          
          // Verificar se a demanda é do Notion (tem source ou é identificável como Notion)
          const isFromNotion = order.source === 'notion' || order.origem === 'notion' || 
                              order.id?.toString().includes('notion') || 
                              !order.id?.toString().match(/^\d+$/); // Se não é numérico, provavelmente é Notion
          
          // Verificar se a demanda é do Google Sheets
          const isFromSheets = order.source === 'sheets' || order.origem === 'sheets' || 
                              order.id?.toString().match(/^\d+$/); // Se é numérico, provavelmente é Sheets
          
          // Lógica específica para demandas atrasadas
          let isOverdue = false;
          if (isFromNotion && order.dataEntrega) {
            const currentDate = new Date();
            const deliveryDate = new Date(order.dataEntrega);
            // Considerar apenas a data, não a hora
            const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
            const delivery = new Date(deliveryDate.getFullYear(), deliveryDate.getMonth(), deliveryDate.getDate());
            isOverdue = delivery < today;
          }
          // Sheets não pode ter demandas atrasadas
          
          // Lógica específica para demandas em andamento
          let isInProgress = false;
          if (isFromNotion) {
            // No Notion: demandas que não estão concluídas
            const isNotCompleted = !order.concluida || order.concluida !== "YES" || 
                                 !order.concluido || order.concluido !== "YES" ||
                                 !order.concluída || order.concluída !== "YES" ||
                                 order.status !== "Concluído" && order.status !== "Concluido" &&
                                 order.status !== "CONCLUÍDO" && order.status !== "CONCLUIDO" &&
                                 order.status !== "concluído" && order.status !== "concluido" &&
                                 order.status !== "FINALIZADO" && order.status !== "finalizado" &&
                                 order.status !== "COMPLETO" && order.status !== "completo" &&
                                 order.status !== "DONE" && order.status !== "done";
            isInProgress = isNotCompleted;
          }
          // Sheets não tem demandas em andamento
          
          // Só processar se for uma demanda válida
          if (isInProgress || isOverdue) {
            const demandItem = {
              id: order.id || Math.random().toString(36).substr(2, 9),
              title: order.projeto || 'Projeto não informado',
              client: order.cliente1 || order.cliente || 'Cliente não informado',
              deliveryDate: order.dataEntrega ? new Date(order.dataEntrega) : null,
              creationDate: order.dataCriacao ? new Date(order.dataCriacao) : null,
              status: order.status || 'Em andamento',
              description: order.descricao || '',
              priority: order.prioridade || 'Média',
              daysOverdue: isOverdue && order.dataEntrega ? 
                Math.floor((new Date() - new Date(order.dataEntrega)) / (1000 * 60 * 60 * 24)) : 0,
              source: isFromNotion ? 'Notion' : 'Sheets'
            };
            
            if (isOverdue) {
              demands[analyst.id].overdue.push(demandItem);
            } else if (isInProgress) {
              demands[analyst.id].inProgress.push(demandItem);
            }
          }
        }
      });
    });

    return demands;
  }, [data, analystsData]);

  // Calcular estatísticas da tabela
  const tableData = useMemo(() => {
    return analystsData.map(analyst => {
      const demands = analystDemands[analyst.id] || { inProgress: [], overdue: [] };

      return {
        ...analyst,
        inProgress: demands.inProgress.length,
        overdue: demands.overdue.length,
        demands: demands
      };
    });
  }, [analystsData, analystDemands]);

  // Handlers
  const handleAnalystClick = (analyst) => {
    console.log('🔍 [ANALYST CALENDAR] Clique no analista:', analyst);
    console.log('🔍 [ANALYST CALENDAR] Demandas do analista:', analystDemands[analyst.id]);
    
    // Garantir que as demandas estão incluídas
    const analystWithDemands = {
      ...analyst,
      demands: analystDemands[analyst.id] || { inProgress: [], overdue: [] }
    };
    
    console.log('🔍 [ANALYST CALENDAR] Analista com demandas:', analystWithDemands);
    
    setSelectedAnalystDetails(analystWithDemands);
    setModalOpen(true);

    console.log('🔍 [ANALYST CALENDAR] Estado após clique:', { modalOpen: true, selectedAnalystDetails: analystWithDemands });
  };

  const handleEventClick = (event) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'alta': case 'high': return '#EF4444';
      case 'média': case 'medium': case 'media': return '#F59E0B';
      case 'baixa': case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <div className="chart-container modern calendar" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
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
            Gerenciamento de workload por analista • Clique para drill-down
          </p>
        </div>
      </div>

      {/* Tabela Principal de Analistas */}
      <div style={{ 
        overflowX: 'auto',
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '12px'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '0.92rem' 
        }}>
          <thead style={{ background: '#FF6B47', color: '#FFF' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '16px 12px', fontWeight: '600' }}>
                Analista
              </th>
              <th style={{ textAlign: 'center', padding: '16px 12px', fontWeight: '600' }}>
                Em Andamento
              </th>
              <th style={{ textAlign: 'center', padding: '16px 12px', fontWeight: '600' }}>
                Em Atraso
              </th>
              <th style={{ textAlign: 'center', padding: '16px 12px', fontWeight: '600' }}>
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {tableData.map((analyst, index) => (
              <tr
                key={analyst.id}
                style={{
                  borderBottom: '1px solid #F1F5F9',
                  background: index % 2 === 0 ? '#FAFBFC' : '#FFF',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FEF3F2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = index % 2 === 0 ? '#FAFBFC' : '#FFF';
                }}
              >
                {/* Nome do Analista */}
                <td style={{ padding: '16px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    background: analyst.color,
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {analyst.avatar}
                  </div>
                  <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#334155' }}>
                      {analyst.name}
                    </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {analyst.role}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Em Andamento */}
                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                  <span style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#10B981' 
                  }}>
                    {analyst.inProgress}
                  </span>
                </td>

                {/* Em Atraso */}
                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                  {analyst.overdue > 0 ? (
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: '700', 
                      color: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}>
                      <AlertTriangle size={16} />
                      {analyst.overdue}
                    </span>
                  ) : (
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: '#6B7280' 
                    }}>
                      0
                    </span>
                  )}
                </td>

                {/* Ações - COMENTADO */}
                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                  {/* <button
                    onClick={() => handleAnalystClick(analyst)}
                    style={{
                      padding: '8px 16px',
                      background: analyst.color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: '0 auto',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Eye size={14} />
                    Ver Detalhes
                  </button> */}
                  <span style={{ color: '#6B7280', fontSize: '0.8rem' }}>
                    -
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
                </div>

      {/* Resumo da Tabela */}
                <div style={{
        marginTop: '16px',
        padding: '16px',
        background: 'rgba(255, 107, 71, 0.05)',
        border: '1px solid rgba(255, 107, 71, 0.2)',
        borderRadius: '8px',
                  display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px'
                }}>
                  <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FF6B47' }}>
            {tableData.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Total de Analistas
          </div>
        </div>


        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
            {tableData.reduce((sum, analyst) => sum + analyst.inProgress, 0)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Em Andamento
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444' }}>
            {tableData.reduce((sum, analyst) => sum + analyst.overdue, 0)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Em Atraso
                    </div>
                  </div>
                </div>

    </div>
  );
};

export default AnalystsCalendar;
