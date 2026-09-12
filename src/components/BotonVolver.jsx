import { ArrowLeft } from 'lucide-react'

// Botón circular "volver" — mismo círculo con flecha que se repetía suelto
// en las vistas de Laboratorio que cambian de pantalla en vez de navegar
// por ruta (FormularioIniciarAnalisis.jsx y las que abre por categoría).
export default function BotonVolver({ onClick, ariaLabel = 'Volver' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex size-9 shrink-0 items-center justify-center rounded-full border border-marron-tierra/20 text-marron-cafe transition-colors duration-150 hover:bg-marron-tierra/5"
      aria-label={ariaLabel}
    >
      <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" strokeWidth={1.75} />
    </button>
  )
}
