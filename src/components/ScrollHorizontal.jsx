import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Contenedor con scroll horizontal "que se note pero no sea feo" — mismo
// mecanismo que ya usaba DocumentTable.jsx (components/documento/) para su
// tabla, generalizado acá para envolver cualquier contenido (una tabla, una
// fila de pastillas, un stepper...). Un degradé + flecha en cada borde
// aparecen SOLO mientras de verdad hay contenido tapado de ese lado, y se
// apagan solos al llegar al final — no son decorativos, son la única pista
// de "esto se desliza" en mobile, donde la mayoría de los navegadores no
// muestra ninguna scrollbar visible. En desktop, además, la scrollbar
// nativa se reemplaza por una delgada y del color de la paleta en vez de
// ocultarla del todo (ocultarla por completo deja el scroll sin ningún
// indicio para quien sí usa mouse/trackpad).
export default function ScrollHorizontal({ children, className = '' }) {
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

  // Sin lista de dependencias a propósito, igual que DocumentTable.jsx: el
  // contenido puede cambiar de ancho entre renders (ej. otra pestaña con
  // más/menos texto) sin que cambie ninguna prop — `medir()` no genera un
  // loop porque `setScroll` devuelve la misma referencia `prev` cuando nada
  // cambió.
  useEffect(() => {
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  })

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={medir}
        className={`overflow-x-auto [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-marron-tierra/20 [&::-webkit-scrollbar-track]:bg-transparent ${className}`}
      >
        {children}
      </div>
      {scroll.desbordado && !scroll.enInicio && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center bg-gradient-to-r from-white via-white/85 to-transparent">
          <ChevronLeft className="size-4 shrink-0 text-marron-cafe/50" strokeWidth={2.5} />
        </div>
      )}
      {scroll.desbordado && !scroll.enFin && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-end bg-gradient-to-l from-white via-white/85 to-transparent">
          <ChevronRight className="size-4 shrink-0 text-marron-cafe/50" strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
}
