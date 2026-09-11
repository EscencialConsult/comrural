import { useEffect, useState } from 'react'
import { Boxes, ClipboardList, Eye } from 'lucide-react'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import { suppliersService } from '../../services/suppliersService'
import { listarTodo } from '../../services/paginacion'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'
import Modal from '../Modal.jsx'
import FormularioExistencias from './formularios/FormularioExistencias.jsx'

const nombrePersona = (p) => `${p.firstNames} ${p.lastNames}`
const nombreOrganizacion = (o) => o.tradeName || o.legalName
const nombreProveedor = (s) => (s?.person ? nombrePersona(s.person) : s?.organization ? nombreOrganizacion(s.organization) : '—')

// Subpestaña "Control de Existencias" de Área B (ver SeccionAreaB.jsx) —
// Área B es hermana de "Área A" (config/gruposMaestros.js). Lista lotes en
// cualquier punto del rango donde tiene sentido trabajar el kardex de
// quinua lavada (docs/lot-traceability.md §4): LAVADO (lavando, ya hay
// ingresos que ver), LAVADO_COMPLETO (terminó de lavar, listo para que
// Área B arranque a consumir) y EN_AREA_B (Área B ya está consumiendo) —
// ver docs/lots.md §3/§8 y docs/production-area-b.md §1.
const ESTADOS_CONTROL_EXISTENCIAS = ['LAVADO', 'LAVADO_COMPLETO', 'EN_AREA_B']

export default function SeccionControlExistencias() {
  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [loteDetalle, setLoteDetalle] = useState(null)
  const [loteExistencias, setLoteExistencias] = useState(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([lotsService.listar({ limit: 100 }), listarTodo(productsService.listar), listarTodo(suppliersService.listar)])
      .then(([lotesResp, productos, proveedores]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM' && ESTADOS_CONTROL_EXISTENCIAS.includes(l.currentStatus)))
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

  if (loteExistencias) {
    return <FormularioExistencias lote={loteExistencias} onVolver={() => setLoteExistencias(null)} />
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Lotes en lavado</h2>
        <p className="text-xs text-marron-cafe/40">
          Materia prima que ya inició el lavado
        </p>
      </div>

      {lotes === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : lotes.length === 0 ? (
        <EmptyState Icon={Boxes} titulo="Todavía no hay lotes en lavado" />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Estado</th>
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
                    <Badge tono="ambar">{l.currentStatus.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => setLoteDetalle(l)}>
                        <Eye className="size-3.5" strokeWidth={2} />
                        Ver detalle
                      </Button>
                      <Button className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => setLoteExistencias(l)}>
                        <ClipboardList className="size-3.5" strokeWidth={2} />
                        Control de existencias
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
              <Badge tono="ambar">{loteDetalle.currentStatus.replace(/_/g, ' ')}</Badge>
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
            </dl>
          </div>
        )}
      </Modal>
    </section>
  )
}
