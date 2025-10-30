import React from 'react';

const ConnectionStatus = ({ onRefresh, onExportCSV, loading, error, lastUpdate }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    }}>
      {/* Status Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#10B981',
          animation: 'pulse 2s infinite'
        }}></div>
        <span style={{
          color: '#10B981',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          Conectado
        </span>
      </div>

      {/* Buttons Container */}
      <div style={{
        display: 'flex',
        gap: '8px'
      }}>
        {/* Refresh Button */}
        <button 
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#9CA3AF' : '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#2563EB';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.backgroundColor = '#3B82F6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
            }
          }}
        >
          <span style={{
            animation: loading ? 'spin 1s linear infinite' : 'none',
            display: 'inline-block'
          }}>
            🔄
          </span>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>

        {/* Export CSV Button */}
        <button 
          onClick={onExportCSV}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#059669';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#10B981';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
          }}
        >
          📊 Exportar CSV
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          color: '#EF4444',
          fontSize: '0.8rem',
          fontWeight: '500',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ConnectionStatus;