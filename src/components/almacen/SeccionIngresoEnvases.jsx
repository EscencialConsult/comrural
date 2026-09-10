import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { suppliersService } from '../../services/suppliersService'
import { listarTodo } from '../../services/paginacion'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'

// RP-13 (Descripcion_Narrativa_Procesos_Almacen_COMRURAL.md, P-13): prefijos
// confirmados por subalmacén de Envases/Embalaje/Insumos.
const SUBALMACENES = [
  { value: 'ML', label: 'Mercado local (ML)' },
  { value: 'EXP', label: 'Exportación (EXP)' },
  { value: 'INS', label: 'Insumos de proceso (INS)' },
]

const DOCUMENTOS_RESPALDO = ['Factura', 'Remito', 'Nota de ingreso']

// Estados del ciclo de calidad descrito en la narrativa (P-02): un ítem
// entra "En revisión" y recién pasa a Disponible o Bloqueado con el
// dictamen de Calidad — acá es solo un select visual, sin lógica detrás.
const ESTADOS = ['En revisión', 'Disponible', 'Bloqueado']

let siguienteId = 1
const filaVacia = () => ({
  id: siguienteId++,
  item: '',
  productoId: '',
  numeroSolicitud: '',
  documentoRespaldo: DOCUMENTOS_RESPALDO[0],
  numeroRespaldo: '',
  loteDesignado: '',
  subalmacen: SUBALMACENES[0].value,
  unidadMedida: '',
  cantidad: '',
  estado: ESTADOS[0],
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))

// Formulario P-ADM-03/R-19 — Nota de Ingreso a Almacén. Aplica a envases
// primarios/secundarios e insumos de proceso (ver nota del formulario
// original). Todavía no existe como pantalla en Almacén ni tiene backend
// propio — MOCKUP total, mismo criterio que SeccionEntregaMateriaPrima.jsx.
export default function SeccionIngresoEnvases() {
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [numeroOrdenCompra, setNumeroOrdenCompra] = useState('')

  const [filas, setFilas] = useState(() => [filaVacia()])

  useEffect(() => {
    let cancelado = false
    Promise.all([listarTodo(productsService.listar), listarTodo(suppliersService.listar)])
      .then(([p, s]) => {
        if (cancelado) return
        setProductos(p)
        setProveedores(s)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const proveedorNombre = (s) => (s.person ? `${s.person.firstNames} ${s.person.lastNames}` : s.organization ? s.organization.tradeName || s.organization.legalName : '—')

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Nota de Ingreso a Almacén" codigo="P-ADM-03/R-19" version="02" />

      <MockupBanner />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario
        numero={1}
        titulo="Datos generales"
        nota="Sección 7 del relevamiento (integración con Compras): hoy no hay Orden de Compra como entidad en el backend — Compras equivale a crear un lote (ver PanelCompras.jsx), y los lotes son solo MP/PT, no envases. El campo de abajo queda como referencia manual hasta que exista esa integración real."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <FormInput
            label="N° de Orden de Compra / Programa"
            value={numeroOrdenCompra}
            onChange={(e) => setNumeroOrdenCompra(e.target.value)}
            hint="Referencia manual — sin backend de Compras que la valide todavía"
          />
          {!proveedores ? (
            <Skeleton className="h-16" />
          ) : (
            <FormSelect label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {proveedores.map((s) => (
                <option key={s.id} value={s.id}>
                  {proveedorNombre(s)}
                </option>
              ))}
            </FormSelect>
          )}
          <FormInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <FormInput label="N° de nota" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} placeholder="224" />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Detalle de ingreso"
        nota="Aplica para envases primarios, secundarios e insumos de proceso u otro que amerite."
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar ítem
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {filas.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ítem ${i + 1}`}
                  disabled={filas.length === 1}
                  onClick={() => quitarFila(f.id)}
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
                      actualizarFila(f.id, 'productoId')(id)
                      actualizarFila(f.id, 'item')(productos.find((p) => p.id === id)?.name ?? '')
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
                  label="N° de solicitud"
                  value={f.numeroSolicitud}
                  onChange={(e) => actualizarFila(f.id, 'numeroSolicitud')(e.target.value)}
                  placeholder="2197"
                />
                <FormSelect label="Documento de respaldo" value={f.documentoRespaldo} onChange={(e) => actualizarFila(f.id, 'documentoRespaldo')(e.target.value)}>
                  {DOCUMENTOS_RESPALDO.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="N° de respaldo"
                  value={f.numeroRespaldo}
                  onChange={(e) => actualizarFila(f.id, 'numeroRespaldo')(e.target.value)}
                  placeholder="53"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FormInput
                  label="Lote designado"
                  value={f.loteDesignado}
                  onChange={(e) => actualizarFila(f.id, 'loteDesignado')(e.target.value)}
                  placeholder="310826-ESEH2-03"
                />
                <FormSelect label="Subalmacén" value={f.subalmacen} onChange={(e) => actualizarFila(f.id, 'subalmacen')(e.target.value)}>
                  {SUBALMACENES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </FormSelect>
                <FormInput
                  label="Unidad de medida"
                  value={f.unidadMedida}
                  onChange={(e) => actualizarFila(f.id, 'unidadMedida')(e.target.value)}
                  placeholder="Piezas"
                />
                <FormInput
                  label="Cantidad"
                  type="number"
                  min="0"
                  value={f.cantidad}
                  onChange={(e) => actualizarFila(f.id, 'cantidad')(numero(e.target.value))}
                />
                <FormSelect label="Estado" value={f.estado} onChange={(e) => actualizarFila(f.id, 'estado')(e.target.value)}>
                  {ESTADOS.map((e2) => (
                    <option key={e2} value={e2}>
                      {e2}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
          ))}
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Firmas y conformidad">
        <FirmasResponsables
          responsables={[
            { rol: 'Recepcionado por', puesto: 'Asistente de Almacén' },
            { rol: 'Verificación Calidad', puesto: 'Analista de Calidad' },
            { rol: 'V°B°', puesto: 'Responsable de Almacén' },
          ]}
          claseGrilla="sm:grid-cols-3"
        />
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button onClick={guardar}>
          <Plus className="mr-1.5 size-4" strokeWidth={2} />
          Guardar
        </Button>
      </div>
    </div>
  )
}
