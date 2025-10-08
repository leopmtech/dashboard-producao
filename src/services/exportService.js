// ==========================================
// src/services/exportService.js
// Serviço completo para exportação de dados e relatórios
// ==========================================

export class ExportService {
  
  // Exportar dados para CSV
  static exportToCSV(data, filename = 'dashboard-data', options = {}) {
    try {
      const csvData = this.convertToCSV(data, options);
      this.downloadFile(csvData, `${filename}-${this.getDateString()}.csv`, 'text/csv');
      console.log('✅ Dados exportados para CSV com sucesso');
    } catch (error) {
      console.error('❌ Erro ao exportar CSV:', error);
      throw new Error('Falha na exportação para CSV');
    }
  }

  // Exportar dados para JSON
  static exportToJSON(data, filename = 'dashboard-data') {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      this.downloadFile(jsonData, `${filename}-${this.getDateString()}.json`, 'application/json');
      console.log('✅ Dados exportados para JSON com sucesso');
    } catch (error) {
      console.error('❌ Erro ao exportar JSON:', error);
      throw new Error('Falha na exportação para JSON');
    }
  }

  // Converter dados para formato CSV
  static convertToCSV(data, options = {}) {
    if (!data || !data.visaoGeral) {
      throw new Error('Dados insuficientes para exportação');
    }

    const separator = options.excel ? ';' : ',';
    const csvRows = [];

    // Headers
    const headers = [
      'Categoria',
      'Cliente', 
      'Janeiro', 
      'Fevereiro', 
      'Março', 
      'Abril', 
      'Maio', 
      'Junho',
      'Julho',
      'Agosto', 
      'Setembro', 
      'Outubro', 
      'Novembro', 
      'Dezembro', 
      'Total'
    ];
    csvRows.push(headers.join(separator));

    // Dados da Visão Geral
    if (data.visaoGeral && data.visaoGeral.length > 0) {
      data.visaoGeral.forEach(item => {
        const row = [
          'Relatórios Gerais',
          this.escapeCsvValue(item.cliente),
          item.janeiro || 0,
          item.fevereiro || 0,
          item.marco || 0,
          item.abril || 0,
          item.maio || 0,
          item.junho || 0,
          item.julho || 0,
          item.agosto || 0,
          item.setembro || 0,
          item.outubro || 0,
          item.novembro || 0,
          item.dezembro || 0,
          item.total || 0
        ];
        csvRows.push(row.join(separator));
      });
    }

    return csvRows.join('\n');
  }

  // Escapar valores para CSV
  static escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  // Baixar arquivo
  static downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  }

  // Gerar string de data
  static getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  // Gerar relatório em HTML
  static generateHTMLReport(data, metrics) {
    const reportDate = new Date().toLocaleDateString('pt-BR');
    const reportTime = new Date().toLocaleTimeString('pt-BR');
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Dashboard - ${reportDate}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            line-height: 1.6; 
            color: #333;
            background: #f8f9fa;
            padding: 20px;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
            text-align: center; 
            padding: 40px 20px;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .content { padding: 40px; }
        .metrics { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px; 
        }
        .metric-card { 
            background: #f8f9fa;
            padding: 20px; 
            border-radius: 8px; 
            text-align: center;
            border-left: 4px solid #6366f1;
        }
        .metric-card h3 { color: #6366f1; margin-bottom: 10px; }
        .metric-card .value { 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #333;
            margin-bottom: 5px;
        }
        .metric-card .label { color: #666; font-size: 0.9em; }
        .table-container { margin-bottom: 40px; }
        .table-container h2 { 
            color: #333; 
            margin-bottom: 20px; 
            padding-bottom: 10px;
            border-bottom: 2px solid #6366f1;
        }
        .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .table th, .table td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #e9ecef;
        }
        .table th { 
            background: #6366f1;
            color: white;
            font-weight: 600;
        }
        .table tbody tr:hover { background: #f8f9fa; }
        .total-cell { font-weight: bold; color: #6366f1; }
        .footer { 
            background: #333; 
            color: white; 
            text-align: center; 
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Dashboard Social Listening & BI</h1>
            <p>Relatório Completo de Produção</p>
            <p>Gerado em ${reportDate} às ${reportTime}</p>
        </div>
        
        <div class="content">
            <div class="metrics">
                <div class="metric-card">
                    <h3>Total de Clientes</h3>
                    <div class="value">${metrics.totalClientes}</div>
                    <div class="label">Clientes Ativos</div>
                </div>
                <div class="metric-card">
                    <h3>Total de Relatórios</h3>
                    <div class="value">${metrics.totalRelatorios}</div>
                    <div class="label">Em 2025</div>
                </div>
                <div class="metric-card">
                    <h3>Crescimento</h3>
                    <div class="value">+${metrics.crescimento}%</div>
                    <div class="label">Desde Nova Diretoria</div>
                </div>
                <div class="metric-card">
                    <h3>Produtividade</h3>
                    <div class="value">${metrics.produtividadeMensal}</div>
                    <div class="label">Relatórios por Mês</div>
                </div>
            </div>

            ${this.generateTableSection('Visão Geral - Relatórios Principais', data.visaoGeral)}
            ${this.generateTableSection('Relatórios Semanais', data.semanais)}
            ${this.generateTableSection('Relatórios Mensais', data.mensais)}
        </div>

        <div class="footer">
            <p>Relatório gerado automaticamente pelo Dashboard Social Listening & BI</p>
            <p>Dados sincronizados com Google Sheets</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Gerar seção de tabela
  static generateTableSection(title, dataArray) {
    if (!dataArray || dataArray.length === 0) {
      return `<div class="table-container">
          <h2>${title}</h2>
          <p style="color: #666; font-style: italic;">Nenhum dado disponível.</p>
      </div>`;
    }

    const totalGeral = dataArray.reduce((sum, item) => sum + (item.total || 0), 0);

    return `<div class="table-container">
        <h2>${title}</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Jan</th>
                    <th>Fev</th>
                    <th>Mar</th>
                    <th>Abr</th>
                    <th>Mai</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${dataArray.map(item => `
                    <tr>
                        <td><strong>${item.cliente}</strong></td>
                        <td>${item.janeiro || 0}</td>
                        <td>${item.fevereiro || 0}</td>
                        <td>${item.marco || 0}</td>
                        <td>${item.abril || 0}</td>
                        <td>${item.maio || 0}</td>
                        <td class="total-cell">${item.total || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr style="background: #f8f9fa; font-weight: bold;">
                    <td>TOTAL</td>
                    <td colspan="5">-</td>
                    <td class="total-cell">${totalGeral}</td>
                </tr>
            </tfoot>
        </table>
    </div>`;
  }

  // Exportar relatório HTML
  static exportReport(data, metrics, filename = 'relatorio-dashboard') {
    try {
      const htmlReport = this.generateHTMLReport(data, metrics);
      this.downloadFile(htmlReport, `${filename}-${this.getDateString()}.html`, 'text/html');
      console.log('✅ Relatório HTML exportado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao exportar relatório:', error);
      throw new Error('Falha na exportação do relatório');
    }
  }

  // Gerar resumo executivo
  static generateExecutiveSummary(data, metrics) {
    const topClientes = data.visaoGeral ? 
      data.visaoGeral.sort((a, b) => b.total - a.total).slice(0, 3) : [];

    return `# RELATÓRIO EXECUTIVO - DASHBOARD SOCIAL LISTENING & BI

**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Período:** Janeiro a Maio 2025

## 📊 RESUMO EXECUTIVO

### Principais Indicadores
- **Total de Clientes Ativos:** ${metrics.totalClientes}
- **Relatórios Produzidos:** ${metrics.totalRelatorios}
- **Crescimento desde Nova Diretoria:** +${metrics.crescimento}%
- **Produtividade Mensal Média:** ${metrics.produtividadeMensal} relatórios

### Top 3 Clientes
${topClientes.map((cliente, index) => 
  `${index + 1}. **${cliente.cliente}** - ${cliente.total} relatórios`
).join('\n')}

### Recomendações
1. **Manter o ritmo de crescimento** iniciado em abril
2. **Expandir parcerias** com clientes de menor volume  
3. **Otimizar processos** para aumentar eficiência

---
*Relatório gerado automaticamente pelo Sistema de Dashboard*`;
  }

  // Exportar resumo executivo
  static exportExecutiveSummary(data, metrics, filename = 'resumo-executivo') {
    try {
      const summary = this.generateExecutiveSummary(data, metrics);
      this.downloadFile(summary, `${filename}-${this.getDateString()}.md`, 'text/markdown');
      console.log('✅ Resumo executivo exportado');
    } catch (error) {
      console.error('❌ Erro ao exportar resumo:', error);
      throw new Error('Falha na exportação do resumo');
    }
  }

  // Validar dados para exportação
  static validateDataForExport(data) {
    const errors = [];

    if (!data) {
      errors.push('Nenhum dado fornecido');
      return { valid: false, errors };
    }

    if (!data.visaoGeral || !Array.isArray(data.visaoGeral)) {
      errors.push('Dados da visão geral inválidos');
    }

    if (data.visaoGeral && data.visaoGeral.length === 0) {
      errors.push('Nenhum cliente encontrado');
    }

    return { valid: errors.length === 0, errors };
  }

  // Exportar todos os formatos
  static exportAll(data, metrics, baseFilename = 'dashboard-completo') {
    const validation = this.validateDataForExport(data);
    
    if (!validation.valid) {
      throw new Error(`Dados inválidos: ${validation.errors.join(', ')}`);
    }

    try {
      console.log('🔄 Iniciando exportação completa...');
      
      this.exportToCSV(data, `${baseFilename}-dados`);
      this.exportToJSON(data, `${baseFilename}-dados`);
      this.exportReport(data, metrics, `${baseFilename}-relatorio`);
      this.exportExecutiveSummary(data, metrics, `${baseFilename}-resumo`);
      
      console.log('✅ Exportação completa finalizada!');
      
      return {
        success: true,
        files: [
          `${baseFilename}-dados-${this.getDateString()}.csv`,
          `${baseFilename}-dados-${this.getDateString()}.json`,
          `${baseFilename}-relatorio-${this.getDateString()}.html`,
          `${baseFilename}-resumo-${this.getDateString()}.md`
        ]
      };
    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      throw new Error('Falha na exportação completa');
    }
  }

  // Obter estatísticas dos dados
  static getDataStatistics(data) {
    if (!data || !data.visaoGeral) return {};

    const stats = {
      totalClientes: data.visaoGeral.length,
      totalRelatorios: data.visaoGeral.reduce((sum, c) => sum + c.total, 0),
      clienteMaiorVolume: data.visaoGeral.reduce((max, cliente) => 
        cliente.total > max.total ? cliente : max
      ),
      mediaPorCliente: 0
    };

    if (stats.totalClientes > 0) {
      stats.mediaPorCliente = Math.round((stats.totalRelatorios / stats.totalClientes) * 10) / 10;
    }

    return stats;
  }

  // Formatação brasileira
  static formatBrazilianNumber(number) {
    return new Intl.NumberFormat('pt-BR').format(number);
  }

  static formatBrazilianCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  static formatPercentage(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1
    }).format(value / 100);
  }
}