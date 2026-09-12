import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { lotsService } from '../../services/lotsService'
import { listarTodo } from '../../services/paginacion'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import ComboboxLote from '../formularios/ComboboxLote.jsx'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'
import Skeleton from '../Skeleton.jsx'

// RP-17: pureza mínima exigida antes de envasar. Si una muestra no llega a
// esto, el resultado es "No aprobado" y el lote vuelve al clasificado
// (reproceso en Área B, ver ModalRegistrarSalidaAreaB.jsx).
const PUREZA_MINIMA = 99.99

// Mismo filtro que ModalRegistrarSalidaAreaB.jsx / ModalRegistrarEnvasado.jsx —
// única aproximación real disponible hoy para "lote pasando por Área B".
const ESTADOS_CANDIDATOS = ['LAVADO']

let siguienteId = 1
const filaVacia = () => ({
  id: siguienteId++,
  fecha: '',
  turno: '',
  inspector: '',
  sacosMuestreados: '',
  purezaPct: '',
  observaciones: '',
})

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0

// Inspección de Calidad previa al envasado de Área B (I-PRO-16). Hoy no
// existe como pantalla — el análisis funcional (RP-17) la describe como una
// inspectora de planta que toma muestras de sacos de 45 kg y verifica
// pureza antes de dar el OK para envasar, usando "sus propios formularios"
// (nunca se compartió uno real en las reuniones — a diferencia de los
// formularios de Producción, este es MOCKUP también del lado de Calidad,
// con MockupBanner visible).
export default function SeccionInspeccionAreaB() {
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [loteId, setLoteId] = useState('')
  const [datosLote, setDatosLote] = useState(null)
  const [filas, setFilas] = useState(() => [filaVacia()])

  useEffect(() => {
    let cancelado = false
    listarTodo(productsService.listar)
      .then((data) => !cancelado && setProductos(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!loteId) {
      setDatosLote(null)
      return
    }
    let cancelado = false
    lotsService
      .obtener(loteId)
      .then((data) => !cancelado && setDatosLote(data))
      .catch(() => !cancelado && setDatosLote(null))
    return () => {
      cancelado = true
    }
  }, [loteId])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const agregarFila = () => setFilas((prev) => [...prev, filaVacia()])
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev))

  const filasConResultado = filas.map((f) => ({
    ...f,
    aprobado: f.purezaPct !== '' && num(f.purezaPct) >= PUREZA_MINIMA,
  }))
  const conMuestra = filasConResultado.filter((f) => f.purezaPct !== '')
  const purezaPromedio = conMuestra.length > 0 ? conMuestra.reduce((acc, f) => acc + num(f.purezaPct), 0) / conMuestra.length : null

  const guardar = () => {
    toast.info('Registro guardado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Registro" titulo="Inspección de Calidad — Área B" version="01" />

      <MockupBanner />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Datos generales">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!productos ? (
            <Skeleton className="h-16" />
          ) : (
            <ComboboxLote
              label="Lote MP"
              value={loteId}
              onChange={setLoteId}
              estados={ESTADOS_CANDIDATOS}
              productoNombre={productoNombre}
            />
          )}
        </div>

        {loteId && datosLote && (
          <dl className="grid gap-4 rounded-2xl bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Producto</dt>
              <dd className="text-sm font-medium text-marron-cafe">{productoNombre(datosLote.productId)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Código de lote</dt>
              <dd className="text-sm font-medium text-marron-cafe">{datosLote.code}</dd>
            </div>
          </dl>
        )}

        {purezaPromedio != null && (
          <div className={`flex items-center justify-between gap-3 rounded-2xl p-4 ${purezaPromedio >= PUREZA_MINIMA ? 'bg-verde-hoja/15' : 'bg-rojo-pasankalla/10'}`}>
            <span className="text-sm font-semibold text-marron-cafe">Pureza promedio del lote</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-marron-cafe">{purezaPromedio.toFixed(2)}%</span>
              <Badge tono={purezaPromedio >= PUREZA_MINIMA ? 'positivo' : 'negativo'}>
                {purezaPromedio >= PUREZA_MINIMA ? 'Cumple' : 'Fuera de meta'}
              </Badge>
            </div>
          </div>
        )}
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Muestras tomadas"
        nota={`Pureza mínima exigida (RP-17): ${PUREZA_MINIMA}%. Por debajo de esto, el lote vuelve al clasificado (reproceso).`}
        acciones={
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={agregarFila}>
            <Plus className="size-3.5" strokeWidth={2} />
            Agregar muestra
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {filasConResultado.map((f, i) => (
            <div key={f.id} className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
                  {i + 1}
                </span>
                <button
                  type="button"
                  aria-label={`Quitar muestra ${i + 1}`}
                  disabled={filas.length === 1}
                  onClick={() => quitarFila(f.id)}
                  className="rounded-full p-2 text-marron-cafe/40 transition-all duration-200 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla disabled:pointer-events-none disabled:opacity-30"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FormInput label="Fecha" type="date" value={f.fecha} onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)} />
                <FormSelect label="Turno" value={f.turno} onChange={(e) => actualizarFila(f.id, 'turno')(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  <option value="1">1º turno</option>
                  <option value="2">2º turno</option>
                  <option value="3">3º turno</option>
                </FormSelect>
                <FormInput label="Inspector" value={f.inspector} onChange={(e) => actualizarFila(f.id, 'inspector')(e.target.value)} />
                <FormInput
                  label="Sacos muestreados"
                  type="number"
                  min="0"
                  value={f.sacosMuestreados}
                  onChange={(e) => actualizarFila(f.id, 'sacosMuestreados')(numero(e.target.value))}
                />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <FormInput
                  label="Pureza (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={f.purezaPct}
                  onChange={(e) => actualizarFila(f.id, 'purezaPct')(numero(e.target.value))}
                  className="w-32"
                />
                {f.purezaPct !== '' && (
                  <Badge tono={f.aprobado ? 'positivo' : 'negativo'}>{f.aprobado ? 'Aprobado' : 'No aprobado — reproceso'}</Badge>
                )}
                <FormInput
                  label="Observaciones"
                  value={f.observaciones}
                  onChange={(e) => actualizarFila(f.id, 'observaciones')(e.target.value)}
                  className="min-w-48 flex-1"
                />
              </div>
            </div>
          ))}
        </div>
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
