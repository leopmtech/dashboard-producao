import React from 'react';
import { RefreshCw, Download, Wifi, WifiOff } from 'lucide-react';

const DashboardHeader = ({ onRefresh, onExport, isConnected, lastUpdate, loading }) => (
  <div className="dashboard-header">
    <div className="header-content">
      <div className="header-text">
        <h1 className="header-title">
          Dashboard Social Listening & BI
        </h1>
        <p className="header-subtitle">
          Acompanhamento da produção desde abril 2024 • Nova Diretoria
        </p>
      </div>
      <div className="header-actions">
        <div className="connection-status">
          {isConnected ? (
            <div className="status-connected">
              <Wifi size={16} />
              <span>Google Sheets Conectado</span>
            </div>
          ) : (
            <div className="status-disconnected">
              <WifiOff size={16} />
              <span>Desconectado</span>
            </div>
          )}
        </div>
        <button 
          onClick={onRefresh} 
          className="btn-refresh"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
        <button onClick={onExport} className="btn-export">
          <Download size={16} />
          Exportar
        </button>
      </div>
    </div>
    {lastUpdate && (
      <div className="last-update">
        Última atualização: {lastUpdate.toLocaleString('pt-BR')} • Fonte: Google Sheets
      </div>
    )}
  </div>
);

export default DashboardHeader;
