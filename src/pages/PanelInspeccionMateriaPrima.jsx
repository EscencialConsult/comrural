import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { inspectionsService } from '../services/inspectionsService'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { lotsService } from '../services/lotsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Button from '../components/Button.jsx'
import CabeceraFormulario from '../components/formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../components/formularios/SeccionFormulario.jsx'
import DatosGeneralesLote from '../components/formularios/DatosGeneralesLote.jsx'
import TablaCriterios from '../components/formularios/TablaCriterios.jsx'
import TablaRechazo from '../components/formularios/TablaRechazo.jsx'
import TablaMediciones from '../components/formularios/TablaMediciones.jsx'
import DatosComplementarios from '../components/formularios/DatosComplementarios.jsx'
import CampoObservaciones from '../components/formularios/CampoObservaciones.jsx'
import FirmasResponsables from '../components/formularios/FirmasResponsables.jsx'
import AvisoFaltante from '../components/formularios/AvisoFaltante.jsx'
import { solicitarAltaDeMaestro } from '../components/formularios/solicitudesDeAlta'

// Registro I-CAL-29/R-01 — "Inspección de Materia Prima", maquetado según el
// papel real (secciones 1 a 5 + pie de observaciones y responsables).
//
// Diferencia de fondo con FormularioInspeccion.jsx, que ya existía: aquel es
// un renderer GENÉRICO — recorre form.items y dibuja un control por ítem, uno
// debajo del otro, sin saber qué significa cada sección. Sirve para cualquier
// formulario, pero no puede producir la forma del papel: un cuestionario con
// observación por criterio, dos bloques de rechazo con contador, una grilla
// de 3 mediciones por categoría.
//
// Esta pantalla es SECTION-AWARE: conoce los tres códigos de sección reales
// de este formulario y le da a cada uno su disposición propia. Las secciones
// que no reconoce caen en un render genérico al final, así que si el backend
// suma una sección nueva no desaparece de la pantalla.
//
// Todas las secciones van a ancho completo, apiladas. La 2 estaba en media
// pantalla y no se podía leer: son preguntas largas y el texto se partía en
// cinco renglones con la respuesta lejos, a la derecha.
const SECCION = {
  CONDICIONES: 'arrival_conditions',
  RECHAZO: 'rejection_evaluation',
  TAMANIO_GRANO: 'grain_size',
}

// La pregunta que corta el formulario: si se responde "No", se rechaza el
// lote entero y el resto de la hoja deja de aplicar.
const ITEM_ACEPTA_CONDICIONES = 'arrival_conditions_accepted'
const ITEM_TOTAL_RECHAZADAS = 'total_rejected_bags'

// Cómo se parte en dos columnas la tabla de la sección 3.
//
// En el papel es UNA sola tabla de hallazgos impresa a dos columnas porque no
// entra a lo largo: arranca en "Paja", baja nueve renglones y sigue en
// "Granos dañados". No hay títulos de bloque ahí — es la misma lista que
// continúa, y por eso acá tampoco los hay.
//
// El corte va por código y no por `sortOrder` partido al medio: los dos
// grupos "Otros" van al final de la sección (sortOrder 15 a 18) aunque en la
// hoja cada uno cierra SU columna, así que el orden de la base no alcanza
// para reconstruir la disposición. Va explícito, en un solo lugar.
const COLUMNAS_RECHAZO = [
  {
    grupoOtros: 'rejection_other_contaminant',
    codigos: [
      'straw_bags',
      'mouse_droppings_bags',
      'bird_droppings_bags',
      'larvae_bags',
      'quartz_stone_bags',
      'hard_stone_bags',
      'volcanic_stone_bags',
      'foreign_material_bags',
    ],
  },
  {
    grupoOtros: 'rejection_other_grain',
    codigos: [
      'damaged_grains_bags',
      'broken_grains_bags',
      'immature_grains_bags',
      'colored_grains_bags',
      'coated_grains_bags',
      'contrasting_varieties_bags',
    ],
  },
]

// Aclaración del asterisco de "Materias extrañas", al pie de toda la tabla.
// No es decorativa: define qué cuenta como materia extraña, que es lo que
// evita que dos analistas clasifiquen distinto el mismo hallazgo.
const NOTA_MATERIAS_EXTRANIAS = '* Vidrio, metal, madera, semillas, semillas alergénicas.'

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
const COMPLEMENTARIOS_VACIOS = { totalRecibido: null, pesoNeto: null, seAcepta: null }

export default function PanelInspeccionMateriaPrima() {
  const { lotId } = useParams()
  const navigate = useNavigate()
  const { permisos } = useAuth()
  const puedeVer = permisos.has('raw-material-receptions:read')

  const [recepcion, setRecepcion] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [valores, setValores] = useState({})
  const [tocados, setTocados] = useState(new Set())
  const [observaciones, setObservaciones] = useState('')
  const [generales, setGenerales] = useState(GENERALES_VACIOS)
  const [complementarios, setComplementarios] = useState(COMPLEMENTARIOS_VACIOS)
  const [listados, setListados] = useState({ productos: [], proveedores: [], lotes: [] })
  const [cargandoListados, setCargandoListados] = useState(true)
  // Observaciones por criterio de la sección 2, { [itemId]: texto }.
  // Se escriben y se ven, pero todavía no se guardan: la migración 0020 cargó
  // las 8 preguntas como BOOLEAN sueltos, sin un ítem TEXT hermano donde
  // pueda vivir el texto. Se avisa una vez al pie de la sección en vez de
  // bloquear los campos — bloquearlos era peor: no se podía dejar constancia
  // de nada ni siquiera para leerlo en la misma sesión.
  const [observacionesCriterio, setObservacionesCriterio] = useState({})
  const [confirmacion, setConfirmacion] = useState(null)
  const [confirmandoFinal, setConfirmandoFinal] = useState(false)
  const { enviando, error, ejecutar } = useSolicitud()

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

  // Maestros para los selectores de la sección 1 (producto / proveedor /
  // lote). Cada opción viaja como { id, nombre, detalle }: el `id` es lo que
  // de verdad identifica la fila, `nombre` lo que se busca y se muestra, y
  // `detalle` el dato de desempate — hay proveedores homónimos cargados dos
  // veces con distinto tipo (PRODUCER y OTHER), y sin el tipo al lado son dos
  // renglones idénticos imposibles de distinguir.
  //
  // allSettled y no all: el rol `calidad` NO tiene `lots:read` (ver
  // 0019_business_modules_permissions.sql), así que ese pedido le va a fallar
  // siempre. Con Promise.all, esa falla dejaría también sin opciones a
  // producto y proveedor, que sí puede leer.
  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    setCargandoListados(true)
    Promise.allSettled([
      productsService.listar({ limit: 100 }),
      suppliersService.listar({ limit: 100 }),
      lotsService.listar({ limit: 100 }),
    ]).then(([productos, proveedores, lotes]) => {
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
        lotes: datos(lotes)
          .filter((l) => l.nature === 'PM')
          .map((l) => ({ id: l.id, nombre: l.code, detalle: l.currentStatus?.replace(/_/g, ' ') })),
      })
      setCargandoListados(false)
    })
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  // Se resiembra SOLO cuando cambia el formulario (otra inspección), nunca en
  // cada refresco: si dependiera de `responses`, cualquier recarga pisaría lo
  // que el usuario tipeó y todavía no guardó. Es el mismo bug que ya había
  // aparecido en FormularioInspeccion.jsx.
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
    setComplementarios({
      totalRecibido: recepcion.summary?.receivedPackageCount ?? null,
      pesoNeto: recepcion.summary?.acceptedNetWeightKg ?? null,
      seAcepta: recepcion.qualityResolution ? recepcion.qualityResolution.decision === 'APROBADA' : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId])

  useEffect(() => {
    if (!confirmacion) return
    const id = setTimeout(() => setConfirmacion(null), 4000)
    return () => clearTimeout(id)
  }, [confirmacion])

  const porSeccion = useMemo(() => {
    const mapa = new Map()
    for (const item of detalle?.form?.items ?? []) {
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

  const cambiarGeneral = (campo, valor) => {
    if (campo === 'lote') {
      if (valor?.id && valor.id !== lotId) navigate(`/panel/calidad/lotes/${valor.id}/inspeccion`)
      return
    }
    setGenerales((prev) => ({ ...prev, [campo]: valor }))
  }

  // Pedido de alta de un maestro que falta. Hoy es un stub local de la
  // maqueta (ver components/formularios/solicitudesDeAlta.js): el aviso no le
  // llega a nadie todavía porque falta definir quién carga cada maestro. La
  // interacción queda igual para cuando exista el endpoint de verdad.
  const solicitarAlta = ({ tipo, detalle }) => solicitarAltaDeMaestro({ tipo, detalle })
  const cambiarComplementario = (campo, valor) => setComplementarios((prev) => ({ ...prev, [campo]: valor }))

  if (!puedeVer) return <AccesoDenegado mensaje="No tenés acceso a la inspección de materia prima." />

  if (errorCarga) {
    // El backend valida `lotId` como UUID, así que entrar a esta ruta con un
    // id inventado (o con el `:lotId` literal de la definición de la ruta)
    // devuelve "Invalid UUID" — correcto para la API, inútil para quien está
    // mirando la pantalla. Se traduce a la acción que realmente destraba.
    const idInvalido = /uuid/i.test(errorCarga)
    return (
      <main className="flex w-full flex-col items-start gap-3 p-6 md:p-10">
        <p className="text-sm font-medium text-rojo-pasankalla">
          {idInvalido ? 'La dirección no apunta a ningún lote real.' : `No se pudo cargar: ${errorCarga}`}
        </p>
        {idInvalido && (
          <p className="text-sm text-marron-cafe/60">
            Esta pantalla se abre desde un lote concreto — entrá desde el listado de Calidad y tocá "Inspección" en la
            fila del lote.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button className="px-3 py-1.5 text-xs" onClick={() => navigate('/panel/calidad')}>
            Ir al listado de Calidad
          </Button>
          {!idInvalido && (
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={recargar}>
              Reintentar
            </Button>
          )}
        </div>
      </main>
    )
  }

  if (!recepcion) {
    return (
      <main className="w-full p-6 md:p-10">
        <p className="text-sm text-marron-cafe/50">Cargando…</p>
      </main>
    )
  }

  if (!detalle) {
    // Sin inspección abierta no hay formulario que mostrar: los ítems, sus
    // secciones y sus respuestas cuelgan todos de la inspección.
    //
    // Ojo: hoy el rol `calidad` NO tiene `inspections:create` (quedó solo en
    // superadmin, ver 0024_inspections_read_and_raw_material_receptions.sql),
    // así que para un analista puro este botón no aparece — y sin él no puede
    // arrancar su propia inspección. Es un permiso que falta en el backend,
    // no algo que se pueda resolver acá.
    const puedeIniciar = permisos.has('inspections:create')
    return (
      <main className="flex w-full flex-col items-start gap-4 p-6 md:p-10">
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">{recepcion.lot?.code ?? 'Lote'}</h1>
          <p className="text-sm text-marron-cafe/60">Todavía no hay una inspección abierta para este lote.</p>
        </div>
        {error && (
          <p className="rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {puedeIniciar && (
            <Button
              disabled={enviando}
              className="px-4 py-2 text-sm"
              onClick={async () => {
                try {
                  await ejecutar(() => inspectionsService.iniciar(lotId, {}))
                  recargar()
                } catch {
                  // el mensaje legible ya quedó en `error`
                }
              }}
            >
              {enviando ? 'Iniciando…' : 'Iniciar inspección'}
            </Button>
          )}
          <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => navigate('/panel/calidad')}>
            Volver al listado
          </Button>
        </div>
        {!puedeIniciar && (
          <p className="text-xs text-marron-cafe/50">
            Tu rol no tiene permiso para abrir inspecciones (`inspections:create`).
          </p>
        )}
      </main>
    )
  }

  const { form, inspection } = detalle
  const { summary, qualityResolution, warehouseReceipt } = recepcion

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

  // Cuántas obligatorias faltan — antes esto no se calculaba en ningún
  // lado: "Finalizar inspección" quedaba habilitado siempre que la
  // inspección estuviera INICIADA, sin mirar si de verdad estaba
  // respondida. En un formulario recién empezado (7 de 8 condiciones sin
  // responder, incluida la decisiva) el botón se veía exactamente igual
  // que en uno completo — el único aviso de "falta esto" vivía adentro de
  // la sección 2 (`TablaCriterios`), donde nadie lo conecta con el botón
  // de más abajo. No intenta reproducir `assertAllRequiredAnswered` al
  // pixel (occurrences repetibles quedan del lado optimista: alcanza con 1
  // fila cargada) — es una cota inferior para avisar ANTES de intentar, no
  // el árbitro final. Si igual queda algo sin contar acá, el backend
  // sigue siendo quien de verdad decide y su 400 real se sigue mostrando
  // tal cual, como ya hacía.
  const faltantes = form.items.filter((item) => {
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
    if (cambios.length === 0) return
    try {
      await ejecutar(() => inspectionsService.guardarRespuestas(inspection.id, cambios))
      setConfirmacion('Respuestas guardadas.')
      recargar()
    } catch {
      // el mensaje legible ya quedó en `error`
    }
  }

  // `faltantes` (arriba) ya bloquea el botón antes de intentar, pero
  // `assertAllRequiredAnswered` del backend sigue siendo quien manda:
  // exige TODAS las obligatorias sin excepción para la sección decisiva
  // (ver nota en el banner de rechazo total), y `faltantes` es una cota
  // inferior, no una copia exacta de esa regla. Si el backend igual
  // rechaza por algo que el cálculo de acá no vio, el mensaje de `error`
  // lo cuenta tal cual — mismo criterio que el resto de esta pantalla con
  // los 409/400 de otros pasos.
  const finalizar = async () => {
    try {
      await ejecutar(() => inspectionsService.completar(inspection.id, {}))
      setConfirmandoFinal(false)
      setConfirmacion('Inspección finalizada.')
      recargar()
    } catch {
      // se deja `confirmandoFinal` abierto para reintentar sin perder el
      // contexto de qué se estaba por confirmar
    }
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex w-fit items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
        Volver
      </button>

      <CabeceraFormulario
        antetitulo="Registro"
        titulo="Inspección de Materia Prima"
        codigo={form.code}
        version={form.version ?? '02'}
      />

      {confirmacion && (
        <p className="rounded-2xl bg-verde-lima/15 px-4 py-3 text-sm font-medium text-verde-bosque">{confirmacion}</p>
      )}
      {error && (
        <p className="rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      {rechazoTotal && (
        <p className="flex items-start gap-2 rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-semibold text-rojo-pasankalla">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
          No se aceptaron las condiciones de llegada — se rechaza el lote completo. El resto del formulario queda sin
          efecto; dejá el motivo en Observaciones.
        </p>
      )}

      {!soloLectura && faltantes.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-2xl bg-marron-arcilla/12 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-marron-arcilla">
            <TriangleAlert className="size-4 shrink-0" strokeWidth={2} />
            Faltan {faltantes.length} {faltantes.length === 1 ? 'campo obligatorio' : 'campos obligatorios'} por
            responder — todavía no se puede finalizar.
          </p>
          <p className="text-xs text-marron-cafe/70">{faltantes.map((i) => i.label).join(' · ')}</p>
        </div>
      )}

      {/* El aviso de "falta un dato" vive acá y no en el encabezado: los
          campos que pueden quedarse sin opción (producto, proveedor, lote)
          son justo los de esta sección, así que la salida tiene que estar
          donde aparece el problema, no a media pantalla de distancia. */}
      <SeccionFormulario
        numero={1}
        titulo="Datos generales"
        acciones={<AvisoFaltante onEnviar={solicitarAlta} />}
      >
        <DatosGeneralesLote
          valores={generales}
          onCambiar={cambiarGeneral}
          opciones={listados}
          cargandoOpciones={cargandoListados}
          soloLectura={soloLectura}
        />
      </SeccionFormulario>

      {condiciones.length > 0 && (
        <SeccionFormulario
          numero={2}
          titulo="Condiciones de llegada de transporte"
          nota="Marcá Sí o No según corresponda. La observación de cada criterio es opcional y todavía no se guarda al recargar."
        >
          <TablaCriterios
            items={condiciones}
            valorDe={(item) => leer(item)}
            observacionDe={(item) => observacionesCriterio[item.id] ?? ''}
            onCambiar={(item, v) => escribir(item, 1, v)}
            onCambiarObservacion={(item, texto) =>
              setObservacionesCriterio((prev) => ({ ...prev, [item.id]: texto }))
            }
            soloLectura={soloLectura}
            codigoDecisivo={ITEM_ACEPTA_CONDICIONES}
          />
          <CamposSinClasificar items={sueltosCondiciones} />
        </SeccionFormulario>
      )}

      {seccionRechazo.length > 0 && (
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
          <CamposSinClasificar items={sueltosRechazo} />
        </SeccionFormulario>
      )}

      {tamanioGrano.length > 0 && (
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
          <CamposSinClasificar items={sueltosGrano} />
        </SeccionFormulario>
      )}

      {/* Sección 5, en su lugar del papel: después del tamaño de grano y
          antes de las observaciones. Los tres datos los completa el sistema
          (lo que recibió Almacén, el peso, la decisión de Calidad) con el
          botón "Traer del sistema", pero se pueden corregir a mano. */}
      <SeccionFormulario
        numero={5}
        titulo="Datos complementarios"
        nota="Los trae el sistema — se pueden corregir a mano si hace falta."
      >
        <DatosComplementarios
          valores={complementarios}
          onCambiar={cambiarComplementario}
          summary={summary}
          decision={qualityResolution?.decision}
          soloLectura={soloLectura}
        />
      </SeccionFormulario>

      {otrasSecciones.map(([seccion, items]) => (
        <SeccionFormulario key={seccion} titulo={seccion} nota="Sección sin maquetación propia todavía.">
          <ul className="flex flex-col gap-1 text-sm text-marron-cafe/60">
            {items.map((i) => (
              <li key={i.id}>{i.label}</li>
            ))}
          </ul>
        </SeccionFormulario>
      ))}

      <SeccionFormulario titulo="Observaciones">
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

      {!soloLectura && (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={enviando} onClick={guardar}>
            {enviando ? 'Guardando…' : 'Guardar inspección'}
          </Button>

          {confirmandoFinal ? (
            <>
              <span className="text-sm font-medium text-marron-cafe">
                ¿Confirmar finalización? Guardá las respuestas antes — una vez finalizada, la inspección queda en solo
                lectura.
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
              onClick={() => setConfirmandoFinal(true)}
            >
              Finalizar inspección
            </Button>
          )}

          <Button variant="secondary" disabled={enviando} onClick={() => navigate('/panel/calidad')}>
            Volver al listado
          </Button>
        </div>
      )}
    </main>
  )
}

// Ítems que existen en el formulario pero no entran en la maquetación de su
// sección. Hoy son restos de prueba cargados a mano en la base real
// (`asd`/"asdf", `nueva_seccion`, `nuevo_campo`), y varios están marcados
// como obligatorios — así que `assertAllRequiredAnswered` los va a exigir y
// ninguna inspección se va a poder finalizar hasta que se borren.
//
// Se muestran señalados en vez de filtrarlos en silencio: si no se ven, el
// 400 al finalizar llega sin ninguna explicación en pantalla.
function CamposSinClasificar({ items }) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-marron-arcilla/12 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-marron-arcilla">
        Campos sin clasificar en el formulario
      </p>
      <p className="text-xs text-marron-cafe/70">
        No corresponden a ningún renglón del papel — parecen restos de prueba cargados en el formulario. Los marcados
        como obligatorios impiden finalizar la inspección hasta que se borren de la base.
      </p>
      <ul className="flex flex-col gap-1 text-xs text-marron-cafe">
        {items.map((i) => (
          <li key={i.id}>
            <code className="font-mono">{i.code}</code> — "{i.label}" ({i.dataType}
            {i.isRequired ? ', obligatorio' : ''})
          </li>
        ))}
      </ul>
    </div>
  )
}
