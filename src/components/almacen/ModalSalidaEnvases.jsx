import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { areasService } from '../../services/areasService'
import { warehouseDeliveriesService } from '../../services/warehouseDeliveriesService'
import { iamService } from '../../services/iamService'
import { listarTodo } from '../../services/paginacion'
import { useSolicitud } from '../../hooks/useSolicitud'
import { toast } from '../../lib/toast'
import Modal from '../Modal.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'

let siguienteIdReq = 1
const filaRequerimientoVacia = () => ({ id: siguienteIdReq++, productoId: '', item: '', unidadMedida: '', cantidad: '' })

let siguienteIdEnt = 1
const filaEntregaVacia = () => ({ id: siguienteIdEnt++, productoId: '', item: '', loteAlmacen: '', unidadMedida: '', cantidad: '' })

const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Modal "Registrar salida" — es el formulario completo de "Salida de
// Envases y Embalaje" (antes pantalla propia de la subpestaña "Salida", ver
// SeccionSalidaEnvases.jsx, que ahora es el listado). Sección 5.2 del
// relevamiento: "se maneja un formulario con dos pestañas — solicitante e
// ítems", resuelto acá como dos secciones numeradas en vez de pestañas
// reales porque en la práctica son dos documentos correlativos
// (P-15 → P-04 de la narrativa).
//
// §1 "Requerimiento del área" (P-ADM-03/R-27) sigue siendo MOCKUP puro — no
// hay tabla propuesta para eso en el diseño. §2 "Nota de entrega" (P-ADM-03/
// R-20) es real: cada ítem es un POST /warehouse-deliveries
// (documentType='R-20'), ver comrural_erp_backend/docs/warehouse-deliveries.md.
// `solicitanteId` sale de un selector real de TODOS los usuarios
// (GET /iam/users, sin filtro de rol — a diferencia de R-24 en
// ModalEntregaMateriaPrima.jsx, acá cualquier área puede pedir envases/
// insumos, no solo Producción) — antes era un uuid tipeado a mano.
export default function ModalSalidaEnvases({ abierto, onCerrar, onCreada }) {
  const [productos, setProductos] = useState(null)
  const [areas, setAreas] = useState(null)
  const [solicitantes, setSolicitantes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const { enviando, ejecutar } = useSolicitud()

  const [solicitanteId, setSolicitanteId] = useState('')
  const [destinoAreaId, setDestinoAreaId] = useState('')
  const [numeroRequerimiento, setNumeroRequerimiento] = useState('')
  const [fechaRequerimiento, setFechaRequerimiento] = useState('')
  const [ordenProduccion, setOrdenProduccion] = useState('')
  const [filasRequerimiento, setFilasRequerimiento] = useState(() => [filaRequerimientoVacia()])

  const [fechaEntrega, setFechaEntrega] = useState('')
  const [numeroNotaEntrega, setNumeroNotaEntrega] = useState('')
  const [filasEntrega, setFilasEntrega] = useState(() => [filaEntregaVacia()])
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => {
    if (!abierto) return
    setSolicitanteId('')
    setNumeroRequerimiento('')
    setFechaRequerimiento('')
    setOrdenProduccion('')
    setFilasRequerimiento([filaRequerimientoVacia()])
    setFechaEntrega('')
    setNumeroNotaEntrega('')
    setFilasEntrega([filaEntregaVacia()])
    setObservaciones('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    Promise.all([listarTodo(productsService.listar), areasService.listar(), iamService.listarUsuarios()])
      .then(([productosResp, areasResp, solicitantesResp]) => {
        if (cancelado) return
        setProductos(productosResp)
        setAreas(areasResp.data)
        setSolicitantes(solicitantesResp)
        setDestinoAreaId((prev) => prev || areasResp.data[0]?.id || '')
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [abierto])

  const actualizarFilaRequerimiento = (id, campo) => (valor) =>
    setFilasRequerimiento((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFilaRequerimiento = () => setFilasRequerimiento((prev) => [...prev, filaRequerimientoVacia()])
  const quitarFilaRequerimiento = (id) =>
    setFilasRequerimiento((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const actualizarFilaEntrega = (id, campo) => (valor) =>
    setFilasEntrega((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFilaEntrega = () => setFilasEntrega((prev) => [...prev, filaEntregaVacia()])
  const quitarFilaEntrega = (id) => setFilasEntrega((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const totalRequerimiento = filasRequerimiento.reduce((acc, f) => acc + (Number(f.cantidad) || 0), 0)

  const filaEntregaValida = (f) => f.productoId !== '' && Number(f.cantidad) > 0 && f.unidadMedida.trim() !== ''
  const puedeGuardar =
    solicitanteId.trim() !== '' && destinoAreaId !== '' && fechaEntrega !== '' && filasEntrega.some(filaEntregaValida)

  const cerrar = () => onCerrar()

  const guardar = async () => {
    if (!puedeGuardar) return
    const validas = filasEntrega.filter(filaEntregaValida)
    let creadas = 0
    try {
      await ejecutar(async () => {
        for (const f of validas) {
          await warehouseDeliveriesService.crear({
            documentType: 'R-20',
            productId: f.productoId,
            solicitanteId: solicitanteId.trim(),
            destinoAreaId,
            opId: ordenProduccion.trim() || undefined,
            cantidad: Number(f.cantidad),
            unidad: f.unidadMedida.trim(),
            fechaEntrega: new Date(fechaEntrega).toISOString(),
            observaciones: observaciones.trim() || undefined,
          })
          creadas += 1
        }
      })
      toast.success(creadas === 1 ? 'Salida registrada.' : `${creadas} ítems registrados en la nota de entrega.`)
      onCreada()
      cerrar()
    } catch (err) {
      toast.error(creadas > 0 ? `Se guardaron ${creadas} de ${validas.length} ítems — ${err.message}` : (err.message ?? 'No se pudo guardar.'))
    }
  }

  return (
    <Modal abierto={abierto} titulo="Registrar salida — Envases y Embalaje" onCerrar={cerrar} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6">
        {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

        <SeccionFormulario numero={1} titulo="Requerimiento del área" nota="Mockup — sin tabla propia en el backend, solo P-ADM-03/R-20 (§2) es real.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FormSelect label="Solicitante" value={solicitanteId} onChange={(e) => setSolicitanteId(e.target.value)}>
              <option value="">{solicitantes ? 'Seleccionar…' : 'Cargando…'}</option>
              {solicitantes?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </FormSelect>
            {!areas ? (
              <Skeleton className="h-16" />
            ) : (
              <FormSelect label="Área de destino" value={destinoAreaId} onChange={(e) => setDestinoAreaId(e.target.value)}>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </FormSelect>
            )}
            <FormInput label="N°" value={numeroRequerimiento} onChange={(e) => setNumeroRequerimiento(e.target.value)} placeholder="204" />
            <FormInput label="Fecha" type="date" value={fechaRequerimiento} onChange={(e) => setFechaRequerimiento(e.target.value)} />
            <FormInput label="OE/OP" value={ordenProduccion} onChange={(e) => setOrdenProduccion(e.target.value)} placeholder="OE-166" />
          </div>

          <div className="flex flex-col gap-3">
            {filasRequerimiento.map((f, i) => (
              <div key={f.id} className="flex flex-col gap-3 rounded-2xl bg-white/70 p-4 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-3 sm:grid-cols-3">
                  {!productos ? (
                    <Skeleton className="h-16" />
                  ) : (
                    <FormSelect
                      label="Ítem"
                      value={f.productoId}
                      onChange={(e) => {
                        const id = e.target.value
                        actualizarFilaRequerimiento(f.id, 'productoId')(id)
                        actualizarFilaRequerimiento(f.id, 'item')(productos.find((p) => p.id === id)?.name ?? '')
                      }}
                    >
                      <option value="">Seleccionar…</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                  <FormInput
                    label="Unidad de medida"
                    value={f.unidadMedida}
                    onChange={(e) => actualizarFilaRequerimiento(f.id, 'unidadMedida')(e.target.value)}
                    placeholder="Piezas"
                  />
                  <FormInput
                    label="Total"
                    type="number"
                    min="0"
                    value={f.cantidad}
                    onChange={(e) => actualizarFilaRequerimiento(f.id, 'cantidad')(numero(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Quitar ítem ${i + 1}`}
                  disabled={filasRequerimiento.length === 1}
                  onClick={() => quitarFilaRequerimiento(f.id)}
                  className="self-end rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30 sm:self-center"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </div>
            ))}

            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFilaRequerimiento}>
                <Plus className="size-3.5" strokeWidth={2} />
                Agregar ítem
              </Button>
              <p className="text-sm font-bold text-marron-cafe">
                Total general: <span className="text-verde-bosque">{totalRequerimiento}</span>
              </p>
            </div>
          </div>

          <FirmasResponsables
            responsables={[
              { rol: 'Solicitante', puesto: '' },
              { rol: 'Supervisor de Producción', puesto: 'Aprobación' },
            ]}
            claseGrilla="sm:grid-cols-2"
          />
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo="Nota de entrega de Almacén"
          nota="Se emite cuando Almacén despacha el requerimiento aprobado — descuenta el lote de origen."
          acciones={
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFilaEntrega}>
              <Plus className="size-3.5" strokeWidth={2} />
              Agregar ítem
            </Button>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput label="Fecha" type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} />
            <FormInput label="N° de nota" value={numeroNotaEntrega} onChange={(e) => setNumeroNotaEntrega(e.target.value)} placeholder="485" />
            <FormInput label="OP/OE" value={ordenProduccion} disabled hint="Mismo dato del requerimiento" />
          </div>

          <div className="flex flex-col gap-4">
            {filasEntrega.map((f, i) => (
              <div key={f.id} className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                    {i + 1}
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar ítem ${i + 1}`}
                    disabled={filasEntrega.length === 1}
                    onClick={() => quitarFilaEntrega(f.id)}
                    className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {!productos ? (
                    <Skeleton className="h-16" />
                  ) : (
                    <FormSelect
                      label="Ítem"
                      value={f.productoId}
                      onChange={(e) => {
                        const id = e.target.value
                        actualizarFilaEntrega(f.id, 'productoId')(id)
                        actualizarFilaEntrega(f.id, 'item')(productos.find((p) => p.id === id)?.name ?? '')
                      }}
                    >
                      <option value="">Seleccionar…</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </FormSelect>
                  )}
                  <FormInput
                    label="Lote de almacén"
                    value={f.loteAlmacen}
                    onChange={(e) => actualizarFilaEntrega(f.id, 'loteAlmacen')(e.target.value)}
                    placeholder="270726-EEBB-07"
                  />
                  <FormInput
                    label="Unidad de medida"
                    value={f.unidadMedida}
                    onChange={(e) => actualizarFilaEntrega(f.id, 'unidadMedida')(e.target.value)}
                    placeholder="Piezas"
                  />
                  <FormInput
                    label="Cantidad"
                    type="number"
                    min="0"
                    value={f.cantidad}
                    onChange={(e) => actualizarFilaEntrega(f.id, 'cantidad')(numero(e.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>

          <FormTextarea label="Observaciones" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />

          <FirmasResponsables
            responsables={[
              { rol: 'Entregado por', puesto: 'Asistente de Almacén' },
              { rol: 'Recibido por', puesto: areas?.find((a) => a.id === destinoAreaId)?.name ?? 'Área solicitante' },
            ]}
            claseGrilla="sm:grid-cols-2"
          />
        </SeccionFormulario>

        <div className="flex items-center justify-end gap-3 border-t border-marron-tierra/10 pt-4">
          <Button onClick={guardar} disabled={enviando || !puedeGuardar} className="px-5 py-2.5">
            <Plus className="mr-1.5 size-4" strokeWidth={2} />
            {enviando ? 'Guardando…' : 'Registrar salida'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
