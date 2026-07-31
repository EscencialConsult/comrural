import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { servicioService } from '../services/servicioService'
import { ESTADO_LABEL, ESTADO_STYLE } from '../components/ModuloCard'
import { MODULO_ICON } from '../config/moduloIcons'

// Destino real de cada ítem del sidebar que todavía no tiene pantalla
// propia — reutiliza el estado real de modulos.json (relevado/parcial/
// pendiente) en vez de inventar una página en blanco. Cuando se
// construya el módulo real (Almacén primero, ya relevado), esta ruta se
// reemplaza por la pantalla de verdad. El sidebar y el header viven en
// DashboardLayout.jsx (ruta padre, ver App.jsx) — acá solo va el
// contenido propio de cada módulo.
export default function PanelModulo() {
  const { moduloId } = useParams()
  const [modulo, setModulo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    servicioService.getModulos().then((data) => {
      if (cancelado) return
      setModulo(data.find((m) => m.id === moduloId) ?? null)
      setLoading(false)
    })
    return () => {
      cancelado = true
    }
  }, [moduloId])

  const esConfiguracion = moduloId === 'configuracion'
  const Icon = modulo && MODULO_ICON[modulo.id]

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      {!loading && !modulo && !esConfiguracion ? (
        <p className="text-marron-cafe/60">Sección no encontrada.</p>
      ) : (
        <>
          <div className="rounded-full bg-verde-hoja/10 p-4">
            {Icon ? (
              <Icon className="size-8 text-verde-bosque" strokeWidth={1.5} />
            ) : (
              <span className="block size-8" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">
            {esConfiguracion ? 'Configuración' : (modulo?.nombre ?? '')}
          </h1>
          {modulo && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${ESTADO_STYLE[modulo.estado]}`}>
              {ESTADO_LABEL[modulo.estado]}
            </span>
          )}
          <p className="max-w-md text-marron-cafe/70">
            {esConfiguracion
              ? 'Ajustes de cuenta y preferencias — todavía en construcción.'
              : modulo?.descripcion}
          </p>
          <Link to="/panel" className="text-sm font-medium text-verde-bosque hover:text-verde-hoja">
            ← Volver al resumen
          </Link>
        </>
      )}
    </main>
  )
}
