import { useEffect, useState } from 'react'
import { PackageMinus, Plus } from 'lucide-react'
import { warehouseDeliveriesService } from '../../services/warehouseDeliveriesService'
import { productsService } from '../../services/productsService'
import { listarTodo } from '../../services/paginacion'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'
import ModalSalidaEnvases from './ModalSalidaEnvases.jsx'

const TONO_ESTADO = {
  PENDIENTE_CONFIRMACION: 'alerta',
  CONFIRMADA: 'positivo',
}

// Subpestaña "Salida" de Envases y Embalaje (ver PanelAlmacenEnvases.jsx) —
// listado simple de notas P-ADM-03/R-20 ya registradas (GET
// /warehouse-deliveries, ver comrural_erp_backend/docs/
// warehouse-deliveries.md §3), sin paginación por cursor (catálogo chico).
// "Registrar salida" abre ModalSalidaEnvases.jsx, el formulario completo
// (§1 Requerimiento del área, mockup, + §2 Nota de entrega, real) — antes
// esta subpestaña ERA ese formulario directo, sin listado.
export default function SeccionSalidaEnvases() {
  const [entregas, setEntregas] = useState(null)
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const cargar = () => {
    setEntregas(null)
    Promise.all([warehouseDeliveriesService.listar(), listarTodo(productsService.listar)])
      .then(([data, productosResp]) => {
        setEntregas(data.filter((e) => e.documentType === 'R-20'))
        setProductos(productosResp)
      })
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(cargar, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-marron-cafe">Salidas de envases y embalaje</h2>
          <p className="text-xs text-marron-cafe/40">Notas de entrega de Almacén (P-ADM-03/R-20)</p>
        </div>
        <Button className="gap-1.5 px-3.5 py-2 text-sm" onClick={() => setModalAbierto(true)}>
          <Plus className="size-4" strokeWidth={2} />
          Registrar salida
        </Button>
      </div>

      {entregas === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : entregas.length === 0 ? (
        <EmptyState Icon={PackageMinus} titulo="Todavía no hay salidas registradas" />
      ) : (
        <div className="flex flex-col gap-3">
          {entregas.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-marron-tierra/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
                  <PackageMinus className="size-4.5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-bold text-marron-cafe">{productoNombre(e.productId)}</p>
                  <p className="text-xs text-marron-cafe/60">
                    {e.cantidad} {e.unidad}
                    {e.fechaEntrega ? ` · ${new Date(e.fechaEntrega).toLocaleDateString('es-BO')}` : ''}
                  </p>
                </div>
              </div>
              <Badge tono={TONO_ESTADO[e.estado] ?? 'neutro'}>{e.estado.replace(/_/g, ' ')}</Badge>
            </div>
          ))}
        </div>
      )}

      <ModalSalidaEnvases
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onCreada={cargar}
      />
    </div>
  )
}
