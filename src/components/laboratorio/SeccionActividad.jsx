import { useEffect, useState } from 'react'
import { Activity, X } from 'lucide-react'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { siguienteCursor } from '../../services/paginacion'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import FormSelect from '../FormSelect.jsx'
import FormInput from '../FormInput.jsx'
import SearchInput from '../SearchInput.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'

// Pestaña "Actividad" de Laboratorio — bitácora de solicitudes de análisis
// (GET /analysis-requests, ya existe y ya soporta los filtros de acá:
// status/effectiveType/sampleCode/lotCode/from/to). No hace falta backend
// nuevo — el placeholder anterior decía "todavía no hay bitácora", pero el
// endpoint real ya trae todo lo necesario para armar una, solo faltaba esta
// pantalla.
const TONO_ESTADO = {
  PENDIENTE_MUESTRA: 'alerta',
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  ANALIZADA: 'positivo',
  RECHAZADA: 'negativo',
}
const ESTADOS = ['PENDIENTE_MUESTRA', 'RECIBIDA', 'EN_PROCESO', 'ANALIZADA', 'RECHAZADA']
const TAMANIO_PAGINA = 20

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

// `from`/`to` del backend son datetime completos (utcDateTimeSchema) — un
// filtro de fecha simple (type=date) se expande al día entero en UTC-BO,
// mismo criterio que el resto de los filtros de fecha del proyecto.
const inicioDeDia = (fecha) => (fecha ? new Date(`${fecha}T00:00:00`).toISOString() : undefined)
const finDeDia = (fecha) => (fecha ? new Date(`${fecha}T23:59:59.999`).toISOString() : undefined)

export default function SeccionActividad() {
  const [solicitudes, setSolicitudes] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorCargarMas, setErrorCargarMas] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [sampleCode, setSampleCode] = useState('')
  const [lotCode, setLotCode] = useState('')
  const [status, setStatus] = useState('')
  const [effectiveType, setEffectiveType] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const hayFiltrosActivos =
    sampleCode !== '' || lotCode !== '' || status !== '' || effectiveType !== '' || desde !== '' || hasta !== ''
  const limpiarFiltros = () => {
    setSampleCode('')
    setLotCode('')
    setStatus('')
    setEffectiveType('')
    setDesde('')
    setHasta('')
  }

  const filtrosActivos = () => ({
    sampleCode: sampleCode || undefined,
    lotCode: lotCode || undefined,
    status: status || undefined,
    effectiveType: effectiveType || undefined,
    from: inicioDeDia(desde),
    to: finDeDia(hasta),
  })

  // Recarga desde cero cada vez que cambia algún filtro — a diferencia de
  // Inspección/Remito (que cargan 100 y filtran en el cliente), acá el
  // filtrado es del lado del servidor de verdad (status/fechas pueden
  // representar meses de historial, no tiene sentido traer todo y filtrar
  // después).
  useEffect(() => {
    let cancelado = false
    setSolicitudes(null)
    setErrorCarga(null)
    analysisRequestsService
      .listar({ limit: TAMANIO_PAGINA, ...filtrosActivos() })
      .then((resp) => {
        if (cancelado) return
        setSolicitudes(resp.data)
        setCursor(siguienteCursor(resp))
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtrosActivos()
    // se recrea cada render; los 6 valores primitivos de abajo son la
    // dependencia real.
  }, [sampleCode, lotCode, status, effectiveType, desde, hasta])

  const cargarMas = async () => {
    if (!cursor || cargandoMas) return
    setCargandoMas(true)
    setErrorCargarMas(null)
    try {
      const resp = await analysisRequestsService.listar({ limit: TAMANIO_PAGINA, cursor, ...filtrosActivos() })
      setSolicitudes((prev) => [...prev, ...resp.data])
      setCursor(siguienteCursor(resp))
    } catch (err) {
      setErrorCargarMas(err.message)
    } finally {
      setCargandoMas(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-2.5">
          <Activity className="size-5 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-marron-cafe">Actividad</h2>
          <p className="text-xs text-marron-cafe/50">Historial de solicitudes de análisis, más reciente primero.</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <SearchInput label="Código de muestra" placeholder="LAB-00001…" value={sampleCode} onChange={(e) => setSampleCode(e.target.value)} />
        <SearchInput label="Código de lote" placeholder="LOT-1…" value={lotCode} onChange={(e) => setLotCode(e.target.value)} />
        <FormSelect label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.replace(/_/g, ' ')}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Tipo" value={effectiveType} onChange={(e) => setEffectiveType(e.target.value)}>
          <option value="">Todos</option>
          <option value="EXPRESS">Express</option>
          <option value="REGULAR">Regular</option>
        </FormSelect>
        <FormInput label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        <FormInput label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>
      {hayFiltrosActivos && (
        <Button variant="secondary" className="w-fit gap-1.5 px-3 py-1.5 text-xs" onClick={limpiarFiltros}>
          <X className="size-3.5" strokeWidth={2} />
          Limpiar filtros
        </Button>
      )}

      {errorCarga ? (
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
      ) : solicitudes === null ? (
        <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : solicitudes.length === 0 ? (
        <EmptyState
          Icon={Activity}
          titulo={hayFiltrosActivos ? 'Ninguna solicitud coincide con el filtro' : 'Todavía no hay ninguna solicitud de análisis'}
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
            {solicitudes.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
              >
                <span className="w-36 shrink-0 text-xs text-marron-cafe/50">{formatearFechaHora(s.requestedAt)}</span>
                <span className="font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</span>
                <span className="text-sm text-marron-cafe">{s.product.name}</span>
                <span className="font-mono text-xs text-marron-cafe/50">{s.lot.code}</span>
                <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
                <span className="text-xs text-marron-cafe/50">
                  {s.itemCount} {s.itemCount === 1 ? 'ensayo' : 'ensayos'}
                </span>
                <span className="text-xs text-marron-cafe/50">{s.requestedBy.name}</span>
                <Badge tono={TONO_ESTADO[s.status] ?? 'neutro'} className="ml-auto">
                  {s.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </div>

          {errorCargarMas && (
            <p className="text-center text-xs font-medium text-rojo-pasankalla">No se pudo cargar más: {errorCargarMas}</p>
          )}
          {cursor && (
            <Button variant="secondary" className="self-center px-4 py-2 text-sm" disabled={cargandoMas} onClick={cargarMas}>
              {cargandoMas ? 'Cargando…' : errorCargarMas ? 'Reintentar' : 'Cargar más'}
            </Button>
          )}
        </>
      )}
    </section>
  )
}
