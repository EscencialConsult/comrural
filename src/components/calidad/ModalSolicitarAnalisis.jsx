import { useEffect, useMemo, useRef, useState } from 'react'
import { X, FlaskConical, ClipboardList, Truck, Beaker } from 'lucide-react'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { laboratoryTestsService } from '../../services/laboratoryTestsService'
import { iamService } from '../../services/iamService'
import { areasService } from '../../services/areasService'
import { useSolicitud } from '../../hooks/useSolicitud'
import { NATURALEZA_LABEL, USO_LABEL } from '../../config/analisisLabels'
import { CATEGORIA_LABEL, CATEGORIA_ICON, CATEGORIA_ESTILO, ORDEN_CATEGORIAS } from '../../config/analisisCategorias'
import Modal from '../Modal.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'
import Skeleton from '../Skeleton.jsx'
import ErrorBanner from '../ErrorBanner.jsx'

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
// El catálogo acá nunca trae 'OTHER' como ensayo elegible por checkbox (se
// maneja aparte, ver testOtro más abajo) — por eso este modal sigue
// filtrando esa categoría de porCategoria, aunque analisisCategorias.js ya
// la incluya para el otro consumidor (FormularioIniciarAnalisis.jsx).
const CATEGORIAS_CATALOGO = ORDEN_CATEGORIAS.filter((c) => c !== 'OTHER')

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

  // Refs para scroll-to-error: cada campo obligatorio tiene su ref apuntando
  // al contenedor de la sección/campo, para poder hacer scrollIntoView si
  // el usuario intenta enviar con ese campo vacío.
  const refNaturaleza = useRef(null)
  const refUso = useRef(null)
  const refEnsayos = useRef(null)
  const refResponsable = useRef(null)

  // Campos que fallaron la última validación — se limpian individualmente
  // en cuanto el usuario los toca.
  const [camposError, setCamposError] = useState(new Set())

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

  // Responsable de entrega — filtrado para mostrar únicamente al personal
  // asignado al área de Laboratorio.
  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    Promise.all([
      iamService.listarUsuarios(),
      areasService.listar().then((r) => r.data).catch(() => []),
      iamService.listarRoles().catch(() => []),
    ])
      .then(async ([todosUsuarios, areasList, rolesList]) => {
        if (cancelado) return
        const activos = todosUsuarios.filter((u) => u.isActive)
        const areaLab = areasList.find((a) => a.name?.toLowerCase().includes('laboratorio'))
        
        const idsRolesLab = new Set(
          rolesList
            .filter(
              (r) =>
                (areaLab && r.areaId === areaLab.id) ||
                r.code?.toLowerCase().includes('lab') ||
                r.name?.toLowerCase().includes('laboratorio')
            )
            .map((r) => r.id)
        )

        const asignaciones = await Promise.allSettled(
          activos.map((u) => iamService.getRolesDeUsuario(u.id))
        )
        if (cancelado) return

        const filtrados = activos.filter((u, index) => {
          const res = asignaciones[index]
          if (res.status !== 'fulfilled' || !Array.isArray(res.value)) return false
          const rolesDeUsuario = res.value.filter((a) => a.effective !== false)
          return rolesDeUsuario.some(
            (a) =>
              (a.roleId && idsRolesLab.has(a.roleId)) ||
              (areaLab && a.role?.areaId === areaLab.id) ||
              a.role?.code?.toLowerCase().includes('lab') ||
              a.role?.name?.toLowerCase().includes('laboratorio')
          )
        })

        setUsuarios(filtrados.length > 0 ? filtrados : activos)
      })
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
    return CATEGORIAS_CATALOGO.filter((c) => mapa.has(c)).map((c) => [c, mapa.get(c)])
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

  // Limpia el error de un campo en cuanto el usuario interactúa con él.
  const limpiarCampoError = (campo) =>
    setCamposError((prev) => { const s = new Set(prev); s.delete(campo); return s })

  const cerrar = () => {
    setNaturaleza('')
    setUso('')
    setTipoSolicitud('REGULAR')
    setResponsableEntregaId('')
    setSeleccionados(new Set())
    setOtroTexto('')
    setOtrosAgregados([])
    setCamposError(new Set())
    limpiarError()
    onCerrar()
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!muestra) return

    // Validar y hacer scroll al primer campo vacío si hay alguno.
    if (!puedeEnviar) {
      const errores = new Set()
      let primerRef = null

      if (naturaleza === '') { errores.add('naturaleza'); primerRef = primerRef ?? refNaturaleza }
      if (uso === '')        { errores.add('uso');        primerRef = primerRef ?? refUso }
      if (totalEnsayos === 0) { errores.add('ensayos');   primerRef = primerRef ?? refEnsayos }
      if (responsableEntregaId.trim() === '') { errores.add('responsable'); primerRef = primerRef ?? refResponsable }

      setCamposError(errores)
      primerRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

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

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={ClipboardList}>Datos generales</TituloSeccion>
          <div className="grid gap-4 sm:grid-cols-2">
            <div ref={refNaturaleza}>
              <FormSelect
                label="Naturaleza"
                value={naturaleza}
                onChange={(e) => { setNaturaleza(e.target.value); limpiarCampoError('naturaleza') }}
                className={camposError.has('naturaleza') ? 'ring-2 ring-rojo-pasankalla/60 rounded-xl' : ''}
              >
                <option value="">Seleccioná…</option>
                {NATURALEZAS.map((n) => (
                  <option key={n.value} value={n.value}>
                    {n.label}
                  </option>
                ))}
              </FormSelect>
              {camposError.has('naturaleza') && (
                <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Campo obligatorio</p>
              )}
            </div>
            <div ref={refUso}>
              <FormSelect
                label="Uso"
                value={uso}
                onChange={(e) => { setUso(e.target.value); limpiarCampoError('uso') }}
                className={camposError.has('uso') ? 'ring-2 ring-rojo-pasankalla/60 rounded-xl' : ''}
              >
                <option value="">Seleccioná…</option>
                {USOS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </FormSelect>
              {camposError.has('uso') && (
                <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Campo obligatorio</p>
              )}
            </div>
          </div>
        </div>

        <div
          ref={refEnsayos}
          className={`flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${
            camposError.has('ensayos') ? 'border-rojo-pasankalla/50' : 'border-marron-tierra/10'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <TituloSeccion Icon={Beaker}>Ensayos solicitados</TituloSeccion>
            {totalEnsayos > 0 && (
              <Badge tono="positivo">
                {totalEnsayos} elegido{totalEnsayos === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          {camposError.has('ensayos') && (
            <p className="text-xs font-medium text-rojo-pasankalla">Elegí al menos un ensayo para continuar.</p>
          )}
          {errorCatalogo && (
            <ErrorBanner mensaje={`No se pudo cargar el catálogo: ${errorCatalogo}`} />
          )}
          {catalogo === null && !errorCatalogo && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          )}

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
                    Otros <span className="font-normal normal-case text-marron-cafe/40">(fuera del catálogo de arriba)</span>
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
          {totalEnsayos === 0 && catalogo && !camposError.has('ensayos') && (
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
            <div ref={refResponsable} className="sm:col-span-2">
              <FormSelect
                label="Responsable de entrega"
                value={responsableEntregaId}
                onChange={(e) => { setResponsableEntregaId(e.target.value); limpiarCampoError('responsable') }}
                hint={
                  errorUsuarios
                    ? `No se pudo cargar la lista de personal: ${errorUsuarios}`
                    : usuarios?.length === 0
                      ? 'Tu rol no tiene acceso a listar personal (users:read).'
                      : undefined
                }
                className={camposError.has('responsable') ? 'ring-2 ring-rojo-pasankalla/60 rounded-xl' : ''}
                disabled={usuarios === null}
              >
                <option value="">{usuarios === null ? 'Cargando…' : 'Seleccioná…'}</option>
                {usuarios?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </FormSelect>
              {camposError.has('responsable') && (
                <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Campo obligatorio</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-marron-tierra/10 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-marron-cafe/50">
              {totalEnsayos} ensayo{totalEnsayos === 1 ? '' : 's'} seleccionado{totalEnsayos === 1 ? '' : 's'}
            </p>
            <Button type="submit" disabled={enviando} className="px-5 py-2.5">
              {enviando ? 'Enviando…' : 'Enviar solicitud'}
            </Button>
          </div>
          {error && <ErrorBanner mensaje={error} />}
        </div>
      </form>
    </Modal>
  )
}
