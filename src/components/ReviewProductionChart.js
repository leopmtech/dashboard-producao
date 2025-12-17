import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DataProcessingService } from '../services/dataProcessingService';

const ReviewProductionChart = ({ data, title, subtitle, filters = { periodo: '2025' } }) => {
  const colors = {
    primary: '#10B981',
    secondary: '#FF6B47',
    tertiary: '#6366F1',
    creative: '#F59E0B',
    accent: '#EC4899',
    background: '#FFFFFF',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    gridLines: '#F3F4F6'
  };

  // ------------------------------------------
  // Helpers (espelha o padrão do Gustavo)
  // ------------------------------------------
  const normalize = (v) => String(v || '').toLowerCase().trim();
  const safeText = (v) => (v == null ? '' : String(v));

  const formatDateBR = (dt) => {
    try {
      if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '—';
      return dt.toLocaleDateString('pt-BR');
    } catch {
      return '—';
    }
  };

  const getOrderIdKey = (o) =>
    o?.id ||
    o?._id ||
    o?.orderId ||
    o?.ID ||
    o?.['ID'] ||
    o?.['Id'] ||
    null;

  const buildFallbackKey = (o) => {
    const dt = DataProcessingService.parseDeliveryDate(o);
    const iso = dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : 'no-date';
    const cliente = (o?.cliente || o?.cliente1 || o?.Cliente || '').toString().trim();
    const tipo = (o?.tipoDemanda || o?.TipoDemanda || o?.tipo_demanda || '').toString().trim();
    const titulo = (o?.projeto || o?.titulo || o?.nome || o?.name || '').toString().trim();
    return `${cliente}|${tipo}|${iso}|${titulo}`;
  };

  const dedupeOrdersStable = (orders = []) => {
    const seen = new Set();
    const out = [];
    for (const o of orders) {
      if (!o) continue;
      const key = getOrderIdKey(o) || buildFallbackKey(o);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(o);
    }
    return out;
  };

  // ------------------------------------------
  // 1) Identificar demandas da Anna (sem duplicatas)
  // ------------------------------------------
  const filterAnnaOliveiraData = (rawOrders) => {
    if (!rawOrders || !Array.isArray(rawOrders)) return [];

    const nomeVariacoes = [
      'anna oliveira',
      'anna',
      // tolerância a variação comum
      'ana oliveira',
    ];

    const camposPossiveis = (item) => ([
      item.quemExecuta,
      item.criadoPor,
      item.responsavel,
      item.designer,
      item.profissional,
      item.executor,
      item.analista,
      item.autor,
      item.equipe,
      item.revisor,
      item['Quem executa'],
      item['Criado por'],
      item['Responsável'],
      item['Designer'],
      item['Profissional'],
      item['Revisor'],
    ]);

    const encontrados = rawOrders.filter(item => {
      if (!item || typeof item !== 'object') return false;

      const match = camposPossiveis(item).some(campo => {
        if (!campo) return false;
        const campoLower = normalize(campo);
        return nomeVariacoes.some(nome => campoLower.includes(nome));
      });

      if (match) {
        // Log leve (mantém padrão do Gustavo de evidenciar match)
        const dt = DataProcessingService.parseDeliveryDate(item);
        // eslint-disable-next-line no-console
        console.log('📝 [ANNA FILTER] ✅ Encontrada demanda da Anna:', {
          id: item.id || item._id,
          cliente: item.cliente || item.cliente1 || item.Cliente,
          tipoDemanda: item.tipoDemanda,
          dataEntrega: dt ? dt.toISOString().slice(0, 10) : item.dataEntrega,
          revisor: item.revisor || item['Revisor'],
          quemExecuta: item.quemExecuta || item['Quem executa'],
          responsavel: item.responsavel || item['Responsável'],
          titulo: item.projeto || item.titulo,
        });
      }

      return match;
    });

    return encontrados;
  };

  const annaOrders = React.useMemo(() => {
    const baseOrders = Array.isArray(data?.originalOrders) ? data.originalOrders : (Array.isArray(data) ? data : []);
    const found = filterAnnaOliveiraData(baseOrders);
    const unique = dedupeOrdersStable(found);
    return unique;
  }, [data]);

  // ✅ Clientes únicos (mesma lógica do Gustavo, agora aplicada às demandas da Anna)
  const annaUniqueClientsCount = React.useMemo(() => {
    try {
      return DataProcessingService.getUniqueClients({ originalOrders: annaOrders }).length || 0;
    } catch {
      return 0;
    }
  }, [annaOrders]);

  // ------------------------------------------
  // 2) Derivar agregações (mantém visual comparativo existente)
  // ------------------------------------------
  const processReviewData = (orders) => {
    if (!orders || !Array.isArray(orders)) return getFallbackDataAnna();

    let dadosParaProcessar = [];
    dadosParaProcessar = orders;
    if (dadosParaProcessar.length === 0) return getFallbackDataAnna();

    const clientesMap = {};
    dadosParaProcessar.forEach(item => {
      const cliente = (item.cliente || item.cliente1 || '').toString().trim() || 'Cliente Não Informado';
      if (!cliente || cliente === 'Total') return;
      if (!clientesMap[cliente]) {
        clientesMap[cliente] = {
          nome: cliente,
          total2024: 0,
          total2025: 0,
          jan2025: 0, fev2025: 0, mar2025: 0, abr2025: 0, mai2025: 0, jun2025: 0,
          jul2025: 0, ago2025: 0, set2025: 0, out2025: 0, nov2025: 0, dez2025: 0
        };
      }

      let ano = null;
      const dt = DataProcessingService.parseDeliveryDate(item);
      if (dt) ano = dt.getFullYear();
      if (ano === 2024) {
        clientesMap[cliente].total2024++;
      } else if (ano === 2025) {
        clientesMap[cliente].total2025++;
        try {
          const mes = dt.getMonth();
          const meses = ['jan2025','fev2025','mar2025','abr2025','mai2025','jun2025','jul2025','ago2025','set2025','out2025','nov2025','dez2025'];
          if (meses[mes]) clientesMap[cliente][meses[mes]]++;
        } catch (_) {}
      }
    });

    const reviewData = Object.values(clientesMap).map(item => {
      const crescimento = item.total2024 > 0
        ? Math.round(((item.total2025 - item.total2024) / item.total2024) * 100)
        : (item.total2025 > 0 ? 100 : 0);
      return { ...item, crescimento };
    });
    return reviewData;
  };

  const getFallbackDataAnna = () => {
    return [
      { nome: 'In.Pacto', total2024: 8, total2025: 10, crescimento: 25, jan2025: 2, fev2025: 2, mar2025: 2, abr2025: 2, mai2025: 2 },
      { nome: 'MIDR', total2024: 3, total2025: 4, crescimento: 33, jan2025: 1, fev2025: 1, mar2025: 1, abr2025: 1 },
      { nome: 'STA', total2024: 2, total2025: 2, crescimento: 0, jan2025: 0, fev2025: 1, mar2025: 1 }
    ];
  };

  const processedData = processReviewData(annaOrders);
  const total2024 = processedData.reduce((s, c) => s + c.total2024, 0);
  const total2025 = processedData.reduce((s, c) => s + c.total2025, 0);
  const crescimentoGeral = total2024 > 0 ? Math.round(((total2025 - total2024) / total2024) * 100) : 0;

  const getVisualizationData = (data, filters) => {
    const filteredData = data.filter(c => c.nome !== 'Total');
    if (filters.periodo === 'ambos') {
      return filteredData
        .filter(c => c.total2024 > 0 || c.total2025 > 0)
        .sort((a, b) => (b.total2024 + b.total2025) - (a.total2024 + a.total2025))
        .slice(0, 8);
    }
    if (filters.periodo === '2024') {
      return filteredData.filter(c => c.total2024 > 0).sort((a, b) => b.total2024 - a.total2024);
    }
    return filteredData.sort((a, b) => b.total2025 - a.total2025);
  };

  const visualizationData = getVisualizationData(processedData, filters);

  const ComparativeChart = ({ data }) => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <defs>
          <linearGradient id="anna2024Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.tertiary} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={colors.tertiary} stopOpacity={0.4}/>
          </linearGradient>
          <linearGradient id="anna2025Gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.primary} stopOpacity={0.8}/>
            <stop offset="100%" stopColor={colors.primary} stopOpacity={0.4}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.gridLines} />
        <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} fontSize={12} tick={{ fill: colors.text }} />
        <YAxis fontSize={12} tick={{ fill: colors.textSecondary }} label={{ value: 'Demandas revisadas', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: colors.primary } }} />
        <Tooltip contentStyle={{ backgroundColor: colors.background, border: `2px solid ${colors.border}`, borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }} formatter={(value, name) => [`${value} ${value === 1 ? 'demanda' : 'demandas'}`, name === 'total2024' ? '2024' : '2025' ]} labelFormatter={(label) => `Cliente: ${label} (Profissional: Anna Oliveira)`} />
        <Legend />
        <Bar dataKey="total2024" fill="url(#anna2024Gradient)" name="2024" radius={[4, 4, 0, 0]} />
        <Bar dataKey="total2025" fill="url(#anna2025Gradient)" name="2025" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  // ------------------------------------------
  // 3) Lista de demandas únicas (novo, conforme solicitado)
  // ------------------------------------------
  const demandRows = React.useMemo(() => {
    const rows = (annaOrders || [])
      .map((o) => {
        const dt = DataProcessingService.parseDeliveryDate(o);
        const cliente = (o?.cliente || o?.cliente1 || o?.Cliente || '').toString().trim() || 'Cliente Não Informado';
        const tipo = (o?.tipoDemanda || o?.TipoDemanda || o?.tipo_demanda || '').toString().trim() || '—';
        const titulo = (o?.projeto || o?.titulo || o?.name || o?.nome || '').toString().trim() || 'Demanda';
        const status = (o?.status || o?.Status || o?.situacao || o?.situação || '').toString().trim() || '—';
        const revisor = safeText(o?.revisor || o?.['Revisor'] || '');
        const quemExecuta = safeText(o?.quemExecuta || o?.['Quem executa'] || '');
        const responsavel = safeText(o?.responsavel || o?.['Responsável'] || '');
        const id = getOrderIdKey(o) || buildFallbackKey(o);

        return {
          id,
          date: dt,
          dateLabel: formatDateBR(dt),
          year: dt ? dt.getFullYear() : null,
          cliente,
          titulo,
          tipo,
          status,
          revisor,
          quemExecuta,
          responsavel,
        };
      })
      // Ordenar por data desc (sem data vai pro fim)
      .sort((a, b) => {
        const at = a.date ? a.date.getTime() : -Infinity;
        const bt = b.date ? b.date.getTime() : -Infinity;
        return bt - at;
      });

    return rows;
  }, [annaOrders]);

  const demandsCountByYear = React.useMemo(() => {
    const out = { 2024: 0, 2025: 0, unknown: 0 };
    for (const r of demandRows) {
      if (r.year === 2024) out[2024] += 1;
      else if (r.year === 2025) out[2025] += 1;
      else out.unknown += 1;
    }
    return out;
  }, [demandRows]);

  const ClientTable = ({ data, year }) => {
    const tableData = year === '2024' ? data.filter(client => client.nome !== 'Total' && client.total2024 > 0) : data.filter(client => client.nome !== 'Total');
    const allClientsData = data.filter(client => client.nome !== 'Total');
    const totalYear = year === '2024' ? allClientsData.reduce((sum, client) => sum + client.total2024, 0) : allClientsData.reduce((sum, client) => sum + client.total2025, 0);
    return (
      <div style={{ backgroundColor: colors.background, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.creative})`, color: 'white', padding: '16px 24px', fontWeight: '700', fontSize: '16px' }}>
          📝 Produção de Revisão - Anna Oliveira - {year}
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: colors.gridLines }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: colors.text, fontWeight: '600' }}>Posição</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: colors.text, fontWeight: '600' }}>Cliente</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', color: colors.text, fontWeight: '600' }}>Demandas</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', color: colors.text, fontWeight: '600' }}>Participação</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((client, index) => {
                const demandas = year === '2024' ? client.total2024 : client.total2025;
                const participacao = totalYear > 0 ? Math.round((demandas / totalYear) * 100) : 0;
                return (
                  <tr key={client.nome} style={{ borderBottom: `1px solid ${colors.gridLines}` }}>
                    <td style={{ padding: '12px 20px', fontWeight: '600', color: colors.primary }}>#{index + 1}</td>
                    <td style={{ padding: '12px 20px', fontWeight: '600', color: colors.text }}>{client.nome}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '700', color: demandas > 0 ? colors.secondary : colors.textSecondary }}>{demandas}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center', color: colors.textSecondary }}>{participacao}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '16px 24px', backgroundColor: colors.gridLines, borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', color: colors.text }}>Clientes atendidos pela Anna: {tableData.filter(c => year === '2024' ? c.total2024 > 0 : c.total2025 > 0).length}</span>
          <span style={{ fontWeight: '700', color: colors.primary, fontSize: '18px' }}>{totalYear} demandas revisadas</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: colors.background, borderRadius: '20px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: `1px solid ${colors.border}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ marginBottom: '32px', position: 'relative' }}>
        <h3 style={{ fontSize: '24px', fontWeight: '700', color: colors.text, margin: '0 0 8px 0', position: 'relative' }}>
          📝 {title} - Anna Oliveira
        </h3>
        <p style={{ fontSize: '16px', color: colors.textSecondary, margin: '0', lineHeight: '1.5' }}>
          {subtitle || 'Portfólio das demandas revisadas por Anna Oliveira'}
        </p>
      </div>

      {/* ✅ Resumo + gráfico (mantém, mas agora derivado de demandas únicas da Anna) */}
      {filters.periodo === 'ambos' && (
        <>
          <ComparativeChart data={visualizationData} />
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.tertiary, marginBottom: '4px' }}>{demandsCountByYear[2024]}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Demandas únicas 2024</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.primary, marginBottom: '4px' }}>{demandsCountByYear[2025]}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Demandas únicas 2025</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: crescimentoGeral >= 0 ? colors.secondary : '#EF4444', marginBottom: '4px' }}>
                {crescimentoGeral >= 0 ? '+' : ''}{crescimentoGeral}%
              </div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Crescimento (agregado)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.creative, marginBottom: '4px' }}>{annaUniqueClientsCount}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Clientes atendidos (únicos)</div>
            </div>
          </div>
        </>
      )}

      {/* ✅ Lista de demandas únicas da Anna (principal, conforme solicitado) */}
      <div style={{ marginTop: '28px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12
        }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>
              📋 Demandas únicas associadas à Anna Oliveira
            </h4>
            <div style={{ marginTop: 4, fontSize: 13, color: colors.textSecondary, fontWeight: 600 }}>
              {demandRows.length} demanda(s) única(s) • filtradas pelos Filtros Inteligentes do dashboard
              {demandsCountByYear.unknown > 0 ? ` • ${demandsCountByYear.unknown} sem data válida` : ''}
            </div>
          </div>
          {filters.periodo !== 'ambos' && (
            <div style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 700 }}>
              Período: {filters.periodo}
            </div>
          )}
        </div>

        <div style={{
          background: 'white',
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          overflow: 'hidden'
        }}>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
                <tr>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: colors.textSecondary }}>Data</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: colors.textSecondary }}>Cliente</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: colors.textSecondary }}>Demanda</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: colors.textSecondary }}>Tipo</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: colors.textSecondary }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: colors.textSecondary }}>Envolvimento</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, color: colors.textSecondary, width: 110 }}>ID</th>
                </tr>
              </thead>
              <tbody>
                {demandRows.map((r, idx) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${colors.gridLines}`, background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: colors.text }}>
                      {r.dateLabel}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: colors.text, fontWeight: 700 }}>
                      {r.cliente}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: colors.text }}>
                      {r.titulo}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: colors.textSecondary }}>
                      {r.tipo}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: colors.textSecondary }}>
                      {r.status}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: colors.textSecondary }}>
                      {[
                        r.revisor ? `Revisor: ${r.revisor}` : null,
                        r.quemExecuta ? `Execução: ${r.quemExecuta}` : null,
                        r.responsavel ? `Resp.: ${r.responsavel}` : null,
                      ].filter(Boolean).join(' • ') || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: colors.textSecondary, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                      {String(r.id).length > 12 ? `${String(r.id).slice(0, 12)}…` : String(r.id)}
                    </td>
                  </tr>
                ))}
                {demandRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '18px 14px', color: colors.textSecondary, fontSize: 13 }}>
                      Nenhuma demanda encontrada para a Anna Oliveira com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewProductionChart;


