import React from 'react';
import { RefreshCw } from 'lucide-react';

const LoadingOverlay = () => (
  <div className="loading-overlay">
    <div className="loading-spinner">
      <RefreshCw className="spinning" size={24} />
      <span>Sincronizando com Google Sheets...</span>
    </div>
  </div>
);

export default LoadingOverlay;