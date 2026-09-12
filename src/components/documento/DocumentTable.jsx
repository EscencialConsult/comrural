import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Badge from '../Badge.jsx'

export function DocumentSectionTitle({ title, prefix }) {
  return (
    <h2 className="mb-2.5 mt-6 rounded-r-md border-l-4 border-marron-cafe bg-marron-tierra/5 px-2.5 py-1.5 text-[12px] uppercase tracking-wide text-marron-cafe">
      {prefix && `${prefix}. `}<span className="capitalize">{title}</span>
    </h2>
  )
}

// El "papel" que envuelve esto (DocumentSheet) usa `overflow-hidden` para
// mantener las esquinas redondeadas — sin este `overflow-x-auto` propio,
// en pantallas angostas la columna de acciones (el tacho de borrar, al
// final de la fila) quedaba recortada por ese `overflow-hidden` sin
// ninguna forma de hacer scroll para llegar a ella. El `min-w` fuerza el
// scroll horizontal en vez de que las columnas se aplasten hasta
// desaparecer.
//
// Ese scroll no se nota a simple vista (no hay scrollbar visible en la
// mayoría de los navegadores mobile) — por eso el degradé + flecha en el
// borde: solo aparecen mientras de verdad hay contenido tapado de ese
// lado, y se apagan solos al llegar al final. No es decorativo, es la
// única pista de que "esto se desliza".
export function DocumentTable({ children }) {
  const scrollRef = useRef(null)
  const [scroll, setScroll] = useState({ desbordado: false, enInicio: true, enFin: true })

  const medir = () => {
    const el = scrollRef.current
    if (!el) return
    const desbordado = el.scrollWidth > el.clientWidth + 1
    const enInicio = el.scrollLeft <= 0
    const enFin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1
    setScroll((prev) =>
      prev.desbordado === desbordado && prev.enInicio === enInicio && prev.enFin === enFin
        ? prev
        : { desbordado, enInicio, enFin },
    )
  }

  // Sin lista de dependencias a propósito: se re-mide después de CADA
  // render (agregar/dar de baja un campo cambia cuántas filas hay, y con
  // eso el ancho real de la tabla) — `medir()` no genera un loop porque
  // `setScroll` devuelve la misma referencia `prev` cuando nada cambió.
  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  })

  return (
    <div className="relative">
      <div ref={scrollRef} onScroll={medir} className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse">
          <tbody>{children}</tbody>
        </table>
      </div>
      {scroll.desbordado && !scroll.enInicio && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center bg-gradient-to-r from-white via-white/85 to-transparent">
          <ChevronLeft className="size-4 shrink-0 text-marron-cafe/50" strokeWidth={2.5} />
        </div>
      )}
      {scroll.desbordado && !scroll.enFin && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-end bg-gradient-to-l from-white via-white/85 to-transparent">
          <ChevronRight className="size-4 shrink-0 text-marron-cafe/50" strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}

export function DocumentRow({ labelNode, code, required, unit, controlNode, actionsNode, isDeleted }) {
  return (
    <tr className="transition-colors duration-150 hover:bg-marron-tierra/[0.03]">
      <th className="w-1/2 border border-marron-tierra/20 bg-[#f7f6f0] px-3 py-2.5 text-left align-top text-[11px] font-bold uppercase text-marron-cafe">
        <div className="flex flex-col gap-1.5">
          {labelNode}
          <div className="flex flex-wrap items-center gap-1">
            <Badge tono={required ? 'negativo' : 'neutro'} className="normal-case">
              {required ? 'Obligatorio' : 'Opcional'}
            </Badge>
            {unit && (
              <Badge tono="neutro" className="normal-case">
                {unit}
              </Badge>
            )}
          </div>
        </div>
      </th>
      <td className="border border-marron-tierra/20 px-3 py-2 align-middle">
        {controlNode}
      </td>
      {actionsNode && (
        <td className="w-[56px] whitespace-nowrap border border-marron-tierra/20 bg-[#fafaf9] px-2 py-2 text-center align-middle print:hidden">
          {actionsNode}
        </td>
      )}
    </tr>
  )
}
