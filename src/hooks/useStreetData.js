import { useEffect, useState } from 'react';

const BOUNDS = {
  west: -73.45,
  south: -13.72,
  east: -73.3,
  north: -13.58,
};

function filterAndahuaylasFeatures(payload) {
  if (!payload || !Array.isArray(payload.features)) return [];

  return payload.features.filter((feature) => {
    const geometry = feature.geometry;
    if (
      !geometry ||
      geometry.type !== 'LineString' ||
      !Array.isArray(geometry.coordinates)
    ) {
      return false;
    }

    return geometry.coordinates.some(
      ([lng, lat]) =>
        lng >= BOUNDS.west &&
        lng <= BOUNDS.east &&
        lat >= BOUNDS.south &&
        lat <= BOUNDS.north,
    );
  });
}

export function useStreetData() {
  const [state, setState] = useState({
    status: 'loading',
    text: 'Cargando calles…',
    features: [],
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 25000);

    async function loadStreets() {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}RUTASexport.geojson`,
          {
            signal: controller.signal,
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          throw new Error(`No se pudo cargar el GeoJSON (${response.status})`);
        }

        const payload = await response.json();
        const features = filterAndahuaylasFeatures(payload);

        if (!features.length) {
          throw new Error('El GeoJSON no contiene calles en Andahuaylas');
        }

        if (!cancelled) {
          setState({
            status: 'ok',
            text: `Calles OSM · ${features.length}`,
            features,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            status: 'error',
            text: 'Calles no disponibles',
            features: [],
          });
        }
      } finally {
        window.clearTimeout(timer);
      }
    }

    loadStreets();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return state;
}
