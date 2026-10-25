import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Pane,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import { formatMinutes, ROUTES } from '../data/mockRoutes';
import {
  buildRouteLaneSigns,
  offsetPathInPixels,
  ROUTE_LANE_OFFSET_PX,
} from '../utils/routeOffset';

const MAP_CENTER = [-13.6556, -73.3872];
const ROUTE_LANE_SIGNS = buildRouteLaneSigns(ROUTES);
const COLLAPSED_HEIGHT = 214;

const FALLBACK_TILE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e8eef3"/><path d="M0 128h256M128 0v256" stroke="#dbe4ea" stroke-width="1"/></svg>',
)}`;

const STANDARD_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const LABELS_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_TILE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function getSheetHeight(sheetExpanded) {
  if (!sheetExpanded) return COLLAPSED_HEIGHT;
  return Math.min(window.innerHeight * 0.64, window.innerHeight - 92);
}

function flyToVisiblePoint(map, coords, zoom, duration, sheetExpanded) {
  if (window.innerWidth >= 768) {
    map.flyTo(coords, zoom, { duration });
    return;
  }

  const sheetHeight = getSheetHeight(sheetExpanded);
  const panelTop = window.innerHeight - sheetHeight - 10;
  const offsetY = Math.max(0, Math.round(window.innerHeight / 2 - panelTop / 2));
  const target = map.unproject(
    map.project(coords, zoom).add([0, offsetY]),
    zoom,
  );

  map.flyTo(target, zoom, { duration });
}

function MapController({
  selectedRoute,
  focusedStop,
  fitNonce,
  sheetExpanded,
}) {
  const map = useMap();

  const fitVisible = useCallback(() => {
    const routes = selectedRoute ? [selectedRoute] : ROUTES;
    const bounds = L.latLngBounds([]);

    routes.forEach((route) => {
      route.path.forEach((coords) => bounds.extend(coords));
    });

    if (!bounds.isValid()) return;

    const mobile = window.innerWidth < 768;
    const paddingTopLeft = mobile
      ? [30, 58]
      : [Math.min(404 + 38, 470), 46];
    const paddingBottomRight = mobile
      ? [30, getSheetHeight(sheetExpanded) + 28]
      : [46, 46];

    map.flyToBounds(bounds, {
      paddingTopLeft,
      paddingBottomRight,
      maxZoom: mobile ? 14.5 : 15,
      duration: 0.9,
      easeLinearity: 0.24,
    });
  }, [map, selectedRoute, sheetExpanded]);

  useEffect(() => {
    fitVisible();
  }, [fitVisible, fitNonce]);

  useEffect(() => {
    if (focusedStop === null || !selectedRoute) return;

    const stop = selectedRoute.stops[focusedStop];
    if (!stop) return;

    flyToVisiblePoint(
      map,
      stop.coords,
      Math.max(map.getZoom(), 16),
      0.9,
      sheetExpanded,
    );
  }, [map, focusedStop, selectedRoute, sheetExpanded]);

  useEffect(() => {
    let timer;

    const handleResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        map.invalidateSize({ pan: false });
        fitVisible();
      }, 220);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [map, fitVisible]);

  return null;
}

function StopMarker({
  route,
  stop,
  index,
  focused,
  onStopFocus,
}) {
  const markerRef = useRef(null);
  const isOrigin = index === 0;
  const isDestination = index === route.stops.length - 1;
  const type = isOrigin ? 'origin' : isDestination ? 'dest' : 'stop';
  const size = type === 'stop' ? 18 : 30;

  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'smart-div-icon',
        html: `<div class="smart-pin ${type} ${focused ? 'is-selected' : ''}" style="--pin-color:${route.color}">${
          type === 'stop'
            ? ''
            : `<i class="fa-solid ${isOrigin ? 'fa-bus' : 'fa-flag-checkered'}" aria-hidden="true"></i>`
        }</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2 + 5)],
      }),
    [focused, isOrigin, route.color, size, type],
  );

  useEffect(() => {
    if (!focused) return undefined;

    const timer = window.setTimeout(() => {
      markerRef.current?.openPopup();
    }, 460);

    return () => window.clearTimeout(timer);
  }, [focused]);

  return (
    <Marker
      ref={markerRef}
      position={stop.coords}
      icon={icon}
      riseOnHover
      zIndexOffset={isOrigin || isDestination ? 450 : 0}
      eventHandlers={{ click: () => onStopFocus(index) }}
    >
      <Tooltip
        direction="top"
        offset={[0, -13]}
        opacity={1}
        className="smart-tooltip"
      >
        {stop.name}
      </Tooltip>
      <Popup
        className="smart-popup"
        closeButton={false}
        offset={[0, -4]}
        autoPanPadding={[28, 28]}
      >
        <div
          className="stop-popup"
          style={{ '--route-color': route.color }}
        >
          <div className="popup-kicker">
            <span>
              Línea {route.line} · {route.name}
            </span>
            <span>{formatMinutes(stop.minutes)} min</span>
          </div>
          <h3>{stop.name}</h3>
          <p>
            {stop.sub} · Paradero {index + 1} de {route.stops.length}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}

function StreetLayer({ features }) {
  const map = useMap();

  useEffect(() => {
    if (!features?.length) return undefined;

    const renderer = L.canvas({ pane: 'streetsPane', padding: 0.5 });
    const layer = L.geoJSON(
      { type: 'FeatureCollection', features },
      {
        renderer,
        interactive: false,
        smoothFactor: 1.2,
        style: (feature) => {
          const highway = feature.properties?.highway;
          const major = [
            'motorway',
            'trunk',
            'primary',
            'secondary',
            'tertiary',
          ].includes(highway);

          return {
            color: major ? '#b9c7d3' : '#d4dee7',
            weight: major ? 2.2 : 1.25,
            opacity: major ? 0.82 : 0.7,
            lineCap: 'round',
            lineJoin: 'round',
          };
        },
      },
    ).addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [features, map]);

  return null;
}

function MapControls({
  satellite,
  onToggleLayer,
  locating,
  onLocateStateChange,
  sheetExpanded,
  onToast,
}) {
  const map = useMap();
  const controlsRef = useRef(null);

  useEffect(() => {
    const element = controlsRef.current;
    if (!element) return undefined;

    L.DomEvent.disableClickPropagation(element);
    L.DomEvent.disableScrollPropagation(element);

    return () => {
      L.DomEvent.off(element);
    };
  }, []);

  const [userLocation, setUserLocation] = useState(null);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      onToast('Tu navegador no tiene geolocalización disponible.', 'error');
      return;
    }

    onLocateStateChange(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocateStateChange(false);
        const coords = [position.coords.latitude, position.coords.longitude];

        setUserLocation({
          coords,
          accuracy: Math.max(position.coords.accuracy || 40, 25),
        });
        flyToVisiblePoint(
          map,
          coords,
          Math.max(map.getZoom(), 16),
          1,
          sheetExpanded,
        );
        onToast('Ubicación encontrada. Usa el mapa para orientarte.', 'success');
      },
      () => {
        onLocateStateChange(false);
        onToast(
          'No se pudo obtener tu ubicación. Revisa los permisos del navegador.',
          'error',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const userIcon = useMemo(
    () =>
      L.divIcon({
        className: 'smart-div-icon',
        html: '<div class="user-pin"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    [],
  );

  return (
    <>
      <div
        ref={controlsRef}
        className="map-controls"
        aria-label="Controles del mapa"
      >
        <div className="control-group">
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => map.zoomIn(1, { animate: true })}
            aria-label="Acercar mapa"
            title="Acercar"
            data-tip="Acercar"
          >
            <i className="fa-solid fa-plus" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={() => map.zoomOut(1, { animate: true })}
            aria-label="Alejar mapa"
            title="Alejar"
            data-tip="Alejar"
          >
            <i className="fa-solid fa-minus" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          className={`ctrl-btn ${locating ? 'is-loading' : ''}`}
          onClick={handleLocate}
          aria-label="Centrar en mi ubicación"
          aria-busy={locating}
          title="Mi ubicación"
          data-tip="Mi ubicación"
        >
          <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`ctrl-btn ${satellite ? 'is-active' : ''}`}
          onClick={onToggleLayer}
          aria-label={
            satellite ? 'Cambiar a capa estándar' : 'Cambiar a capa satélite'
          }
          aria-pressed={satellite}
          title={satellite ? 'Capa estándar' : 'Capa satélite'}
          data-tip={satellite ? 'Capa estándar' : 'Capa satélite'}
        >
          <i className="fa-solid fa-layer-group" aria-hidden="true" />
        </button>
      </div>

      {userLocation ? (
        <>
          <Circle
            center={userLocation.coords}
            radius={userLocation.accuracy}
            pathOptions={{
              color: '#2563eb',
              weight: 1,
              opacity: 0.35,
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
            }}
            interactive={false}
          />
          <Marker
            position={userLocation.coords}
            icon={userIcon}
            zIndexOffset={1200}
          >
            <Popup className="smart-popup" closeButton={false}>
              <div className="stop-popup" style={{ '--route-color': '#2563eb' }}>
                <div className="popup-kicker">
                  <span>Tu ubicación</span>
                </div>
                <h3>Estás aquí</h3>
                <p>Punto aproximado según el GPS del navegador.</p>
              </div>
            </Popup>
          </Marker>
        </>
      ) : null}
    </>
  );
}

function RouteLines({ selectedRoute, onFilterChange }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());

    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  const visibleRoutes = useMemo(
    () =>
      selectedRoute
        ? ROUTES.filter((route) => route.id === selectedRoute.id)
        : ROUTES,
    [selectedRoute],
  );

  const positionsByRoute = useMemo(() => {
    const positions = new Map();

    visibleRoutes.forEach((route) => {
      positions.set(
        route.id,
        selectedRoute
          ? route.path
          : offsetPathInPixels(
              route.path,
              ROUTE_LANE_SIGNS.get(route.id),
              map,
              zoom,
              ROUTE_LANE_OFFSET_PX,
            ),
      );
    });

    return positions;
  }, [map, selectedRoute, visibleRoutes, zoom]);

  return (
    <>
      {visibleRoutes.map((route) => {
        const isRoute02 = route.id === 'ruta-02';
        const casingWeight = isRoute02 ? 12 : 9;

        return (
          <Polyline
            key={`${route.id}-casing`}
            positions={positionsByRoute.get(route.id) ?? route.path}
            pane="routesPane"
            interactive={false}
            className="route-casing"
            pathOptions={{
              color: '#ffffff',
              weight: casingWeight,
              opacity: 0.94,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        );
      })}

      {visibleRoutes.map((route) => {
        const isRoute02 = route.id === 'ruta-02';
        const lineWeight = isRoute02 ? 6 : 5;

        return (
          <Polyline
            key={`${route.id}-line`}
            positions={positionsByRoute.get(route.id) ?? route.path}
            pane="routesPane"
            className="route-main active"
            pathOptions={{
              color: route.color,
              weight: lineWeight,
              opacity: 0.96,
              lineCap: 'round',
              lineJoin: 'round',
            }}
            eventHandlers={{
              click: () => onFilterChange(route.id),
            }}
          />
        );
      })}
    </>
  );
}

function MapView({
  selectedRoute,
  focusedStop,
  fitNonce,
  sheetExpanded,
  streetFeatures,
  onFilterChange,
  onStopFocus,
  onToast,
}) {
  const [satellite, setSatellite] = useState(false);
  const [locating, setLocating] = useState(false);

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={MAP_CENTER}
        zoom={14}
        minZoom={12}
        maxZoom={18}
        zoomSnap={0.5}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <Pane name="streetsPane" style={{ zIndex: 350 }} />
        <Pane name="routesPane" style={{ zIndex: 420 }} />

        {satellite ? (
          <TileLayer
            key="satellite"
            url={SATELLITE_TILE}
            maxZoom={18}
            maxNativeZoom={17}
            zIndex={1}
            errorTileUrl={FALLBACK_TILE}
          />
        ) : (
          <>
            <TileLayer
              key="base"
              url={STANDARD_TILE}
              maxZoom={18}
              maxNativeZoom={16}
              zIndex={1}
              errorTileUrl={FALLBACK_TILE}
            />
            <TileLayer
              key="labels"
              url={LABELS_TILE}
              maxZoom={18}
              maxNativeZoom={16}
              zIndex={2}
              errorTileUrl={FALLBACK_TILE}
            />
          </>
        )}

        <StreetLayer features={streetFeatures} />

        <RouteLines
          selectedRoute={selectedRoute}
          onFilterChange={onFilterChange}
        />

        {selectedRoute
          ? selectedRoute.stops.map((stop, index) => (
              <StopMarker
                key={`${selectedRoute.id}-${stop.name}`}
                route={selectedRoute}
                stop={stop}
                index={index}
                focused={focusedStop === index}
                onStopFocus={onStopFocus}
              />
            ))
          : null}

        <MapController
          selectedRoute={selectedRoute}
          focusedStop={focusedStop}
          fitNonce={fitNonce}
          sheetExpanded={sheetExpanded}
        />

        <MapControls
          satellite={satellite}
          onToggleLayer={() => setSatellite((value) => !value)}
          locating={locating}
          onLocateStateChange={setLocating}
          sheetExpanded={sheetExpanded}
          onToast={onToast}
        />
      </MapContainer>
    </div>
  );
}

export default MapView;
