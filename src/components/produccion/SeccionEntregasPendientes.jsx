import { useEffect, useState } from 'react'
import { PackageCheck, Truck } from 'lucide-react'
import { warehouseDeliveriesService } from '../../services/warehouseDeliveriesService'
import { lotsService } from '../../services/lotsService'
import { useSolicitud } from '../../hooks/useSolicitud'
import { toast } from '../../lib/toast'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'

// Confirmación de recepción física de una entrega de Almacén
// (P-ADM-03/R-24, ver almacen/SeccionEntregaMateriaPrima.jsx) — real, POST
// /warehouse-deliveries/:id/confirm (ver comrural_erp_backend/docs/
// warehouse-deliveries.md §3). Lista solo PENDIENTE_CONFIRMACION; una vez
// confirmada desaparece de acá. Sin gate todavía sobre Volumen A: confirmar
// (o no) una entrega hoy no bloquea ni habilita nada más — ver
// docs/warehouse-deliveries.md §1.
export default function SeccionEntregasPendientes() {
  const [entregas, setEntregas] = useState(null)
  const [lotesPorId, setLotesPorId] = useState({})
  const [errorCarga, setErrorCarga] = useState(null)
  const [confirmandoId, setConfirmandoId] = useState(null)
  const { ejecutar } = useSolicitud()

  const cargar = () => {
    setEntregas(null)
    warehouseDeliveriesService
      .listar({ estado: 'PENDIENTE_CONFIRMACION' })
      .then(async (data) => {
        setEntregas(data)
        const lotIds = [...new Set(data.map((e) => e.lotId).filter(Boolean))]
        const lotes = await Promise.all(lotIds.map((id) => lotsService.obtener(id).catch(() => null)))
        setLotesPorId(Object.fromEntries(lotIds.map((id, i) => [id, lotes[i]])))
      })
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(cargar, [])

  const confirmar = async (id) => {
    setConfirmandoId(id)
    try {
      await ejecutar(() => warehouseDeliveriesService.confirmar(id))
      toast.success('Recepción confirmada.')
      cargar()
    } catch (err) {
      toast.error(err.message ?? 'No se pudo confirmar.')
    } finally {
      setConfirmandoId(null)
    }
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Entregas por confirmar</h2>
        <p className="text-xs text-marron-cafe/40">Notas de entrega de Almacén (R-24/R-20) pendientes de recepción física</p>
      </div>

      {entregas === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : entregas.length === 0 ? (
        <EmptyState Icon={PackageCheck} titulo="No hay entregas pendientes de confirmar" />
      ) : (
        <div className="flex flex-col gap-3">
          {entregas.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-marron-tierra/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
                  <Truck className="size-4.5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-bold text-marron-cafe">
                    {e.documentType} — {e.lotId ? (lotesPorId[e.lotId]?.code ?? '…') : 'sin lote'}
                  </p>
                  <p className="text-xs text-marron-cafe/60">
                    {e.documentType === 'R-24' ? `${e.sacos} sacos · ${e.kg} kg` : `${e.cantidad} ${e.unidad}`}
                  </p>
                </div>
                <Badge tono="alerta">Pendiente</Badge>
              </div>
              <Button className="px-4 py-2 text-xs" disabled={confirmandoId === e.id} onClick={() => confirmar(e.id)}>
                {confirmandoId === e.id ? 'Confirmando…' : 'Confirmar recepción'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
