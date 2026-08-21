// Pastillas de navegación LOCAL (no rutas) — mismo lenguaje visual que
// GrupoTabs.jsx (Compras: Personas/Organizaciones/Proveedores/...), pero acá
// las pestañas cambian una vista dentro de la misma pantalla en vez de
// navegar a otra URL. Se usa, por ejemplo, en PanelCalidad.jsx para
// Pendientes/Muestras/Actividad. Reutilizable: cualquier pantalla que
// necesite sub-pestañas internas puede sumar esto en vez de reinventar el
// estilo de pastilla cada vez.
export default function PillTabs({ pestañas, activa, onCambiar }) {
  return (
    <nav
      aria-label="Secciones de esta pantalla"
      className="flex items-center gap-0.5 overflow-x-auto px-1 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {pestañas.map((pestaña) => {
        const esActiva = pestaña.id === activa
        return (
          <button
            key={pestaña.id}
            type="button"
            aria-current={esActiva ? 'page' : undefined}
            onClick={() => onCambiar(pestaña.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out ${
              esActiva
                ? 'bg-verde-lima text-marron-cafe shadow-sm scale-[1.03]'
                : 'text-marron-cafe/50 hover:-translate-y-0.5 hover:bg-marron-tierra/5 hover:text-marron-cafe/80'
            }`}
          >
            {pestaña.Icon && <pestaña.Icon className="size-3.5 shrink-0" strokeWidth={2.25} />}
            {pestaña.nombre}
          </button>
        )
      })}
    </nav>
  )
}
