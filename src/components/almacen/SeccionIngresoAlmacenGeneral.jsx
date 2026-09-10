import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'

// almacenes.md: subalmacenes del Almacén General, con baja rotación
// (algunos ítems se piden una vez al mes o al año, sección 2.4 del
// relevamiento) — a diferencia de Envases, acá no hay catálogo de
// productos real (ni falta le hace, el service es de MP/PT), así que el
// ítem es texto libre, igual que EPP y Bajas.
const SUBALMACENES = [
  { value: 'ESC', label: 'Material de escritorio (ESC)' },
  { value: 'LIM', label: 'Material de limpieza (LIM)' },
  { value: 'MNT', label: 'Mantenimiento (MNT)' },
  { value: 'SOL', label: 'Solicitud de compras (SOL)' },
]

const DOCUMENTOS_RESPALDO = ['Factura', 'Remito', 'Nota de ingreso']
const ESTADOS = ['En revisión', 'Disponible', 'Bloqueado']

let siguienteId = 1
const filaVacia = () => ({
  id: siguienteId++,
  item: '',
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

// Formulario P-ADM-03/R-19 — Nota de Ingreso a Almacén, mismo documento que
// usa Envases (SeccionIngresoEnvases.jsx) pero para Almacén General
// (Escritorio/Limpieza/Mantenimiento/Solicitudes de compra), sección 2.4
// del relevamiento. Autocontenido, sin compartir código con Envases —
// mismo criterio que el resto de los formularios mock de este relevamiento
// (ver ControlProductoAlmacen.jsx). MOCKUP total, sin backend propio.
export default function SeccionIngresoAlmacenGeneral() {
  const [proveedor, setProveedor] = useState('')
  const [fecha, setFecha] = useState('')
  const [numeroNota, setNumeroNota] = useState('')
  const [numeroOrdenCompra, setNumeroOrdenCompra] = useState('')
  const [filas, setFilas] = useState(() => [filaVacia()])

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Nota de Ingreso a Almacén — General" codigo="P-ADM-03/R-19" version="02" />

      <MockupBanner />

      <SeccionFormulario
        numero={1}
        titulo="Datos generales"
        nota="Sección 7 del relevamiento (integración con Compras): no hay Orden de Compra como entidad en el backend todavía — el campo de abajo queda como referencia manual."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <FormInput
            label="N° de Orden de Compra / Programa"
            value={numeroOrdenCompra}
            onChange={(e) => setNumeroOrdenCompra(e.target.value)}
            hint="Referencia manual — sin backend de Compras que la valide todavía"
          />
          <FormInput label="Proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
          <FormInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <FormInput label="N° de nota" value={numeroNota} onChange={(e) => setNumeroNota(e.target.value)} />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Detalle de ingreso"
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
                <FormInput label="Ítem" value={f.item} onChange={(e) => actualizarFila(f.id, 'item')(e.target.value)} placeholder="Resma de papel A4" />
                <FormInput
                  label="N° de solicitud"
                  value={f.numeroSolicitud}
                  onChange={(e) => actualizarFila(f.id, 'numeroSolicitud')(e.target.value)}
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
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FormInput
                  label="Lote designado"
                  value={f.loteDesignado}
                  onChange={(e) => actualizarFila(f.id, 'loteDesignado')(e.target.value)}
                  hint="Opcional — ítems de baja rotación pueden no llevar lote"
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
            { rol: 'V°B°', puesto: 'Responsable de Almacén' },
          ]}
          claseGrilla="sm:grid-cols-2"
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
