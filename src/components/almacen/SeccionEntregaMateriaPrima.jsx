import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { areasService } from '../../services/areasService'
import { warehouseDeliveriesService } from '../../services/warehouseDeliveriesService'
import { iamService } from '../../services/iamService'
import { listarTodo } from '../../services/paginacion'
import { useSolicitud } from '../../hooks/useSolicitud'
import { toast } from '../../lib/toast'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'
import ComboboxLote from '../formularios/ComboboxLote.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'

const KG_POR_QUINTAL = 45.359

// Lote candidato a entrega: ya liberado por Calidad, todavía no arrancó
// Área A (ver ControlVolumenA.jsx) — es exactamente el momento "antes de
// que un lote arranque el Área A" que describe P-ADM-03/R-24.
const ESTADOS_CANDIDATOS = ['LIBERADO']

const TIPOS_SALIDA = ['Requerimiento', 'Ajuste', 'Devolución']

// Roles reales de Producción en este deployment — granulares por puesto,
// no el rol-módulo genérico `produccion` del seed original (que existe
// pero nadie tiene asignado). Cualquiera de estos puede figurar como
// "Solicitante" de una R-24.
const ROLES_SOLICITANTE = 'produccion,supervisor_prod,jefe_prod,encargado_grupo'

const RESPONSABLES = [
  { rol: 'Entregado por', puesto: 'Asistente de Almacén' },
  { rol: 'Recibido por', puesto: 'Supervisor de Producción' },
]

let siguienteId = 1
const filaVacia = () => ({
  id: siguienteId++,
  solicitanteId: '',
  fecha: new Date().toLocaleDateString('en-CA'),
  numeroSalida: '',
  tipoSalida: TIPOS_SALIDA[0],
  loteId: '',
  cantidadSacos: '',
  pesoPromedioKg: '',
  observaciones: '',
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0

// Formulario P-ADM-03/R-24 — Nota de Entrega de Materia Prima. Real: cada
// nota es un POST /warehouse-deliveries (documentType='R-24'), ver
// comrural_erp_backend/docs/warehouse-deliveries.md. `numeroSalida`/
// `tipoSalida` no tienen columna en el backend — quedan solo en pantalla,
// para que Producción los siga usando en el papel. `solicitanteId` sale de
// un selector real de personas con rol `produccion`
// (GET /iam/users?roleCode=produccion) — antes era un uuid tipeado a mano.
export default function SeccionEntregaMateriaPrima() {
  const [productos, setProductos] = useState(null)
  const [areas, setAreas] = useState(null)
  const [solicitantes, setSolicitantes] = useState(null)
  const [destinoAreaId, setDestinoAreaId] = useState('')
  const [errorCarga, setErrorCarga] = useState(null)
  const [filas, setFilas] = useState(() => [filaVacia()])
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    let cancelado = false
    Promise.all([listarTodo(productsService.listar), areasService.listar(), iamService.listarUsuarios({ roleCode: ROLES_SOLICITANTE })])
      .then(([productosResp, areasResp, solicitantesResp]) => {
        if (cancelado) return
        setProductos(productosResp)
        setAreas(areasResp.data)
        setSolicitantes(solicitantesResp)
        if (areasResp.data.length > 0) setDestinoAreaId(areasResp.data[0].id)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const filasConCalculo = filas.map((f) => {
    const pesoNetoKg = num(f.cantidadSacos) * num(f.pesoPromedioKg)
    return { ...f, pesoNetoKg, pesoNetoQq: pesoNetoKg / KG_POR_QUINTAL }
  })

  const filaValida = (f) => f.loteId !== '' && f.solicitanteId.trim() !== '' && num(f.cantidadSacos) > 0 && num(f.pesoPromedioKg) > 0
  const puedeGuardar = destinoAreaId !== '' && filasConCalculo.some(filaValida)

  const guardar = async () => {
    if (!puedeGuardar) return
    const validas = filasConCalculo.filter(filaValida)
    let creadas = 0
    try {
      await ejecutar(async () => {
        for (const f of validas) {
          await warehouseDeliveriesService.crear({
            documentType: 'R-24',
            lotId: f.loteId,
            solicitanteId: f.solicitanteId.trim(),
            destinoAreaId,
            sacos: num(f.cantidadSacos),
            kg: Number(f.pesoNetoKg.toFixed(3)),
            quintales: Number(f.pesoNetoQq.toFixed(3)),
            pesoPromedioKg: num(f.pesoPromedioKg),
            fechaEntrega: new Date(f.fecha).toISOString(),
            observaciones: f.observaciones.trim() || undefined,
          })
          creadas += 1
        }
      })
      toast.success(`${creadas} ${creadas === 1 ? 'nota registrada' : 'notas registradas'}.`)
      setFilas([filaVacia()])
    } catch (err) {
      toast.error(creadas > 0 ? `Se guardaron ${creadas} de ${validas.length} notas — ${err.message}` : (err.message ?? 'No se pudo guardar.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Nota de Entrega de Materia Prima" codigo="P-ADM-03/R-24" version="01" />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Destino">
        {!areas ? (
          <Skeleton className="h-16" />
        ) : (
          <FormSelect label="Área de destino" value={destinoAreaId} onChange={(e) => setDestinoAreaId(e.target.value)} className="max-w-xs">
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </FormSelect>
        )}
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Notas de entrega"
        nota="Se entrega el lote completo — sin control de diferencias pedido/entrega. Conteo físico de sacos entre Almacén y Producción antes de iniciar."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar nota
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {filasConCalculo.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar nota ${i + 1}`}
                  disabled={filas.length === 1}
                  onClick={() => quitarFila(f.id)}
                  className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FormSelect
                  label="Solicitante"
                  value={f.solicitanteId}
                  onChange={(e) => actualizarFila(f.id, 'solicitanteId')(e.target.value)}
                >
                  <option value="">{solicitantes ? 'Seleccionar…' : 'Cargando…'}</option>
                  {solicitantes?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </FormSelect>
                <FormInput label="Fecha" type="date" value={f.fecha} onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)} />
                <FormInput
                  label="N° de salida"
                  value={f.numeroSalida}
                  onChange={(e) => actualizarFila(f.id, 'numeroSalida')(e.target.value)}
                  placeholder="86"
                />
                <FormSelect label="Tipo de salida" value={f.tipoSalida} onChange={(e) => actualizarFila(f.id, 'tipoSalida')(e.target.value)}>
                  {TIPOS_SALIDA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </FormSelect>
                {!productos ? (
                  <Skeleton className="h-16" />
                ) : (
                  <ComboboxLote
                    label="Lote MP"
                    value={f.loteId}
                    onChange={actualizarFila(f.id, 'loteId')}
                    estados={ESTADOS_CANDIDATOS}
                    productoNombre={productoNombre}
                  />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput
                  label="Cantidad de sacos"
                  type="number"
                  min="0"
                  value={f.cantidadSacos}
                  onChange={(e) => actualizarFila(f.id, 'cantidadSacos')(numero(e.target.value))}
                />
                <FormInput
                  label="Peso promedio (kg/saco)"
                  type="number"
                  min="0"
                  step="0.001"
                  value={f.pesoPromedioKg}
                  onChange={(e) => actualizarFila(f.id, 'pesoPromedioKg')(numero(e.target.value))}
                />
                <FormInput label="Peso neto (kg)" value={f.pesoNetoKg.toFixed(2)} disabled />
                <FormInput label="Peso neto (QQ)" value={f.pesoNetoQq.toFixed(2)} disabled hint="1 QQ = 45,359 kg" />
              </div>

              <FormTextarea
                label="Observaciones"
                rows={1}
                value={f.observaciones}
                onChange={(e) => actualizarFila(f.id, 'observaciones')(e.target.value)}
              />
            </div>
          ))}
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Firmas">
        <FirmasResponsables responsables={RESPONSABLES} claseGrilla="sm:grid-cols-2" />
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button onClick={guardar} disabled={enviando || !puedeGuardar}>
          <Plus className="mr-1.5 size-4" strokeWidth={2} />
          {enviando ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
