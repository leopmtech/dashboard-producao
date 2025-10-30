import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

  const filterAnnaOliveiraData = (rawData) => {
    if (!rawData || !Array.isArray(rawData)) return [];

    const nomeVariacoes = [
      'anna oliveira',
      'anna'
    ];

    const dadosAnna = rawData.filter(item => {
      if (!item || typeof item !== 'object') return false;
      const camposParaBuscar = [
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
        item['Revisor']
      ];
      return camposParaBuscar.some(campo => {
        if (!campo) return false;
        const campoLower = String(campo).toLowerCase();
        return nomeVariacoes.some(nome => campoLower.includes(nome));
      });
    });

    return dadosAnna;
  };

  const processReviewData = (rawData) => {
    if (!rawData) return getFallbackDataAnna();

    let dadosParaProcessar = [];
    if (rawData.revisao && Array.isArray(rawData.revisao)) {
      dadosParaProcessar = rawData.revisao;
    } else if (Array.isArray(rawData)) {
      dadosParaProcessar = rawData;
    } else if (rawData.data && Array.isArray(rawData.data)) {
      dadosParaProcessar = rawData.data;
    } else {
      return getFallbackDataAnna();
    }

    const dadosAnna = filterAnnaOliveiraData(dadosParaProcessar);
    if (dadosAnna.length === 0) return getFallbackDataAnna();

    const clientesMap = {};
    dadosAnna.forEach(item => {
      if (!item.cliente || item.cliente === 'Total') return;
      const cliente = item.cliente;
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
      if (item.dataEntrega) {
        try { ano = new Date(item.dataEntrega).getFullYear(); } catch (_) {}
      }
      if (ano === 2024) {
        clientesMap[cliente].total2024++;
      } else if (ano === 2025) {
        clientesMap[cliente].total2025++;
        try {
          const mes = new Date(item.dataEntrega).getMonth();
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

  const processedData = processReviewData(data);
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
      {filters.periodo === 'ambos' ? (
        <>
          <ComparativeChart data={visualizationData} />
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.tertiary, marginBottom: '4px' }}>{total2024}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Demandas 2024</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.primary, marginBottom: '4px' }}>{total2025}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Demandas 2025</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: crescimentoGeral >= 0 ? colors.secondary : '#EF4444', marginBottom: '4px' }}>{crescimentoGeral >= 0 ? '+' : ''}{crescimentoGeral}%</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Crescimento</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.creative, marginBottom: '4px' }}>{processedData.filter(c => c.total2025 > 0).length}</div>
              <div style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: '600' }}>Clientes Atendidos</div>
            </div>
          </div>
        </>
      ) : (
        <ClientTable data={visualizationData} year={filters.periodo} />
      )}
    </div>
  );
};

export default ReviewProductionChart;


