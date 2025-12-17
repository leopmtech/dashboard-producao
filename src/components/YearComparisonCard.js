import React, { useMemo, useState, useEffect } from 'react';
import { DataProcessingService } from '../services/dataProcessingService';
import { Filter } from 'lucide-react';

const numberBR = (n) => Number(n || 0).toLocaleString('pt-BR');

const pct = (prev, curr) => {
  const a = Number(prev || 0);
  const b = Number(curr || 0);
  if (a === 0) return b > 0 ? 100 : 0;
  return ((b - a) / a) * 100;
};

const formatDelta = (prev, curr) => {
  const v = pct(prev, curr);
  const sign = v > 0 ? '+' : '';
  return `${sign}${Math.round(v)}%`;
};

const deltaColor = (prev, curr) => {
  const v = pct(prev, curr);
  if (v > 0) return '#059669'; // green-600
  if (v < 0) return '#DC2626'; // red-600
  return '#6B7280'; // gray-500
};

const YearComparisonCard = ({ data, title = '📊 Comparativo por Ano' }) => {
  const orders = Array.isArray(data?.originalOrders) ? data.originalOrders : [];

  const yearsAvailable = useMemo(() => {
    const set = new Set();
    for (const o of orders) {
      const dt = DataProcessingService.parseDeliveryDate(o);
      if (!dt) continue;
      set.add(String(dt.getFullYear()));
    }
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [orders]);

  const [selectedYears, setSelectedYears] = useState([]);

  // Inicializa seleção: últimos 2 anos disponíveis (ou 1)
  useEffect(() => {
    if (!yearsAvailable.length) {
      setSelectedYears([]);
      return;
    }
    setSelectedYears((prev) => {
      if (prev && prev.length) {
        // manter seleção, mas remover anos que não existem mais
        const still = prev.filter((y) => yearsAvailable.includes(y));
        return still.length ? still : yearsAvailable.slice(-2);
      }
      return yearsAvailable.slice(-2);
    });
  }, [yearsAvailable]);

  const metricsByYear = useMemo(() => {
    const map = new Map(); // year -> { totals... }

    for (const y of yearsAvailable) {
      map.set(y, {
        year: y,
        totalDemandas: 0,
        concluidas: 0,
        pendentes: 0,
        atrasadas: 0,
        clientesUnicos: new Set(),
        tiposUnicos: new Set(),
      });
    }

    for (const o of orders) {
      const dt = DataProcessingService.parseDeliveryDate(o);
      if (!dt) continue;
      const y = String(dt.getFullYear());
      if (!map.has(y)) continue;

      const bucket = map.get(y);
      bucket.totalDemandas += 1;
      if (o?.isConcluido === true || o?.concluido === 'yes' || o?.concluido === 'YES') bucket.concluidas += 1;
      if (o?.isAtrasado === true) bucket.atrasadas += 1;

      const tipo = (o?.tipoDemanda || o?.TipoDemanda || o?.tipo_demanda || '').toString().trim();
      if (tipo) bucket.tiposUnicos.add(tipo);

      const clients = DataProcessingService.extractCanonicalClientsFromOrder
        ? DataProcessingService.extractCanonicalClientsFromOrder(o)
        : [];
      if (clients && clients.length) {
        clients.forEach((c) => bucket.clientesUnicos.add(c));
      } else {
        const fallback = (o?.cliente || o?.cliente1 || o?.Cliente || '').toString().trim();
        if (fallback) bucket.clientesUnicos.add(fallback);
      }
    }

    // derivar pendentes
    for (const v of map.values()) {
      v.pendentes = Math.max(0, v.totalDemandas - v.concluidas);
    }

    return map;
  }, [orders, yearsAvailable]);

  const selectedYearsSorted = useMemo(
    () => (selectedYears || []).slice().sort((a, b) => Number(a) - Number(b)),
    [selectedYears]
  );

  const tableRows = useMemo(() => {
    const rows = [
      {
        key: 'totalDemandas',
        label: 'Total de demandas',
        get: (m) => m.totalDemandas,
      },
      {
        key: 'clientesUnicos',
        label: 'Clientes únicos',
        get: (m) => m.clientesUnicos.size,
      },
      {
        key: 'tiposUnicos',
        label: 'Tipos de conteúdo',
        get: (m) => m.tiposUnicos.size,
      },
      {
        key: 'concluidas',
        label: 'Concluídas',
        get: (m) => m.concluidas,
      },
      {
        key: 'pendentes',
        label: 'Pendentes',
        get: (m) => m.pendentes,
      },
      {
        key: 'atrasadas',
        label: 'Atrasadas',
        get: (m) => m.atrasadas,
      },
    ];
    return rows;
  }, []);

  const handleToggleYear = (y) => {
    setSelectedYears((prev) => {
      const set = new Set(prev || []);
      if (set.has(y)) set.delete(y);
      else set.add(y);
      return Array.from(set);
    });
  };

  const selectAll = () => setSelectedYears(yearsAvailable.slice());
  const clearSelection = () => setSelectedYears([]);

  const hasData = yearsAvailable.length > 0 && orders.length > 0;

  return (
    <div
      className="chart-container modern"
      style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        padding: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 className="chart-title" style={{ marginBottom: 6 }}>
            {title}
          </h3>
          <p className="chart-subtitle" style={{ margin: 0 }}>
            Compare múltiplos anos lado a lado • {numberBR(orders.length)} demanda(s) consideradas
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={selectAll}
            style={{
              padding: '8px 12px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Selecionar tudo
          </button>

          <button
            onClick={clearSelection}
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
              gap: 6,
              fontWeight: 700,
            }}
          >
            <Filter size={14} />
            Limpar seleção
          </button>
        </div>
      </div>

      {/* Seletor de anos */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 16,
          padding: '12px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
        }}
      >
        {yearsAvailable.map((y) => {
          const active = selectedYears.includes(y);
          return (
            <button
              key={y}
              onClick={() => handleToggleYear(y)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: `1px solid ${active ? '#FF6B47' : '#E5E7EB'}`,
                background: active ? '#FFF5F2' : 'white',
                color: active ? '#C2410C' : '#374151',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title={active ? 'Clique para remover' : 'Clique para adicionar'}
            >
              {y}
            </button>
          );
        })}

        {!yearsAvailable.length && (
          <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>Nenhum ano encontrado nos dados.</div>
        )}
      </div>

      {!hasData || selectedYearsSorted.length === 0 ? (
        <div style={{ padding: 18, color: '#6B7280', fontSize: '0.95rem' }}>
          {yearsAvailable.length === 0
            ? 'Sem dados com data válida para comparação.'
            : 'Selecione 1 ou mais anos para comparar.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
          {tableRows.map((row) => {
            const values = selectedYearsSorted.map((y) => row.get(metricsByYear.get(y)));
            const max = Math.max(...values, 1);
            return (
              <div key={row.key} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 800, color: '#374151', marginBottom: 10 }}>{row.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedYearsSorted.length}, 1fr)`, gap: 10 }}>
                  {selectedYearsSorted.map((y, idx) => {
                    const m = metricsByYear.get(y);
                    const v = row.get(m);
                    const prevYear = idx > 0 ? selectedYearsSorted[idx - 1] : null;
                    const prevVal = prevYear ? row.get(metricsByYear.get(prevYear)) : null;
                    const showDelta = idx > 0;
                    return (
                      <div key={y} style={{ background: '#F8FAFC', borderRadius: 10, padding: 10, border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 800, color: '#111827' }}>{y}</span>
                          {showDelta && (
                            <span style={{ fontWeight: 800, color: deltaColor(prevVal, v) }}>
                              {formatDelta(prevVal, v)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#FF6B47', marginBottom: 8 }}>
                          {numberBR(v)}
                        </div>
                        <div style={{ height: 8, background: '#E5E7EB', borderRadius: 999 }}>
                          <div
                            style={{
                              width: `${Math.round((v / max) * 100)}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: 'linear-gradient(90deg, #FF6B47, #FB923C)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default YearComparisonCard;

