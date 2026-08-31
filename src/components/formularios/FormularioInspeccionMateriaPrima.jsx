import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Printer, TriangleAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSolicitud } from '../../hooks/useSolicitud'
import { rawMaterialReceptionsService } from '../../services/rawMaterialReceptionsService'
import { inspectionsService } from '../../services/inspectionsService'
import { productsService } from '../../services/productsService'
import { suppliersService } from '../../services/suppliersService'
import { useGenerarPdf } from '../../hooks/useGenerarPdf'
import { toast } from '../../lib/toast'
import AccesoDenegado from '../dashboard/AccesoDenegado.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Switch from '../Switch.jsx'
import CabeceraFormulario from './CabeceraFormulario.jsx'
import SeccionFormulario from './SeccionFormulario.jsx'
import AsistenteDeEtapas from './AsistenteDeEtapas.jsx'
import DatosGeneralesLote from './DatosGeneralesLote.jsx'
import TablaCriterios from './TablaCriterios.jsx'
import TablaRechazo from './TablaRechazo.jsx'
import TablaMediciones from './TablaMediciones.jsx'
import CampoObservaciones from './CampoObservaciones.jsx'
import FirmasResponsables from './FirmasResponsables.jsx'
import AvisoFaltante from './AvisoFaltante.jsx'
import { solicitarAltaDeMaestro } from './solicitudesDeAlta'
import { ITEM_ACEPTA_CONDICIONES, ITEM_TOTAL_RECHAZADAS, COLUMNAS_RECHAZO } from './codigosCriticosInspeccion.js'

// Registro I-CAL-29/R-01 — "Inspección de Materia Prima", maquetado según el
// papel real. Cuerpo del formulario extraído como componente propio, sin
// ruta ni router adentro — mismo criterio que
// FormularioIngresoMateriaPrima.jsx: `lotId`/`onVolver` llegan por props, no
// de `useParams()`/`useNavigate()`.
//
// Por qué se sacó de la pantalla: Facundo pidió una subpestaña
// "Recepción/Inspección" DENTRO de Calidad y Laboratorio — al tocar un
// lote ahí se abre el formulario directo, sin pasar por la pantalla
// intermedia de estado (PanelRecepcionLote.jsx) que existía antes. Ese
// hub sigue vivo para quien lo necesite completo (Compras, desde
// PanelLotes.jsx), pero ya no es el único camino hacia acá.
//
// Diferencia de fondo con FormularioInspeccion.jsx, que ya existía: aquel
// es un renderer GENÉRICO — recorre form.items y dibuja un control por
// ítem, uno debajo del otro, sin saber qué significa cada sección. Sirve
// para cualquier formulario, pero no puede producir la forma del papel: un
// cuestionario con observación por criterio, dos bloques de rechazo con
// contador, una grilla de 3 mediciones por categoría.
//
// Esta pantalla es SECTION-AWARE: conoce los tres códigos de sección
// reales de este formulario y le da a cada uno su disposición propia. Las
// secciones que no reconoce caen en un render genérico al final, así que
// si el backend suma una sección nueva no desaparece de la pantalla.
const SECCION = {
  CONDICIONES: 'arrival_conditions',
  RECHAZO: 'rejection_evaluation',
  TAMANIO_GRANO: 'grain_size',
}

// La pregunta que corta el formulario: si se responde "No", se rechaza el
// lote entero y el resto de la hoja deja de aplicar.
//
// ITEM_ACEPTA_CONDICIONES, ITEM_TOTAL_RECHAZADAS y COLUMNAS_RECHAZO viven
// en codigosCriticosInspeccion.js (no acá) para que PanelFormularios.jsx
// pueda advertir antes de dar de baja uno de estos ítems sin tener que
// importar este componente completo. Es la misma fuente que se usa más
// abajo — no hay una segunda lista con estos códigos.
//
// En el papel, la tabla de rechazo (sección 3) es UNA sola tabla de
// hallazgos impresa a dos columnas porque no entra a lo largo: arranca en
// "Paja", baja nueve renglones y sigue en "Granos dañados". No hay
// títulos de bloque ahí — es la misma lista que continúa, y por eso acá
// tampoco los hay. El corte va por código y no por `sortOrder` partido al
// medio: los dos grupos "Otros" van al final de la sección (sortOrder 15
// a 18) aunque en la hoja cada uno cierra SU columna, así que el orden de
// la base no alcanza para reconstruir la disposición.

// Aclaración del asterisco de "Materias extrañas", al pie de toda la tabla.
// No es decorativa: define qué cuenta como materia extraña, que es lo que
// evita que dos analistas clasifiquen distinto el mismo hallazgo.
const NOTA_MATERIAS_EXTRANIAS = '* Vidrio, metal, madera, semillas, semillas alergénicas.'

// Restos de prueba cargados a mano en el formulario real (I-CAL-29/R-01)
// mientras se probaban los endpoints de alta — no son del papel, nunca
// deberían haber quedado activos. Ya hay una migración lista para
// borrarlos de la base (0029_cleanup_test_form_items.sql), pero no se pudo
// aplicar todavía (contraseña vencida en MIGRATION_DATABASE_URL, ver
// docs/formulario-inspeccion-materia-prima.md §3 y el reporte de esta
// sesión). Hasta que se aplique, se filtran acá para que no se vean —
// Facundo pidió sacar puntualmente esto, no todo el aviso de "campos sin
// clasificar" (que sigue sirviendo si el backend suma una sección de
// verdad nueva mañana).
//
// OJO: `nueva_seccion` (código) y `nueva_seccion` (sección) son DOS restos
// de prueba distintos, encontrados probando el asistente en vivo — el
// ítem de código `nueva_seccion` vive DENTRO de la sección real
// `grain_size` (TEXT, obligatorio), así que bloqueaba el paso "Tamaño de
// grano" del asistente sin que se viera por qué (el aviso de "campos sin
// clasificar" sí lo mostraba, pero coincidía con la etapa 4, no era obvio
// que fuera basura de prueba y no un dato real faltante).
const CODIGOS_PRUEBA_CONOCIDOS = new Set(['asd', 'nuevo_campo', 'adf', 'nueva_seccion'])

const clave = (itemId, occurrence) => `${itemId}:${occurrence}`

const soloFecha = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '')
// 'es-BO' con hour12:false — el formulario en papel maneja horario de 24 h,
// sin AM/PM.
const soloHora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }) : null

const valorDesdeRespuesta = (item, r) => {
  if (!r) return null
  switch (item.dataType) {
    case 'BOOLEAN':
      return r.valueBoolean ?? null
    case 'INTEGER':
    case 'DECIMAL':
      return r.valueNumber ?? null
    case 'TEXT':
      return r.valueText ?? null
    case 'DATE':
      return r.valueDate ?? null
    case 'SELECT':
      return r.valueOption ?? null
    default:
      return null
  }
}

const campoValor = (item, valor) => {
  switch (item.dataType) {
    case 'BOOLEAN':
      return { valueBoolean: valor }
    case 'INTEGER':
    case 'DECIMAL':
      return { valueNumber: Number(valor) }
    case 'DATE':
      return { valueDate: valor }
    case 'SELECT':
      return { valueOption: valor }
    default:
      return { valueText: String(valor) }
  }
}

const GENERALES_VACIOS = { producto: null, proveedor: null, lote: null, fecha: '', horaInicio: null, horaFin: null }

export default function FormularioInspeccionMateriaPrima({ lotId, onVolver, tituloVolver = 'Volver' }) {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('raw-material-receptions:read')

  const [recepcion, setRecepcion] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [valores, setValores] = useState({})
  const [tocados, setTocados] = useState(new Set())
  const [observaciones, setObservaciones] = useState('')
  const [generales, setGenerales] = useState(GENERALES_VACIOS)
  const [listados, setListados] = useState({ productos: [], proveedores: [] })
  const [confirmacion, setConfirmacion] = useState(null)
  const [confirmandoFinal, setConfirmandoFinal] = useState(false)
  const [avisoGuardarPrimero, setAvisoGuardarPrimero] = useState(false)
  const [pasoActual, setPasoActual] = useState(0)
  const { enviando, error, ejecutar } = useSolicitud()

  // El asistente arranca desde el paso 1 cada vez que se entra a OTRO
  // lote — mismo criterio que FormularioIngresoMateriaPrima.jsx.
  useEffect(() => {
    setPasoActual(0)
  }, [lotId])

  // PDF real, no un screenshot de window.print() — Facundo lo pidió
  // explícito: el botón "Imprimir" abría el diálogo nativo del navegador,
  // y ahí lo que se ve/genera depende de cada navegador (algunos rasterizan
  // mal, otros ignoran el print-color-adjust) — "se ve todo mal, todo
  // feo". Ver useGenerarPdf.js para el mecanismo completo (canvas + jsPDF,
  // cortando hoja solo entre secciones, nunca en medio de una).
  const { areaImprimibleRef, generandoPdf, errorPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#faf4e8' })

  const recargar = useCallback(() => {
    if (!puedeVer) return
    setErrorCarga(null)
    rawMaterialReceptionsService
      .obtener(lotId)
      .then(async (datos) => {
        setRecepcion(datos)
        if (!datos.inspection?.id) {
          setDetalle(null)
          return
        }
        setDetalle(await inspectionsService.obtener(datos.inspection.id))
      })
      .catch((err) => setErrorCarga(err.message))
  }, [lotId, puedeVer])

  useEffect(() => {
    recargar()
  }, [recargar])

  // Auto-crea la inspección apenas se detecta que no existe, sin pedir un
  // segundo click de confirmación — antes esto era una pantalla propia
  // ("Todavía no hay una inspección abierta... [Iniciar inspección]") que
  // Facundo marcó, más de una vez, como una ventana previa de más: el
  // botón de la tabla ABRE EL FORMULARIO, no una pantalla intermedia.
  //
  // Un 409 "ya existe una inspección vigente" acá NO es un error real —
  // es la prueba de que la inspección YA está creada (por ejemplo, otro
  // intento se cruzó con este) y de que `recargar()` simplemente todavía
  // no la había visto. Se trata como éxito: se vuelve a pedir la vista
  // consolidada, que esta vez sí trae el detalle real. Usa un estado
  // propio (`errorInicio`), separado del `error` de `useSolicitud` (ese
  // queda para Guardar/Finalizar) — así un 409 que se resuelve solo no le
  // hace parpadear un banner de error a nadie.
  const [errorInicio, setErrorInicio] = useState(null)
  const [iniciandoAuto, setIniciandoAuto] = useState(false)

  const intentarIniciar = useCallback(() => {
    setIniciandoAuto(true)
    setErrorInicio(null)
    return inspectionsService
      .iniciar(lotId, {})
      .then(() => recargar())
      .catch((err) => {
        if (err.status === 409) {
          recargar()
          return
        }
        setErrorInicio(err.message)
      })
      .finally(() => setIniciandoAuto(false))
  }, [lotId, recargar])

  // `lotIdIntentado` guarda el ÚLTIMO lote para el que ya se intentó, no
  // un booleano simple — sin eso, cambiar de `lotId` sin desmontar el
  // componente dejaría el auto-inicio bloqueado para siempre después del
  // primer intento.
  const lotIdIntentado = useRef(null)
  useEffect(() => {
    if (!recepcion || detalle) return
    if (!permisos.has('inspections:create')) return
    if (lotIdIntentado.current === lotId) return
    lotIdIntentado.current = lotId
    intentarIniciar()
  }, [recepcion, detalle, permisos, lotId, intentarIniciar])

  // Maestros para los selectores de la sección 1 (producto / proveedor).
  // Cada opción viaja como { id, nombre, detalle }: el `id` es lo que de
  // verdad identifica la fila, `nombre` lo que se busca y se muestra, y
  // `detalle` el dato de desempate — hay proveedores homónimos cargados dos
  // veces con distinto tipo (PRODUCER y OTHER), y sin el tipo al lado son dos
  // renglones idénticos imposibles de distinguir. "Lote" quedó fijo (no
  // editable, ver DatosGeneralesLote.jsx), no necesita su propio maestro acá.
  //
  // allSettled y no all: el rol `calidad` NO tiene `lots:read` (ver
  // 0019_business_modules_permissions.sql) — si algún día se necesitara ese
  // pedido, no debería tirar abajo también producto y proveedor, que sí
  // puede leer.
  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    Promise.allSettled([productsService.listar({ limit: 100 }), suppliersService.listar({ limit: 100 })]).then(
      ([productos, proveedores]) => {
        if (cancelado) return
        const datos = (r) => (r.status === 'fulfilled' ? (r.value.data ?? []) : [])
        setListados({
          productos: datos(productos).map((p) => ({ id: p.id, nombre: p.name, detalle: p.code })),
          proveedores: datos(proveedores).map((s) => ({
            id: s.id,
            nombre: s.person
              ? `${s.person.firstNames} ${s.person.lastNames}`
              : (s.organization?.tradeName ?? s.organization?.legalName ?? 'Sin nombre'),
            detalle: s.type,
          })),
        })
      },
    )
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  // Se resiembra SOLO cuando cambia el formulario (otra inspección), nunca en
  // cada refresco: si dependiera de `responses`, cualquier recarga pisaría lo
  // que el usuario tipeó y todavía no guardó.
  const formId = detalle?.form?.id
  useEffect(() => {
    if (!detalle || !recepcion) return
    const mapa = {}
    for (const item of detalle.form.items) {
      for (const r of detalle.responses.filter((resp) => resp.itemId === item.id)) {
        mapa[clave(item.id, r.occurrence)] = valorDesdeRespuesta(item, r)
      }
    }
    setValores(mapa)
    setTocados(new Set())
    setObservaciones(detalle.inspection?.notes ?? '')
    setGenerales({
      // Objetos { id, nombre } y no cadenas: lo que identifica al producto es
      // su id, no cómo está escrito su nombre.
      producto: recepcion.lot?.productId
        ? { id: recepcion.lot.productId, nombre: recepcion.lot.productName ?? '' }
        : null,
      proveedor: recepcion.lot?.supplierId
        ? { id: recepcion.lot.supplierId, nombre: recepcion.lot.supplierName ?? '' }
        : null,
      lote: recepcion.lot?.id ? { id: recepcion.lot.id, nombre: recepcion.lot.code ?? '' } : null,
      fecha: soloFecha(detalle.inspection?.startedAt),
      horaInicio: soloHora(detalle.inspection?.startedAt),
      horaFin: soloHora(detalle.inspection?.completedAt),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId])

  useEffect(() => {
    if (!confirmacion) return
    const id = setTimeout(() => setConfirmacion(null), 4000)
    return () => clearTimeout(id)
  }, [confirmacion])

  useEffect(() => {
    if (!avisoGuardarPrimero) return
    const id = setTimeout(() => setAvisoGuardarPrimero(false), 4000)
    return () => clearTimeout(id)
  }, [avisoGuardarPrimero])

  const porSeccion = useMemo(() => {
    const mapa = new Map()
    for (const item of detalle?.form?.items ?? []) {
      if (CODIGOS_PRUEBA_CONOCIDOS.has(item.code)) continue
      if (!mapa.has(item.section)) mapa.set(item.section, [])
      mapa.get(item.section).push(item)
    }
    for (const items of mapa.values()) items.sort((a, b) => a.sortOrder - b.sortOrder)
    return mapa
  }, [detalle])

  const leer = (item, occurrence = 1) => valores[clave(item.id, occurrence)] ?? null

  const escribir = (item, occurrence, valor) => {
    setValores((prev) => ({ ...prev, [clave(item.id, occurrence)]: valor }))
    setTocados((prev) => new Set(prev).add(clave(item.id, occurrence)))
  }

  // Qué ocurrencias de un ítem tienen valor hoy. Lo necesitan los grupos
  // repetibles de "Otros" de la sección 3: la cantidad de filas visibles sale
  // de acá, no de un contador aparte.
  const ocurrenciasDe = useCallback(
    (item) => {
      if (!item) return []
      const prefijo = `${item.id}:`
      return Object.entries(valores)
        .filter(([k, v]) => k.startsWith(prefijo) && v !== null && v !== '')
        .map(([k]) => Number(k.split(':')[1]))
    },
    [valores],
  )

  // Pedido de alta de un maestro que falta. Hoy es un stub local de la
  // maqueta (ver components/formularios/solicitudesDeAlta.js): el aviso no le
  // llega a nadie todavía porque falta definir quién carga cada maestro. La
  // interacción queda igual para cuando exista el endpoint de verdad.
  const solicitarAlta = ({ tipo, detalle }) => solicitarAltaDeMaestro({ tipo, detalle })

  if (!puedeVer) return <AccesoDenegado mensaje="No tenés acceso a la inspección de materia prima." />

  if (errorCarga) {
    // El backend valida `lotId` como UUID, así que entrar a esta ruta con un
    // id inventado (o con el `:lotId` literal de la definición de la ruta)
    // devuelve "Invalid UUID" — correcto para la API, inútil para quien está
    // mirando la pantalla. Se traduce a la acción que realmente destraba.
    const idInvalido = /uuid/i.test(errorCarga)
    return (
      <div className="flex w-full flex-col items-start gap-3">
        <p className="text-sm font-medium text-rojo-pasankalla">
          {idInvalido ? 'La dirección no apunta a ningún lote real.' : `No se pudo cargar: ${errorCarga}`}
        </p>
        <div className="flex flex-wrap gap-2">
          {onVolver && (
            <Button className="px-3 py-1.5 text-xs" onClick={onVolver}>
              {tituloVolver}
            </Button>
          )}
          {!idInvalido && (
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={recargar}>
              Reintentar
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!recepcion) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (!detalle) {
    // Sin inspección abierta no hay formulario que mostrar: los ítems, sus
    // secciones y sus respuestas cuelgan todos de la inspección. El
    // `useEffect` de más arriba ya está creándola sola en este mismo
    // instante — esto NO es una pantalla propia, es el mismo "Cargando…"
    // que se ve un poco más arriba mientras llega `recepcion`. Un 409 se
    // resuelve solo (ver `intentarIniciar`) y nunca llega a mostrarse acá.
    const puedeIniciar = permisos.has('inspections:create')

    if (!puedeIniciar) {
      return (
        <div className="flex w-full flex-col items-start gap-3">
          <p className="text-sm text-marron-cafe/60">Todavía no hay una inspección abierta para este lote.</p>
          <p className="text-xs text-marron-cafe/50">Tu rol no tiene permiso para abrir inspecciones.</p>
          {onVolver && (
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onVolver}>
              {tituloVolver}
            </Button>
          )}
        </div>
      )
    }

    if (errorInicio) {
      // Solo llega acá si el auto-inicio falló por algo que NO es "ya
      // existe" — permiso real caído a mitad de sesión, red, etc.
      return (
        <div className="flex w-full flex-col items-start gap-3">
          <p className="rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-medium text-rojo-pasankalla">
            {errorInicio}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={iniciandoAuto} className="px-3 py-1.5 text-xs" onClick={intentarIniciar}>
              {iniciandoAuto ? 'Reintentando…' : 'Reintentar'}
            </Button>
            {onVolver && (
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onVolver}>
                {tituloVolver}
              </Button>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  const { form, inspection } = detalle
  const { qualityResolution, warehouseReceipt } = recepcion

  // Cada sección se filtra al tipo de dato que su maquetación sabe dibujar.
  // No es defensa teórica: el formulario real tiene ítems TEXT sueltos en
  // secciones numéricas (`nueva_seccion` dentro de grain_size), y sin este
  // filtro un contador de porcentaje intentaría renderizar un campo de texto.
  // Lo que queda afuera no se pierde: cae en `sueltos`, que se muestran
  // señalados al pie de su sección.
  const condiciones = (porSeccion.get(SECCION.CONDICIONES) ?? []).filter((i) => i.dataType === 'BOOLEAN')
  const seccionRechazo = porSeccion.get(SECCION.RECHAZO) ?? []
  const itemTotalRechazadas = seccionRechazo.find((i) => i.code === ITEM_TOTAL_RECHAZADAS)
  const porCodigo = new Map(seccionRechazo.map((i) => [i.code, i]))

  const columnasRechazo = COLUMNAS_RECHAZO.map((col) => {
    const miembros = seccionRechazo.filter((i) => i.groupCode === col.grupoOtros)
    const descripcion = miembros.find((i) => i.dataType === 'TEXT')
    const cantidad = miembros.find((i) => i.dataType === 'INTEGER')
    return {
      items: col.codigos.map((c) => porCodigo.get(c)).filter(Boolean),
      grupo: descripcion && cantidad ? { groupCode: col.grupoOtros, descripcion, cantidad } : null,
    }
  })

  // Ítems de la sección que no entran en ningún bloque conocido. Hoy esto
  // atrapa restos de prueba que quedaron cargados en el formulario real
  // (`asd`/"asdf"), y como varios están marcados como obligatorios, bloquean
  // el cierre de la inspección. Se muestran aparte y señalados en vez de
  // esconderlos: si no se ven, el 400 al finalizar no tiene explicación.
  const clasificados = new Set([
    ...COLUMNAS_RECHAZO.flatMap((c) => c.codigos),
    ...seccionRechazo.filter((i) => i.groupCode).map((i) => i.code),
    ITEM_TOTAL_RECHAZADAS,
  ])
  const sueltosRechazo = seccionRechazo.filter((i) => !clasificados.has(i.code))
  const seccionGrano = porSeccion.get(SECCION.TAMANIO_GRANO) ?? []
  const tamanioGrano = seccionGrano.filter((i) => i.dataType === 'DECIMAL' || i.dataType === 'INTEGER')
  const sueltosGrano = seccionGrano.filter((i) => !tamanioGrano.includes(i))
  const sueltosCondiciones = (porSeccion.get(SECCION.CONDICIONES) ?? []).filter((i) => !condiciones.includes(i))
  const otrasSecciones = Array.from(porSeccion.entries()).filter(([s]) => !Object.values(SECCION).includes(s))

  const itemAcepta = condiciones.find((i) => i.code === ITEM_ACEPTA_CONDICIONES)
  // Se compara contra `false` explícito, no `!valor`: mientras la pregunta
  // esté sin responder (null) el formulario sigue entero.
  const rechazoTotal = itemAcepta ? leer(itemAcepta) === false : false

  const soloLectura = inspection.status !== 'INICIADA' || !permisos.has('inspections:update')

  // Cuántas obligatorias faltan — sin esto "Finalizar inspección" quedaba
  // habilitado siempre que la inspección estuviera INICIADA, sin mirar si
  // de verdad estaba respondida. No intenta reproducir
  // `assertAllRequiredAnswered` al pixel (occurrences repetibles quedan del
  // lado optimista: alcanza con 1 fila cargada) — es una cota inferior para
  // avisar ANTES de intentar, no el árbitro final.
  const faltantes = form.items.filter((item) => {
    // Los restos de prueba (CODIGOS_PRUEBA_CONOCIDOS) ya no se muestran en
    // ningún lado del formulario — bloquear "Finalizar" por un campo que
    // nadie puede ver ni llenar sería peor que el problema original. Si el
    // backend todavía los tiene activos y obligatorios (hasta que se
    // aplique la migración de limpieza), el 400 real va a seguir
    // mostrándose en el aviso de error de más abajo, igual que cualquier
    // otro caso que este cálculo no llegue a cubrir.
    if (CODIGOS_PRUEBA_CONOCIDOS.has(item.code)) return false
    // Rechazo (sección 3) nunca bloquea: cada contador ya se MUESTRA en "0"
    // por defecto (ver TablaRechazo.jsx, "sin valor cargado = no apareció,
    // que es lo mismo que 0") — pedirle al analista que "llene" un renglón
    // que ya vale 0 no tiene sentido. `guardar()` de abajo manda ese 0 real
    // al backend para lo que nunca se tocó, así el paso avanza y
    // `assertAllRequiredAnswered` del lado del servidor igual queda
    // conforme.
    if (item.section === SECCION.RECHAZO) return false
    if (!item.isRequired) return false
    const ocurrenciasEsperadas = item.occurrences != null && item.occurrences > 1 ? item.occurrences : 1
    for (let occ = 1; occ <= ocurrenciasEsperadas; occ++) {
      if (leer(item, occ) === null) return true
    }
    return false
  })

  const guardar = async () => {
    const cambios = []
    for (const k of tocados) {
      const [itemId, occ] = k.split(':')
      const item = form.items.find((i) => i.id === itemId)
      if (!item) continue
      const valor = valores[k]
      if (valor === null || valor === '') cambios.push({ itemId, occurrence: Number(occ), clear: true })
      else cambios.push({ itemId, occurrence: Number(occ), ...campoValor(item, valor) })
    }
    // Completa con 0 real los contadores de Rechazo que nunca se tocaron —
    // sin `rechazoTotal` (el lote no se rechazó entero, esa sección sigue
    // aplicando). Es la contraparte de sacarlos de `faltantes` arriba: acá
    // se persiste de verdad lo que ahí se dejó de exigir.
    if (!rechazoTotal) {
      for (const item of form.items) {
        if (item.section !== SECCION.RECHAZO || !item.isRequired) continue
        const ocurrenciasEsperadas = item.occurrences != null && item.occurrences > 1 ? item.occurrences : 1
        for (let occ = 1; occ <= ocurrenciasEsperadas; occ++) {
          if (tocados.has(clave(item.id, occ)) || leer(item, occ) !== null) continue
          cambios.push({ itemId: item.id, occurrence: occ, ...campoValor(item, 0) })
        }
      }
    }
    // startedAt se manda junto con las respuestas en el mismo "Guardar" —
    // mismo criterio que FormularioIngresoMateriaPrima.jsx (Almacén): se
    // combinan fecha+hora locales y se interpretan en hora local del
    // navegador.
    const startedAtIso =
      generales.fecha && generales.horaInicio ? new Date(`${generales.fecha}T${generales.horaInicio}`).toISOString() : null

    if (cambios.length === 0 && !startedAtIso) return
    try {
      await ejecutar(() =>
        Promise.all([
          cambios.length > 0 ? inspectionsService.guardarRespuestas(inspection.id, cambios) : Promise.resolve(),
          startedAtIso ? inspectionsService.actualizar(inspection.id, { startedAt: startedAtIso }) : Promise.resolve(),
        ]),
      )
      setConfirmacion('Cambios guardados.')
      setAvisoGuardarPrimero(false)
      // `recargar()` no reseeda `tocados` (el `useEffect` que lo hace está
      // atado a `formId`, que no cambia al guardar) — sin esto, "Finalizar"
      // seguía viendo cambios "sin guardar" para siempre después del primer
      // guardado.
      setTocados(new Set())
      recargar()
    } catch {
      // el mensaje legible ya quedó en `error`
    }
  }

  // `faltantes` (arriba) ya bloquea el botón antes de intentar, pero
  // `assertAllRequiredAnswered` del backend sigue siendo quien manda. Si el
  // backend igual rechaza por algo que el cálculo de acá no vio, el mensaje
  // de `error` lo cuenta tal cual.
  const finalizar = async () => {
    try {
      await ejecutar(() => inspectionsService.completar(inspection.id, {}))
      setConfirmandoFinal(false)
      toast.success('Inspección finalizada.')
      onVolver?.()
    } catch {
      // se deja `confirmandoFinal` abierto para reintentar sin perder el
      // contexto de qué se estaba por confirmar
    }
  }

  // Antes, "Finalizar inspección" completaba directo aunque hubiera
  // respuestas tipeadas y nunca guardadas (`tocados` sin vaciar) — esos
  // cambios se perdían en silencio, porque el backend valida contra lo que
  // ya está en `form_responses`, no contra el estado local. Ahora ese clic
  // se corta acá si `tocados` no está vacío, con un aviso en vez de abrir
  // la confirmación.
  const pedirFinalizar = () => {
    if (tocados.size > 0) {
      setAvisoGuardarPrimero(true)
      return
    }
    setConfirmandoFinal(true)
  }

  // Completitud por etapa — reusa `faltantes` (ya calculado arriba, la
  // misma fuente que gatea "Finalizar inspección"), filtrado por sección,
  // en vez de reinventar una segunda regla de qué está respondido. Si
  // `rechazoTotal` (se rechazó el lote completo), Rechazo y Tamaño de
  // grano quedan `soloLectura` y su contenido "queda sin efecto" — no
  // tiene sentido trabar el asistente ahí esperando respuestas que ya no
  // se pueden cargar.
  const seccionSinFaltantes = (codigoSeccion) => faltantes.every((i) => i.section !== codigoSeccion)
  const condicionesCompleta = seccionSinFaltantes(SECCION.CONDICIONES)
  const rechazoCompleta = rechazoTotal || seccionSinFaltantes(SECCION.RECHAZO)
  const granoCompleta = rechazoTotal || seccionSinFaltantes(SECCION.TAMANIO_GRANO)
  const motivoIncompleta = (codigoSeccion) =>
    `Faltan: ${faltantes
      .filter((i) => i.section === codigoSeccion)
      .map((i) => i.label)
      .join(' · ')}`

  const etapas = [
    {
      id: 'generales',
      titulo: 'Datos generales',
      completa: true,
      contenido: (
        // El aviso de "falta un dato" vive acá y no en el encabezado: los
        // campos que pueden quedarse sin opción (producto, proveedor, lote)
        // son justo los de esta sección, así que la salida tiene que estar
        // donde aparece el problema, no a media pantalla de distancia.
        <SeccionFormulario numero={1} titulo="Datos generales" acciones={<AvisoFaltante onEnviar={solicitarAlta} />}>
          <DatosGeneralesLote
            valores={generales}
            opciones={listados}
            soloLectura={soloLectura}
            onCambiarFecha={(v) => setGenerales((g) => ({ ...g, fecha: v }))}
            onCambiarHoraInicio={(v) => setGenerales((g) => ({ ...g, horaInicio: v }))}
          />
        </SeccionFormulario>
      ),
    },
    condiciones.length > 0 && {
      id: 'condiciones',
      titulo: 'Condiciones de llegada de transporte',
      completa: condicionesCompleta,
      motivoIncompleta: motivoIncompleta(SECCION.CONDICIONES),
      contenido: (
        <SeccionFormulario numero={2} titulo="Condiciones de llegada de transporte" nota="Marcá Sí o No según corresponda.">
          <TablaCriterios
            items={condiciones}
            valorDe={(item) => leer(item)}
            onCambiar={(item, v) => escribir(item, 1, v)}
            soloLectura={soloLectura}
            codigoDecisivo={ITEM_ACEPTA_CONDICIONES}
          />
          <CamposSinClasificar items={sueltosCondiciones} leer={leer} escribir={escribir} soloLectura={soloLectura} />
        </SeccionFormulario>
      ),
    },
    seccionRechazo.length > 0 && {
      id: 'rechazo',
      titulo: 'Evaluación de inspección (rechazo)',
      completa: rechazoCompleta,
      motivoIncompleta: rechazoTotal ? undefined : motivoIncompleta(SECCION.RECHAZO),
      contenido: (
        <SeccionFormulario
          numero={3}
          titulo="Evaluación de inspección (rechazo)"
          nota="Cantidad de sacos afectados por cada hallazgo. El total se suma solo."
          className={rechazoTotal ? 'opacity-40' : ''}
        >
          <TablaRechazo
            columnas={columnasRechazo}
            itemTotal={itemTotalRechazadas}
            notaAlPie={NOTA_MATERIAS_EXTRANIAS}
            valorDe={(item, occ) => leer(item, occ)}
            onCambiar={(item, occ, v) => escribir(item, occ, v)}
            ocurrenciasDe={ocurrenciasDe}
            soloLectura={soloLectura || rechazoTotal}
          />
          <CamposSinClasificar
            items={sueltosRechazo}
            leer={leer}
            escribir={escribir}
            soloLectura={soloLectura || rechazoTotal}
          />
        </SeccionFormulario>
      ),
    },
    tamanioGrano.length > 0 && {
      id: 'grano',
      titulo: 'Tamaño de grano',
      completa: granoCompleta,
      motivoIncompleta: rechazoTotal ? undefined : motivoIncompleta(SECCION.TAMANIO_GRANO),
      contenido: (
        <SeccionFormulario
          numero={4}
          titulo="Tamaño de grano"
          nota="Porcentaje retenido en cada una de las tres mediciones."
          className={rechazoTotal ? 'opacity-40' : ''}
        >
          <TablaMediciones
            items={tamanioGrano}
            valorDe={(item, occ) => leer(item, occ)}
            onCambiar={(item, occ, v) => escribir(item, occ, v)}
            soloLectura={soloLectura || rechazoTotal}
          />
          <CamposSinClasificar
            items={sueltosGrano}
            leer={leer}
            escribir={escribir}
            soloLectura={soloLectura || rechazoTotal}
          />
        </SeccionFormulario>
      ),
    },
    {
      id: 'firmas',
      titulo: 'Observaciones y Firmas',
      completa: true,
      contenido: (
        <>
          {otrasSecciones.map(([seccion, items]) => (
            <SeccionFormulario key={seccion} titulo={seccion} nota="Sección agregada desde Configuración — sin maquetación propia del papel, un campo debajo del otro.">
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <CampoGenerico
                    key={item.id}
                    item={item}
                    valor={leer(item)}
                    onChange={(v) => escribir(item, 1, v)}
                    soloLectura={soloLectura}
                  />
                ))}
              </div>
            </SeccionFormulario>
          ))}

          <SeccionFormulario titulo="Observaciones">
            {/* La decisión de aceptar o no el lote no la toma esta
                inspección — es el resultado de la resolución de Calidad, un
                paso posterior con su propio endpoint (ver
                PanelCalidadRecepcion.jsx). Antes vivía como un campo
                editable en una sección propia ("Datos complementarios"),
                duplicando algo que ya se decide en otro lado; acá se
                muestra de solo lectura, al principio de esta etapa (la que
                sigue a Tamaño de grano, etapa 4). */}
            {qualityResolution && (
              <p className="mb-3 text-sm font-medium text-marron-cafe/70">
                ¿Se acepta el lote?{' '}
                <span
                  className={
                    qualityResolution.decision === 'APROBADA' ? 'font-bold text-verde-bosque' : 'font-bold text-rojo-pasankalla'
                  }
                >
                  {qualityResolution.decision === 'APROBADA' ? 'Sí' : 'No'}
                </span>
              </p>
            )}
            <CampoObservaciones valor={observaciones} onCambiar={setObservaciones} soloLectura={soloLectura} />
          </SeccionFormulario>

          <SeccionFormulario titulo="Responsables">
            <FirmasResponsables
              responsables={[
                {
                  rol: 'Analista de Calidad',
                  usuario: inspection.createdByName,
                  puesto: 'Control de Calidad',
                  firmadoEn: inspection.completedAt,
                },
                {
                  rol: 'Asistente de Almacenes',
                  usuario: warehouseReceipt?.createdByName,
                  puesto: 'Almacén',
                  firmadoEn: warehouseReceipt?.completedAt,
                },
                { rol: 'Transporte', usuario: null, puesto: 'Externo', firmadoEn: null },
                {
                  rol: 'Gerente de Aseguramiento',
                  usuario: qualityResolution?.reviewedByName,
                  puesto: 'Aseguramiento de Calidad y Certificaciones',
                  firmadoEn: qualityResolution?.reviewedAt,
                },
              ]}
            />
          </SeccionFormulario>

          {inspection.status === 'FINALIZADA' && (
            <p className="text-sm font-medium text-marron-cafe/70">Sacos rechazados: {inspection.rejectedBagCount}</p>
          )}
        </>
      ),
    },
  ].filter(Boolean)

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        {onVolver ? (
          <button
            type="button"
            onClick={onVolver}
            className="flex w-fit items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            {tituloVolver}
          </button>
        ) : (
          <span />
        )}
        {/* Genera un PDF real (ver `generarPdf` más arriba) y lo abre en
            una pestaña nueva — no el diálogo de impresión del navegador.
            Mientras genera, se deshabilita y los avisos de abajo
            (confirmación/error/rechazo total/faltantes) se ocultan un
            instante: no son parte del papel y arruinaban la captura. */}
        {errorPdf && <span className="text-xs font-medium text-rojo-pasankalla">{errorPdf}</span>}
        <button
          type="button"
          onClick={generarPdf}
          disabled={generandoPdf}
          className="flex items-center gap-1.5 rounded-full bg-marron-tierra/10 px-3 py-1.5 text-xs font-semibold text-marron-cafe transition-colors duration-150 hover:bg-marron-tierra/20 disabled:opacity-50"
        >
          <Printer className="size-3.5" strokeWidth={2} />
          {generandoPdf ? 'Generando PDF…' : 'Imprimir'}
        </button>
      </div>

      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Inspección de Materia Prima"
          codigo={form.code}
          version={form.version ?? '02'}
        />

        {confirmacion && !generandoPdf && (
          <p className="rounded-2xl bg-verde-lima/15 px-4 py-3 text-sm font-medium text-verde-bosque print:hidden">
            {confirmacion}
          </p>
        )}
        {error && !generandoPdf && (
          <p className="rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-medium text-rojo-pasankalla print:hidden">
            {error}
          </p>
        )}

        {rechazoTotal && !generandoPdf && (
          <p className="flex items-start gap-2 rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-semibold text-rojo-pasankalla print:hidden">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
            No se aceptaron las condiciones de llegada — se rechaza el lote completo. El resto del formulario queda sin
            efecto; dejá el motivo en Observaciones.
          </p>
        )}

        <AsistenteDeEtapas
          etapas={etapas}
          pasoActual={pasoActual}
          onAvanzar={() => setPasoActual((p) => Math.min(p + 1, etapas.length - 1))}
          onVolverA={setPasoActual}
          modoImpresion={generandoPdf || soloLectura}
        />
      </div>
      {/* Cierra `areaImprimibleRef` — de acá para abajo (Guardar/Finalizar y
          sus avisos) no es parte del papel, nunca entra al PDF. Gateado al
          último paso del asistente — mismo criterio que
          FormularioIngresoMateriaPrima.jsx. "Volver" ya vive arriba, como
          link junto al encabezado — no hace falta repetirlo acá abajo. */}

      {!soloLectura && pasoActual === etapas.length - 1 && (
        <div className="flex flex-col gap-2 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={enviando} onClick={guardar}>
              {enviando ? 'Guardando…' : 'Guardar inspección'}
            </Button>

            {confirmandoFinal ? (
              <>
                <span className="text-sm font-medium text-marron-cafe">
                  ¿Confirmar finalización? Una vez finalizada, la inspección queda en solo lectura.
                </span>
                <Button disabled={enviando} onClick={finalizar}>
                  {enviando ? 'Finalizando…' : 'Sí, finalizar'}
                </Button>
                <Button variant="secondary" disabled={enviando} onClick={() => setConfirmandoFinal(false)}>
                  Seguir revisando
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                disabled={enviando || faltantes.length > 0}
                title={faltantes.length > 0 ? `Faltan ${faltantes.length} campos obligatorios por responder` : undefined}
                onClick={pedirFinalizar}
              >
                Finalizar inspección
              </Button>
            )}
          </div>

          {faltantes.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-2xl bg-marron-arcilla/12 px-4 py-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-marron-arcilla">
                <TriangleAlert className="size-4 shrink-0" strokeWidth={2} />
                Faltan {faltantes.length} {faltantes.length === 1 ? 'campo obligatorio' : 'campos obligatorios'} por
                responder — todavía no se puede finalizar.
              </p>
              <p className="text-xs text-marron-cafe/70">{faltantes.map((i) => i.label).join(' · ')}</p>
            </div>
          )}

          {avisoGuardarPrimero && (
            <p className="flex items-center gap-2 rounded-2xl bg-marron-arcilla/12 px-4 py-3 text-sm font-semibold text-marron-arcilla">
              <TriangleAlert className="size-4 shrink-0" strokeWidth={2} />
              Guardá las respuestas primero.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Control genérico por dataType — para cualquier ítem que Configuración
// (PanelFormularios.jsx) agregue a este formulario sin que el frontend
// conozca su código de antemano. Mismo criterio de tipos que
// FormularioInspeccion.jsx (el renderer 100% genérico, que sigue vivo sin
// usarse en ningún lado — ver conversación), pero hookeado a `leer`/
// `escribir` de ESTE componente. A propósito solo soporta 1 ocurrencia acá
// (sin "+ agregar fila") — los ítems repetibles reales del papel (Rechazo,
// Tamaño de grano) ya tienen su propia maquetación arriba; esto es
// deliberadamente el camino simple para preguntas sueltas que el papel no
// contemplaba.
function CampoGenerico({ item, valor, onChange, soloLectura }) {
  const label = `${item.label}${item.isRequired ? ' *' : ''}${item.unit ? ` (${item.unit})` : ''}`

  if (item.dataType === 'BOOLEAN') {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-sm text-marron-cafe">{label}</span>
        <Switch checked={!!valor} onChange={onChange} disabled={soloLectura} label={item.label} />
      </div>
    )
  }
  if (item.dataType === 'SELECT') {
    return (
      <FormSelect label={label} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} disabled={soloLectura}>
        <option value="">Seleccioná…</option>
        {item.config?.options?.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </FormSelect>
    )
  }
  if (item.dataType === 'DATE') {
    return (
      <FormInput
        label={label}
        type="date"
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={soloLectura}
      />
    )
  }
  if (item.dataType === 'INTEGER' || item.dataType === 'DECIMAL') {
    return (
      <FormInput
        label={label}
        type="number"
        step={item.dataType === 'DECIMAL' ? Math.pow(10, -(item.config?.decimalPlaces ?? 2)) : 1}
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={soloLectura}
      />
    )
  }
  return (
    <FormInput
      label={label}
      type="text"
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={soloLectura}
    />
  )
}

// Ítems que existen en el formulario pero no entran en la maquetación fija
// de su sección (Condiciones/Rechazo/Tamaño de grano) — porque Configuración
// (PanelFormularios.jsx) agregó algo que el papel real (I-CAL-29/R-01) no
// tenía. Antes esto se mostraba como texto plano de solo lectura, sin
// ningún input — un campo así, si quedaba obligatorio, bloqueaba
// "Finalizar inspección" para siempre porque no había dónde responderlo
// (exactamente lo que pasó con los 3 ítems de prueba que se borraron de la
// base esta sesión). Ahora sí tiene un control real, vía CampoGenerico.
function CamposSinClasificar({ items, leer, escribir, soloLectura }) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-marron-tierra/5 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-marron-cafe/50">
        Campos agregados desde Configuración
      </p>
      {items.map((item) => (
        <CampoGenerico
          key={item.id}
          item={item}
          valor={leer(item)}
          onChange={(v) => escribir(item, 1, v)}
          soloLectura={soloLectura}
        />
      ))}
    </div>
  )
}
