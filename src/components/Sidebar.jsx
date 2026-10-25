import { useEffect, useRef, useState } from 'react';
import { formatMinutes, ROUTES } from '../data/mockRoutes';
import RouteFilters from './RouteFilters';
import Stepper from './Stepper';

const COLLAPSED_HEIGHT = 214;

function getExpandedHeight() {
  return Math.min(window.innerHeight * 0.64, window.innerHeight - 92);
}

function Sidebar({
  activeFilter,
  onFilterChange,
  selectedRoute,
  focusedStop,
  onStopFocus,
  onFitRoute,
  sheetExpanded,
  onSheetExpandedChange,
  streetData,
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState(null);

  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleDesktop = (event) => {
      if (event.matches) onSheetExpandedChange(true);
    };

    mediaQuery.addEventListener('change', handleDesktop);
    return () => mediaQuery.removeEventListener('change', handleDesktop);
  }, [onSheetExpandedChange]);

  const handlePointerDown = (event) => {
    if (!isMobile() || (event.pointerType === 'mouse' && event.button !== 0)) return;

    const panel = panelRef.current;
    if (!panel) return;

    dragRef.current = {
      startY: event.clientY,
      startHeight: panel.getBoundingClientRect().height,
    };
    setDragging(true);
    setDragHeight(panel.getBoundingClientRect().height);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;

    const maxHeight = getExpandedHeight();
    const nextHeight =
      dragRef.current.startHeight + (dragRef.current.startY - event.clientY);

    setDragHeight(
      Math.min(maxHeight, Math.max(COLLAPSED_HEIGHT, nextHeight)),
    );
  };

  const finishDrag = () => {
    if (!dragRef.current) return;

    const height = dragHeight ?? dragRef.current.startHeight;
    const threshold = (COLLAPSED_HEIGHT + getExpandedHeight()) / 2;
    const shouldExpand = height >= threshold;

    dragRef.current = null;
    setDragging(false);
    setDragHeight(null);

    if (shouldExpand !== sheetExpanded) {
      onSheetExpandedChange(shouldExpand);
    }
  };

  const statusClass =
    streetData.status === 'ok'
      ? 'ok'
      : streetData.status === 'loading'
        ? 'loading'
        : 'warn';

  return (
    <aside
      ref={panelRef}
      className={`sheet-panel ${sheetExpanded ? 'is-expanded' : 'is-collapsed'} ${
        dragging ? 'is-dragging' : ''
      }`}
      style={dragHeight ? { height: `${dragHeight}px` } : undefined}
      aria-label="Planificador RutaSmart Andahuaylas"
    >
      <div
        className="sheet-handle"
        aria-hidden="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      />

      <header className="panel-header flex items-center justify-between gap-3 px-4 pb-3 pt-5 md:px-[18px] md:pb-3 md:pt-[18px]">
        <div className="brand flex min-w-0 items-center gap-3">
          <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[13px] bg-gradient-to-br from-[#00b47b] to-[#007a52] text-base text-white shadow-[0_12px_22px_-10px_rgba(0,168,112,0.8)] md:h-11 md:w-11 md:rounded-[15px]">
            <i className="fa-solid fa-route" aria-hidden="true" />
          </div>
          <div className="brand-copy min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="m-0 text-[17px] font-extrabold leading-none tracking-[-0.035em] md:text-[19px]">
                RutaSmart
              </h1>
              <span className="rounded-md bg-brand/10 px-1.5 py-1 text-[8px] font-extrabold tracking-[0.12em] text-[#007a52]">
                AND
              </span>
            </div>
            <p className="mt-1.5 text-[9.5px] font-medium leading-tight text-slate-500 md:text-[10.5px]">
              Andahuaylas · Apurímac
            </p>
          </div>
        </div>

        <button
          type="button"
          className="icon-button sheet-toggle"
          onClick={() => onSheetExpandedChange(!sheetExpanded)}
          aria-label={sheetExpanded ? 'Contraer panel' : 'Expandir panel'}
          aria-expanded={sheetExpanded}
          title={sheetExpanded ? 'Contraer panel' : 'Expandir panel'}
        >
          <i
            className={`fa-solid fa-chevron-down transition-transform ${
              sheetExpanded ? '' : 'rotate-180'
            }`}
            aria-hidden="true"
          />
        </button>
      </header>

      <div className="panel-scroll">
        <section className="sheet-collapsible" aria-label="Buscador de rutas">
          <div className="search-card">
            <div className="search-row">
              <span className="search-dot origin" aria-hidden="true" />
              <div className="search-field">
                <label htmlFor="origin-input">Origen</label>
                <input
                  id="origin-input"
                  type="text"
                  readOnly
                  value="Plaza de Armas de Andahuaylas"
                  aria-label="Origen seleccionado"
                  title="Origen seleccionado"
                />
              </div>
              <i
                className="fa-solid fa-location-dot search-end-icon"
                aria-hidden="true"
              />
            </div>
            <div className="search-row">
              <span className="search-dot dest" aria-hidden="true" />
              <div className="search-field">
                <label htmlFor="dest-input">Destino</label>
                <input
                  id="dest-input"
                  type="text"
                  readOnly
                  value={selectedRoute?.destinationLabel ?? 'Selecciona una línea'}
                  aria-label="Destino seleccionado"
                  title={selectedRoute?.destinationLabel ?? 'Selecciona una línea'}
                />
              </div>
              <i
                className="fa-solid fa-flag-checkered search-end-icon"
                aria-hidden="true"
              />
            </div>
          </div>
        </section>

        <section className="mt-3" aria-label="Filtrar líneas">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="eyebrow">Líneas</span>
            <span className="count-badge">2 rutas</span>
          </div>
          <RouteFilters
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
          <p className="mt-2 text-center text-[9.5px] leading-tight text-slate-400">
            <i className="fa-solid fa-bus mr-1" aria-hidden="true" />
            Solo combi/bus · tiempos referenciales
          </p>
        </section>

        <section
          className="routes-section sheet-collapsible mt-3.5"
          aria-label="Rutas disponibles"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="eyebrow">Rutas disponibles</span>
            <span className="count-badge">2 líneas</span>
          </div>
          <div className="flex flex-col gap-2">
            {ROUTES.map((route) => {
              const active = selectedRoute?.id === route.id;

              return (
                <button
                  key={route.id}
                  type="button"
                  className={`route-card ${active ? 'active' : ''}`}
                  style={{ '--route-color': route.color }}
                  aria-pressed={active}
                  aria-label={`Seleccionar línea ${route.line}, ${route.name}`}
                  onClick={() => onFilterChange(route.id)}
                >
                  <span className="route-card-top">
                    <span className="line-badge">{route.line}</span>
                    <span className="route-name-wrap">
                      <strong>{route.name}</strong>
                      <small>{route.summary}</small>
                    </span>
                    <span className={`traffic-pill ${route.trafficClass}`}>
                      {route.traffic}
                    </span>
                  </span>
                  <span className="route-meta">
                    <span className="met">
                      <i className="fa-regular fa-clock" aria-hidden="true" />
                      <b>{formatMinutes(route.baseMinutes)}</b> min
                    </span>
                    <span className="met">
                      <i className="fa-solid fa-road" aria-hidden="true" />
                      <span>{route.distanceKm.toFixed(1)}</span> km
                    </span>
                    <span className="select-check" aria-hidden="true">
                      <i className="fa-solid fa-check" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedRoute ? (
          <Stepper
            route={selectedRoute}
            activeStop={focusedStop}
            onStopClick={onStopFocus}
            onFitRoute={onFitRoute}
          />
        ) : (
          <div className="sheet-collapsible mt-4 rounded-2xl border border-brand/15 bg-brand/[0.055] px-4 py-4 text-center">
            <i
              className="fa-solid fa-hand-pointer mb-2 text-sm text-brand"
              aria-hidden="true"
            />
            <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
              Selecciona una línea para ver los paraderos
            </p>
          </div>
        )}
      </div>

      <footer className="panel-footer sheet-collapsible">
        <div className="data-state">
          <span className={`status-dot ${statusClass}`} aria-hidden="true" />
          <span>{streetData.text}</span>
        </div>
        <div className="credits">
          <span>© Esri · OpenStreetMap</span>
          <span className="dot-sep">·</span>
          <span>Recorridos referenciales</span>
        </div>
      </footer>
    </aside>
  );
}

export default Sidebar;
