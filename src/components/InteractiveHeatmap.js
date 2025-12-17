// ==========================================
// src/components/InteractiveHeatmap.js - VERSÃO APRIMORADA
// Heatmap com dados reais da planilha e seletor de ano
// ==========================================

import React, { useState, useMemo } from 'react';
import { ZoomIn, Filter } from 'lucide-react';
import { DataProcessingService } from '../services/dataProcessingService';

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

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthKeys = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    
    // Obter o mês atual (0-11)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Usar todos os meses para manter a estrutura visual da tabela
    const filteredMonths = months;
    const filteredMonthKeys = monthKeys;
    
    // ------------------------------------------
    // ✅ Unificação de clientes (aliases + split + normalização)
    // ------------------------------------------
    const selectedYearsSet = new Set(selectedYears.map(String));

    // counts: client -> year -> [12 months]
    const counts = new Map();
    const totalsByClientYear = new Map(); // `${client}|${year}` -> total
    const clients2024 = new Set();
    const clients2025 = new Set();
    const clients2026 = new Set();

    // 🧮 DEBUG: registros incluídos (já com clientes canônicos)
    const includedOrders = [];

    for (const item of data) {
      const dt = DataProcessingService.parseDeliveryDate(item);
      if (!dt) continue;
      const year = String(dt.getFullYear());
      if (!selectedYearsSet.has(year)) continue;

      const monthIndex = dt.getMonth();
      if (monthIndex < 0 || monthIndex > 11) continue;

      const clients = DataProcessingService.extractCanonicalClientsFromOrder(item);
      if (!clients || clients.length === 0) continue;

      includedOrders.push({
        rawCliente: (item?.cliente || item?.cliente1 || item?.cliente2 || '').trim(),
        canonicalClients: clients,
        dataEntrega: item?.dataEntrega,
        tipoDemanda: item?.tipoDemanda,
      });

      for (const clientName of clients) {
        if (!counts.has(clientName)) counts.set(clientName, {});
        const byYear = counts.get(clientName);
        if (!byYear[year]) byYear[year] = new Array(12).fill(0);
        byYear[year][monthIndex] += 1;

        const key = `${clientName}|${year}`;
        totalsByClientYear.set(key, (totalsByClientYear.get(key) || 0) + 1);

        if (year === '2024') clients2024.add(clientName);
        if (year === '2025') clients2025.add(clientName);
        if (year === '2026') clients2026.add(clientName);
      }
    }

    try {
      console.log('🧮 [HEATMAP DEBUG] Registros incluídos (anos/cliente canônico):', {
        anosSelecionados: selectedYears,
        total: includedOrders.length,
        amostra: includedOrders.slice(0, 10),
      });
      if (typeof window !== 'undefined') {
        window.__heatmapIncludedOrders = includedOrders;
      }
    } catch (e) {
      console.warn('⚠️ [HEATMAP DEBUG] Falha ao gerar lista de incluídos:', e);
    }

    const clients = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Calcular valores máximos para normalização (considerando soma dos anos selecionados)
    let maxValue = 0;
    let totalSum = 0;
    for (const clientName of clients) {
      for (let mi = 0; mi < 12; mi++) {
        let total = 0;
        for (const year of selectedYears) {
          const byYear = counts.get(clientName) || {};
          total += (byYear[String(year)]?.[mi] || 0);
        }
        maxValue = Math.max(maxValue, total);
        totalSum += total;
      }
    }

    // Construir matriz com dados multi-ano
    const matrix = clients.map(clientName => {
      return filteredMonths.map((month, monthIndex) => {
        const monthKey = filteredMonthKeys[monthIndex];
        
        // Coletar dados de todos os anos selecionados
        const yearData = {};
        let totalValue = 0;
        
        selectedYears.forEach(year => {
          const byYear = counts.get(clientName) || {};
          // ✅ Só zerar "meses futuros" para o ANO ATUAL (não impactar 2024, 2026 etc.)
          const isFutureForThisYear = Number(year) === currentYear && monthIndex > currentMonth;
          const raw = byYear[String(year)]?.[monthIndex] || 0;
          const value = isFutureForThisYear ? 0 : raw;
          yearData[year] = value;
          totalValue += value;
        });

        // Calcular dados para exibição
        let displayValue = totalValue;
        let intensity = 0;

        if (viewMode === 'percentage') {
          // Calcular percentual do total anual do cliente
          const clientTotalAllYears = selectedYears.reduce((sum, year) => {
            const key = `${clientName}|${String(year)}`;
            return sum + (totalsByClientYear.get(key) || 0);
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

        // Determinar se cliente é novo no ano seguinte (2024→2025 ou 2025→2026)
        const isNewClient2025 =
          selectedYears.includes('2025') &&
          selectedYears.includes('2024') &&
          clients2025.has(clientName) &&
          !clients2024.has(clientName);
        const isNewClient2026 =
          selectedYears.includes('2026') &&
          selectedYears.includes('2025') &&
          clients2026.has(clientName) &&
          !clients2025.has(clientName);
                                
        return {
          client: clientName,
          month: month,
          monthIndex,
          value: totalValue,
          displayValue: displayValue,
          intensity: intensity,
          yearData: yearData, // Dados separados por ano
          isSelected: selectedClient === clientName || selectedMonth === month,
          isHighlighted: hoveredCell?.client === clientName || hoveredCell?.month === month,
          isNovaGestao: isNovaGestao,
          isNewClient2025: isNewClient2025,
          isNewClient2026: isNewClient2026,
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

    return { clients, months: filteredMonths, matrix, maxValue, totalSum, _clients2024: clients2024, _clients2025: clients2025, _clients2026: clients2026, _counts: counts };
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
    
    // Se cliente novo no ano seguinte (2025/2026), usar verde
    if (cell.isNewClient2025 || cell.isNewClient2026) {
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
      total2026: 0,
      average2024: 0,
      average2025: 0,
      average2026: 0,
      peak: 0,
      activeMonths: 0,
      isNewIn2025: false,
      leftIn2025: false,
      isNewIn2026: false,
      leftIn2026: false
    };

    const byYear = heatmapData?._counts?.get(clientName) || {};
    const values2024 = byYear['2024'] || new Array(12).fill(0);
    const values2025 = byYear['2025'] || new Array(12).fill(0);
    const values2026 = byYear['2026'] || new Array(12).fill(0);

    const total2024 = values2024.reduce((a, b) => a + (b || 0), 0);
    const total2025 = values2025.reduce((a, b) => a + (b || 0), 0);
    const total2026 = values2026.reduce((a, b) => a + (b || 0), 0);

    stats.total2024 = total2024;
    stats.total2025 = total2025;
    stats.total2026 = total2026;

    const nonZero2024 = values2024.filter((v) => v > 0);
    const nonZero2025 = values2025.filter((v) => v > 0);
    const nonZero2026 = values2026.filter((v) => v > 0);

    stats.average2024 = nonZero2024.length > 0 ? Math.round((nonZero2024.reduce((s, v) => s + v, 0) / nonZero2024.length) * 10) / 10 : 0;
    stats.average2025 = nonZero2025.length > 0 ? Math.round((nonZero2025.reduce((s, v) => s + v, 0) / nonZero2025.length) * 10) / 10 : 0;
    stats.average2026 = nonZero2026.length > 0 ? Math.round((nonZero2026.reduce((s, v) => s + v, 0) / nonZero2026.length) * 10) / 10 : 0;
    stats.peak = Math.max(stats.peak, ...(values2024 || []), ...(values2025 || []), ...(values2026 || []));
    stats.activeMonths += nonZero2024.length + nonZero2025.length + nonZero2026.length;

    // Detectar status do cliente
    const existsIn2024 = total2024 > 0;
    const existsIn2025 = total2025 > 0;
    const existsIn2026 = total2026 > 0;
    
    stats.isNewIn2025 = !existsIn2024 && existsIn2025;
    stats.leftIn2025 = existsIn2024 && !existsIn2025;
    stats.isNewIn2026 = !existsIn2025 && existsIn2026;
    stats.leftIn2026 = existsIn2025 && !existsIn2026;

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
            <button
              onClick={() => toggleYear('2026')}
              style={{
                padding: '8px 12px',
                background: selectedYears.includes('2026') ? '#2563EB' : 'transparent',
                color: selectedYears.includes('2026') ? 'white' : '#6B7280',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📅 2026
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

          {selectedYears.includes('2026') && selectedYears.includes('2025') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  background: '#10B981',
                  borderRadius: '50%'
                }} />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Novo Cliente 2026</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  background: '#EF4444',
                  borderRadius: '50%'
                }} />
                <span style={{ fontSize: '0.875rem', color: '#374151' }}>Saiu em 2026</span>
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

                  {selectedYears.includes('2026') && (
                    <>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563EB' }}>
                          {stats.total2026}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          Total 2026
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2563EB' }}>
                          {stats.average2026}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          Média 2026
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

                  {stats.isNewIn2026 && (
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      color: '#059669',
                      fontWeight: '600'
                    }}>
                      🆕 Novo Cliente 2026
                    </div>
                  )}
                  
                  {stats.leftIn2026 && (
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      color: '#DC2626',
                      fontWeight: '600'
                    }}>
                      ⚠️ Saiu em 2026
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

                  {selectedYears.includes('2025') && selectedYears.includes('2026') && stats.total2026 > stats.total2025 && (
                    <div style={{
                      padding: '6px 12px',
                      background: 'rgba(37, 99, 235, 0.08)',
                      border: '1px solid rgba(37, 99, 235, 0.25)',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      color: '#1D4ED8',
                      fontWeight: '600'
                    }}>
                      📈 Crescimento 2026 vs 2025
                    </div>
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
            // Extrair clientes únicos (canônicos) de 2024 e 2025
            const clientes2024 = heatmapData?._clients2024 ? Array.from(heatmapData._clients2024) : [];
            const clientes2025 = heatmapData?._clients2025 ? Array.from(heatmapData._clients2025) : [];

            const set2024 = new Set(clientes2024);
            const set2025 = new Set(clientes2025);

            const novos = Array.from(set2025).filter(c => !set2024.has(c));
            const sairam = Array.from(set2024).filter(c => !set2025.has(c));

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

      {/* Resumo dos Novos Clientes (2025 → 2026) */}
      {selectedYears.includes('2026') && selectedYears.includes('2025') && data && Array.isArray(data) && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(37, 99, 235, 0.05)',
          border: '1px solid rgba(37, 99, 235, 0.2)',
          borderRadius: '8px'
        }}>
          <h5 style={{ 
            color: '#2563EB', 
            margin: '0 0 12px 0',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            🔄 Mudanças na Base de Clientes (2025 → 2026)
          </h5>
          
          {(() => {
            const clientes2025 = heatmapData?._clients2025 ? Array.from(heatmapData._clients2025) : [];
            const clientes2026 = heatmapData?._clients2026 ? Array.from(heatmapData._clients2026) : [];

            const set2025 = new Set(clientes2025);
            const set2026 = new Set(clientes2026);

            const novos = Array.from(set2026).filter(c => !set2025.has(c));
            const sairam = Array.from(set2025).filter(c => !set2026.has(c));

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2563EB', marginBottom: 8 }}>🆕 Novos (2026)</div>
                  <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                    {novos.length ? novos.slice(0, 12).join(', ') : '—'}
                    {novos.length > 12 ? ` (+${novos.length - 12})` : ''}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#DC2626', marginBottom: 8 }}>⚠️ Saíram (2026)</div>
                  <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                    {sairam.length ? sairam.slice(0, 12).join(', ') : '—'}
                    {sairam.length > 12 ? ` (+${sairam.length - 12})` : ''}
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
