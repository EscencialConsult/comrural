import { useEffect, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { packagingService } from '../../../services/packagingService'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import EmptyState from '../../EmptyState.jsx'
import Skeleton from '../../Skeleton.jsx'
import ModalRegistrarEnvasado from './ModalRegistrarEnvasado.jsx'
import ModalCompletarEnvasado from './ModalCompletarEnvasado.jsx'

// Subpestaña "Envasado" de Área B (ver SeccionAreaB.jsx) — listado simple
// de registros de envasado ya cargados (GET /packaging/entries, ver
// comrural_erp_backend/docs/packaging.md §3; catálogo chico sin paginación
// por cursor). "Registrar envasado" abre ModalRegistrarEnvasado.jsx, el
// formulario completo (I-PRO-16/R-01) — antes esta subpestaña ERA ese
// formulario directo, sin listado. Los que quedaron ABIERTOS (no
// alcanzó el material de Área B para cerrarlos al crearlos) muestran
// "Completar", que abre ModalCompletarEnvasado.jsx para vincular más
// material y cerrarlos — antes no existía ninguna forma de retomar uno
// abierto, la única opción era registrar uno nuevo desde cero.
export default function EnvasadoProductoTerminado() {
  const [envasados, setEnvasados] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [modalRegistrarAbierto, setModalRegistrarAbierto] = useState(false)
  const [envasadoACompletar, setEnvasadoACompletar] = useState(null)

  const cargar = () => {
    setEnvasados(null)
    packagingService
      .listar()
      .then(setEnvasados)
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
          <h2 className="text-lg font-bold text-marron-cafe">Envasado de Producto Terminado</h2>
          <p className="text-xs text-marron-cafe/40">Registros de envasado ya cargados (I-PRO-16/R-01)</p>
        </div>
        <Button className="gap-1.5 px-3.5 py-2 text-sm" onClick={() => setModalRegistrarAbierto(true)}>
          <Plus className="size-4" strokeWidth={2} />
          Registrar envasado
        </Button>
      </div>

      {envasados === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : envasados.length === 0 ? (
        <EmptyState Icon={Package} titulo="Todavía no hay envasados registrados" />
      ) : (
        <div className="flex flex-col gap-3">
          {envasados.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-marron-tierra/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
                  <Package className="size-4.5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-bold text-marron-cafe">{e.presentationLabel}</p>
                  <p className="text-xs text-marron-cafe/60">
                    {e.packageCount} unidades · {Number(e.packagedKg).toFixed(3)} kg
                    {e.packagingLotCodeSnapshot ? ` · Lote de envase ${e.packagingLotCodeSnapshot}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tono={e.closedAt ? 'positivo' : 'alerta'}>{e.closedAt ? 'Cerrado' : 'Abierto'}</Badge>
                {!e.closedAt && (
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setEnvasadoACompletar(e.id)}>
                    Completar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalRegistrarEnvasado
        abierto={modalRegistrarAbierto}
        onCerrar={() => setModalRegistrarAbierto(false)}
        onCreado={cargar}
      />

      <ModalCompletarEnvasado
        abierto={envasadoACompletar !== null}
        envasadoId={envasadoACompletar}
        onCerrar={() => setEnvasadoACompletar(null)}
        onActualizado={cargar}
      />
    </div>
  )
}
