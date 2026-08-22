import { useEffect, useMemo, useState } from 'react'
import { X, FlaskConical, ClipboardList, Truck, Beaker, Bug, Skull, Eye } from 'lucide-react'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { laboratoryTestsService } from '../../services/laboratoryTestsService'
import { iamService } from '../../services/iamService'
import { useSolicitud } from '../../hooks/useSolicitud'
import { NATURALEZA_LABEL, USO_LABEL } from '../../config/analisisLabels'
import Modal from '../Modal.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'

// Solo crea la SOLICITUD DE ANÁLISIS (POST /samples/:sampleId/analysis-requests)
// sobre una muestra que YA existe — separado de ModalCrearMuestra.jsx a
// propósito. El backend permite varias solicitudes por muestra a lo largo
// del tiempo, pero nunca dos activas a la vez (ver
// analysis_requests_one_active_per_sample_idx) — por eso este modal ni se
// abre si la muestra ya tiene una solicitud sin cerrar (lo decide quien
// llama, pasando `muestra`).
const NATURALEZAS = Object.entries(NATURALEZA_LABEL).map(([value, label]) => ({ value, label }))
const USOS = Object.entries(USO_LABEL).map(([value, label]) => ({ value, label }))
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
const CATEGORIA_ICON = {
  PHYSICOCHEMICAL: Beaker,
  MICROBIOLOGICAL: Bug,
  TOXICOLOGICAL: Skull,
  SENSORY: Eye,
}
// Un color propio por categoría — antes las 4 se veían idénticas (mismo
// gris), costaba distinguir dónde empezaba una y terminaba otra. Clases
// completas y literales (no armadas con template strings) porque Tailwind
// necesita verlas tal cual en el código fuente para no purgarlas.
const CATEGORIA_ESTILO = {
  PHYSICOCHEMICAL: { borde: 'border-azul-andino/40', icono: 'bg-azul-andino/15 text-azul-andino', contador: 'text-azul-andino' },
  MICROBIOLOGICAL: { borde: 'border-verde-bosque/40', icono: 'bg-verde-bosque/15 text-verde-bosque', contador: 'text-verde-bosque' },
  TOXICOLOGICAL: { borde: 'border-rojo-pasankalla/40', icono: 'bg-rojo-pasankalla/15 text-rojo-pasankalla', contador: 'text-rojo-pasankalla' },
  SENSORY: { borde: 'border-marron-arcilla/40', icono: 'bg-marron-arcilla/15 text-marron-arcilla', contador: 'text-marron-arcilla' },
}
const ORDEN_CATEGORIAS = ['PHYSICOCHEMICAL', 'MICROBIOLOGICAL', 'TOXICOLOGICAL', 'SENSORY']

// Cabecera de sección reutilizada 3 veces acá adentro — mismo patrón visual
// que ModalDetalleMuestra.jsx (ícono chico + título), para que las dos
// pantallas del flujo de muestreo se vean como parte del mismo sistema.
function TituloSeccion({ Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-verde-bosque" strokeWidth={1.75} />
      <h3 className="text-sm font-bold text-marron-cafe">{children}</h3>
    </div>
  )
}

export default function ModalSolicitarAnalisis({ abierto, muestra, loteCodigo, productoNombre, proveedorNombre, onCerrar, onCreada }) {
  const [catalogo, setCatalogo] = useState(null)
  const [errorCatalogo, setErrorCatalogo] = useState(null)

  const [usuarios, setUsuarios] = useState(null)
  const [errorUsuarios, setErrorUsuarios] = useState(null)

  const [naturaleza, setNaturaleza] = useState('')
  const [uso, setUso] = useState('')
  const [tipoSolicitud, setTipoSolicitud] = useState('REGULAR')
  const [responsableEntregaId, setResponsableEntregaId] = useState('')

  const [seleccionados, setSeleccionados] = useState(new Set())
  const [otroTexto, setOtroTexto] = useState('')
  const [otrosAgregados, setOtrosAgregados] = useState([])

  const [disponibilidad, setDisponibilidad] = useState(null)
  const { enviando, error, ejecutar, limpiarError } = useSolicitud()

  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    laboratoryTestsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setCatalogo(resp.data))
      .catch((err) => !cancelado && setErrorCatalogo(err.message))
    return () => {
      cancelado = true
    }
  }, [abierto])

  // Responsable de entrega — antes era un input de texto con el UUID a
  // mano (el rol calidad no tiene users:read). Con superadmin de prueba sí
  // hay acceso, así que se lista de verdad. Si el usuario logueado no
  // tiene el permiso, el catch deja `usuarios` en `[]` — el campo cae solo
  // a "no hay usuarios para elegir" en vez de romper el resto del modal.
  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    iamService
      .listarUsuarios()
      .then((data) => !cancelado && setUsuarios(data.filter((u) => u.isActive)))
      .catch((err) => {
        if (cancelado) return
        setErrorUsuarios(err.message)
        setUsuarios([])
      })
    return () => {
      cancelado = true
    }
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    const pedir = tipoSolicitud === 'EXPRESS' ? analysisRequestsService.disponibilidadExpress : analysisRequestsService.disponibilidadRegular
    pedir()
      .then((d) => !cancelado && setDisponibilidad(d))
      .catch(() => !cancelado && setDisponibilidad(null))
    return () => {
      cancelado = true
    }
  }, [abierto, tipoSolicitud])

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
    naturaleza !== '' && uso !== '' && tipoSolicitud !== '' && responsableEntregaId.trim() !== '' && totalEnsayos > 0

  const cerrar = () => {
    setNaturaleza('')
    setUso('')
    setTipoSolicitud('REGULAR')
    setResponsableEntregaId('')
    setSeleccionados(new Set())
    setOtroTexto('')
    setOtrosAgregados([])
    limpiarError()
    onCerrar()
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar || !muestra) return
    const items = [
      ...Array.from(seleccionados).map((laboratoryTestId) => ({ laboratoryTestId })),
      ...otrosAgregados.map((o) => ({ laboratoryTestId: testOtro.id, otherTestName: o.otherTestName })),
    ]
    try {
      const solicitud = await ejecutar(() =>
        analysisRequestsService.crear(muestra.id, {
          intendedUse: uso,
          productNature: naturaleza,
          requestedType: tipoSolicitud,
          deliveryResponsibleId: responsableEntregaId.trim(),
          items,
        }),
      )
      onCreada(solicitud)
      cerrar()
    } catch {
      // el mensaje legible ya quedó en `error`
    }
  }

  if (!muestra) return null

  return (
    <Modal abierto={abierto} titulo="Solicitar análisis" onCerrar={cerrar} maxWidth="max-w-2xl">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        <div className="flex items-center gap-3 rounded-2xl bg-verde-hoja/5 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
            <FlaskConical className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-marron-cafe">{muestra.code}</h3>
            <p className="text-xs text-marron-cafe/60">
              Lote {loteCodigo} · {productoNombre} · {proveedorNombre}
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={ClipboardList}>Datos generales</TituloSeccion>
          <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <TituloSeccion Icon={Beaker}>Ensayos solicitados</TituloSeccion>
            {totalEnsayos > 0 && (
              <Badge tono="positivo">
                {totalEnsayos} elegido{totalEnsayos === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          {errorCatalogo && (
            <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar el catálogo: {errorCatalogo}</p>
          )}
          {catalogo === null && !errorCatalogo && <p className="text-sm text-marron-cafe/50">Cargando catálogo…</p>}

          {catalogo && (
            <div className="flex flex-col gap-3">
              {porCategoria.map(([categoria, tests]) => {
                const IconoCategoria = CATEGORIA_ICON[categoria]
                const estilo = CATEGORIA_ESTILO[categoria]
                const elegidosCategoria = tests.filter((t) => seleccionados.has(t.id)).length
                return (
                  <div key={categoria} className={`rounded-xl border-l-4 bg-marron-tierra/5 p-3.5 ${estilo.borde}`}>
                    <div className="mb-2.5 flex items-center gap-2">
                      <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${estilo.icono}`}>
                        <IconoCategoria className="size-3.5" strokeWidth={1.75} />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wide text-marron-cafe/70">
                        {CATEGORIA_LABEL[categoria]}
                      </p>
                      {elegidosCategoria > 0 && (
                        <span className={`ml-auto text-xs font-bold ${estilo.contador}`}>{elegidosCategoria}</span>
                      )}
                    </div>
                    {/* columns, no grid: con grid, la fila entera se estira a
                        la altura del ítem más largo de esa fila (uno que
                        envuelve a 2 líneas hacía que su vecino de al lado
                        quedara con un hueco vacío igual de alto) — con
                        columnas cada ítem mide solo lo que necesita, sin
                        acoplarse al de al lado. break-inside-avoid evita que
                        un ítem se parta entre las dos columnas. */}
                    <div className="sm:columns-2 sm:gap-x-4">
                      {tests.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-start gap-2 rounded-lg px-2 py-1 text-sm text-marron-cafe transition-colors duration-150 hover:bg-white/70 [break-inside:avoid]"
                        >
                          <input
                            type="checkbox"
                            checked={seleccionados.has(t.id)}
                            onChange={() => alternarEnsayo(t.id)}
                            className="mt-0.5 size-4 shrink-0 accent-verde-lima"
                          />
                          <span className="leading-snug">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}

              {testOtro && (
                <div className="rounded-xl border-l-4 border-dashed border-marron-cafe/25 bg-marron-tierra/5 p-3.5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-marron-cafe/50">
                    Otros <span className="font-normal normal-case text-marron-cafe/40">(fuera de las 4 categorías)</span>
                  </p>
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
                          className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-marron-cafe"
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

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Truck}>Parámetros de entrega</TituloSeccion>
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
            <FormSelect
              label="Responsable de entrega"
              value={responsableEntregaId}
              onChange={(e) => setResponsableEntregaId(e.target.value)}
              hint={
                errorUsuarios
                  ? `No se pudo cargar la lista de personal: ${errorUsuarios}`
                  : usuarios?.length === 0
                    ? 'Tu rol no tiene acceso a listar personal (users:read).'
                    : undefined
              }
              className="sm:col-span-2"
              disabled={usuarios === null}
            >
              <option value="">{usuarios === null ? 'Cargando…' : 'Seleccioná…'}</option>
              {usuarios?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </FormSelect>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-marron-tierra/10 pt-4">
          <p className="text-xs text-marron-cafe/50">
            {totalEnsayos} ensayo{totalEnsayos === 1 ? '' : 's'} seleccionado{totalEnsayos === 1 ? '' : 's'}
          </p>
          <Button type="submit" disabled={enviando || !puedeEnviar} className="px-5 py-2.5">
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
