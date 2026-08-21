import { useEffect, useState } from 'react'
import { Check, CircleHelp } from 'lucide-react'
import Button from '../Button.jsx'

// Un solo aviso de "falta un dato maestro en el sistema", arriba a la
// derecha, en vez de un link colgado abajo de cada campo.
//
// Con uno por campo, el mismo texto se repetía tres veces en la sección 1 y
// competía visualmente con los propios campos — y además solo cubría los
// tres que tenían selector: si faltaba cualquier otra cosa, no había dónde
// avisarlo. Acá el punto de entrada es único y estable (siempre en el mismo
// lugar de la pantalla, se busque lo que se busque), y el QUÉ falta se elige
// adentro. Eso también deja lugar para el caso "otro", que antes no existía.
const TIPOS = [
  { id: 'producto', etiqueta: 'Producto' },
  { id: 'proveedor', etiqueta: 'Proveedor' },
  { id: 'lote', etiqueta: 'Lote' },
  { id: 'otro', etiqueta: 'Otro' },
]

export default function AvisoFaltante({ onEnviar }) {
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState(TIPOS[0].id)
  const [detalle, setDetalle] = useState('')
  const [estado, setEstado] = useState(null) // null | 'enviando' | 'enviado'

  useEffect(() => {
    if (!abierto) return
    const alTeclado = (e) => e.key === 'Escape' && setAbierto(false)
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [abierto])

  // "Otro" no dice nada por sí solo: si el área que recibe el aviso no sabe
  // qué se necesita, el pedido no se puede resolver. Por eso ahí el detalle
  // pasa a ser obligatorio, y en el resto queda opcional.
  const puedeEnviar = tipo !== 'otro' || detalle.trim() !== ''

  const enviar = async () => {
    if (!puedeEnviar) return
    setEstado('enviando')
    try {
      await onEnviar({ tipo, detalle: detalle.trim() })
      setEstado('enviado')
      setTimeout(() => {
        setAbierto(false)
        setEstado(null)
        setDetalle('')
      }, 1400)
    } catch {
      setEstado(null)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-2 text-xs font-semibold text-marron-cafe transition-colors duration-150 hover:bg-white"
      >
        <CircleHelp className="size-3.5 shrink-0" strokeWidth={2} />
        ¿Falta un dato en el sistema?
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-marron-cafe/50" onClick={() => setAbierto(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aviso-faltante-titulo"
            className="rise-in relative flex w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6"
          >
            <div>
              <h2 id="aviso-faltante-titulo" className="text-lg font-extrabold text-marron-cafe">
                Avisar al responsable
              </h2>
              <p className="mt-1 text-sm text-marron-cafe/70">
                Elegí qué no encontraste y se le avisa al área que carga ese dato.
              </p>
            </div>

            {estado === 'enviado' ? (
              <p className="flex items-center gap-2 rounded-2xl bg-verde-hoja/12 px-4 py-3 text-sm font-semibold text-verde-bosque">
                <Check className="size-4 shrink-0" strokeWidth={2.5} />
                Aviso enviado al área responsable.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={tipo === t.id}
                      onClick={() => setTipo(t.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                        tipo === t.id
                          ? 'bg-verde-lima text-marron-cafe'
                          : 'bg-marron-tierra/10 text-marron-cafe/70 hover:bg-marron-tierra/20'
                      }`}
                    >
                      {t.etiqueta}
                    </button>
                  ))}
                </div>

                <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
                  <span className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/70">
                    ¿Cuál falta? {tipo === 'otro' ? '(obligatorio)' : '(opcional)'}
                  </span>
                  <input
                    type="text"
                    value={detalle}
                    autoFocus
                    placeholder={tipo === 'otro' ? 'Describí qué falta…' : 'Nombre o código, si lo sabés'}
                    onChange={(e) => setDetalle(e.target.value)}
                    className="rounded-xl border border-marron-tierra/25 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima"
                  />
                </label>

                <div className="flex justify-end gap-2">
                  <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => setAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="px-4 py-2 text-sm"
                    disabled={estado === 'enviando' || !puedeEnviar}
                    onClick={enviar}
                  >
                    {estado === 'enviando' ? 'Avisando…' : 'Avisar'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
