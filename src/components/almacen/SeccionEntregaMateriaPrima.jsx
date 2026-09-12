import { useEffect, useState } from 'react'
import { Truck, Plus } from 'lucide-react'
import { warehouseDeliveriesService } from '../../services/warehouseDeliveriesService'
import { lotsService } from '../../services/lotsService'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'
import ModalEntregaMateriaPrima from './ModalEntregaMateriaPrima.jsx'

const TONO_ESTADO = {
  PENDIENTE_CONFIRMACION: 'alerta',
  CONFIRMADA: 'positivo',
}

// Subpestaña "Entrega" de Recepción y Entrega de MP (ver
// PanelAlmacenRecepcion.jsx) — listado simple de notas P-ADM-03/R-24 ya
// registradas (GET /warehouse-deliveries, ver comrural_erp_backend/docs/
// warehouse-deliveries.md §3), sin paginación por cursor (catálogo chico).
// "Registrar salida" abre ModalEntregaMateriaPrima.jsx, el formulario
// completo de la R-24 — antes esta subpestaña ERA ese formulario directo,
// sin listado; ahora el formulario es el modal y acá solo se ve el
// historial.
export default function SeccionEntregaMateriaPrima() {
  const [entregas, setEntregas] = useState(null)
  const [lotesPorId, setLotesPorId] = useState({})
  const [errorCarga, setErrorCarga] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const cargar = () => {
    setEntregas(null)
    warehouseDeliveriesService
      .listar()
      .then(async (data) => {
        const r24 = data.filter((e) => e.documentType === 'R-24')
        setEntregas(r24)
        const lotIds = [...new Set(r24.map((e) => e.lotId).filter(Boolean))]
        const lotes = await Promise.all(lotIds.map((id) => lotsService.obtener(id).catch(() => null)))
        setLotesPorId(Object.fromEntries(lotIds.map((id, i) => [id, lotes[i]])))
      })
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(cargar, [])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-marron-cafe">Entregas de materia prima</h2>
          <p className="text-xs text-marron-cafe/40">Notas de entrega a Producción (P-ADM-03/R-24)</p>
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
        <EmptyState Icon={Truck} titulo="Todavía no hay salidas registradas" />
      ) : (
        <div className="flex flex-col gap-3">
          {entregas.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-marron-tierra/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
                  <Truck className="size-4.5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-bold text-marron-cafe">{lotesPorId[e.lotId]?.code ?? '…'}</p>
                  <p className="text-xs text-marron-cafe/60">
                    {e.sacos} sacos · {e.kg} kg
                    {e.fechaEntrega ? ` · ${new Date(e.fechaEntrega).toLocaleDateString('es-BO')}` : ''}
                  </p>
                </div>
              </div>
              <Badge tono={TONO_ESTADO[e.estado] ?? 'neutro'}>{e.estado.replace(/_/g, ' ')}</Badge>
            </div>
          ))}
        </div>
      )}

      <ModalEntregaMateriaPrima
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onCreada={cargar}
      />
    </div>
  )
}
