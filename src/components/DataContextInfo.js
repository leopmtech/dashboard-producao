import React from 'react';

const DataContextInfo = ({ periodo, showSTA = true }) => {
  if (periodo === '2025') return null; // Sem aviso para 2025 apenas
  
  return (
    <div style={{
      backgroundColor: '#EBF8FF',
      border: '1px solid #3B82F6',
      borderRadius: '12px',
      padding: '16px',
      margin: '16px 0',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px'
    }}>
      <div style={{ fontSize: '20px', marginTop: '2px' }}>ℹ️</div>
      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#1E40AF'
        }}>
          Contexto dos Dados
        </h4>
        <ul style={{ 
          margin: '0', 
          paddingLeft: '16px',
          fontSize: '14px',
          color: '#1E3A8A',
          lineHeight: '1.5'
        }}>
          <li><strong>In.Pacto:</strong> Dados disponíveis desde 2024 (empresa estabelecida)</li>
          {showSTA && (
            <li><strong>STA:</strong> Dados disponíveis apenas a partir de Janeiro 2025 (empresa nova parceira)</li>
          )}
          {periodo === 'ambos' && showSTA && (
            <li><strong>Comparação:</strong> Limitada ao período onde ambas as empresas possuem dados</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default DataContextInfo;