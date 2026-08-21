import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { samplesService } from '../../services/samplesService'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { laboratoryTestsService } from '../../services/laboratoryTestsService'
import { useSolicitud } from '../../hooks/useSolicitud'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'

// Formulario real de Solicitud de Análisis de Laboratorio (I-LAB-20/R-01) —
// dos pedidos al backend en secuencia, no uno: primero se crea la MUESTRA
// (POST /raw-material-lots/:lotId/samples), después la SOLICITUD DE ANÁLISIS
// sobre esa muestra (POST /samples/:sampleId/analysis-requests). El backend
// nunca deja crear la muestra si el lote no está en ACEPTADO_RECEPCION — por
// eso PanelCalidad.jsx ya filtra el listado a ese estado antes de llegar
// acá.
//
// Campos que NO están acá porque el backend los rechaza o los calcula solo
// (charlado explícitamente con el usuario antes de armar esto):
//   - Criterio de aceptación: es el RESULTADO del análisis, no un dato de la
//     solicitud — el backend lo rechaza con 409 si se manda al crear
//     (CHECK analysis_requests_pending_fields_check). Se completa después,
//     en receive-sample, fuera de esta pantalla.
//   - Turno: el backend lo resuelve solo según la hora real (turno activo
//     ahora mismo) — no es seleccionable, por eso solo se MUESTRA después
//     de crear la solicitud, nunca se pide acá.
//
// Responsable de entrega: el rol calidad no tiene users:read (no puede
// listar personal), así que es un input de texto con el UUID a mano — el
// backend igual valida que exista y esté activo (409 si no). Cuando calidad
// tenga permiso para listar personal, este campo se cambia a un FormSelect.
const UNIDADES = ['G', 'KG', 'ML', 'L', 'PIEZA', 'OTRA']
const NATURALEZAS = [
  { value: 'MATERIA_PRIMA', label: 'Materia Prima (MP)' },
  { value: 'PRODUCTO_PROCESO', label: 'Producto en Proceso' },
  { value: 'PRODUCTO_TERMINADO', label: 'Producto Terminado (PT)' },
]
const USOS = [
  { value: 'EXPORTACION', label: 'Exportación' },
  { value: 'MERCADO_INTERNO', label: 'Mercado Interno' },
]
const TIPOS_SOLICITUD = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'EXPRESS', label: 'Express' },
]
const CATEGORIA_LABEL = {
  PHYSICOCHEMICAL: 'Fisicoquímico',
  MICROBIOLOGICAL: 'Microbiológico',
  TOXICOLOGICAL: 'Toxicológico',
  SENSORY: 'Sensorial',
}
const ORDEN_CATEGORIAS = ['PHYSICOCHEMICAL', 'MICROBIOLOGICAL', 'TOXICOLOGICAL', 'SENSORY']

export default function FormularioSolicitudAnalisis({ lote, productoNombre, proveedorNombre, onVolver }) {
  const [catalogo, setCatalogo] = useState(null)
  const [errorCatalogo, setErrorCatalogo] = useState(null)

  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState('KG')
  const [otraUnidad, setOtraUnidad] = useState('')
  const [naturaleza, setNaturaleza] = useState('')
  const [uso, setUso] = useState('')
  const [tipoSolicitud, setTipoSolicitud] = useState('REGULAR')
  const [responsableEntregaId, setResponsableEntregaId] = useState('')

  const [seleccionados, setSeleccionados] = useState(new Set())
  const [otroTexto, setOtroTexto] = useState('')
  const [otrosAgregados, setOtrosAgregados] = useState([]) // [{ tempId, otherTestName }]

  const [disponibilidad, setDisponibilidad] = useState(null)
  const [resultado, setResultado] = useState(null)

  const { enviando, error, ejecutar } = useSolicitud()

  useEffect(() => {
    let cancelado = false
    laboratoryTestsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setCatalogo(resp.data))
      .catch((err) => !cancelado && setErrorCatalogo(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    const pedir = tipoSolicitud === 'EXPRESS' ? analysisRequestsService.disponibilidadExpress : analysisRequestsService.disponibilidadRegular
    pedir()
      .then((d) => !cancelado && setDisponibilidad(d))
      .catch(() => !cancelado && setDisponibilidad(null))
    return () => {
      cancelado = true
    }
  }, [tipoSolicitud])

  const porCategoria = useMemo(() => {
    if (!catalogo) return []
    const mapa = new Map()
    for (const t of catalogo) {
      if (t.category === 'OTHER') continue
      if (!mapa.has(t.category)) mapa.set(t.category, [])
      mapa.get(t.category).push(t)
    }
    return ORDEN_CATEGORIAS.filter((c) => mapa.has(c)).map((c) => [c, mapa.get(c)])
  }, [catalogo])

  const testOtro = catalogo?.find((t) => t.category === 'OTHER')

  const alternarEnsayo = (testId) => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(testId)) siguiente.delete(testId)
      else siguiente.add(testId)
      return siguiente
    })
  }

  const agregarOtro = () => {
    const texto = otroTexto.trim()
    if (!texto) return
    setOtrosAgregados((prev) => [...prev, { tempId: crypto.randomUUID(), otherTestName: texto }])
    setOtroTexto('')
  }

  const quitarOtro = (tempId) => setOtrosAgregados((prev) => prev.filter((o) => o.tempId !== tempId))

  const totalEnsayos = seleccionados.size + otrosAgregados.length

  const puedeEnviar =
    cantidad !== '' &&
    Number(cantidad) > 0 &&
    unidad &&
    (unidad !== 'OTRA' || otraUnidad.trim() !== '') &&
    naturaleza !== '' &&
    uso !== '' &&
    tipoSolicitud !== '' &&
    responsableEntregaId.trim() !== '' &&
    totalEnsayos > 0

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar) return
    try {
      const muestra = await ejecutar(() =>
        samplesService.crear(lote.id, {
          quantity: Number(cantidad),
          unit: unidad,
          ...(unidad === 'OTRA' ? { otherUnit: otraUnidad.trim() } : {}),
        }),
      )

      const items = [
        ...Array.from(seleccionados).map((laboratoryTestId) => ({ laboratoryTestId })),
        ...otrosAgregados.map((o) => ({ laboratoryTestId: testOtro.id, otherTestName: o.otherTestName })),
      ]

      const solicitud = await ejecutar(() =>
        analysisRequestsService.crear(muestra.id, {
          intendedUse: uso,
          productNature: naturaleza,
          requestedType: tipoSolicitud,
          deliveryResponsibleId: responsableEntregaId.trim(),
          items,
        }),
      )

      setResultado(solicitud)
    } catch {
      // el mensaje legible ya quedó en `error` (useSolicitud) — si falló en
      // el segundo paso, la muestra ya quedó creada en el backend; no se
      // reintenta el primer paso desde acá para no duplicarla.
    }
  }

  if (resultado) {
    return (
      <section className="flex flex-col gap-4 rounded-3xl bg-verde-hoja/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 shrink-0 text-verde-bosque" strokeWidth={1.75} />
          <div className="text-sm text-verde-bosque">
            <p className="font-semibold">Solicitud de análisis creada — muestra {resultado.sample.code}</p>
            <p className="text-verde-bosque/80">
              Turno asignado: {resultado.shift.name} ({resultado.shift.startTime}–{resultado.shift.endTime}) ·{' '}
              {resultado.operationalDate}
            </p>
            {resultado.wasReclassified && (
              <p className="mt-1 text-marron-arcilla">{resultado.message}</p>
            )}
          </div>
        </div>
        <Button variant="secondary" className="self-start px-4 py-2 text-sm" onClick={onVolver}>
          Volver al listado
        </Button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onVolver}
        className="flex w-fit items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
      >
        ← Volver al listado
      </button>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-6 rounded-3xl bg-marron-tierra/5 p-6">
        <div>
          <h2 className="text-lg font-bold text-marron-cafe">Solicitud de análisis — {lote.code}</h2>
          <p className="text-sm text-marron-cafe/60">
            {productoNombre} · {proveedorNombre}
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}

        {/* Sección 1 — Detalles de la muestra */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-marron-cafe">1. Detalles de la muestra</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="Cantidad de muestra"
              type="number"
              min="0.001"
              step="0.001"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <FormSelect label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </FormSelect>
            {unidad === 'OTRA' && (
              <FormInput label="Especificar unidad" value={otraUnidad} onChange={(e) => setOtraUnidad(e.target.value)} />
            )}
            <FormSelect label="Naturaleza" value={naturaleza} onChange={(e) => setNaturaleza(e.target.value)}>
              <option value="">Seleccioná…</option>
              {NATURALEZAS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Uso" value={uso} onChange={(e) => setUso(e.target.value)}>
              <option value="">Seleccioná…</option>
              {USOS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>

        {/* Sección 2 — Ensayos solicitados */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-marron-cafe">2. Ensayos solicitados</h3>
          {errorCatalogo && (
            <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar el catálogo: {errorCatalogo}</p>
          )}
          {catalogo === null && !errorCatalogo && <p className="text-sm text-marron-cafe/50">Cargando catálogo…</p>}

          {catalogo && (
            <div className="flex flex-col gap-4">
              {porCategoria.map(([categoria, tests]) => (
                <div key={categoria} className="rounded-2xl bg-white/60 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-marron-cafe/50">
                    {CATEGORIA_LABEL[categoria]}
                  </p>
                  <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {tests.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm text-marron-cafe">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(t.id)}
                          onChange={() => alternarEnsayo(t.id)}
                          className="size-4 accent-verde-lima"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {testOtro && (
                <div className="rounded-2xl bg-white/60 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-marron-cafe/50">Otros</p>
                  <div className="flex flex-wrap gap-2">
                    <FormInput
                      className="flex-1"
                      placeholder="Especificar ensayo…"
                      value={otroTexto}
                      onChange={(e) => setOtroTexto(e.target.value)}
                    />
                    <Button type="button" variant="secondary" className="self-end px-4 py-2 text-sm" onClick={agregarOtro}>
                      Agregar
                    </Button>
                  </div>
                  {otrosAgregados.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {otrosAgregados.map((o) => (
                        <span
                          key={o.tempId}
                          className="flex items-center gap-1.5 rounded-full bg-marron-tierra/10 px-3 py-1 text-xs text-marron-cafe"
                        >
                          {o.otherTestName}
                          <button type="button" onClick={() => quitarOtro(o.tempId)} aria-label={`Quitar ${o.otherTestName}`}>
                            <X className="size-3" strokeWidth={2} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {totalEnsayos === 0 && catalogo && (
            <p className="text-xs text-marron-cafe/50">Elegí al menos un ensayo para poder enviar la solicitud.</p>
          )}
        </div>

        {/* Sección 3 — Parámetros de entrega */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-marron-cafe">3. Parámetros de entrega</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect label="Tipo de solicitud" value={tipoSolicitud} onChange={(e) => setTipoSolicitud(e.target.value)}>
              {TIPOS_SOLICITUD.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </FormSelect>
            <div className="flex flex-col gap-1.5 text-sm text-marron-cafe">
              Cupo disponible
              {disponibilidad ? (
                <Badge tono={disponibilidad.available ? 'positivo' : 'negativo'} className="w-fit">
                  {disponibilidad.used}/{disponibilidad.capacity} ocupado{disponibilidad.available ? ' · hay lugar' : ' · sin cupo'}
                </Badge>
              ) : (
                <span className="text-xs text-marron-cafe/40">Consultando…</span>
              )}
            </div>
            <FormInput
              label="Responsable de entrega"
              placeholder="UUID del responsable"
              value={responsableEntregaId}
              onChange={(e) => setResponsableEntregaId(e.target.value)}
              hint="Tu rol no puede listar personal todavía — se ingresa el id a mano."
            />
            <div className="flex flex-col gap-1.5 text-sm text-marron-cafe">
              Turno
              <span className="text-xs text-marron-cafe/50">Se asigna solo, según la hora real — se muestra recién al crear la solicitud.</span>
            </div>
          </div>
        </div>

        <Button type="submit" disabled={enviando || !puedeEnviar} className="self-start">
          {enviando ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </form>
    </section>
  )
}
