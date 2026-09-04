import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, Printer } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSolicitud } from '../../hooks/useSolicitud'
import { rawMaterialReceptionsService } from '../../services/rawMaterialReceptionsService'
import { warehouseReceiptsService } from '../../services/warehouseReceiptsService'
import { useGenerarPdf } from '../../hooks/useGenerarPdf'
import { toast } from '../../lib/toast'
import AccesoDenegado from '../dashboard/AccesoDenegado.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import CabeceraFormulario from './CabeceraFormulario.jsx'
import SeccionFormulario from './SeccionFormulario.jsx'
import AsistenteDeEtapas from './AsistenteDeEtapas.jsx'
import DatosRecepcionLote from './DatosRecepcionLote.jsx'
import ControlDocumentos from './ControlDocumentos.jsx'
import DatosTransporte from './DatosTransporte.jsx'
import DatosProductoYCantidad from './DatosProductoYCantidad.jsx'
import ResumenRecepcion from './ResumenRecepcion.jsx'
import PesajeFinal from './PesajeFinal.jsx'
import CampoObservaciones from './CampoObservaciones.jsx'
import FirmasResponsables from './FirmasResponsables.jsx'

// Registro P-ADM-03/R-02 — "Ingreso de Materia Prima", segundo formulario
// de la maqueta (ver docs/formulario-ingreso-materia-prima.md). Cuerpo del
// formulario extraído como componente propio, sin ruta ni router adentro
// — por eso `lotId`/`onVolver` llegan por props en vez de leerse de
// `useParams()`/`useNavigate()`.
//
// Por qué se sacó de la pantalla: la reunión con Milenka (ver
// video1788040555.txt) es explícita en que este formulario vive DENTRO de
// Almacén, como una subpestaña de esa pantalla ("necesito ponerle otra
// subpestaña a este almacén que diga recepción") — no como una ruta aparte
// colgada de Calidad. `PanelAlmacen.jsx` lo monta inline, cambiando de
// vista sin navegar. `PanelIngresoMateriaPrima.jsx` (la ruta con URL
// propia) queda como envoltorio delgado sobre este mismo componente, para
// quien de verdad necesite un link directo y compartible a un lote — pero
// el punto de entrada real y cotidiano es Almacén.
//
// Section-aware contra el papel real, reusando los átomos de
// src/components/formularios/ que el primer formulario (Calidad) ya dejó
// genéricos (CabeceraFormulario, SeccionFormulario, FirmasResponsables,
// CampoObservaciones).
//
// Diferencia real con el formulario de Calidad: acá el documento vive en
// DOS pasos del backend, no uno. El papel es una sola hoja continua, pero
// `warehouse-receipts` exige crear primero (POST, con lo mínimo: envase +
// cantidad) y recién después completar el resto por PATCH — no hay forma
// de mandar la hoja entera de una. El botón de abajo cambia según el estado
// real: "Finalizar recepción" (todavía no existe — este POST es el que de
// verdad arranca la recepción: crea el warehouseReceipt en INICIADA y pasa
// el lote a EN_RECEPCION) → "Guardar cambios" (existe, INICIADA) → nada
// (FINALIZADA, todo de solo lectura). El POST sella `startedAt` con el
// instante real del servidor, pero eso casi nunca coincide con la fecha/
// hora que el usuario ve en pantalla (capturada al abrir el formulario,
// editable — ver DatosRecepcionLote.jsx): por eso `finalizar()` manda un
// PATCH de corrección inmediatamente después, con ese valor. Tanto
// "Finalizar recepción" como "Guardar cambios" vuelven al listado
// (`onVolver`) con un toast al terminar, en vez de quedarse en el asistente
// — un solo botón de acción abajo, sin un "Volver al listado" aparte.
//
// Se ve UNA sección a la vez (AsistenteDeEtapas.jsx) — corrección
// post-revisión: antes las secciones se mostraban todas juntas ("como el
// papel completo"), pero eso permitía completar la 4 sin haber completado
// la 1/2/3. Mientras `soloLectura` (FINALIZADA), no hay nada que "saltear"
// — se ve todo de una, como un documento cerrado normal.
const TIPOS_ENVASE = ['Saco de polipropileno', 'Bolsa de yute', 'Bolsa de rafia', 'A granel']

// Índices de etapas dentro de `etapas` (armado más abajo, en el cuerpo del
// componente) — documentos(0), recepción(1), transporte(2), producto(3,
// unidades de medida), firmas(4). Viven acá arriba porque el efecto que
// decide el salto automático (más abajo) corre antes de que `etapas` exista.
const PASO_DOCUMENTOS = 0
const PASO_PRODUCTO = 3
const PASO_FIRMAS = 4

const DOCUMENTOS_VACIOS = { productores: { verificado: null, notas: '' }, guia: { verificado: null, notas: '' } }
// Solo los campos que pide negocio (ver DatosTransporte.jsx) — el backend
// ya no exige identityDocument/licenseCategory/brand/model (se sacaron de
// driverSchema/vehicleSchema en warehouse-receipt.dto.ts, ya no hace falta
// rellenarlos con 'N/A').
const CONDUCTOR_VACIO = { fullName: '', licenseNumber: '' }
const VEHICULO_VACIO = { plate: '', type: '', color: '' }

const soloFecha = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA') : '')
const soloHora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false }) : null

export default function FormularioIngresoMateriaPrima({ lotId, onVolver, tituloVolver = 'Volver' }) {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('raw-material-receptions:read')
  const puedeCrear = permisos.has('warehouse-receipts:create')
  const puedeEditar = permisos.has('warehouse-receipts:update')

  const [recepcion, setRecepcion] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [documentos, setDocumentos] = useState(DOCUMENTOS_VACIOS)
  const [conductor, setConductor] = useState(CONDUCTOR_VACIO)
  const [vehiculo, setVehiculo] = useState(VEHICULO_VACIO)
  const [packagingType, setPackagingType] = useState(TIPOS_ENVASE[0])
  const [receivedPackageCount, setReceivedPackageCount] = useState(null)
  const [notes, setNotes] = useState('')
  const [pesoBruto, setPesoBruto] = useState('')
  const [pesoNeto, setPesoNeto] = useState('')
  // Editables mientras la recepción siga abierta (pedido explícito) — ver
  // DatosRecepcionLote.jsx y warehouse-receipt.dto.ts (`startedAt` ahora
  // acepta PATCH). Antes de crearse la recepción no hay nada que editar:
  // `startedAt` lo sella el propio POST al presionar "Iniciar".
  const [fechaInicio, setFechaInicio] = useState('')
  const [horaInicio, setHoraInicio] = useState(null)
  const [pasoActual, setPasoActual] = useState(0)

  const { enviando, error, ejecutar } = useSolicitud()

  // PDF real, mismo mecanismo que FormularioInspeccionMateriaPrima.jsx —
  // ver useGenerarPdf.js para el porqué completo (no window.print(),
  // captura el bloque aislado a un canvas y arma un PDF paginado a A4 con
  // jsPDF, cortando hoja solo entre secciones, nunca en medio de una) — el
  // botón "Imprimir" abre ESE archivo, nunca el diálogo del navegador.
  const { areaImprimibleRef, generandoPdf, errorPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#faf4e8' })

  // El asistente arranca desde el paso 1 cada vez que cambia `lotId` — sin
  // esto, entrar a otro lote (por ejemplo desde un link directo) dejaría a
  // alguien parado en el paso 4 del lote anterior, viendo los datos del nuevo.
  useEffect(() => {
    setPasoActual(0)
  }, [lotId])

  // Salta a la sección que tiene el dato faltante/con error y la trae a la
  // vista — los avisos viven junto al botón, al final del todo, lejos de la
  // sección real cuando el asistente está en otro paso (cada etapa se
  // desmonta al no ser la actual, ver AsistenteDeEtapas.jsx, así que no
  // alcanza con un scroll sin cambiar `pasoActual` primero).
  const irAPaso = (paso) => {
    setPasoActual(paso)
    areaImprimibleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const recargar = useCallback(() => {
    if (!puedeVer) return
    setErrorCarga(null)
    rawMaterialReceptionsService.obtener(lotId).then(setRecepcion).catch((err) => setErrorCarga(err.message))
  }, [lotId, puedeVer])

  useEffect(() => {
    recargar()
  }, [recargar])

  // Se resiembra SOLO cuando cambia la recepción de verdad (creada, o el
  // lote cambió), nunca en cada `recargar()` — mismo bug ya resuelto antes
  // en este mismo formulario y en el de Calidad: si dependiera de todo
  // `recepcion`, cualquier recarga pisaría lo que Almacén tipeó y todavía
  // no guardó. `warehouseReceipt?.id` es estable desde que se crea la
  // recepción hasta que se cierra, así que es el ancla correcta.
  const wrId = recepcion?.warehouseReceipt?.id ?? null
  useEffect(() => {
    if (!recepcion) return
    const { warehouseReceipt } = recepcion
    setDocumentos({
      productores: {
        verificado: warehouseReceipt?.producerListVerified ?? null,
        notas: warehouseReceipt?.producerListNotes ?? '',
      },
      guia: {
        verificado: warehouseReceipt?.shippingGuideVerified ?? null,
        notas: warehouseReceipt?.shippingGuideNotes ?? '',
      },
    })
    setConductor(warehouseReceipt?.transportInfo?.driver ?? CONDUCTOR_VACIO)
    setVehiculo(warehouseReceipt?.transportInfo?.vehicle ?? VEHICULO_VACIO)
    setPackagingType(warehouseReceipt?.packagingType ?? TIPOS_ENVASE[0])
    setReceivedPackageCount(warehouseReceipt?.receivedPackageCount ?? null)
    setNotes(warehouseReceipt?.notes ?? '')
    setPesoBruto(warehouseReceipt?.acceptedGrossWeightKg != null ? String(warehouseReceipt.acceptedGrossWeightKg) : '')
    setPesoNeto(warehouseReceipt?.acceptedNetWeightKg != null ? String(warehouseReceipt.acceptedNetWeightKg) : '')
    // Si ya existe la recepción, la fecha/hora real vienen del backend
    // (`startedAt`). Si todavía no existe, la captura del momento actual la
    // hace el efecto de abajo (atado a `recepcion`, no a `wrId` — ver por
    // qué) — acá no hace nada en ese caso, para no pisarla en cada
    // `recargar()`.
    if (warehouseReceipt) {
      setFechaInicio(soloFecha(warehouseReceipt.startedAt))
      setHoraInicio(soloHora(warehouseReceipt.startedAt))
    }

    // Al continuar una recepción ya iniciada, entrar directo a la etapa más
    // inmediata que todavía necesita algo — no siempre al paso 0. Pedido
    // explícito: antes de esto, Almacén volvía a caer siempre en el paso 0
    // y tenía que reclickear "Siguiente" en las etapas ya completas
    // (colapsadas, sin nada más que hacer ahí) para llegar a donde de
    // verdad hacía falta seguir. Se calcula sobre `warehouseReceipt`/
    // `summary` (el dato recién llegado del backend), no sobre el estado
    // local (`documentos`/`packagingType`/...) — ese todavía tiene los
    // valores del `wrId` anterior en este mismo efecto, una carrera contra
    // los `setDocumentos`/`setPackagingType`/... de arriba, que recién se
    // reflejan en el próximo render. Solo corre cuando cambia `wrId` (mismo
    // motivo que el resto de este efecto: no pisar el paso en el que está
    // parado alguien cada vez que `recargar()` refresca datos).
    const { summary } = recepcion
    const documentosCompletaWR =
      (warehouseReceipt?.producerListVerified === true || (warehouseReceipt?.producerListNotes ?? '').trim() !== '') &&
      (warehouseReceipt?.shippingGuideVerified === true || (warehouseReceipt?.shippingGuideNotes ?? '').trim() !== '')
    const productoCompletaWR =
      (warehouseReceipt?.packagingType ?? '') !== '' &&
      warehouseReceipt?.receivedPackageCount != null &&
      warehouseReceipt.receivedPackageCount > 0
    // El pesaje (unidades de medida, vive en la misma etapa "producto") no
    // entra en `productoCompletaWR` — se habilita recién cuando Calidad
    // resuelve, así que es su propia condición de "todavía falta algo acá".
    const pesajePendiente = summary.canRegisterWeight || summary.canCompleteWithoutWeight

    let pasoInicial = PASO_DOCUMENTOS
    if (warehouseReceipt?.status === 'INICIADA') {
      if (!documentosCompletaWR) pasoInicial = PASO_DOCUMENTOS
      else if (!productoCompletaWR || pesajePendiente) pasoInicial = PASO_PRODUCTO
      else pasoInicial = PASO_FIRMAS
    }
    setPasoActual(pasoInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrId])

  // Captura el momento actual como fecha/hora de inicio EDITABLE, apenas se
  // confirma que el lote todavía no tiene recepción — es el mismo instante
  // en que se clickeó "Iniciar" en la lista de Almacén, que solo abre este
  // formulario sin crear nada (ver DatosRecepcionLote.jsx). No puede vivir
  // en el efecto de arriba: ese está atado a `wrId`
  // (`recepcion?.warehouseReceipt?.id`), que sigue siendo `null` tanto
  // ANTES de cargar `recepcion` como DESPUÉS si la recepción no existe
  // todavía — la dependencia nunca cambia, así que ese efecto nunca vuelve
  // a correr para capturar nada. Acá se usa `recepcion` (no `wrId`) como
  // disparador, y un ref para no re-capturar en cada `recargar()` (que
  // repite mientras el usuario sigue completando el resto del formulario).
  const loteYaCapturado = useRef(null)
  useEffect(() => {
    if (!recepcion || recepcion.warehouseReceipt) return
    if (loteYaCapturado.current === lotId) return
    loteYaCapturado.current = lotId
    const ahora = new Date()
    setFechaInicio(ahora.toLocaleDateString('en-CA'))
    setHoraInicio(`${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`)
  }, [recepcion, lotId])

  const cambiarDocumento = (clave, campo, valor) =>
    setDocumentos((prev) => ({ ...prev, [clave]: { ...prev[clave], [campo]: valor } }))
  const cambiarConductor = (campo, valor) => setConductor((prev) => ({ ...prev, [campo]: valor }))
  const cambiarVehiculo = (campo, valor) => setVehiculo((prev) => ({ ...prev, [campo]: valor }))

  if (!puedeVer) return <AccesoDenegado mensaje="No tenés acceso al ingreso de materia prima." />

  if (errorCarga) {
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

  const { lot, summary, warehouseReceipt } = recepcion
  const existe = warehouseReceipt != null
  const finalizada = warehouseReceipt?.status === 'FINALIZADA'
  // `receivedPackageCount` queda bloqueado en cuanto existe una resolución
  // de Calidad (400 del backend si se intenta) — ver warehouseReceiptsService.js.
  const cantidadBloqueada = recepcion.qualityResolution != null
  const soloLectura = !existe ? !puedeCrear : finalizada || !puedeEditar

  const validoParaGuardar =
    packagingType !== '' &&
    receivedPackageCount != null &&
    receivedPackageCount > 0 &&
    (documentos.productores.verificado || documentos.productores.notas.trim() !== '') &&
    (documentos.guia.verificado || documentos.guia.notas.trim() !== '')

  // Mismo problema que tenía "Finalizar inspección" antes de arreglarlo:
  // el botón quedaba deshabilitado sin decir por qué, así que alguien con
  // el formulario a medio llenar no tenía forma de saber qué le faltaba
  // sin ir campo por campo. Se arma la lista una sola vez para reusarla en
  // el aviso visible y en el `title` del botón. `paso` es el índice en
  // `etapas` (abajo) — permite saltar directo a la sección que tiene el
  // problema en vez de solo nombrarla.
  const motivosFaltantes = []
  if (receivedPackageCount == null || receivedPackageCount <= 0) motivosFaltantes.push({ texto: 'N. de bolsas', paso: 3 })
  if (!documentos.productores.verificado && documentos.productores.notas.trim() === '')
    motivosFaltantes.push({ texto: 'Observaciones de lista de productores (no cumple)', paso: 0 })
  if (!documentos.guia.verificado && documentos.guia.notas.trim() === '')
    motivosFaltantes.push({ texto: 'Observaciones de guía de remisión (no cumple)', paso: 0 })

  const camposTransporte = [conductor.fullName, conductor.licenseNumber, vehiculo.plate, vehiculo.type, vehiculo.color]
  const transporteCompleto = camposTransporte.every((v) => v.trim() !== '')

  const dtoDocumentosYTransporte = () => ({
    packagingType,
    receivedPackageCount: Number(receivedPackageCount),
    producerListVerified: documentos.productores.verificado,
    producerListNotes: documentos.productores.verificado ? undefined : documentos.productores.notas,
    shippingGuideVerified: documentos.guia.verificado,
    shippingGuideNotes: documentos.guia.verificado ? undefined : documentos.guia.notas,
    notes: notes || undefined,
    // `transportInfo` sigue siendo todo-o-nada en el backend, pero ahora
    // driverSchema/vehicleSchema (warehouse-receipt.dto.ts) solo piden los
    // mismos 5 campos que muestra DatosTransporte.jsx — ya no hace falta
    // rellenar nada con 'N/A'.
    ...(transporteCompleto ? { transportInfo: { driver: conductor, vehicle: vehiculo } } : {}),
  })

  const finalizar = async () => {
    if (!validoParaGuardar) return
    try {
      await ejecutar(async () => {
        const creado = await warehouseReceiptsService.iniciar(lotId, dtoDocumentosYTransporte())
        // El POST sella `startedAt` con el instante real del servidor —
        // acá se corrige de inmediato con el valor capturado al abrir el
        // formulario (o editado a mano mientras se completaba el resto),
        // en la misma acción de "Finalizar recepción". Sin esto, la fecha/
        // hora que se ve en pantalla nunca coincidía con la que terminaba
        // guardada.
        if (fechaInicio && horaInicio) {
          await warehouseReceiptsService.actualizar(creado.id, {
            startedAt: new Date(`${fechaInicio}T${horaInicio}`).toISOString(),
          })
        }
      })
      toast.success('Recepción registrada.')
      onVolver?.()
    } catch {
      // mensaje ya en `error`
    }
  }

  const guardar = async () => {
    if (!validoParaGuardar) return
    try {
      const dto = dtoDocumentosYTransporte()
      // Igual que en el formulario viejo: si ya hay resolución de Calidad,
      // `receivedPackageCount` queda afuera del PATCH — mandarlo igual es
      // un 400 asegurado, no algo que valga la pena intentar.
      if (cantidadBloqueada) delete dto.receivedPackageCount
      // `startedAt` se manda solo si fecha/hora de inicio están cargadas
      // (no antes de crear la recepción) — combinar los dos campos locales
      // en un instante único e interpretarlo en hora local del navegador,
      // igual criterio que aInputLocal/datetime-local en utils/fecha.js.
      if (fechaInicio && horaInicio) {
        dto.startedAt = new Date(`${fechaInicio}T${horaInicio}`).toISOString()
      }
      await ejecutar(() => warehouseReceiptsService.actualizar(warehouseReceipt.id, dto))
      toast.success('Cambios guardados.')
      onVolver?.()
    } catch {
      // mensaje ya en `error`
    }
  }

  const puedeCerrarConPesos = summary.canRegisterWeight
  const puedeCerrarSinPesos = summary.canCompleteWithoutWeight
  const pesosValidos = !puedeCerrarConPesos || (pesoBruto !== '' && pesoNeto !== '')

  const cerrar = async () => {
    if (!pesosValidos) return
    try {
      await ejecutar(() =>
        warehouseReceiptsService.actualizar(warehouseReceipt.id, {
          complete: true,
          ...(puedeCerrarConPesos ? { acceptedGrossWeightKg: Number(pesoBruto), acceptedNetWeightKg: Number(pesoNeto) } : {}),
        }),
      )
      toast.success('Recepción cerrada.')
      onVolver?.()
    } catch {
      // mensaje ya en `error`
    }
  }

  // Completitud por etapa — decide cuándo se habilita "Siguiente" en el
  // asistente. Reusa los mismos cálculos que ya existían para
  // `motivosFaltantes`/`validoParaGuardar`, no inventa una segunda versión
  // de la misma regla.
  const documentosCompleta =
    (documentos.productores.verificado === true || documentos.productores.notas.trim() !== '') &&
    (documentos.guia.verificado === true || documentos.guia.notas.trim() !== '')
  const transporteVacio = camposTransporte.every((v) => v.trim() === '')
  const productoCompleta = packagingType !== '' && receivedPackageCount != null && receivedPackageCount > 0

  // Etapas del asistente — números/títulos vienen de
  // seccionesIngresoMateriaPrima.js (única fuente, la comparte con la
  // tabla de PanelAlmacenRecepcion.jsx), acá solo se arma el `contenido`
  // real y la `completa` de cada una.
  const etapas = [
    {
      id: 'documentos',
      titulo: 'Control de documentos',
      completa: documentosCompleta,
      motivoIncompleta: 'Marcá si cumple o no en las dos preguntas — con observación si no cumple.',
      contenido: (
        <SeccionFormulario numero={1} titulo="Control de documentos">
          <ControlDocumentos valores={documentos} onCambiar={cambiarDocumento} soloLectura={soloLectura} />
        </SeccionFormulario>
      ),
    },
    {
      id: 'recepcion',
      titulo: 'Datos de recepción',
      completa: true,
      contenido: (
        <SeccionFormulario numero={2} titulo="Datos de recepción">
          <DatosRecepcionLote
            valores={{
              producto: lot.productId ? { id: lot.productId, nombre: lot.productName ?? '' } : null,
              fecha: fechaInicio,
              horaInicio,
              horaFin: soloHora(warehouseReceipt?.completedAt),
              lote: { id: lot.id, nombre: lot.code },
            }}
            soloLectura={soloLectura}
            onCambiarFecha={setFechaInicio}
            onCambiarHoraInicio={setHoraInicio}
          />
        </SeccionFormulario>
      ),
    },
    {
      id: 'transporte',
      titulo: 'Datos del transporte',
      completa: transporteCompleto || transporteVacio,
      motivoIncompleta: 'Es opcional en conjunto — completá los 9 datos, o dejalos todos vacíos.',
      contenido: (
        <SeccionFormulario
          numero={3}
          titulo="Datos del transporte"
          nota="Opcional en conjunto — si se carga uno, hay que completar los 9."
        >
          <DatosTransporte
            conductor={conductor}
            vehiculo={vehiculo}
            onCambiarConductor={cambiarConductor}
            onCambiarVehiculo={cambiarVehiculo}
            soloLectura={soloLectura}
          />
        </SeccionFormulario>
      ),
    },
    {
      id: 'producto',
      titulo: 'Datos del producto',
      completa: productoCompleta,
      motivoIncompleta: 'Falta el tipo de envase o el N. de bolsas.',
      // Sección 4 completa — pedido explícito de Facundo, guiándose por los
      // encabezados en VERDE INTENSO del papel real: solo hay 4 secciones
      // numeradas, no 6. "Datos del producto" en el papel incluye, bajo el
      // MISMO encabezado, tipo de envase/N. de bolsas, resumen de
      // recepción, detalle de rechazos y unidades de medida.
      contenido: (
        <SeccionFormulario numero={4} titulo="Datos del producto">
          <DatosProductoYCantidad
            tipoEnvase={packagingType}
            nBolsas={receivedPackageCount}
            tiposEnvase={TIPOS_ENVASE}
            onCambiarTipoEnvase={setPackagingType}
            onCambiarNBolsas={setReceivedPackageCount}
            soloLectura={soloLectura || cantidadBloqueada}
          />
          {cantidadBloqueada && !finalizada && (
            <p className="text-xs text-marron-cafe/50">
              Ya existe una resolución de Calidad para este lote — la cantidad de bolsas quedó bloqueada.
            </p>
          )}

          <div className="flex flex-col gap-2 border-t border-verde-hoja/20 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-verde-bosque/80">
              Resumen de recepción y detalle de rechazos
            </h3>
            <ResumenRecepcion
              totalBolsas={warehouseReceipt?.storedPackageCount}
              pesoPromedioNetoKg={warehouseReceipt?.averageAcceptedNetWeightKg}
              sacosRechazados={warehouseReceipt?.rejectedPackageCount}
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-verde-hoja/20 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-verde-bosque/80">
              Unidades de medida
              <span className="ml-1.5 font-normal normal-case text-marron-cafe/50">
                — peso total bruto y neto, se completa al cerrar la recepción
              </span>
            </h3>
            {!existe ? (
              <p className="text-sm text-marron-cafe/50">Se habilita al iniciar la recepción.</p>
            ) : finalizada ? (
              <PesajeFinal bruto={pesoBruto} neto={pesoNeto} soloLectura />
            ) : puedeCerrarConPesos ? (
              <PesajeFinal bruto={pesoBruto} neto={pesoNeto} onCambiarBruto={setPesoBruto} onCambiarNeto={setPesoNeto} soloLectura={!puedeEditar} />
            ) : puedeCerrarSinPesos ? (
              <p className="text-sm text-marron-cafe/60">
                Calidad rechazó el lote — la recepción se cierra sin registrar pesos (0 bolsas autorizadas).
              </p>
            ) : (
              <p className="text-sm text-marron-cafe/50">
                {summary.qualityDecision == null
                  ? 'Se habilita cuando Calidad emita su resolución.'
                  : 'Esperando el permiso para cerrar la recepción.'}
              </p>
            )}
          </div>
        </SeccionFormulario>
      ),
    },
    {
      id: 'firmas',
      titulo: 'Observaciones y Firmas',
      completa: true,
      contenido: (
        <>
          <SeccionFormulario titulo="Observaciones">
            <CampoObservaciones valor={notes} onCambiar={setNotes} soloLectura={soloLectura} />
          </SeccionFormulario>

          {/* `usuario` queda siempre en null: warehouse-receipts solo
              expone `receivedBy` como id crudo (sin `*Name`, a diferencia
              de la inspección de Calidad que sí trae `createdByName`) y la
              resolución compuesta tampoco trae `reviewedByName` — eso solo
              vive en GET /quality-resolutions/:id, que esta pantalla no
              pide. Mostrar un nombre inventado sería peor que mostrar
              "Pendiente"; `firmadoEn` ya alcanza para decir que ese paso
              ocurrió. "Transporte" NO va acá — en el papel real la firma
              del conductor está pegada a Datos del transporte, no acá
              abajo (ver DatosTransporte.jsx). Estos son los 3 firmantes
              reales del pie de la hoja. */}
          <SeccionFormulario titulo="Responsables">
            <FirmasResponsables
              responsables={[
                { rol: 'Responsable de Recepción', usuario: null, puesto: 'Asistente de Almacenes', firmadoEn: warehouseReceipt?.startedAt },
                { rol: 'Inspectora de Calidad', usuario: null, puesto: 'VoBo Calidad', firmadoEn: recepcion.qualityResolution?.resolvedAt },
                { rol: 'Responsable de Almacén', usuario: null, puesto: 'VoBo Inmediato Superior', firmadoEn: warehouseReceipt?.completedAt },
              ]}
            />
          </SeccionFormulario>
        </>
      ),
    },
  ]

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
          titulo="Ingreso de Materia Prima"
          codigo="P-ADM-03/R-02"
          version="05"
        />

        <AsistenteDeEtapas
          etapas={etapas}
          pasoActual={pasoActual}
          onAvanzar={() => setPasoActual((p) => Math.min(p + 1, etapas.length - 1))}
          onVolverA={setPasoActual}
          modoImpresion={generandoPdf || soloLectura}
        />
      </div>
      {/* Cierra `areaImprimibleRef` — de acá para abajo (Iniciar/Guardar/
          Cerrar/Volver, y sus avisos) no es parte del papel, nunca entra al
          PDF. Gateado al último paso del asistente: los botones de guardar/
          cerrar recién tienen sentido una vez que se pasó por todas las
          etapas — antes de eso ya está el botón "Siguiente" de cada una.
          Los avisos van DESPUÉS de los botones, no antes — arriba del todo
          (junto a la cabecera) quedaban fuera de la vista de quien está
          parado acá abajo, mirando el botón. */}

      {!soloLectura && pasoActual === etapas.length - 1 && (
        <div className="flex flex-col gap-2 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {!existe ? (
              <Button
                disabled={enviando || !validoParaGuardar || !puedeCrear}
                title={motivosFaltantes.length > 0 ? `Falta completar: ${motivosFaltantes.map((m) => m.texto).join(', ')}` : undefined}
                onClick={finalizar}
              >
                {enviando ? 'Finalizando…' : 'Finalizar recepción'}
              </Button>
            ) : (
              <>
                <Button
                  disabled={enviando || !validoParaGuardar}
                  title={motivosFaltantes.length > 0 ? `Falta completar: ${motivosFaltantes.map((m) => m.texto).join(', ')}` : undefined}
                  onClick={guardar}
                >
                  {enviando ? 'Guardando…' : 'Guardar cambios'}
                </Button>
                {(puedeCerrarConPesos || puedeCerrarSinPesos) && (
                  <Button
                    variant="secondary"
                    disabled={enviando || !pesosValidos}
                    title={!pesosValidos ? 'Falta el peso bruto y neto para cerrar la recepción' : undefined}
                    onClick={cerrar}
                  >
                    {enviando ? 'Cerrando…' : 'Cerrar recepción'}
                  </Button>
                )}
              </>
            )}
          </div>

          {error && (
            <p className="rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-medium text-rojo-pasankalla">{error}</p>
          )}
          {!existe && !puedeCrear && (
            <p className="rounded-2xl bg-marron-arcilla/12 px-4 py-3 text-sm font-medium text-marron-arcilla">
              Tu rol no tiene permiso para iniciar una recepción (`warehouse-receipts:create`).
            </p>
          )}
          {motivosFaltantes.length > 0 && (
            <div className="flex flex-col gap-1 rounded-2xl bg-marron-arcilla/12 px-4 py-3 text-sm">
              <p className="font-semibold text-marron-arcilla">Falta completar:</p>
              <ul className="flex flex-col gap-0.5">
                {motivosFaltantes.map((m, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => irAPaso(m.paso)}
                      className="text-left text-xs font-medium text-marron-arcilla underline decoration-marron-arcilla/40 underline-offset-2 hover:text-marron-cafe"
                    >
                      {m.texto}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
