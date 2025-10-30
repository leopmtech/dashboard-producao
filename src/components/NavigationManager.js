// ==========================================
// src/components/NavigationManager.js
// Sistema de navegação entre múltiplas views
// ==========================================

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Map, Calendar, Brain, Eye, Grid, Users,
  ArrowLeft, Settings, Bookmark, Share2, Download,
  Layers, Filter, Search, RefreshCw, Maximize2
} from 'lucide-react';

const NavigationManager = ({ 
  currentView, 
  onViewChange, 
  data, 
  breadcrumbs = [],
  onBack,
  showFilters = true,
  showExport = true
}) => {
  const [viewHistory, setViewHistory] = useState(['dashboard']);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Definir views disponíveis
  const views = {
    dashboard: {
      id: 'dashboard',
      title: 'Dashboard Principal',
      description: 'Visão geral com KPIs e gráficos principais',
      icon: BarChart3,
      color: '#FF6B47',
      category: 'overview'
    },
    heatmap: {
      id: 'heatmap',
      title: 'Heatmap Interativo',
      description: 'Mapa de calor clientes x meses com drill-down',
      icon: Map,
      color: '#10B981',
      category: 'analysis'
    },
    timeline: {
      id: 'timeline',
      title: 'Timeline de Eventos',
      description: 'Linha do tempo com marcos e eventos importantes',
      icon: Calendar,
      color: '#3B82F6',
      category: 'temporal'
    },
    collaborators: {
      id: 'collaborators',
      title: 'Demandas por Colaborador',
      description: 'Calendário e resumo mensal filtrado por colaborador',
      icon: Users,
      color: '#22C55E',
      category: 'temporal'
    },
    insights: {
      id: 'insights',
      title: 'Insights com IA',
      description: 'Análises automáticas e recomendações inteligentes',
      icon: Brain,
      color: '#8B5CF6',
      category: 'ai'
    },
    analytics: {
      id: 'analytics',
      title: 'Analytics Avançado',
      description: 'Correlações, previsões e análises estatísticas',
      icon: Grid,
      color: '#F59E0B',
      category: 'advanced'
    },
    drilldown: {
      id: 'drilldown',
      title: 'Drill Down',
      description: 'Análise detalhada por cliente e período',
      icon: Eye,
      color: '#EF4444',
      category: 'detail'
    }
  };

  const categories = {
    overview: { label: 'Visão Geral', icon: BarChart3, color: '#FF6B47' },
    analysis: { label: 'Análise', icon: Map, color: '#10B981' },
    temporal: { label: 'Temporal', icon: Calendar, color: '#3B82F6' },
    ai: { label: 'Inteligência', icon: Brain, color: '#8B5CF6' },
    advanced: { label: 'Avançado', icon: Grid, color: '#F59E0B' },
    detail: { label: 'Detalhes', icon: Eye, color: '#EF4444' }
  };

  // Gerenciar histórico de navegação
  useEffect(() => {
    if (currentView && !viewHistory.includes(currentView)) {
      setViewHistory(prev => [...prev, currentView].slice(-10)); // Manter últimas 10 views
    }
  }, [currentView, viewHistory]);

  // Alternar favoritos
  const toggleFavorite = (viewId) => {
    setFavorites(prev => 
      prev.includes(viewId) 
        ? prev.filter(id => id !== viewId)
        : [...prev, viewId]
    );
  };

  // Filtrar views por busca
  const filteredViews = Object.values(views).filter(view =>
    view.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    view.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Obter view atual
  const getCurrentView = () => views[currentView] || views.dashboard;

  // Renderizar breadcrumbs
  const renderBreadcrumbs = () => {
    if (!breadcrumbs.length) return null;

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        fontSize: '0.875rem',
        color: '#6B7280'
      }}>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <span style={{ color: '#D1D5DB' }}>{'>'}</span>
            )}
            <button
              onClick={() => crumb.onClick && crumb.onClick()}
              style={{
                background: 'none',
                border: 'none',
                color: index === breadcrumbs.length - 1 ? '#FF6B47' : '#6B7280',
                cursor: crumb.onClick ? 'pointer' : 'default',
                fontWeight: index === breadcrumbs.length - 1 ? '600' : '400',
                textDecoration: 'none',
                fontSize: '0.875rem'
              }}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Renderizar navegação principal
  const renderMainNavigation = () => {
    const currentViewData = getCurrentView();

    return (
      <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Header da navegação */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          {/* Busca */}
          <div style={{
            position: 'relative',
            flex: 1,
            maxWidth: '300px'
          }}>
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9CA3AF'
              }}
            />
            <input
              type="text"
              placeholder="Buscar views..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#FF6B47'}
              onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
            />
          </div>

          {/* Filtros rápidos */}
          {showFilters && (
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <Filter size={16} style={{ color: '#6B7280' }} />
              <select
                style={{
                  padding: '6px 10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  background: 'white'
                }}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setSearchQuery('');
                  } else {
                    setSearchQuery(''); // Reset search when filtering by category
                  }
                }}
              >
                <option value="all">Todas as categorias</option>
                {Object.entries(categories).map(([key, category]) => (
                  <option key={key} value={key}>{category.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Grid de views */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px'
        }}>
          {filteredViews.map(view => {
            const isActive = view.id === currentView;
            const isFavorite = favorites.includes(view.id);
            const category = categories[view.category];

            return (
              <div
                key={view.id}
                onClick={() => onViewChange(view.id)}
                style={{
                  background: isActive ? `${view.color}10` : 'white',
                  border: `2px solid ${isActive ? view.color : '#E5E7EB'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.target.style.borderColor = view.color;
                    e.target.style.background = `${view.color}05`;
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = `0 4px 12px ${view.color}20`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.target.style.borderColor = '#E5E7EB';
                    e.target.style.background = 'white';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Badge de categoria */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {isFavorite && (
                    <div style={{
                      background: '#FEF3C7',
                      color: '#D97706',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem'
                    }}>
                      ⭐
                    </div>
                  )}
                  <div style={{
                    background: `${category.color}20`,
                    color: category.color,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {category.label}
                  </div>
                </div>

                {/* Conteúdo da view */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    background: `${view.color}20`,
                    color: view.color,
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <view.icon size={24} />
                  </div>

                  <div style={{ flex: 1, paddingRight: '40px' }}>
                    <h4 style={{
                      margin: '0 0 8px 0',
                      color: '#374151',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}>
                      {view.title}
                    </h4>
                    <p style={{
                      margin: 0,
                      color: '#6B7280',
                      fontSize: '0.875rem',
                      lineHeight: '1.4'
                    }}>
                      {view.description}
                    </p>
                  </div>
                </div>

                {/* Indicador ativo */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: view.color,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Eye size={12} />
                    Ativo
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Views favoritas */}
        {favorites.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{
              margin: '0 0 12px 0',
              color: '#374151',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Bookmark size={16} fill="#F59E0B" style={{ color: '#F59E0B' }} />
              Views Favoritas
            </h4>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {favorites.map(viewId => {
                const view = views[viewId];
                if (!view) return null;

                return (
                  <button
                    key={viewId}
                    onClick={() => onViewChange(viewId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: `${view.color}10`,
                      border: `1px solid ${view.color}30`,
                      borderRadius: '8px',
                      color: view.color,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = `${view.color}20`;
                      e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = `${view.color}10`;
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    <view.icon size={14} />
                    {view.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Histórico de navegação */}
        {viewHistory.length > 1 && (
          <div style={{ marginTop: '24px' }}>
            <h4 style={{
              margin: '0 0 12px 0',
              color: '#374151',
              fontSize: '1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <RefreshCw size={16} style={{ color: '#6B7280' }} />
              Histórico de Navegação
            </h4>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {viewHistory.slice(-5).map((viewId, index) => {
                const view = views[viewId];
                if (!view) return null;

                const isLast = index === viewHistory.length - 1;

                return (
                  <React.Fragment key={`${viewId}-${index}`}>
                    {index > 0 && (
                      <span style={{ color: '#D1D5DB', fontSize: '0.875rem' }}>→</span>
                    )}
                    <button
                      onClick={() => onViewChange(viewId)}
                      disabled={isLast}
                      style={{
                        padding: '6px 10px',
                        background: isLast ? `${view.color}20` : 'white',
                        border: `1px solid ${isLast ? view.color : '#E5E7EB'}`,
                        borderRadius: '6px',
                        color: isLast ? view.color : '#6B7280',
                        cursor: isLast ? 'default' : 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        opacity: isLast ? 1 : 0.7,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {view.title}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizar navegação compacta (para quando está dentro de uma view)
  const renderCompactNavigation = () => {
    const currentViewData = getCurrentView();

    return (
      <div style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                background: 'transparent',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                color: '#6B7280',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              background: `${currentViewData.color}20`,
              color: currentViewData.color,
              padding: '6px',
              borderRadius: '6px'
            }}>
              <currentViewData.icon size={16} />
            </div>
            <span style={{
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              {currentViewData.title}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Views rápidas */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['dashboard','heatmap','timeline','insights'].map(id => {
              const view = views[id];
              if (!view) return null;
              return (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                style={{
                  padding: '6px',
                  background: view.id === currentView ? `${view.color}20` : 'transparent',
                  border: `1px solid ${view.id === currentView ? view.color : '#E5E7EB'}`,
                  borderRadius: '6px',
                  color: view.id === currentView ? view.color : '#6B7280',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title={view.title}
              >
                <view.icon size={14} />
              </button>
              );
            })}
            {/* Atalho fixo: Colaboradores */}
            <button
              onClick={() => onViewChange('collaborators')}
              style={{
                padding: '6px',
                background: currentView === 'collaborators' ? `#22C55E20` : 'transparent',
                border: `1px solid ${currentView === 'collaborators' ? '#22C55E' : '#E5E7EB'}`,
                borderRadius: '6px',
                color: currentView === 'collaborators' ? '#22C55E' : '#6B7280',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Demandas por Colaborador"
            >
              <Calendar size={14} />
            </button>
          </div>

          {showExport && (
            <button
              style={{
                padding: '6px 12px',
                background: '#FF6B47',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Download size={12} />
              Exportar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      right: isFullscreen ? 0 : 'auto',
      bottom: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 1000 : 'auto',
      background: isFullscreen ? 'white' : 'transparent',
      padding: isFullscreen ? '20px' : '0',
      overflow: isFullscreen ? 'auto' : 'visible'
    }}>
      {currentView === 'navigation' ? renderMainNavigation() : renderCompactNavigation()}
    </div>
  );
};

export default NavigationManager;