// server/notionAdapter.js
const PROP = {
  concluido: 'Concluído',
  ordemServico: 'Ordem de serviço',
  cliente1: 'Cliente',
  cliente2: 'Cliente 2',
  tipoDemanda: 'Tipo de demanda',
  criadoPor: 'Criado por',
  dataInicio: 'Data de início',
  dataEntrega: 'Data de entrega',
  quemExecuta: 'Quem executa',
  status: 'Status',
  complexidade: 'Complexidade',
  prioridade: 'Prioridade',
  tags: 'Tags', // Campo de tags (multi_select)
};

const getText = (p) => {
  if (!p) return '';
  if (p.type === 'title') return (p.title?.map(t => t.plain_text).join('') || '').trim();
  if (p.type === 'rich_text') return (p.rich_text?.map(t => t.plain_text).join('') || '').trim();
  if (p.type === 'url') return p.url || '';
  if (Array.isArray(p)) return p.map(x => x?.plain_text || '').join('').trim();
  return '';
};

const getSelectName = (p) => {
  if (!p) return '';
  if (p.type === 'select') return p.select?.name || '';
  if (p.type === 'status') return p.status?.name || '';
  if (p.type === 'multi_select') return (p.multi_select || []).map(x => x.name).join(', ');
  return '';
};

// Função para extrair tags como array (para facilitar verificação)
const getTagsArray = (p) => {
  if (!p) return [];
  if (p.type === 'multi_select') {
    return (p.multi_select || []).map(x => x.name).filter(Boolean);
  }
  // Se for string separada por vírgula (fallback)
  if (typeof p === 'string' && p.trim()) {
    return p.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
};

const getPeople = (p) => {
  if (!p || p.type !== 'people') return '';
  return (p.people || []).map(per => per?.name || per?.person?.email || 'Pessoa').join(', ');
};

const getDate = (p) => (p?.type === 'date' ? (p.date?.start || '') : '');
const getCheckbox = (p) => (p?.type === 'checkbox' ? !!p.checkbox : false);

function parseDateToObj(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function rowToOrder(page) {
  try {
    const props = page.properties || {};
    const ordemServico = getText(props[PROP.ordemServico]);
    const cliente1 = getSelectName(props[PROP.cliente1]) || getText(props[PROP.cliente1]);
    const cliente2 = getSelectName(props[PROP.cliente2]) || getText(props[PROP.cliente2]);
    const tipoDemanda = getSelectName(props[PROP.tipoDemanda]) || getText(props[PROP.tipoDemanda]);
    const criadoPor = getPeople(props[PROP.criadoPor]) || getText(props[PROP.criadoPor]);
    const dataInicio = getDate(props[PROP.dataInicio]);
    const dataEntrega = getDate(props[PROP.dataEntrega]);
    const quemExecuta = getPeople(props[PROP.quemExecuta]) || getText(props[PROP.quemExecuta]);
    const status = getSelectName(props[PROP.status]) || getText(props[PROP.status]);
    const complexidade = getSelectName(props[PROP.complexidade]) || getText(props[PROP.complexidade]);
    const prioridade = getSelectName(props[PROP.prioridade]) || getText(props[PROP.prioridade]);
    
    // Extrair tags como array (com verificação de segurança)
    // Se o campo Tags não existir no Notion, retorna array vazio
    // Isso é seguro e não deve causar erros mesmo se o campo não existir
    let tagsArray = [];
    let tagsString = '';
    
    try {
      // Tentar acessar a propriedade Tags de forma segura
      // Se não existir, props[PROP.tags] será undefined e getTagsArray retornará []
      const tagsProperty = props[PROP.tags];
      if (tagsProperty !== undefined && tagsProperty !== null) {
        tagsArray = getTagsArray(tagsProperty);
        tagsString = tagsArray.join(', ');
      }
      // Se tagsProperty for undefined/null, tagsArray já está como [] (padrão)
    } catch (tagsError) {
      // Se houver erro ao processar tags, apenas logar e continuar
      // Não quebrar o processamento por causa de tags
      // Isso pode acontecer se o campo Tags existir mas tiver formato inesperado
      console.warn('⚠️ [NOTION ADAPTER] Erro ao processar tags para página:', page?.id, tagsError.message);
      tagsArray = [];
      tagsString = '';
    }

    let isDone = getCheckbox(props[PROP.concluido]);
    const statusLower = (status || '').toLowerCase();
    if (!isDone && (statusLower.includes('conclu') || statusLower.includes('done'))) isDone = true;

    const dataEntregaDate = parseDateToObj(dataEntrega);
    const dataInicioDate = parseDateToObj(dataInicio);

    const order = {
      id: page.id,
      concluido: isDone ? 'yes' : 'no',
      ordemServico,
      cliente1,
      cliente2,
      tipoDemanda,
      criadoPor,
      dataInicio,
      dataEntrega,
      quemExecuta,
      status,
      complexidade,
      prioridade,
      tags: tagsArray, // Array de tags
      tagsString: tagsString, // String de tags (para compatibilidade)
      isConcluido: isDone,
      isRelatorio: (tipoDemanda || '').toLowerCase().includes('relat'),
      dataEntregaDate,
      dataInicioDate,
    };

    if (dataEntregaDate) {
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      order.isAtrasado = dataEntregaDate < hoje && !order.isConcluido;
    }
    return order;
  } catch (error) {
    console.error('❌ [NOTION ADAPTER] Erro ao processar página:', {
      pageId: page?.id,
      error: error.message,
      stack: error.stack
    });
    // Retornar um objeto vazio em caso de erro
    return {
      id: page.id,
      concluido: 'no',
      ordemServico: '',
      cliente1: '',
      cliente2: '',
      tipoDemanda: '',
      criadoPor: '',
      dataInicio: '',
      dataEntrega: '',
      quemExecuta: '',
      status: '',
      complexidade: '',
      prioridade: '',
      isConcluido: false,
      isRelatorio: false,
      dataEntregaDate: null,
      dataInicioDate: null,
      tags: [],
      tagsString: '',
      _error: error.message
    };
  }
}

function summarize(orders) {
  const totalDemandas = orders.length;
  const totalRelatorios = orders.filter(o => o.isRelatorio).length;
  const relatoriosPendentes = orders.filter(o => o.isRelatorio && !o.isConcluido).length;
  const relatoriosAtrasados = orders.filter(o => o.isAtrasado).length;
  const totalConcluidos = orders.filter(o => o.isConcluido).length;
  const taxaConclusao = totalDemandas > 0 ? +(totalConcluidos / totalDemandas * 100).toFixed(2) : 0;

  const clientesUnicos = [...new Set(orders.map(o => o.cliente1).filter(Boolean))];
  const tiposDemanda = [...new Set(orders.map(o => o.tipoDemanda).filter(Boolean))];

  const orders2024 = orders.filter(o => o.dataEntregaDate?.getFullYear() === 2024);
  const orders2025 = orders.filter(o => o.dataEntregaDate?.getFullYear() === 2025);

  // 📊 Log de debug
  console.log('📊 [NOTION ADAPTER] Resumo:');
  console.log(`  Total de orders: ${totalDemandas}`);
  console.log(`  Clientes únicos: ${clientesUnicos.length}`);
  console.log(`  Lista: ${clientesUnicos.join(', ')}`);

  return {
    totalDemandas,
    totalRelatorios,
    relatoriosPendentes,
    relatoriosAtrasados,
    totalConcluidos,
    taxaConclusao,
    clientesUnicos,
    tiposDemanda,
    totalClientes: clientesUnicos.length,
    orders2024: orders2024.length,
    orders2025: orders2025.length,
    crescimentoPercentual: orders2024.length > 0
      ? +(((orders2025.length - orders2024.length) / orders2024.length) * 100).toFixed(2)
      : 0
  };
}

function groupByClient(orders) {
  const acc = {};
  const monthNames = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  for (const o of orders) {
    const c = o.cliente1?.trim();
    if (!c) continue;
    if (!acc[c]) {
      acc[c] = { cliente: c, total: 0, concluidos: 0, pendentes: 0, atrasados: 0, 2024: 0, 2025: 0 };
      monthNames.forEach(m => acc[c][m] = 0);
    }
    const it = acc[c];
    it.total++;
    if (o.isConcluido) it.concluidos++; else it.pendentes++;
    if (o.isAtrasado) it.atrasados++;
    if (o.dataEntregaDate) {
      const y = o.dataEntregaDate.getFullYear();
      if (y === 2024) it['2024']++;
      if (y === 2025) it['2025']++;
      const m = o.dataEntregaDate.getMonth();
      it[monthNames[m]]++;
    }
  }
  return Object.values(acc);
}

function extractUniqueContentTypes(orders) {
  return [...new Set(orders.map(o => (o.tipoDemanda || '').trim()).filter(Boolean))]
    .sort()
    .map(tipo => ({ id: tipo.toLowerCase().replace(/\s+/g, '_'), label: tipo, value: tipo }));
}

module.exports = { rowToOrder, summarize, groupByClient, extractUniqueContentTypes, PROP };
