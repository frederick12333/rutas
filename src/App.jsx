import { useCallback, useEffect, useRef, useState } from 'react';
import MapView from './components/MapView';
import Sidebar from './components/Sidebar';
import { ROUTE_BY_ID } from './data/mockRoutes';
import { useStreetData } from './hooks/useStreetData';

const TOAST_ICONS = {
  success: 'fa-circle-check',
  error: 'fa-triangle-exclamation',
  warn: 'fa-circle-exclamation',
  info: 'fa-circle-info',
};

function App() {
  const [activeFilter, setActiveFilter] = useState('todas');
  const [focusedStop, setFocusedStop] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const [fitNonce, setFitNonce] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const streetData = useStreetData();

  const selectedRoute =
    activeFilter === 'todas' ? null : (ROUTE_BY_ID[activeFilter] ?? null);

  const showToast = useCallback((message, type = 'info') => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, type, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 3400);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const handleFilterChange = (filterId) => {
    if (filterId !== 'todas' && !ROUTE_BY_ID[filterId]) return;

    setActiveFilter(filterId);
    setFocusedStop(null);
    setFitNonce((value) => value + 1);
  };

  const handleFitRoute = () => {
    setFitNonce((value) => value + 1);
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#e8eef3] text-ink">
      <MapView
        selectedRoute={selectedRoute}
        focusedStop={focusedStop}
        fitNonce={fitNonce}
        sheetExpanded={sheetExpanded}
        streetFeatures={streetData.features}
        onFilterChange={handleFilterChange}
        onStopFocus={setFocusedStop}
        onToast={showToast}
      />

      <Sidebar
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        selectedRoute={selectedRoute}
        focusedStop={focusedStop}
        onStopFocus={setFocusedStop}
        onFitRoute={handleFitRoute}
        sheetExpanded={sheetExpanded}
        onSheetExpandedChange={setSheetExpanded}
        streetData={streetData}
      />

      {toast ? (
        <div
          className="pointer-events-none fixed left-1/2 top-16 z-[2000] flex w-[min(92vw,390px)] -translate-x-1/2 justify-center max-md:left-3 max-md:right-3 max-md:top-[58px] max-md:w-auto max-md:translate-x-0"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            key={toast.id}
            className={`toast ${toast.type}`}
          >
            <i
              className={`fa-solid ${TOAST_ICONS[toast.type] ?? TOAST_ICONS.info}`}
              aria-hidden="true"
            />
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
