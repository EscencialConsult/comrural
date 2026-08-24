import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import { toastStore } from '../lib/toast'

// Fondo SÓLIDO (no traslúcido como Badge.jsx) a propósito — un toast flota
// sobre contenido arbitrario de la pantalla de atrás, así que un tinte al
// 10-15% de opacidad se leía transparente y sin contraste según qué hubiera
// debajo. Mismo par sólido "color fuerte + texto crema-quinua" que ya usa
// el proyecto para insignias de estado (ver IndicadorEtapas/PanelCalidadRecepcion:
// bg-verde-bosque/bg-rojo-pasankalla con texto crema-quinua).
const ESTILO = {
  positivo: { icono: CheckCircle2, clase: 'bg-verde-bosque text-crema-quinua' },
  negativo: { icono: CircleAlert, clase: 'bg-rojo-pasankalla text-crema-quinua' },
  neutro: { icono: Info, clase: 'bg-marron-cafe text-crema-quinua' },
}

// Contenedor global de toasts — se monta UNA vez en DashboardLayout.jsx.
// Reemplaza el patrón repetido "estado `confirmacion` + setTimeout(4000) +
// banner propio" que tenían Proveedores/Personas/Organizaciones/Productos/
// Lotes/Formularios (los 6 consumidores de useCatalogoMaestro.js) — ahora
// ese hook llama a `toast.success(...)` y esto lo pinta, en vez de que cada
// pantalla dibuje su propio `<p>` inline.
//
// Se suscribe al store con useEffect+useState (no useSyncExternalStore) por
// consistencia con el resto del proyecto, que no usa esa API en ningún
// lado — el store solo cambia por interacción del usuario, no hay riesgo
// real de tearing que justifique la API más nueva acá.
export default function Toaster() {
  const [toasts, setToasts] = useState([])

  useEffect(() => toastStore.suscribir(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => {
        const { icono: Icono, clase } = ESTILO[t.tipo] ?? ESTILO.neutro
        return (
          <div
            key={t.id}
            role="status"
            className={`rise-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${clase}`}
          >
            <Icono className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
            <p className="min-w-0 flex-1">{t.mensaje}</p>
            <button
              type="button"
              onClick={() => toastStore.quitar(t.id)}
              aria-label="Cerrar aviso"
              className="shrink-0 rounded-full p-0.5 opacity-60 transition-opacity duration-150 hover:opacity-100"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
