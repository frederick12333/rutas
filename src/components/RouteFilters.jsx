import { ROUTES } from '../data/mockRoutes';

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  ...ROUTES.map((route) => ({
    id: route.id,
    label: `Línea ${route.line}`,
    color: route.color,
  })),
];

function RouteFilters({ activeFilter, onFilterChange }) {
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-900/5 bg-[#edf3f1]/90 p-1"
      role="group"
      aria-label="Filtrar rutas"
    >
      {FILTERS.map((filter) => {
        const active = activeFilter === filter.id;

        return (
          <button
            key={filter.id}
            type="button"
            className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[10px] font-bold leading-none transition ${
              active
                ? 'bg-white shadow-[0_4px_12px_-7px_rgba(15,23,42,0.5)] ring-1 ring-brand/10'
                : 'text-slate-500 hover:bg-white/60 hover:text-ink'
            }`}
            style={active ? { color: filter.color ?? '#007a52' } : undefined}
            aria-pressed={active}
            onClick={() => onFilterChange(filter.id)}
          >
            {filter.color ? (
              <span
                className="h-1.5 w-1.5 flex-none rounded-full"
                style={{ backgroundColor: filter.color }}
                aria-hidden="true"
              />
            ) : (
              <i className="fa-solid fa-layer-group text-[10px]" aria-hidden="true" />
            )}
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

export default RouteFilters;
