import React, { useMemo, useState, useEffect } from 'react';
import notionService from '../services/notionService';

const DEFAULT_COLLAB_DB_ID = '37f13b4723764d5db4ec94b259430b7c';

const isRecurring = (tipo) => {
  if (!tipo || typeof tipo !== 'string') return false;
  const t = tipo.toLowerCase();
  return (
    t.includes('diário') || t.includes('diario') ||
    t.includes('semanal') ||
    t.includes('mensal') ||
    t.includes('relatório diário') || t.includes('relatorio diario') ||
    t.includes('relatório semanal') || t.includes('relatorio semanal') ||
    t.includes('relatório mensal') || t.includes('relatorio mensal') ||
    t.includes('relatórios diários') || t.includes('relatorios diarios') ||
    t.includes('relatórios semanais') || t.includes('relatorios semanais') ||
    t.includes('relatórios mensais') || t.includes('relatorios mensais')
  );
};

const isCompleted = (order) => {
  const s = (order.status || '').toString();
  return (
    order.isConcluido === true ||
    order.concluido === 'yes' || order.concluido === 'YES' ||
    order.concluida === 'YES' || order.concluido === 'YES' || order.concluída === 'YES' || order.concluido === true ||
    s === 'Concluído' || s === 'Concluido' || s === 'CONCLUÍDO' || s === 'CONCLUIDO' ||
    s === 'concluído' || s === 'concluido' || s === 'FINALIZADO' || s === 'finalizado' ||
    s === 'COMPLETO' || s === 'completo' || s === 'DONE' || s === 'done'
  );
};

const getCollaboratorsFromField = (value) => {
  if (!value) return [];
  return String(value)
    .split(/[,;&\/]|\se\s|\sE\s/)
    .map(v => v.trim())
    .filter(v => v && v !== 'Não definido');
};

// Extrai a data de entrega a partir de múltiplas variações de campos
const getDeliveryDate = (order) => {
  const candidates = [
    order.dataEntregaDate,
    order.dataEntrega,
    order.DataEntrega,
    order.data_entrega,
    order['Data de entrega'],
    order['Data de Entrega'],
    order['Data de Entrege'], // variação citada pelo usuário
  ];
  for (const c of candidates) {
    if (!c) continue;
    // Caso Date já válido
    if (c instanceof Date && !isNaN(c)) {
      return new Date(c.getFullYear(), c.getMonth(), c.getDate());
    }
    const s = String(c);
    // Formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/').map(n => parseInt(n, 10));
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        return new Date(yyyy, mm - 1, dd); // data local
      }
    }
    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [yyyy, mm, dd] = s.split('-').map(n => parseInt(n, 10));
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        return new Date(yyyy, mm - 1, dd); // evitar shift de timezone
      }
    }
    // ISO com timezone -> usar a parte da data (YYYY-MM-DD) para evitar shift
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      const base = s.slice(0, 10); // YYYY-MM-DD
      const [yyyy, mm, dd] = base.split('-').map(n => parseInt(n, 10));
      if (!isNaN(dd) && !isNaN(mm) && !isNaN(yyyy)) {
        return new Date(yyyy, mm - 1, dd);
      }
      const d = new Date(s);
      if (!isNaN(d)) return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    // Fallback
    const dt = new Date(s);
    if (!isNaN(dt)) return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }
  return null;
};

const buildMonthGrid = (date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // start on Monday
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      days.push(day);
    }
    weeks.push(days);
  }
  return weeks;
};

const CollaboratorDemands = ({ data, title = 'Demandas por Colaborador', databaseId = DEFAULT_COLLAB_DB_ID }) => {
  const [orders, setOrders] = useState([]);
  const [sourceError, setSourceError] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [selected, setSelected] = useState('Todos');
  const [refDate, setRefDate] = useState(new Date());

  // ✅ Fonte única: busca direto do banco informado (tempo real via polling leve)
  useEffect(() => {
    let isMounted = true;
    let interval = null;

    const load = async (reason = 'initial') => {
      try {
        setSourceLoading(true);
        setSourceError(null);

        const fetched = await notionService.getOrdersFromDatabase({
          dbId: databaseId,
          useCache: true,
          ttlMs: 10_000
        });

        if (!isMounted) return;
        setOrders(Array.isArray(fetched) ? fetched : []);
        setLastSync(new Date());
      } catch (e) {
        if (!isMounted) return;
        // fallback: usar dados do dashboard se houver
        const fallbackOrders = Array.isArray(data?.originalOrders) ? data.originalOrders : [];
        setOrders(fallbackOrders);
        setSourceError(e?.message || String(e));
      } finally {
        if (isMounted) setSourceLoading(false);
      }
    };

    load('mount');
    interval = setInterval(() => load('poll'), 30_000);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [databaseId, data?.originalOrders]);

  // DEBUG VALIDATION: verificar caso específico solicitado (pode ser removido depois)
  React.useEffect(() => {
    const alvoNome = 'kezya rakkel';
    const alvoDia = 31; // 31 de outubro
    const alvoMes = 9; // zero-based (Outubro = 9)
    const matches = [];
    const excluded = [];
    orders.forEach(o => {
      const names = getCollaboratorsFromField(o.quemExecuta || o.analista || o.responsavel).map(n => n.toLowerCase());
      if (!names.some(n => n.includes(alvoNome))) return;
      const dt = getDeliveryDate(o);
      if (!dt) return;
      if (dt.getMonth() !== alvoMes || dt.getDate() !== alvoDia) return;
      const recurring = isRecurring(o.tipoDemanda);
      const completed = isCompleted(o);
      const record = {
        id: o.id,
        projeto: o.projeto || o.titulo,
        tipoDemanda: o.tipoDemanda,
        dataEntrega: dt?.toISOString?.() || dt,
        quemExecuta: o.quemExecuta,
        status: o.status,
        recurring,
        completed
      };
      if (!recurring && !completed) matches.push(record); else excluded.push(record);
    });
    if (matches.length || excluded.length) {
      console.log('🔎 [VALIDAÇÃO COLABORADORES] Kezya Rakkel em 31/out:', {
        exibidas: matches.length,
        excluidas_por_regra: excluded.length,
        detalhes_exibidas: matches,
        detalhes_excluidas: excluded
      });
    }
  }, [orders]);

  // Dedupe por tarefa para evitar contagens erradas (mesma demanda entrando duplicada)
  const uniqueOrders = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const o of orders || []) {
      const id = o?.id || o?._id || o?.orderId || JSON.stringify(o);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(o);
    }
    return out;
  }, [orders]);

  const collaborators = useMemo(() => {
    const setNames = new Set();
    uniqueOrders.forEach(o => {
      // ✅ Mostrar TODAS as demandas não concluídas (inclui recorrentes),
      // para refletir fielmente o banco de dados.
      if (isCompleted(o)) return;
      const names = getCollaboratorsFromField(o.quemExecuta || o.analista || o.responsavel);
      // dedupe local de nomes por tarefa
      const local = new Set(names.map(n => n.toLowerCase()));
      names.forEach(n => {
        if (local.has(n.toLowerCase())) setNames.add(n);
      });
    });
    return ['Todos', ...Array.from(setNames).sort()];
  }, [uniqueOrders]);

  const inProgressThisMonth = useMemo(() => {
    const year = refDate.getFullYear();
    const month = refDate.getMonth();
    const map = new Map(); // name -> count
    const eventsByDay = {}; // yyyy-mm-dd -> [{...order, names}]
    uniqueOrders.forEach(o => {
      if (isCompleted(o)) return;
      const dt = getDeliveryDate(o);
      if (!dt) return;
      if (dt.getFullYear() !== year || dt.getMonth() !== month) return;
      const names = getCollaboratorsFromField(o.quemExecuta || o.analista || o.responsavel);
      if (names.length === 0) return;
      // ✅ Contar cada demanda apenas uma vez por colaborador
      const uniqueNames = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)));
      uniqueNames.forEach(n => map.set(n, (map.get(n) || 0) + 1));
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      if (!eventsByDay[key]) eventsByDay[key] = [];
      eventsByDay[key].push({ ...o, names: uniqueNames, _deliveryDate: dt });
    });
    return { counts: map, eventsByDay };
  }, [uniqueOrders, refDate]);

  const monthWeeks = useMemo(() => buildMonthGrid(refDate), [refDate]);

  const changeMonth = (delta) => {
    const d = new Date(refDate);
    d.setMonth(d.getMonth() + delta);
    setRefDate(d);
  };

  return (
    <div className="chart-container modern" style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 className="chart-title">{title}</h3>
          <p className="chart-subtitle">
            Demandas pendentes por colaborador • Fonte: Notion DB {String(databaseId).slice(0, 8)}…
            {lastSync ? ` • Atualizado: ${lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
            {sourceLoading ? ' • Sincronizando…' : ''}
            {sourceError ? ' • ⚠️ Falha ao sincronizar (fallback local)' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => changeMonth(-1)} style={{ padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>{'‹'}</button>
          <strong>{refDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
          <button onClick={() => changeMonth(1)} style={{ padding: '6px 10px', border: '1px solid #E5E7EB', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>{'›'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px' }}>
        {/* Lista lateral de colaboradores */}
        <div style={{ borderRight: '1px solid #F1F5F9', paddingRight: '12px', maxHeight: 520, overflowY: 'auto' }}>
          {collaborators.map(name => {
            const count = inProgressThisMonth.counts.get(name) || (name === 'Todos' ? Array.from(inProgressThisMonth.counts.values()).reduce((a, b) => a + b, 0) : 0);
            const active = selected === name;
            return (
              <button
                key={name}
                onClick={() => setSelected(name)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 6,
                  border: `1px solid ${active ? '#FF6B47' : '#E5E7EB'}`, borderRadius: 8,
                  background: active ? '#FFF5F2' : 'white', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <span style={{ color: '#374151', fontWeight: 600 }}>{name}</span>
                <span style={{ color: '#6B7280', fontSize: 12 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Calendário mensal */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8, color: '#6B7280', fontSize: 12 }}>
            {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (<div key={d} style={{ textAlign: 'center' }}>{d}</div>))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {monthWeeks.flat().map((day, idx) => {
              const isThisMonth = day.getMonth() === refDate.getMonth();
              const key = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
              const items = (inProgressThisMonth.eventsByDay[key] || []).filter(ev => selected === 'Todos' || ev.names.includes(selected));
              const today = new Date();
              const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const hasOverdue = items.some(ev => {
                const d = ev._deliveryDate ? new Date(ev._deliveryDate.getFullYear(), ev._deliveryDate.getMonth(), ev._deliveryDate.getDate()) : null;
                return d && d < todayDate;
              });
              return (
                <div key={idx} style={{
                  border: '1px solid #E5E7EB', borderRadius: 8, padding: 8,
                  background: isThisMonth ? 'white' : '#F9FAFB', minHeight: 76
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{day.getDate()}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {hasOverdue && (
                        <span style={{ fontSize: 11, background: '#FEE2E2', color: '#B91C1C', padding: '2px 6px', borderRadius: 6 }}>Atraso</span>
                      )}
                      {items.length > 0 && (
                        <span style={{ fontSize: 11, background: '#FFEDD5', color: '#C2410C', padding: '2px 6px', borderRadius: 6 }}>{items.length}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.slice(0, 3).map(ev => (
                      <div key={ev.id || Math.random()} style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.projeto || ev.titulo || 'Demanda'}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div style={{ fontSize: 11, color: '#6B7280' }}>+{items.length - 3} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo mensal por colaborador */}
          <div style={{ marginTop: 16, borderTop: '1px solid #E5E7EB', paddingTop: 12 }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '1rem', fontWeight: 600 }}>Resumo Mensal por Colaborador</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
              {Array.from(inProgressThisMonth.counts.entries()).sort((a,b) => b[1]-a[1]).map(([name, count]) => (
                <div key={name} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', background: '#FAFAFA' }}>
                  <span style={{ color: '#111827', fontWeight: 600 }}>{name}:</span>
                  <span style={{ color: '#6B7280', marginLeft: 6 }}>{count} demandas este mês</span>
                </div>
              ))}
              {inProgressThisMonth.counts.size === 0 && (
                <div style={{ color: '#6B7280' }}>Sem demandas em andamento neste mês.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorDemands;


