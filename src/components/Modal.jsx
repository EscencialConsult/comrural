import { useEffect } from 'react'
import { X } from 'lucide-react'

// Modal genérico de contenido libre — hermano de ConfirmModal.jsx, que es
// específico para confirmar/cancelar. Este es para formularios u otro
// contenido arbitrario dentro de un diálogo (ej. crear una muestra, pedir un
// análisis). `abierto` false/null = no renderiza nada. El contenido scrollea
// si no entra (max-h + overflow-y-auto) — formularios largos no deberían
// romper el layout de la página de atrás.
export default function Modal({ abierto, titulo, onCerrar, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return
    const alTeclado = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-marron-cafe/50" onClick={onCerrar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={`rise-in relative flex max-h-[90vh] w-full ${maxWidth} flex-col rounded-3xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-marron-tierra/10 px-6 py-4">
          <h2 id="modal-titulo" className="text-lg font-extrabold text-marron-cafe">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1.5 text-marron-cafe/50 transition-colors duration-150 hover:bg-marron-tierra/10 hover:text-marron-cafe"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
