import { X } from 'lucide-react'
import SearchInput from '../SearchInput.jsx'
import Button from '../Button.jsx'

// Rediseño de la barra de filtros que antes tenía Recepción de MP (una
// grilla plana de 6 columnas donde la búsqueda se veía igual de "pesada"
// que cualquier select) — ahora aplicado a todas las listas de Almacén
// que lo necesiten. Jerarquía en dos filas: la búsqueda va sola arriba,
// ancha, con "Limpiar filtros" al lado (la acción que más se usa, a mano);
// los demás filtros (selects/fecha) van como una fila propia debajo, en
// flex-wrap en vez de encajarlos en columnas fijas — con 2 o con 5 filtros
// se ve bien igual, no hay que ajustar el grid cada vez que un formulario
// suma o saca uno.
export default function BarraFiltros({
  busqueda,
  onBusquedaChange,
  placeholderBusqueda = 'Buscar…',
  hayFiltrosActivos,
  onLimpiar,
  children,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SearchInput label="Buscar" placeholder={placeholderBusqueda} value={busqueda} onChange={onBusquedaChange} />
        </div>
        <Button
          variant="secondary"
          className="justify-center gap-1.5 px-3.5 py-2 text-sm"
          disabled={!hayFiltrosActivos}
          onClick={onLimpiar}
        >
          <X className="size-3.5" strokeWidth={2} />
          Limpiar filtros
        </Button>
      </div>
      {children && <div className="flex flex-wrap gap-3 border-t border-marron-tierra/10 pt-3">{children}</div>}
    </div>
  )
}
