import Button from './Button.jsx'

// Barra de paginación de las tablas de listado (Almacén/Recepción,
// Calidad/Inspección, Calidad/Remito) — mismo bloque repetido en las tres
// pantallas, centralizado acá. `flex-wrap` en ambos niveles: en mobile el
// texto "Mostrando X–Y de Z" pasa a su propia línea y los botones de
// página envuelven en vez de desbordar horizontalmente.
export default function Paginacion({ pagina, totalItems, tamanioPagina, cantidadMostrada, etiqueta = 'resultados', onCambiarPagina }) {
  const totalPaginas = Math.max(1, Math.ceil(totalItems / tamanioPagina))

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-marron-cafe/60">
      <span>
        Mostrando {cantidadMostrada === 0 ? 0 : pagina * tamanioPagina + 1}–{pagina * tamanioPagina + cantidadMostrada} de{' '}
        {totalItems} {etiqueta}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={pagina === 0} onClick={() => onCambiarPagina(pagina - 1)}>
          Anterior
        </Button>
        {Array.from({ length: totalPaginas }, (_, i) => i).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onCambiarPagina(p)}
            aria-current={p === pagina ? 'page' : undefined}
            className={`flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-150 ${
              p === pagina ? 'bg-verde-lima text-marron-cafe' : 'text-marron-cafe/60 hover:bg-marron-tierra/10'
            }`}
          >
            {p + 1}
          </button>
        ))}
        <Button
          variant="secondary"
          className="px-3 py-1.5 text-xs"
          disabled={(pagina + 1) * tamanioPagina >= totalItems}
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
