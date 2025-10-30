// ==========================================
// src/components/InteractiveHeatmap.js - VERSÃO APRIMORADA
// Heatmap com dados reais da planilha e seletor de ano
// ==========================================

import React, { useState, useMemo } from 'react';
import { ZoomIn, Filter } from 'lucide-react';

const InteractiveHeatmap = ({ data, onCellClick, title = "Heatmap de Produção" }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [viewMode, setViewMode] = useState('absolute'); // absolute, percentage
  const [selectedYears, setSelectedYears] = useState(['2025']); // Novo: seletor de anos

  // Alternar seleção de anos
  const toggleYear = (year) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year);
      } else {
        return [...prev, year];
      }
    });
  };

  // Processar dados para heatmap com base nos anos selecionados
  const heatmapData = useMemo(() => {
    console.log('🗺️ [HEATMAP DEBUG] Dados recebidos:', {
      dataType: typeof data,
      isArray: Array.isArray(data),
      length: Array.isArray(data) ? data.length : 'N/A',
      sampleItem: Array.isArray(data) && data.length > 0 ? data[0] : null
    });
    
    if (!data || !Array.isArray(data)) return { clients: [], months: [], matrix: [], maxValue: 0, totalSum: 0 };

    // 🧮 DEBUG: Listar exatamente os registros incluídos pelo Heatmap (anos selecionados + cliente válido)
    try {
      const includedOrders = data.filter(item => {
        const dataStr = item?.dataEntrega || '';
        const cliente = (item?.cliente || item?.cliente1 || item?.cliente2 || '').trim();
        if (!cliente) return false;
        return selectedYears.some(y => dataStr.includes(String(y)));
      });
      console.log('🧮 [HEATMAP DEBUG] Registros incluídos (anos/cliente):', {
        anosSelecionados: selectedYears,
        total: includedOrders.length,
        amostra: includedOrders.slice(0, 10).map(x => ({
          cliente: (x.cliente || x.cliente1 || x.cliente2 || '').trim(),
          dataEntrega: x.dataEntrega,
          tipoDemanda: x.tipoDemanda
        }))
      });
      if (typeof window !== 'undefined') {
        window.__heatmapIncludedOrders = includedOrders;
      }
    } catch (e) {
      console.warn('⚠️ [HEATMAP DEBUG] Falha ao gerar lista de incluídos:', e);
    }

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthKeys = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    // Obter o mês atual (0-11)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Usar todos os meses para manter a estrutura visual da tabela
    const filteredMonths = months;
    const filteredMonthKeys = monthKeys;
    
    // CORREÇÃO: Usar dados filtrados diretamente (data é um array)
    const allClients = new Set();
    
    // Processar dados 2025 dos dados filtrados
    if (selectedYears.includes('2025')) {
      const items2025 = data.filter(item => {
        const dataStr = item.dataEntrega || '';
        return dataStr.includes('2025');
      });
      
      console.log('🗺️ [HEATMAP DEBUG] Dados 2025:', {
        totalItems: items2025.length,
        sampleItems: items2025.slice(0, 3)
      });
      
      items2025.forEach(item => {
        const cliente = item.cliente || item.cliente1 || item.cliente2 || 'Cliente Desconhecido';
        if (cliente && cliente.trim()) {
          allClients.add(cliente.trim());
        }
      });
    }
    
    // Processar dados 2024 dos dados filtrados
    if (selectedYears.includes('2024')) {
      const items2024 = data.filter(item => {
        const dataStr = item.dataEntrega || '';
        return dataStr.includes('2024');
      });
      
      items2024.forEach(item => {
        const cliente = item.cliente || item.cliente1 || item.cliente2 || 'Cliente Desconhecido';
        if (cliente && cliente.trim()) {
          allClients.add(cliente.trim());
        }
      });
    }

    const clients = Array.from(allClients).sort();

    // Calcular valores máximos para normalização
    let maxValue = 0;
    let totalSum = 0;
    
    // Função para obter dados do cliente por ano (usando dados filtrados)
    const getClientData = (clientName, year) => {
      if (!data || !Array.isArray(data)) return {};
      
      const items = data.filter(item => {
        const dataStr = item.dataEntrega || '';
        const cliente = item.cliente || item.cliente1 || item.cliente2 || '';
        return dataStr.includes(year) && cliente.trim() === clientName;
      });
      
      // Calcular dados mensais para o cliente
      const monthData = {};
      let total = 0;
      
      items.forEach(item => {
        const dataEntrega = new Date(item.dataEntrega);
        const monthIndex = dataEntrega.getMonth();
        const monthKey = monthKeys[monthIndex];
        
        if (monthKey) {
          monthData[monthKey] = (monthData[monthKey] || 0) + 1;
          total += 1;
        }
      });
      
      return {
        ...monthData,
        total: total
      };
    };

    // Calcular max value considerando todos os anos selecionados
    selectedYears.forEach(year => {
      clients.forEach(clientName => {
        const clientData = getClientData(clientName, year);
        filteredMonthKeys.forEach(monthKey => {
          const value = clientData[monthKey] || 0;
          maxValue = Math.max(maxValue, value);
          totalSum += value;
        });
      });
    });

    // Construir matriz com dados multi-ano
    const matrix = clients.map(clientName => {
      return filteredMonths.map((month, monthIndex) => {
        const monthKey = filteredMonthKeys[monthIndex];
        
        // Coletar dados de todos os anos selecionados
        const yearData = {};
        let totalValue = 0;
        
        selectedYears.forEach(year => {
          const clientData = getClientData(clientName, year);
          const value = clientData[monthKey] || 0;
          yearData[year] = value;
          totalValue += value;
        });

        // Calcular dados para exibição
        let displayValue = totalValue;
        let intensity = 0;

        if (viewMode === 'percentage') {
          // Calcular percentual do total anual do cliente
          const clientTotalAllYears = selectedYears.reduce((sum, year) => {
            const clientData = getClientData(clientName, year);
            return sum + (clientData.total || 0);
          }, 0);
          
          const percentage = clientTotalAllYears > 0 ? (totalValue / clientTotalAllYears) * 100 : 0;
          displayValue = Math.round(percentage * 10) / 10;
          intensity = percentage / 100;
        } else {
          // Modo absoluto
          displayValue = totalValue;
          intensity = maxValue > 0 ? totalValue / maxValue : 0;
        }

        // Determinar se é período da nova gestão (abril 2024 em diante)
        const isNovaGestao = (monthIndex >= 3); // Abril em diante

        // Determinar se cliente é novo em 2025
        const isNewClient2025 = selectedYears.includes('2025') && 
                                selectedYears.includes('2024') && 
                                data.visaoGeral?.some(c => c.cliente === clientName) &&
                                !data.visaoGeral2024?.some(c => c.cliente === clientName);
                                
        // Verificar se o mês é futuro (para não mostrar dados futuros)
        const isFutureMonth = (currentYear === 2025 && monthIndex > currentMonth) || 
                             (currentYear > 2025);

        return {
          client: clientName,
          month: month,
          monthIndex,
          value: isFutureMonth ? 0 : totalValue, // Zero para meses futuros
          displayValue: isFutureMonth ? 0 : displayValue, // Zero para meses futuros
          intensity: intensity,
          yearData: yearData, // Dados separados por ano
          isSelected: selectedClient === clientName || selectedMonth === month,
          isHighlighted: hoveredCell?.client === clientName || hoveredCell?.month === month,
          isNovaGestao: isNovaGestao,
          isNewClient2025: isNewClient2025,
          selectedYears: selectedYears
        };
      });
    });

    console.log('🗺️ [HEATMAP] Dados processados:', {
      clientsCount: clients.length,
      maxValue,
      totalSum,
      matrixCells: matrix.length * (matrix[0]?.length || 0),
      sampleClient: clients[0] || 'N/A',
      sampleData: matrix[0]?.[0] || null,
      selectedYears,
      dataSource: 'originalOrders',
      totalClients: clients.length,
      totalReports: totalSum,
      debug: {
        dataLength: data?.length || 0,
        dataType: typeof data,
        isArray: Array.isArray(data),
        sampleItem: data?.[0] || null
      }
    });

    return { clients, months: filteredMonths, matrix, maxValue, totalSum };
  }, [data, selectedClient, selectedMonth, hoveredCell, viewMode, selectedYears]);

  // Obter cor da célula baseada na intensidade e contexto
  const getCellColor = (cell) => {
    if (cell.value === 0) return '#F1F5F9'; // Cinza claro para zero
    
    const intensity = Math.min(cell.intensity, 1);
    
    // Se mostrando ambos os anos, usar gradiente diferenciado
    if (selectedYears.length > 1) {
      const opacity = 0.1 + (intensity * 0.7);
      return `rgba(59, 130, 246, ${opacity})`; // Azul para comparativo
    }
    
    // Se cliente novo em 2025, usar verde
    if (cell.isNewClient2025) {
      const opacity = 0.2 + (intensity * 0.6);
      return `rgba(16, 185, 129, ${opacity})`;
    }
    
    // Se período nova gestão, usar cor especial
    if (cell.isNovaGestao && selectedYears.includes('2024')) {
      const opacity = 0.1 + (intensity * 0.8);
      return `rgba(139, 92, 246, ${opacity})`; // Roxo para nova gestão
    }
    
    // Cor padrão in.Pacto
    const opacity = 0.1 + (intensity * 0.8);
    return `rgba(255, 107, 71, ${opacity})`;
  };

  // Obter estatísticas do cliente
  const getClientStats = (clientName) => {
    if (!data || !Array.isArray(data)) return null;

    const stats = {
      total2024: 0,
      total2025: 0,
      average2024: 0,
      average2025: 0,
      peak: 0,
      activeMonths: 0,
      isNewIn2025: false,
      leftIn2025: false
    };

    // Dados 2024
    const items2024 = data.filter(item => {
      const dataStr = item.dataEntrega || '';
      const cliente = item.cliente || item.cliente1 || item.cliente2 || '';
      return dataStr.includes('2024') && cliente.trim() === clientName;
    });
    
    if (items2024.length > 0) {
      stats.total2024 = items2024.length;
      const monthKeys = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const values2024 = monthKeys.map(key => {
        return items2024.filter(item => {
          const dataEntrega = new Date(item.dataEntrega);
          const monthIndex = dataEntrega.getMonth();
          return monthKeys[monthIndex] === key;
        }).length;
      });
      const nonZero2024 = values2024.filter(v => v > 0);
      stats.average2024 = nonZero2024.length > 0 ? Math.round((nonZero2024.reduce((sum, v) => sum + v, 0) / nonZero2024.length) * 10) / 10 : 0;
      stats.peak = Math.max(stats.peak, ...values2024);
      stats.activeMonths += nonZero2024.length;
    }

    // Dados 2025
    const items2025 = data.filter(item => {
      const dataStr = item.dataEntrega || '';
      const cliente = item.cliente || item.cliente1 || item.cliente2 || '';
      return dataStr.includes('2025') && cliente.trim() === clientName;
    });
    
    if (items2025.length > 0) {
      stats.total2025 = items2025.length;
      const monthKeys = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const values2025 = monthKeys.map(key => {
        return items2025.filter(item => {
          const dataEntrega = new Date(item.dataEntrega);
          const monthIndex = dataEntrega.getMonth();
          return monthKeys[monthIndex] === key;
        }).length;
      });
      const nonZero2025 = values2025.filter(v => v > 0);
      stats.average2025 = nonZero2025.length > 0 ? Math.round((nonZero2025.reduce((sum, v) => sum + v, 0) / nonZero2025.length) * 10) / 10 : 0;
      stats.peak = Math.max(stats.peak, ...values2025);
      stats.activeMonths += nonZero2025.length;
    }

    // Detectar status do cliente
    const existsIn2024 = items2024.length > 0;
    const existsIn2025 = items2025.length > 0;
    
    stats.isNewIn2025 = !existsIn2024 && existsIn2025;
    stats.leftIn2025 = existsIn2024 && !existsIn2025;

    return stats;
  };

  // Handle cell click
  const handleCellClick = (cell) => {
    if (onCellClick) {
      onCellClick(cell.client, cell.month, cell.value);
    }
    setSelectedClient(cell.client);
    setSelectedMonth(cell.month);
  };

  // Handle cell hover
  const handleCellHover = (cell) => {
    setHoveredCell(cell);
  };

  const clearHover = () => {
    setHoveredCell(null);
  };

  return (
    <div className="chart-container modern heatmap">
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
            Mapa de calor com dados reais da planilha • Clique para drill-down
          </p>
        </div>
        
        {/* Controles */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Seletor de Anos */}
          <div style={{
            display: 'flex',
            gap: '8px',
            background: '#F3F4F6',
            padding: '4px',
            borderRadius: '8px'
          }}>
            <button
              onClick={() => toggleYear('2024')}
              style={{
                padding: '8px 12px',
                background: selectedYears.includes('2024') ? '#8B5CF6' : 'transparent',
                color: selectedYears.includes('2024') ? 'white' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📅 2024
            </button>
            <button
              onClick={() => toggleYear('2025')}
              style={{
                padding: '8px 12px',
                background: selectedYears.includes('2025') ? '#FF6B47' : 'transparent',
                color: selectedYears.includes('2025') ? 'white' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📅 2025
            </button>
          </div>

          {/* Seletor de Modo */}
          <select 
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              background: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="absolute">Valores Absolutos</option>
            <option value="percentage">% do Total Anual</option>
          </select>
          
          <button
            onClick={() => {
              setSelectedClient(null);
              setSelectedMonth(null);
              setHoveredCell(null);
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
            Limpar Seleção
          </button>
        </div>
      </div>

      {/* Status dos Anos Selecionados */}
      <div style={{
        marginBottom: '20px',
        padding: '12px 16px',
        background: selectedYears.length > 1 ? 'rgba(59, 130, 246, 0.1)' : 
                   selectedYears.includes('2025') ? 'rgba(255, 107, 71, 0.1)' : 'rgba(139, 92, 246, 0.1)',
        border: `1px solid ${selectedYears.length > 1 ? 'rgba(59, 130, 246, 0.3)' : 
                             selectedYears.includes('2025') ? 'rgba(255, 107, 71, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
        borderRadius: '8px',
        fontSize: '0.875rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>
            {selectedYears.length > 1 ? '📊' : selectedYears.includes('2025') ? '📅' : '📚'}
          </span>
          <span style={{ fontWeight: '600' }}>
            Visualizando: {selectedYears.join(' + ')} • 
            {heatmapData.clients.length} clientes • 
            {heatmapData.totalSum} relatórios total
          </span>
        </div>
      </div>

      {/* Heatmap Principal */}
      <div style={{ 
        overflowX: 'auto',
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '12px'
      }}>
        <div style={{ 
          minWidth: '800px',
          display: 'grid',
          gridTemplateColumns: '120px repeat(12, 1fr)',
          gap: '1px',
          background: '#E2E8F0',
          padding: '1px'
        }}>
          
          {/* Header com meses */}
          <div style={{ 
            background: '#FF6B47',
            color: 'white',
            padding: '12px 8px',
            fontWeight: '600',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            Cliente / Mês
          </div>
          
          {heatmapData.months.map((month, index) => (
            <div
              key={month}
              style={{
                background: selectedMonth === month ? '#FF8A6B' : '#FF6B47',
                color: 'white',
                padding: '12px 8px',
                fontWeight: '600',
                fontSize: '0.875rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
            >
              {month}
              {/* Indicador nova gestão */}
              {index >= 3 && selectedYears.includes('2024') && (
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#8B5CF6'
                }} />
              )}
            </div>
          ))}

          {/* Linhas de dados */}
          {heatmapData.matrix.map((clientRow, clientIndex) => (
            <React.Fragment key={heatmapData.clients[clientIndex]}>
              {/* Nome do cliente */}
              <div
                style={{
                  background: selectedClient === heatmapData.clients[clientIndex] ? '#FF6B47' : 'white',
                  color: selectedClient === heatmapData.clients[clientIndex] ? 'white' : '#374151',
                  padding: '12px 8px',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderLeft: selectedClient === heatmapData.clients[clientIndex] ? '3px solid #E5522F' : 'none',
                  position: 'relative'
                }}
                onClick={() => setSelectedClient(
                  selectedClient === heatmapData.clients[clientIndex] ? null : heatmapData.clients[clientIndex]
                )}
              >
                {heatmapData.clients[clientIndex]}
                
                {/* Indicadores de status do cliente */}
                {(() => {
                  const stats = getClientStats(heatmapData.clients[clientIndex]);
                  if (!stats) return null;
                  
                  return (
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      display: 'flex',
                      gap: '2px'
                    }}>
                      {stats.isNewIn2025 && (
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#10B981'
                        }} title="Novo cliente em 2025" />
                      )}
                      {stats.leftIn2025 && (
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#EF4444'
                        }} title="Cliente saiu em 2025" />
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Células de dados */}
              {clientRow.map((cell, monthIndex) => (
                <div
                  key={`${clientIndex}-${monthIndex}`}
                  style={{
                    background: getCellColor(cell),
                    padding: '12px 8px',
                    textAlign: 'center',
                    cursor: cell.value > 0 ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    border: cell.isSelected ? '2px solid #FF6B47' : 
                           cell.isHighlighted ? '2px solid #FF8A6B' : '2px solid transparent',
                    fontWeight: cell.value > 0 ? '600' : '400',
                    fontSize: '0.875rem',
                    color: cell.intensity > 0.6 ? 'white' : '#374151',
                    position: 'relative',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onClick={() => cell.value > 0 && handleCellClick(cell)}
                  onMouseEnter={() => handleCellHover(cell)}
                  onMouseLeave={clearHover}
                >
                  {cell.displayValue > 0 ? 
                    (viewMode === 'percentage' ? `${cell.displayValue}%` : cell.displayValue) : 
                    '–'
                  }
                  
                  {/* Indicadores especiais */}
                  {cell.isNovaGestao && cell.value > 0 && selectedYears.includes('2024') && (
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#8B5CF6'
                    }} />
                  )}

                  {cell.isNewClient2025 && (
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: '2px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#10B981'
                    }} />
                  )}

                  {/* Tooltip hover */}
                  {hoveredCell?.client === cell.client && hoveredCell?.month === cell.month && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.9)',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      whiteSpace: 'nowrap',
                      zIndex: 1000,
                      marginBottom: '4px',
                      maxWidth: '200px'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {cell.client} • {cell.month}
                      </div>
                      
                      {/* Dados por ano */}
                      {Object.entries(cell.yearData).map(([year, value]) => (
                        <div key={year} style={{ fontSize: '0.7rem' }}>
                          {year}: {value} relatórios
                        </div>
                      ))}
                      
                      <div style={{ marginTop: '4px', fontSize: '0.7rem' }}>
                        Total: {cell.value} relatórios
                      </div>
                      
                      {cell.isNewClient2025 && (
                        <div style={{ color: '#10B981', fontSize: '0.7rem' }}>
                          🆕 Novo em 2025
                        </div>
                      )}
                      
                      {cell.isNovaGestao && selectedYears.includes('2024') && (
                        <div style={{ color: '#8B5CF6', fontSize: '0.7rem' }}>
                          🚀 Nova Gestão
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '16px',
        padding: '16px',
        background: '#F8FAFC',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: selectedYears.length > 1 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 107, 71, 0.9)',
              borderRadius: '4px'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>Alta Produção</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: selectedYears.length > 1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 107, 71, 0.3)',
              borderRadius: '4px'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>Média Produção</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: '#F1F5F9',
              borderRadius: '4px'
            }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>Sem Produção</span>
          </div>

          {selectedYears.includes('2024') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                background: '#8B5CF6',
                borderRadius: '50%'
              }} />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Nova Gestão (Abr+)</span>
            </div>
          )}

          {selectedYears.includes('2025') && selectedYears.includes('2024') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  background: '#10B981',
                  borderRadius: '50%'
                }} />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Novo Cliente 2025</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  background: '#EF4444',
                  borderRadius: '50%'
                }} />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Saiu em 2025</span>
              </div>
            </>
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
          Máximo: {heatmapData.maxValue} • 
          Anos: {selectedYears.join(', ')} • 
          Modo: {viewMode === 'percentage' ? 'Percentual' : 'Absoluto'}
        </div>
      </div>

      {/* Estatísticas do Cliente Selecionado */}
      {selectedClient && (
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: 'rgba(255, 107, 71, 0.05)',
          border: '1px solid rgba(255, 107, 71, 0.2)',
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h4 style={{ 
              color: '#FF6B47', 
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600'
            }}>
              📊 Análise Detalhada: {selectedClient}
            </h4>
            <button
              onClick={() => onCellClick && onCellClick(selectedClient, null, null)}
              style={{
                padding: '8px 16px',
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
              <ZoomIn size={14} />
              Drill Down
            </button>
          </div>

          {(() => {
            const stats = getClientStats(selectedClient);
            if (!stats) return null;

            return (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px'
                }}>
                  {selectedYears.includes('2024') && (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B5CF6' }}>
                          {stats.total2024}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          Total 2024
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8B5CF6' }}>
                          {stats.average2024}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          Média 2024
                        </div>
                      </div>
                    </>
                  )}
                  
                  {selectedYears.includes('2025') && (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FF6B47' }}>
                          {stats.total2025}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          Total 2025
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#FF6B47' }}>
                          {stats.average2025}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          Média 2025
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
                      {stats.peak}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      Pico Mensal
                    </div>
                  </div>
                </div>

                {/* Status especiais */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {stats.isNewIn2025 && (
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      color: '#059669',
                      fontWeight: '600'
                    }}>
                      🆕 Novo Cliente 2025
                    </div>
                  )}
                  
                  {stats.leftIn2025 && (
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      color: '#DC2626',
                      fontWeight: '600'
                    }}>
                      ⚠️ Saiu em 2025
                    </div>
                  )}

                  {selectedYears.includes('2024') && selectedYears.includes('2025') && stats.total2025 > stats.total2024 && (
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      color: '#7C3AED',
                      fontWeight: '600'
                    }}>
                      📈 Crescimento no Ano Vigente                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Resumo dos Novos Clientes */}
      {selectedYears.includes('2025') && selectedYears.includes('2024') && data && Array.isArray(data) && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '8px'
        }}>
          <h5 style={{ 
            color: '#10B981', 
            margin: '0 0 12px 0',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            🔄 Mudanças na Base de Clientes (2024 → 2025)
          </h5>
          
          {(() => {
            // Extrair clientes únicos de 2024 e 2025 dos dados filtrados
            const clientes2024 = new Set();
            const clientes2025 = new Set();
            
            data.forEach(item => {
              const cliente = item.cliente || item.cliente1 || item.cliente2 || '';
              const dataStr = item.dataEntrega || '';
              
              if (dataStr.includes('2024') && cliente.trim()) {
                clientes2024.add(cliente.trim());
              }
              if (dataStr.includes('2025') && cliente.trim()) {
                clientes2025.add(cliente.trim());
              }
            });
            
            const novos = Array.from(clientes2025).filter(c => !clientes2024.has(c));
            const sairam = Array.from(clientes2024).filter(c => !clientes2025.has(c));

            return (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '600', marginBottom: '4px' }}>
                    🆕 Novos Clientes ({novos.length}):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {novos.length > 0 ? novos.join(', ') : 'Nenhum'}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#DC2626', fontWeight: '600', marginBottom: '4px' }}>
                    ⚠️ Clientes que Saíram ({sairam.length}):
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {sairam.length > 0 ? sairam.join(', ') : 'Nenhum'}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default InteractiveHeatmap;
