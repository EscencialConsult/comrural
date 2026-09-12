import { useEffect, useState } from 'react'
import { PackageCheck, PlayCircle, Eye } from 'lucide-react'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import { suppliersService } from '../../services/suppliersService'
import { rawMaterialReceptionsService } from '../../services/rawMaterialReceptionsService'
import { productionAreaAService } from '../../services/productionAreaAService'
import { listarTodo } from '../../services/paginacion'
import Button from '../Button.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'
import Modal from '../Modal.jsx'

const nombrePersona = (p) => `${p.firstNames} ${p.lastNames}`
const nombreOrganizacion = (o) => o.tradeName || o.legalName
const nombreProveedor = (s) => (s?.person ? nombrePersona(s.person) : s?.organization ? nombreOrganizacion(s.organization) : '—')

const formatearFechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// Pestaña "Lotes" de Producción — servicio real (production-area-a, ver
// comrural_erp_backend/docs/production-area-a.md §3).
//
// Filtra por `LIBERADO`/`LAVADO` a pedido explícito (contradice el orden
// real del pipeline documentado en comrural_erp_backend/docs/lots.md §3,
// donde LAVADO ocurre ANTES de EN_ANALISIS/LIBERADO, no después — se avisó
// de esto y se decidió mantener igual). `LAVADO` entra acá también porque
// un lote que ya inició el lavado (primera entrada de Volumen A, ver
// LotsService.startWashing) pero todavía no llegó al 100% de bolsas
// (LAVADO_COMPLETO) tiene que poder seguir recibiendo entradas — si solo
// mostrara LIBERADO, "Iniciar producción" desaparecería apenas se carga la
// primera entrada y no se podría completar el lote. El backend no impone
// ninguna precondición de `currentStatus` para crear una entrada de Área A
// (ProductionAreaAEntriesService.create solo valida `nature === 'PM'` y el
// tope de bolsas) — así que este es un cambio puramente de filtro en el
// frontend, no requirió tocar el backend.
const ESTADOS_LOTES_PRODUCCION = ['LIBERADO', 'LAVADO']
//
// "Iniciar producción" no abre nada acá adentro: dispara `onIniciarProduccion`
// (implementado en PanelProduccion.jsx) para cambiar a la pestaña "Volumen A"
// con el lote precargado — Lotes es solo el punto de entrada, el flujo en sí
// vive en el área. "Ver detalle" es un paso previo opcional (pedido
// explícito): antes de arrancar, Producción puede confirmar de qué lote se
// trata (proveedor, fecha de llegada) sin comprometerse a nada — production-
// area-a todavía no tiene ninguna entrada para este lote en este punto, así
// que no hay más "detalle" que el que ya trae `lots` en sí.
export default function SeccionLotesProduccion({ onIniciarProduccion }) {
  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [loteDetalle, setLoteDetalle] = useState(null)
  // Bolsas usadas/total del lote en detalle — solo se pide al abrir "Ver
  // detalle" de UN lote (2 requests puntuales, no una por fila de la tabla)
  // para no encarecer el listado completo. `null` mientras carga,
  // `undefined` si no hay recepción de almacén con storedPackageCount
  // todavía (nada que mostrar).
  const [bolsasDetalle, setBolsasDetalle] = useState(null)

  useEffect(() => {
    if (!loteDetalle) {
      setBolsasDetalle(null)
      return
    }
    let cancelado = false
    Promise.all([
      rawMaterialReceptionsService.obtener(loteDetalle.id),
      productionAreaAService.listarPorLote(loteDetalle.id),
    ])
      .then(([datosLote, entradas]) => {
        if (cancelado) return
        const total = datosLote?.warehouseReceipt?.storedPackageCount ?? null
        if (total == null) {
          setBolsasDetalle(undefined)
          return
        }
        const usadas = entradas.reduce((acc, e) => acc + e.usedBags, 0)
        setBolsasDetalle({ usadas, total })
      })
      .catch(() => !cancelado && setBolsasDetalle(undefined))
    return () => {
      cancelado = true
    }
  }, [loteDetalle])

  useEffect(() => {
    let cancelado = false
    Promise.all([lotsService.listar({ limit: 100 }), listarTodo(productsService.listar), listarTodo(suppliersService.listar)])
      .then(([lotesResp, productos, proveedores]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM' && ESTADOS_LOTES_PRODUCCION.includes(l.currentStatus)))
        setProductos(productos)
        setProveedores(proveedores)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => nombreProveedor(proveedores?.find((p) => p.id === id))

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Lotes asignados</h2>
        <p className="text-xs text-marron-cafe/40">
          Materia prima liberada o en lavado (LIBERADO/LAVADO) — lista para arrancar o continuar el lavado de Área A.
        </p>
      </div>

      {lotes === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : lotes.length === 0 ? (
        <EmptyState Icon={PackageCheck} titulo="Todavía no hay lotes listos para lavar" />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                  </td>
                  <td className="px-4 py-3 text-marron-cafe">{productoNombre(l.productId)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => setLoteDetalle(l)}>
                        <Eye className="size-3.5" strokeWidth={2} />
                        Ver detalle
                      </Button>
                      <Button className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => onIniciarProduccion(l.id)}>
                        <PlayCircle className="size-3.5" strokeWidth={2} />
                        {l.currentStatus === 'LAVADO' ? 'Continuar producción' : 'Iniciar producción'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal abierto={loteDetalle !== null} titulo="Detalle del lote" onCerrar={() => setLoteDetalle(null)}>
        {loteDetalle && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-marron-tierra/10 px-3 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                {loteDetalle.code}
              </span>
              <span className="rounded-full bg-verde-hoja/15 px-3 py-1 text-xs font-semibold text-verde-bosque">
                {loteDetalle.currentStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Producto</dt>
                <dd className="text-sm text-marron-cafe">{productoNombre(loteDetalle.productId)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Proveedor</dt>
                <dd className="text-sm text-marron-cafe">{proveedorNombre(loteDetalle.supplierId)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Llegada programada</dt>
                <dd className="text-sm text-marron-cafe">{formatearFechaHora(loteDetalle.scheduledReceptionAt)}</dd>
              </div>
              {bolsasDetalle === null ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Bolsas</dt>
                  <dd className="text-sm text-marron-cafe/40">Cargando…</dd>
                </div>
              ) : bolsasDetalle && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Bolsas</dt>
                  <dd className="text-sm text-marron-cafe">
                    {bolsasDetalle.usadas} / {bolsasDetalle.total}
                    {bolsasDetalle.total > 0 && ` (${Math.round((bolsasDetalle.usadas / bolsasDetalle.total) * 100)}%)`}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex justify-end border-t border-marron-tierra/10 pt-4">
              <Button
                className="gap-1.5 px-4 py-2 text-sm"
                onClick={() => {
                  onIniciarProduccion(loteDetalle.id)
                  setLoteDetalle(null)
                }}
              >
                <PlayCircle className="size-3.5" strokeWidth={2} />
                {loteDetalle.currentStatus === 'LAVADO' ? 'Continuar producción' : 'Iniciar producción'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
