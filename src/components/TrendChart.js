import React, { useEffect, useMemo, useState } from 'react';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { DataProcessingService } from '../services/dataProcessingService';

const COLORS = [
  '#FF6B47', // in.Pacto
  '#2C3E50',
  '#3B82F6',
  '#10B981',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
  '#06B6D4',
];

const numberBR = (n) => Number(n || 0).toLocaleString('pt-BR');

const TrendChart = ({ data, title, subtitle, showComparison = false, orders = null, initialSelectedYears = null }) => {
  const hasOrdersMode = Array.isArray(orders);
  const [viewMode, setViewMode] = useState('lines'); // lines | bars
  const [selectedYears, setSelectedYears] = useState([]);

  const yearsAvailable = useMemo(() => {
    if (!hasOrdersMode) return [];
    const set = new Set();
    for (const o of orders) {
      const dt = DataProcessingService.parseDeliveryDate(o);
      if (!dt) continue;
      set.add(String(dt.getFullYear()));
    }
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [hasOrdersMode, orders]);

  useEffect(() => {
    if (!hasOrdersMode) return;
    if (!yearsAvailable.length) {
      setSelectedYears([]);
      return;
    }

    setSelectedYears((prev) => {
      // se App passou uma seleção inicial, aplica uma vez (quando prev está vazio)
      if ((!prev || prev.length === 0) && Array.isArray(initialSelectedYears) && initialSelectedYears.length) {
        const valid = initialSelectedYears.map(String).filter((y) => yearsAvailable.includes(String(y)));
        return valid.length ? valid : yearsAvailable.slice(-2);
      }

      // manter seleção atual, mas remover anos que não existem
      const still = (prev || []).map(String).filter((y) => yearsAvailable.includes(String(y)));
      return still.length ? still : yearsAvailable.slice(-2);
    });
  }, [hasOrdersMode, yearsAvailable, initialSelectedYears]);

  const selectedYearsSorted = useMemo(
    () => (selectedYears || []).slice().sort((a, b) => Number(a) - Number(b)),
    [selectedYears]
  );

  const toggleYear = (y) => {
    setSelectedYears((prev) => {
      const set = new Set((prev || []).map(String));
      const key = String(y);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      return Array.from(set);
    });
  };

  const selectAllYears = () => setSelectedYears(yearsAvailable.slice());
  const clearYears = () => setSelectedYears([]);
  const compareWithPrevious = () => {
    if (!yearsAvailable.length) return;
    setSelectedYears((prev) => {
      const curr = (prev && prev.length) ? prev.map(String) : [yearsAvailable[yearsAvailable.length - 1]];
      const max = Math.max(...curr.map((x) => Number(x)));
      const prevYear = String(max - 1);
      const set = new Set(curr);
      if (yearsAvailable.includes(prevYear)) set.add(prevYear);
      return Array.from(set);
    });
  };

  const monthsShort = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const multiYearData = useMemo(() => {
    if (!hasOrdersMode || selectedYearsSorted.length === 0) return [];

    // year -> [12]
    const byYear = new Map();
    selectedYearsSorted.forEach((y) => byYear.set(String(y), new Array(12).fill(0)));

    for (const o of orders) {
      const dt = DataProcessingService.parseDeliveryDate(o);
      if (!dt) continue;
      const year = String(dt.getFullYear());
      if (!byYear.has(year)) continue;
      const m = dt.getMonth();
      if (m < 0 || m > 11) continue;
      byYear.get(year)[m] += 1;
    }

    return monthsShort.map((mes, idx) => {
      const row = { mes, monthIndex: idx };
      selectedYearsSorted.forEach((y) => {
        row[String(y)] = byYear.get(String(y))?.[idx] || 0;
      });

      // variação vs ano anterior selecionado (se existir)
      if (selectedYearsSorted.length >= 2) {
        const last = selectedYearsSorted[selectedYearsSorted.length - 1];
        const prev = selectedYearsSorted[selectedYearsSorted.length - 2];
        const a = row[String(prev)] || 0;
        const b = row[String(last)] || 0;
        row.crescimento = a > 0 ? Math.round(((b - a) / a) * 100) : (b > 0 ? 100 : 0);
      } else {
        row.crescimento = 0;
      }

      // compatibilidade visual: destaque Nova Gestão (Abr+)
      row.isNovaGestao = idx === 3 || idx === 4;
      return row;
    });
  }, [hasOrdersMode, orders, selectedYearsSorted]);

  const selectedYearForTrend = useMemo(() => {
    if (!hasOrdersMode) return null;
    if (!selectedYearsSorted.length) return null;
    return String(selectedYearsSorted[selectedYearsSorted.length - 1]);
  }, [hasOrdersMode, selectedYearsSorted]);

  // Tooltip customizado estilo in.Pacto similar ao MonthlyDetailChart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="custom-tooltip monthly inpacto">
          <div className="tooltip-header">
            <span className="tooltip-logo">in•Pacto</span>
            <span className="tooltip-month">{label}</span>
          </div>
          <div className="tooltip-content">
            {payload.map((entry, index) => (
              <div key={index} className="tooltip-item" style={{ borderLeftColor: entry.color }}>
                <span className="tooltip-label">
                  {/* Modo multi-ano */}
                  {hasOrdersMode && selectedYearsSorted.includes(String(entry.dataKey)) && `📅 ${entry.dataKey}`}
                  {/* Modo legado */}
                  {!hasOrdersMode && entry.dataKey === 'total' && '📊 Total 2025'}
                  {!hasOrdersMode && entry.dataKey === 'media' && '📊 Total 2025'}
                  {!hasOrdersMode && entry.dataKey === 'total2024' && '📅 Total 2024'}
                  {!hasOrdersMode && entry.dataKey === 'media2024' && '📅 Total 2024'}
                </span>
                <span className="tooltip-value">{entry.value} demandas</span>
              </div>
            ))}
          </div>
          <div className="tooltip-footer">
            <div className="tooltip-trend">
              <span className="trend-icon">
                {row.crescimento > 20 ? '🚀' : row.crescimento > 0 ? '📈' : row.crescimento < 0 ? '📉' : '➡️'}
              </span>
              <span>
                {row.crescimento > 20 ? 'Alto Crescimento' : 
                 row.crescimento > 0 ? 'Crescimento' : 
                 row.crescimento < 0 ? 'Declínio' : 'Estável'}
              </span>
            </div>
            {row.crescimento !== undefined && row.crescimento !== 0 && (
              <div className="tooltip-growth">
                <span style={{ color: row.crescimento > 0 ? '#10B981' : '#EF4444' }}>
                  {row.crescimento > 0 ? '+' : ''}{row.crescimento}%
                  {hasOrdersMode && selectedYearsSorted.length >= 2
                    ? ` vs ${selectedYearsSorted[selectedYearsSorted.length - 2]}`
                    : ' vs 2024'}
                </span>
              </div>
            )}
            {row.isNovaGestao && (
              <div className="tooltip-highlight">
                <span>🚀 Nova Gestão in.Pacto</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Componente customizado para rótulos dos dados
  const CustomDataLabel = (props) => {
    const { x, y, value, index } = props;
    if (value === 0) return null;
    
    return (
      <text 
        key={`label-${index}-${value}`}
        x={x} 
        y={y - 8} 
        fill="#FF6B47" 
        textAnchor="middle" 
        fontSize="11" 
        fontWeight="600"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="chart-container modern">
      <h3 className="chart-title">{title}</h3>
      <p className="chart-subtitle">{subtitle}</p>

      {/* Seletor multi-ano (novo) */}
      {hasOrdersMode && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '10px 0 16px 0', alignItems: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#6B7280' }}>
            Anos:
          </div>
          {yearsAvailable.map((y, idx) => {
            const active = selectedYearsSorted.includes(String(y));
            return (
              <button
                key={y}
                onClick={() => toggleYear(y)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 10,
                  border: `1px solid ${active ? '#FF6B47' : '#E5E7EB'}`,
                  background: active ? '#FFF5F2' : 'white',
                  color: active ? '#C2410C' : '#374151',
                  cursor: 'pointer',
                  fontWeight: 900,
                }}
                title={active ? 'Clique para remover' : 'Clique para adicionar'}
              >
                {y}
              </button>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: 8,
                background: 'white',
                fontSize: '0.875rem',
              }}
            >
              <option value="lines">Linhas</option>
              <option value="bars">Barras</option>
            </select>

            <button
              onClick={selectAllYears}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#F3F4F6',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.875rem',
              }}
            >
              Selecionar tudo
            </button>
            <button
              onClick={clearYears}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #FF6B47',
                background: '#FF6B47',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '0.875rem',
              }}
            >
              Limpar
            </button>
            <button
              onClick={compareWithPrevious}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: 'white',
                cursor: 'pointer',
                fontWeight: 900,
                fontSize: '0.875rem',
              }}
              title="Adiciona o ano anterior ao maior ano selecionado"
            >
              Comparar com ano anterior
            </button>
          </div>
        </div>
      )}
      
      {/* Render do gráfico */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={hasOrdersMode ? multiYearData : data} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorGradient2025" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B47" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#FF6B47" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorGradient2024" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2C3E50" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#2C3E50" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
          
          <XAxis 
            dataKey="mes" 
            stroke="#FF6B47" 
            fontSize={14}
            tick={{ fill: '#FF6B47' }}
          />
          
          <YAxis 
            stroke="#FF6B47" 
            fontSize={12}
            tick={{ fill: '#FF6B47' }}
            label={{ 
              value: 'Relatórios', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#FF6B47' }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Modo multi-ano */}
          {hasOrdersMode ? (
            <>
              {selectedYearsSorted.map((y, idx) => {
                const color = COLORS[idx % COLORS.length];
                const isPrimary = idx === selectedYearsSorted.length - 1;
                if (viewMode === 'bars') {
                  return (
                    <Bar
                      key={y}
                      dataKey={String(y)}
                      fill={color}
                      name={String(y)}
                      radius={[4, 4, 0, 0]}
                    />
                  );
                }
                return (
                  <Line
                    key={y}
                    type="monotone"
                    dataKey={String(y)}
                    stroke={color}
                    strokeWidth={isPrimary ? 3 : 2}
                    strokeDasharray={idx === 0 && selectedYearsSorted.length > 1 ? '8 4' : '0'}
                    dot={{ fill: color, strokeWidth: 2, r: isPrimary ? 5 : 4 }}
                    activeDot={{ r: 7, fill: color, stroke: '#fff', strokeWidth: 2 }}
                    name={String(y)}
                  />
                );
              })}
            </>
          ) : (
            /* Modo legado (2024 vs 2025) */
            <>
              <Area
                type="monotone"
                dataKey="media"
                stroke="#FF6B47"
                fill="url(#colorGradient2025)"
                strokeWidth={3}
                name="Média Atual"
                dot={(props) => {
                  const { payload, cx, cy } = props;
                  return (
                    <circle 
                      key={`circle-${payload.mes}-${payload.total}`}
                      cx={cx}
                      cy={cy}
                      fill={payload.isNovaGestao ? '#10b981' : '#FF6B47'}
                      stroke={payload.isNovaGestao ? '#10b981' : '#FF6B47'}
                      strokeWidth={3} 
                      r={payload.isNovaGestao ? 7 : 5}
                      style={{ 
                        filter: payload.isNovaGestao ? 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.4))' : 'none'
                      }}
                    />
                  );
                }}
                activeDot={{ r: 8, fill: '#FF6B47', stroke: '#fff', strokeWidth: 2 }}
              >
                <LabelList content={<CustomDataLabel />} />
              </Area>

              {showComparison && (
                <Line
                  type="monotone"
                  dataKey="media2024"
                  stroke="#2C3E50"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  name="Média 2024"
                  dot={{ fill: '#2C3E50', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#2C3E50', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
            </>
          )}

        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legenda explicativa */}
      <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-dot nova-gestao"></div>
              <span>Período Nova Gestão (Abril-Maio)</span>
            </div>
            {(!hasOrdersMode && showComparison) && (
              <>
                <div className="legend-item">
                  <div className="legend-line comparison"></div>
                  <span>Comparação mês a mês com 2024</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#FF6B47' }}></div>
                  <span>Demandas terminadas 2025</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line" style={{ borderColor: '#2C3E50', borderStyle: 'dashed' }}></div>
                  <span>Demandas terminadas 2024</span>
                </div>
              </>
            )}
      </div>

      {/* Insights do gráfico de tendência */}
      <div className="chart-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Meses Analisados:</span>
            <span className="stat-value">{hasOrdersMode ? multiYearData.length : data.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Crescimento Médio:</span>
            <span className="stat-value positive">
              {(hasOrdersMode ? multiYearData.length : data.length) > 0 ? 
                (() => {
                  const base = hasOrdersMode ? multiYearData : data;
                  const mesesComDados = base.filter(m => m.crescimento !== undefined && !isNaN(m.crescimento));
                  const crescimentoMedio = mesesComDados.length > 0
                    ? Math.round(mesesComDados.reduce((sum, mes) => sum + (mes.crescimento || 0), 0) / mesesComDados.length)
                    : 0;
                  return `${crescimentoMedio > 0 ? '+' : ''}${crescimentoMedio}%`;
                })() : 
                '0%'
              }
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Melhor Mês:</span>
            <span className="stat-value">
              {(hasOrdersMode ? multiYearData.length : data.length) > 0 ? 
                (() => {
                  const base = hasOrdersMode ? multiYearData : data;
                  const melhorMes = base.reduce((melhor, mes) => {
                    // Comparar crescimento percentual ou total de demandas
                    const cresMelhor = melhor.crescimento || 0;
                    const cresMes = mes.crescimento || 0;
                    return cresMes > cresMelhor ? mes : melhor;
                  }, base[0]);
                  return melhorMes?.mes || 'N/A';
                })() :
                'N/A'
              }
            </span>
          </div>
        </div>
        
        {/* Indicador de tendência geral */}
        {(hasOrdersMode ? multiYearData.length : data.length) > 0 && (
          <div className="top-performer">
            <div className="performer-card">
              <div className="performer-icon">
                {(() => {
                  const base = hasOrdersMode ? multiYearData : data;
                  const now = new Date();
                  const currentYear = now.getFullYear();
                  const currentMonth = now.getMonth();

                  const key = hasOrdersMode ? (selectedYearForTrend || '') : '';
                  const getVal = (row) => {
                    if (!row) return 0;
                    if (hasOrdersMode) return Number(row[String(key)] || 0);
                    // legado: preferir `media` (série exibida) e cair para `total`
                    if (row.media !== undefined) return Number(row.media || 0);
                    return Number(row.total || 0);
                  };

                  const valid = base.filter((row) => {
                    if (!row) return false;
                    // legado tem `isFutureMonth`; multi-ano não
                    if (!hasOrdersMode) return row.isFutureMonth !== true;
                    // multi-ano: se o ano selecionado é o ano atual, ignorar meses futuros
                    if (key && /^\d{4}$/.test(key) && Number(key) === currentYear) {
                      return Number(row.monthIndex) <= currentMonth;
                    }
                    return true;
                  });

                  const firstRow = valid[0] || base[0];
                  const lastRow = valid[valid.length - 1] || base[base.length - 1];
                  const firstVal = getVal(firstRow);
                  const lastVal = getVal(lastRow);
                  const tendenciaGeral = lastVal > firstVal;
                  return tendenciaGeral ? '📈' : '📉';
                })()}
              </div>
              <div className="performer-info">
                <div className="performer-title">Tendência Geral</div>
                <div className="performer-client">
                  {(() => {
                    const base = hasOrdersMode ? multiYearData : data;
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth();

                    const key = hasOrdersMode ? (selectedYearForTrend || '') : '';
                    const getVal = (row) => {
                      if (!row) return 0;
                      if (hasOrdersMode) return Number(row[String(key)] || 0);
                      if (row.media !== undefined) return Number(row.media || 0);
                      return Number(row.total || 0);
                    };

                    const valid = base.filter((row) => {
                      if (!row) return false;
                      if (!hasOrdersMode) return row.isFutureMonth !== true;
                      if (key && /^\d{4}$/.test(key) && Number(key) === currentYear) {
                        return Number(row.monthIndex) <= currentMonth;
                      }
                      return true;
                    });

                    const firstRow = valid[0] || base[0];
                    const lastRow = valid[valid.length - 1] || base[base.length - 1];
                    const firstVal = getVal(firstRow);
                    const lastVal = getVal(lastRow);
                    const tendenciaGeral = lastVal > firstVal;
                    return tendenciaGeral ? 'Crescimento' : 'Declínio';
                  })()}
                </div>
                <div className="performer-growth">
                  {(() => {
                    const base = hasOrdersMode ? multiYearData : data;
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth();

                    const key = hasOrdersMode ? (selectedYearForTrend || '') : '';
                    const getVal = (row) => {
                      if (!row) return 0;
                      if (hasOrdersMode) return Number(row[String(key)] || 0);
                      if (row.media !== undefined) return Number(row.media || 0);
                      return Number(row.total || 0);
                    };

                    const valid = base.filter((row) => {
                      if (!row) return false;
                      if (!hasOrdersMode) return row.isFutureMonth !== true;
                      if (key && /^\d{4}$/.test(key) && Number(key) === currentYear) {
                        return Number(row.monthIndex) <= currentMonth;
                      }
                      return true;
                    });

                    const firstRow = valid[0] || base[0];
                    const lastRow = valid[valid.length - 1] || base[base.length - 1];
                    const firstVal = getVal(firstRow);
                    const lastVal = getVal(lastRow);
                    if (firstVal > 0) {
                      const variacao = ((lastVal - firstVal) / firstVal) * 100;
                      return `${variacao > 0 ? '+' : ''}${Math.round(variacao)}%`;
                    }
                    return lastVal > 0 ? '+100%' : '0%';
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendChart;