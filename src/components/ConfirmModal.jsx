import { useEffect } from 'react'

// Modal de confirmación genérico — reemplaza a window.confirm en cualquier
// acción que valga la pena frenar un segundo (desactivar un usuario, sacar
// un rol, etc.). `abierto` null/false = no renderiza nada.
export default function ConfirmModal({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'peligro',
  onConfirmar,
  onCancelar,
}) {
  useEffect(() => {
    if (!abierto) return
    const alTeclado = (e) => {
      if (e.key === 'Escape') onCancelar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [abierto, onCancelar])

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-marron-cafe/50" onClick={onCancelar} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-titulo"
        className="rise-in relative w-full max-w-sm rounded-3xl bg-white p-6"
      >
        <h2 id="confirm-modal-titulo" className="text-lg font-extrabold text-marron-cafe">
          {titulo}
        </h2>
        <p className="mt-2 text-sm text-marron-cafe/70">{mensaje}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-full px-4 py-2 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:bg-marron-tierra/10"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            autoFocus
            className={`rounded-full px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ${
              variante === 'peligro'
                ? 'bg-rojo-pasankalla hover:bg-rojo-pasankalla/90'
                : 'bg-verde-lima text-marron-cafe hover:bg-verde-hoja'
            }`}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
