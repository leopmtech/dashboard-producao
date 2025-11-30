// src/services/mockData.js
// Mock data para desenvolvimento quando Netlify Dev não está disponível

// Gerar dados mock mais realistas (50 registros)
const generateMockOrders = () => {
  const clientes = ['Cliente A', 'Cliente B', 'Cliente C', 'Cliente D', 'Cliente E', 'Cliente F', 'Cliente G', 'Cliente H'];
  const tiposDemanda = ['Design', 'Desenvolvimento', 'Revisão', 'Diagnóstico', 'Especial'];
  const statuses = ['Concluído', 'Em Andamento', 'Pendente'];
  const complexidades = ['Baixa', 'Média', 'Alta'];
  const prioridades = ['Baixa', 'Média', 'Alta'];
  const executores = ['Gustavo Oliveira', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'João Silva', 'Carlos Mendes'];
  const criadores = ['João Silva', 'Pedro Costa', 'Ana Oliveira', 'Carlos Mendes'];
  
  const orders = [];
  const currentDate = new Date();
  
  for (let i = 0; i < 50; i++) {
    const month = (i % 12) + 1;
    const day = (i % 28) + 1;
    const year = 2025;
    const dataEntrega = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dataInicio = `${year}-${String(month).padStart(2, '0')}-${String(Math.max(1, day - 15)).padStart(2, '0')}`;
    
    const cliente = clientes[i % clientes.length];
    const tipoDemanda = tiposDemanda[i % tiposDemanda.length];
    const status = statuses[i % statuses.length];
    const concluido = status === 'Concluído';
    
    // 🎯 GUSTAVO OLIVEIRA: Priorizar em registros de Design
    // Se for Design, 40% das vezes será Gustavo
    // Se não for Design, distribuição normal
    let quemExecuta;
    if (tipoDemanda === 'Design') {
      // 40% dos registros de Design são de Gustavo
      quemExecuta = (i % 10 < 4) ? 'Gustavo Oliveira' : executores[i % executores.length];
    } else {
      // Distribuição normal para outros tipos
      quemExecuta = executores[i % executores.length];
    }
    
    orders.push({
      id: `mock-${i + 1}`,
      ordemServico: `OS-${String(i + 1).padStart(3, '0')}`,
      cliente1: cliente,
      cliente2: i % 5 === 0 ? clientes[(i + 1) % clientes.length] : '',
      cliente: cliente,
      tipoDemanda: tipoDemanda,
      criadoPor: criadores[i % criadores.length],
      dataInicio: dataInicio,
      dataEntrega: dataEntrega,
      quemExecuta: quemExecuta,
      status: status,
      complexidade: complexidades[i % complexidades.length],
      prioridade: prioridades[i % prioridades.length],
      tags: i % 10 === 0 ? ['Urgente'] : [],
      tagsString: i % 10 === 0 ? 'Urgente' : '',
      concluido: concluido
    });
  }
  
  return orders;
};

const mockOrders = generateMockOrders();

// Calcular métricas dos dados mock
const calculateMockMetrics = (orders) => {
  const total = orders.length;
  const concluidos = orders.filter(o => o.concluido).length;
  const emAndamento = orders.filter(o => o.status === 'Em Andamento').length;
  const porTipo = {};
  
  orders.forEach(order => {
    const tipo = order.tipoDemanda;
    porTipo[tipo] = (porTipo[tipo] || 0) + 1;
  });
  
  return {
    total,
    concluidos,
    emAndamento,
    porTipo
  };
};

// Calcular visaoGeral dos dados mock
const calculateMockVisaoGeral = (orders) => {
  const clientesMap = new Map();
  
  orders.forEach(order => {
    const cliente = order.cliente1 || order.cliente;
    if (!cliente) return;
    
    if (!clientesMap.has(cliente)) {
      clientesMap.set(cliente, {
        cliente: cliente,
        '2024': 0,
        '2025': 0,
        janeiro: 0,
        fevereiro: 0,
        marco: 0,
        abril: 0,
        maio: 0,
        junho: 0,
        julho: 0,
        agosto: 0,
        setembro: 0,
        outubro: 0,
        novembro: 0,
        dezembro: 0,
        total: 0
      });
    }
    
    const clienteData = clientesMap.get(cliente);
    clienteData.total++;
    clienteData['2025']++;
    
    // Extrair mês da data de entrega
    if (order.dataEntrega) {
      const date = new Date(order.dataEntrega);
      const month = date.getMonth();
      const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 
                         'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      if (month >= 0 && month < 12) {
        clienteData[monthNames[month]]++;
      }
    }
  });
  
  return Array.from(clientesMap.values());
};

// Extrair tipos de conteúdo únicos
const extractContentTypes = (orders) => {
  const tipos = new Set();
  orders.forEach(order => {
    if (order.tipoDemanda) {
      tipos.add(order.tipoDemanda);
    }
  });
  
  return Array.from(tipos).map(tipo => ({
    id: tipo.toLowerCase().replace(/\s+/g, '-'),
    label: tipo,
    value: tipo
  }));
};

const mockMetrics = calculateMockMetrics(mockOrders);
const mockVisaoGeral = calculateMockVisaoGeral(mockOrders);
const mockContentTypes = extractContentTypes(mockOrders);

// Mock data no formato esperado pela aplicação (já processado)
export const MOCK_NOTION_DATA = {
  totalSheets: 1,
  loadedAt: new Date().toISOString(),
  sheetName: 'notion',
  originalOrders: mockOrders,
  metrics: mockMetrics,
  contentTypes: mockContentTypes,
  visaoGeral: mockVisaoGeral,
  visaoGeral2024: [],
  diarios: [],
  diarios2024: [],
  semanais: [],
  semanais2024: [],
  mensais: [],
  mensais2024: [],
  especiais: [],
  especiais2024: [],
  diagnosticos: [],
  diagnosticos2024: [],
  design: []
};

// Função para detectar se deve usar produção (dados reais)
export const useProductionData = () => {
  // 1. Verificar localStorage primeiro (permite toggle persistente)
  if (typeof window !== 'undefined' && localStorage.getItem('force-production') === 'true') {
    console.log('🌐 [MODE] Production mode via localStorage');
    return true;
  }
  
  // 2. Forçar produção via query string
  if (window.location.search.includes('force-production=true')) {
    console.log('🌐 [MODE] Forcing production mode via query string');
    // Salvar no localStorage para persistência
    if (typeof window !== 'undefined') {
      localStorage.setItem('force-production', 'true');
    }
    return true;
  }
  
  // 3. Produção real
  if (process.env.NODE_ENV === 'production') {
    console.log('🌐 [MODE] Production mode (NODE_ENV=production)');
    return true;
  }
  
  // 4. Se não é localhost, assumir produção
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    console.log('🌐 [MODE] Production mode (not localhost):', window.location.hostname);
    return true;
  }
  
  // 5. Netlify Dev (porta 8888) = produção
  if (window.location.port === '8888') {
    console.log('🌐 [MODE] Production mode (Netlify Dev on port 8888)');
    return true;
  }
  
  console.log('🔧 [MODE] Development mode (using mock data)');
  return false;
};

// Função para detectar se deve usar mock data
export const shouldUseMockData = () => {
  // Se forçar produção, não usar mock
  if (useProductionData()) {
    return false;
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isReactDevServer = window.location.port === '3000' || 
                          (window.location.hostname === 'localhost' && 
                           (window.location.port === '' || window.location.port === '3000'));
  const isNotNetlifyDev = window.location.port !== '8888';
  
  const shouldUse = isDevelopment && isReactDevServer && isNotNetlifyDev;
  
  if (shouldUse) {
    console.log('🔧 [MOCK] Will use mock data');
  } else {
    console.log('🌐 [PROD] Will use production data');
  }
  
  return shouldUse;
};

// Função para simular delay de rede
export const simulateNetworkDelay = (ms = 1000) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// 🎯 Dados de Design específicos para Gustavo Oliveira
export const MOCK_DESIGN_DATA = Array.from({ length: 15 }, (_, index) => {
  const month = (index % 12) + 1;
  const clientes = ['Cliente A', 'Cliente B', 'Cliente C', 'Cliente D', 'Cliente E', 'Cliente F', 'Cliente G', 'Cliente H'];
  const tipos = ['Logo', 'Banner', 'Flyer', 'Social Media', 'Identidade Visual'];
  
  return {
    designer: 'Gustavo Oliveira',
    cliente: clientes[index % clientes.length],
    month: `2025-${String(month).padStart(2, '0')}`,
    type: tipos[index % tipos.length],
    projects: Math.floor(Math.random() * 5) + 1,
    status: index % 3 === 0 ? 'Concluído' : 'Em Andamento',
    dataEntrega: `2025-${String(month).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`
  };
});

// Log de estatísticas de Gustavo nos dados mock
const gustavoStats = mockOrders.filter(o => o.quemExecuta === 'Gustavo Oliveira');
const gustavoDesignStats = gustavoStats.filter(o => o.tipoDemanda === 'Design');
console.log('🎯 [MOCK DATA] Gustavo Oliveira statistics:', {
  totalRecords: gustavoStats.length,
  designRecords: gustavoDesignStats.length,
  percentageOfDesign: gustavoDesignStats.length > 0 
    ? ((gustavoDesignStats.length / mockOrders.filter(o => o.tipoDemanda === 'Design').length) * 100).toFixed(1) + '%'
    : '0%'
});
