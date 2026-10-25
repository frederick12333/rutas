import { formatMinutes } from '../data/mockRoutes';

function Stepper({ route, activeStop, onStopClick, onFitRoute }) {
  return (
    <section
      className="sheet-collapsible stepper-section mt-4 pb-1"
      aria-label="Paraderos de la ruta seleccionada"
    >
      <div className="stepper-heading flex items-start justify-between gap-3 px-1 pb-1">
        <div>
          <span className="eyebrow">Paraderos</span>
          <h2 className="mt-1 text-[13px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
            Línea {route.line} · {route.name}
          </h2>
          <p className="mt-1 text-[9.5px] leading-tight text-slate-500">
            {formatMinutes(route.baseMinutes)} min · {route.distanceKm.toFixed(1)} km · Tráfico{' '}
            {route.traffic.toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onFitRoute}
          aria-label="Centrar recorrido en el mapa"
          title="Centrar recorrido"
        >
          <i className="fa-solid fa-expand" aria-hidden="true" />
        </button>
      </div>

      <div className="stepper" style={{ '--route-color': route.color }}>
        {route.stops.map((stop, index) => {
          const type =
            index === 0 ? 'origin' : index === route.stops.length - 1 ? 'dest' : 'mid';

          return (
            <button
              key={`${route.id}-${stop.name}`}
              type="button"
              className={`stop-row ${activeStop === index ? 'is-active' : ''}`}
              onClick={() => onStopClick(index)}
              aria-label={`Ir a ${stop.name}`}
            >
              <span className={`stop-dot ${type}`} aria-hidden="true" />
              <span className="stop-body">
                <span className="stop-name">{stop.name}</span>
                <span className="stop-sub">{stop.sub}</span>
              </span>
              <span className="stop-time">{formatMinutes(stop.minutes)} min</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default Stepper;
