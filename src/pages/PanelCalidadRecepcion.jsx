import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, X, Circle, Pencil, CheckCircle2, XCircle, Play, Signature, Receipt, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { lotsService } from '../services/lotsService'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { inspectionsService } from '../services/inspectionsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import SearchInput from '../components/SearchInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import FormInput from '../components/FormInput.jsx'
import IndicadorEtapas from '../components/IndicadorEtapas.jsx'
import Paginacion from '../components/Paginacion.jsx'
import Skeleton from '../components/Skeleton.jsx'
import FormularioInspeccionMateriaPrima from '../components/formularios/FormularioInspeccionMateriaPrima.jsx'
import NotaRecepcionMateriaPrima from '../components/formularios/NotaRecepcionMateriaPrima.jsx'
import { compararPorFechaRecepcion } from '../utils/fecha'

// Sub-item de "Calidad y Laboratorio" en el sidebar (config/gruposMaestros.js,
// mismo mecanismo que Compras→Personas/Organizaciones/...). Antes esta tabla
// vivía como la pantalla principal de /panel/calidad; ahora ese lugar lo
// ocupa el Inicio del área (PanelCalidad.jsx, solo analytics) y esta pasa a
// ser su propia ruta con submenú propio, igual que las hermanas de Compras.
//
// Al tocar un lote se abre el formulario de inspección DIRECTO, inline, sin
// navegar — la pantalla intermedia de estado (PanelRecepcionLote.jsx) sigue
// viva para quien la necesite completa (recepción + inspección + resolución
// juntas), hoy solo enlazada desde PanelLotes.jsx (Compras).
const TONO_ESTADO_LOTE = {
  PROGRAMADO: 'neutro',
  EN_RECEPCION: 'alerta',
  ACEPTADO_RECEPCION: 'positivo',
  LAVADO: 'positivo',
  EN_ANALISIS: 'alerta',
  PENDIENTE_LIBERACION: 'alerta',
  RETENIDO: 'negativo',
  LIBERADO: 'positivo',
  RECHAZADO: 'negativo',
  CANCELADO: 'neutro',
}

const TAMANIO_PAGINA = 10

// Etapa real del lote para la columna "Estado" — a pedido de Facundo,
// reemplaza a la columna "Inspección" suelta y a mostrar `lot.currentStatus`
// tal cual. Dos motivos:
//   1. Una sola insignia de etapa dice más de un vistazo que dos columnas
//      separadas (Inspección + Estado del lote).
//   2. `lot.currentStatus` puede quedar desactualizado — se encontró en
//      vivo un lote con recepción/inspección FINALIZADA y resolución
//      APROBADA que seguía en PROGRAMADO (el estado agregado del lote no
//      siempre se pone al día). Esta etapa se calcula desde los datos
//      reales de recepción/inspección/resolución, no desde ese campo.
// Se pide expreso: este texto SOLO aparece cuando el ciclo entero ya
// cerró (visto bueno gerencial dado) — "no me pongas 'en curso', no me
// pongas el texto cuando esté visto bueno pendiente, falta de resolución,
// lo que sea, solo cuando esté totalmente aprobado". Los estados
// intermedios los sigue mostrando SOLO el bloque de casillas
// (IndicadorEtapas) de más abajo — ahí no ocupa lugar de más y no achica
// los íconos.
//
// Cada etapa lleva su propio ícono — pedido explícito de Facundo: "Estado"
// y "Recepción"/"Inspección" repetían casi el mismo texto (FINALIZADA,
// INICIADA, APROBADA...) sin diferenciarse a simple vista. Un símbolo +
// color dice la etapa de un vistazo sin tener que leer la palabra.
function etapaDe(resumen) {
  if (!resumen || resumen === 'error') return null
  const { qualityDecision, qualityReviewStatus } = resumen.summary
  if (qualityReviewStatus !== 'APROBADO') return null
  return qualityDecision === 'RECHAZADA'
    ? { texto: 'Rechazado', tono: 'negativo', Icon: XCircle }
    : { texto: 'Aprobado', tono: 'positivo', Icon: CheckCircle2 }
}

// Estado del ícono de "visto bueno" en la columna Formulario — las mismas
// dos etapas que ya vive el ciclo de Resolución de Calidad
// (PanelAprobacionResolucion.jsx/PanelRecepcionLote.jsx), resumidas para un
// solo símbolo: gris = inspección finalizada pero sin resolución emitida
// todavía, dorado = resolución emitida y pendiente del visto bueno
// gerencial, verde = visto bueno ya dado. Antes de que la inspección esté
// FINALIZADA no hay nada que mostrar acá — sigue devolviendo null.
function estadoVistoBuenoDe(resumen) {
  if (!resumen || resumen === 'error') return null
  const { inspectionStatus, qualityReviewStatus } = resumen.summary
  if (inspectionStatus !== 'FINALIZADA') return null
  if (qualityReviewStatus === 'APROBADO') return 'aprobado'
  if (qualityReviewStatus === 'PENDIENTE') return 'pendiente'
  return 'sin_resolucion'
}

// Las 6 casillas de "en qué está el formulario" — pedido explícito de
// Facundo, aparte del badge de etapa de arriba: ese badge dice el estado
// GENERAL del lote (aprobado, visto bueno pendiente...), esto muestra
// puntualmente en qué sección del FORMULARIO de inspección quedó cada uno,
// mismas 6 secciones que ve quien completa el formulario (ver numeración en
// FormularioInspeccionMateriaPrima.jsx). "Todos los formularios van a tener
// etapas" — por eso el widget en sí (IndicadorEtapas) es genérico y este
// mapeo de 6 secciones queda local a esta pantalla, no en el componente.
const SECCIONES_FORMULARIO = [
  { numero: 1, titulo: 'Datos generales' },
  { numero: 2, titulo: 'Condiciones de llegada' },
  { numero: 3, titulo: 'Evaluación de rechazo' },
  { numero: 4, titulo: 'Tamaño de grano' },
  { numero: 5, titulo: 'Datos complementarios' },
  // Firmas es la única casilla con ícono propio y semáforo distinto —
  // pedido explícito: símbolo de firma en vez del número 6, rojo si
  // todavía no se llegó a esa etapa, verde sin rellenar si falta firmar,
  // verde relleno si ya se firmó (ver IndicadorEtapas.jsx, CLASES_FIRMA).
  { numero: 6, titulo: 'Firmas / Responsables', icono: Signature, variante: 'firma' },
]

// section-code real de cada casilla 2/3/4 — las otras tres no dependen de
// ítems de formulario (ver estadoDeSeccion).
const CODIGO_SECCION = { 2: 'arrival_conditions', 3: 'rejection_evaluation', 4: 'grain_size' }

// Mismos restos de prueba que se filtran en el formulario real — si no se
// excluyen acá, un campo de prueba obligatorio nunca respondido deja la
// casilla en amarillo para siempre aunque el formulario esté completo de
// verdad. Ver FormularioInspeccionMateriaPrima.jsx, CODIGOS_PRUEBA_CONOCIDOS.
const CODIGOS_PRUEBA_CONOCIDOS = new Set(['asd', 'nuevo_campo', 'adf'])

// `detalleInsp` es la respuesta de inspectionsService.obtener() — trae
// form.items + responses completos. Puede faltar (todavía no se pidió, o
// falló) aunque la inspección exista: en ese caso 2/3/4 caen a un valor
// conservador en vez de mostrar la casilla vacía sin explicación.
function estadoDeSeccion(numero, resumen, detalleInsp) {
  const inspection = resumen?.inspection
  if (!inspection?.id) return 'sin_iniciar'

  if (numero === 1) return 'completo' // datos de referencia, ya vienen de la recepción

  if (numero === 5) {
    if (resumen.qualityResolution) return 'completo'
    return inspection.status === 'FINALIZADA' ? 'pendiente' : 'sin_iniciar'
  }

  // Firmas: no hay firma digital conectada al sistema todavía (ver
  // FormularioInspeccionMateriaPrima.jsx, sección Responsables), así que se
  // usa el visto bueno gerencial como la firma real más cercana que SÍ
  // queda registrada — 'sin_iniciar' (rojo) hasta que la inspección está
  // FINALIZADA (recién ahí se "llega" a la etapa de firmar), 'pendiente'
  // (verde sin rellenar) mientras falta el visto bueno, 'completo' (verde
  // relleno) una vez que `qualityReviewStatus` es APROBADO.
  if (numero === 6) {
    if (inspection.status !== 'FINALIZADA') return 'sin_iniciar'
    return resumen.summary.qualityReviewStatus === 'APROBADO' ? 'completo' : 'pendiente'
  }

  if (!detalleInsp || detalleInsp === 'error') return inspection.status === 'FINALIZADA' ? 'completo' : 'pendiente'

  const codigo = CODIGO_SECCION[numero]
  const items = detalleInsp.form.items.filter((i) => i.section === codigo && !CODIGOS_PRUEBA_CONOCIDOS.has(i.code))
  const requeridos = items.filter((i) => i.isRequired)
  if (requeridos.length === 0) return items.length === 0 ? 'sin_iniciar' : 'completo'

  const respondidos = requeridos.filter((item) => {
    const ocurrenciasEsperadas = item.occurrences != null && item.occurrences > 1 ? item.occurrences : 1
    for (let occ = 1; occ <= ocurrenciasEsperadas; occ++) {
      if (!detalleInsp.responses.some((r) => r.itemId === item.id && r.occurrence === occ)) return false
    }
    return true
  })
  if (respondidos.length === 0) return 'sin_iniciar'
  return respondidos.length === requeridos.length ? 'completo' : 'pendiente'
}

function etapasFormularioDe(resumen, detalleInsp) {
  return SECCIONES_FORMULARIO.map((s) => ({ ...s, estado: estadoDeSeccion(s.numero, resumen, detalleInsp) }))
}

export default function PanelCalidadRecepcion() {
  const { permisos } = useAuth()
  const navigate = useNavigate()
  const puedeVer = permisos.has('lots:read')
  const puedeAprobar = permisos.has('quality-resolutions:approve')
  const puedeEmitir = permisos.has('quality-resolutions:create')

  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  // Al tocar un lote se abre el formulario de inspección EN LA MISMA
  // pantalla — no navega a una URL nueva.
  const [lotAbierto, setLotAbierto] = useState(null)
  // Formulario 3 (Nota de Recepción, P-ADM-03/R-11) — solo lectura, solo
  // imprimible, vive acá y no en Almacén (ver NotaRecepcionMateriaPrima.jsx).
  // Estado aparte de `lotAbierto`: son dos vistas distintas, nunca las dos
  // a la vez.
  const [remitoAbierto, setRemitoAbierto] = useState(null)

  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('')
  const [productoId, setProductoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')
  const [pagina, setPagina] = useState(0)

  const hayFiltrosActivos = busqueda !== '' || estado !== '' || productoId !== '' || proveedorId !== '' || fecha !== ''
  const limpiarFiltros = () => {
    setBusqueda('')
    setEstado('')
    setProductoId('')
    setProveedorId('')
    setFecha('')
    setPagina(0)
  }

  const [resumenes, setResumenes] = useState({}) // lotId -> vista consolidada (o 'error')

  const recargarLotes = () => {
    Promise.all([lotsService.listar({ limit: 100 }), productsService.listar({ limit: 100 }), suppliersService.listar({ limit: 100 })])
      .then(([lotesResp, productosResp, proveedoresResp]) => {
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM'))
        setProductos(productosResp.data)
        setProveedores(proveedoresResp.data)
      })
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    Promise.all([lotsService.listar({ limit: 100 }), productsService.listar({ limit: 100 }), suppliersService.listar({ limit: 100 })])
      .then(([lotesResp, productosResp, proveedoresResp]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM'))
        setProductos(productosResp.data)
        setProveedores(proveedoresResp.data)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => {
    const s = proveedores?.find((p) => p.id === id)
    if (!s) return '—'
    return s.person ? `${s.person.firstNames} ${s.person.lastNames}` : s.organization ? s.organization.tradeName || s.organization.legalName : '—'
  }

  const filtrados = useMemo(() => {
    if (!lotes) return []
    const q = busqueda.trim().toLowerCase()
    return lotes
      .filter((l) => {
        if (estado && l.currentStatus !== estado) return false
        if (productoId && l.productId !== productoId) return false
        if (proveedorId && l.supplierId !== proveedorId) return false
        // scheduledReceptionAt es el único dato de fecha que trae un lote —
        // se compara solo la parte de fecha (no la hora), en hora local.
        if (fecha && (!l.scheduledReceptionAt || new Date(l.scheduledReceptionAt).toLocaleDateString('en-CA') !== fecha)) return false
        if (q && !l.code.toLowerCase().includes(q) && !productoNombre(l.productId).toLowerCase().includes(q)) return false
        return true
      })
      .sort(compararPorFechaRecepcion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes, busqueda, estado, productoId, proveedorId, fecha, productos])

  const paginados = filtrados.slice(pagina * TAMANIO_PAGINA, (pagina + 1) * TAMANIO_PAGINA)

  // Enriquecimiento acotado a la página visible (10 lotes) — no existe un
  // endpoint de listado con resumen (raw-material-receptions.md §8 lo dice
  // explícito), así que se pide la vista consolidada por lote en paralelo,
  // solo para las filas que se están mostrando. Si el volumen real crece
  // mucho, esto hay que pedírselo al backend como endpoint nuevo.
  useEffect(() => {
    let cancelado = false
    Promise.allSettled(paginados.map((l) => rawMaterialReceptionsService.obtener(l.id))).then((resultados) => {
      if (cancelado) return
      setResumenes((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[paginados[i].id] = r.status === 'fulfilled' ? r.value : 'error'
        })
        return siguiente
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, lotes, busqueda, estado, productoId, proveedorId])

  // Segundo nivel de enriquecimiento, solo para las casillas de etapa: el
  // resumen consolidado ya trae `inspection.status`, pero no `form.items` +
  // `responses` completos (ver rawMaterialReceptionsService.js) — eso
  // requiere pedir la inspección puntual. Acotado igual que el efecto de
  // arriba: solo las filas visibles, y solo las que ya tienen una
  // inspección (sin inspección no hay nada que pedir).
  //
  // `pedidosDetalle` guarda `lotId:inspectionId:status`, no solo el lotId —
  // así, si la inspección de un lote pasa de INICIADA a FINALIZADA (se
  // completó mientras esta pantalla estaba abierta en otra pestaña), la
  // clave cambia y se vuelve a pedir; con un Set de lotIds sueltos esto se
  // hubiera quedado pegado en el primer resultado para siempre.
  const [detallesInspeccion, setDetallesInspeccion] = useState({})
  const pedidosDetalle = useRef(new Set())

  useEffect(() => {
    const aPedir = paginados.filter((l) => {
      const resumen = resumenes[l.id]
      const insp = resumen && resumen !== 'error' ? resumen.inspection : null
      if (!insp?.id) return false
      return !pedidosDetalle.current.has(`${l.id}:${insp.id}:${insp.status}`)
    })
    if (aPedir.length === 0) return
    aPedir.forEach((l) => {
      const insp = resumenes[l.id].inspection
      pedidosDetalle.current.add(`${l.id}:${insp.id}:${insp.status}`)
    })
    let cancelado = false
    Promise.allSettled(aPedir.map((l) => inspectionsService.obtener(resumenes[l.id].inspection.id))).then((resultados) => {
      if (cancelado) return
      setDetallesInspeccion((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[aPedir[i].id] = r.status === 'fulfilled' ? r.value : 'error'
        })
        return siguiente
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, busqueda, estado, productoId, proveedorId, resumenes])

  const volverALista = () => {
    setLotAbierto(null)
    recargarLotes() // el estado (inspección/resolución) pudo cambiar mientras se editaba
  }
  const volverDeRemito = () => setRemitoAbierto(null)

  // El botón de la tabla ABRE EL FORMULARIO, directo — nada de más antes.
  // Antes esta función también intentaba crear la inspección acá (con su
  // propio `iniciando`/`errorIniciar`), duplicando lo que
  // FormularioInspeccionMateriaPrima YA hace solo al montarse — dos
  // intentos de creación que podían cruzarse entre sí y terminar
  // mostrando un 409 como si fuera un error real. Ahora hay un solo lugar
  // que crea la inspección si hace falta (ver el `useEffect` de auto-inicio
  // en ese componente, que además trata el 409 como éxito) — acá no queda
  // ninguna lógica async previa, un solo `setLotAbierto` sincrónico.

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Inspección." />
  }

  if (lotAbierto) {
    return (
      <main className="flex w-full flex-col gap-6 p-6 md:p-10">
        <FormularioInspeccionMateriaPrima lotId={lotAbierto} onVolver={volverALista} tituloVolver="Volver al listado" />
      </main>
    )
  }

  if (remitoAbierto) {
    return (
      <main className="flex w-full flex-col gap-6 p-6 md:p-10">
        <NotaRecepcionMateriaPrima lotId={remitoAbierto} onVolver={volverDeRemito} tituloVolver="Volver al listado" />
      </main>
    )
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ClipboardList className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Inspección</h1>
          <p className="text-sm text-marron-cafe/60">Lotes de materia prima — estado real de recepción, inspección y resolución.</p>
        </div>
      </header>

      {errorCarga && (
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
      )}

      {!lotes ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-2 sm:col-span-1">
              <SearchInput
                label="Buscar"
                placeholder="Código o producto…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(0)
                }}
              />
            </div>
            <FormSelect
              label="Producto"
              value={productoId}
              onChange={(e) => {
                setProductoId(e.target.value)
                setPagina(0)
              }}
            >
              <option value="">Todos</option>
              {productos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              label="Proveedor"
              value={proveedorId}
              onChange={(e) => {
                setProveedorId(e.target.value)
                setPagina(0)
              }}
            >
              <option value="">Todos</option>
              {proveedores?.map((s) => (
                <option key={s.id} value={s.id}>
                  {proveedorNombre(s.id)}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Fecha de recepción"
              type="date"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value)
                setPagina(0)
              }}
            />
            <FormSelect
              label="Estado"
              value={estado}
              onChange={(e) => {
                setEstado(e.target.value)
                setPagina(0)
              }}
            >
              <option value="">Todos</option>
              {Object.keys(TONO_ESTADO_LOTE).map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, ' ')}
                </option>
              ))}
            </FormSelect>
            <div className="col-span-2 flex items-end sm:col-span-1">
              <Button
                variant="secondary"
                className="w-full justify-center gap-1.5 px-3 py-2 text-sm"
                disabled={!hayFiltrosActivos}
                onClick={limpiarFiltros}
              >
                <X className="size-3.5" strokeWidth={2} />
                Limpiar filtros
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
            <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
              {/* Anchos fijos a propósito. Fecha de recepción subió un poco
                  para que el encabezado no parta en dos líneas; Estado
                  bajó otro poco para compensar, ahora que el símbolo de
                  arriba es solo un ícono (sin texto) le alcanza con menos.
                  Formulario subió de 20% a 27% (y el resto bajó un poco)
                  porque ahora puede llevar hasta 3 botones (Iniciar/Continuar/
                  Ver ~128px + Nota de recepción 36px + Aprobar 36px + 2 gaps
                  de 8px = 216px de contenido). Con 24% + min-w 1000px el
                  ancho de CONTENIDO real de la celda (descontando el padding
                  px-4 de cada lado, 32px) quedaba en 208px — 8px corto,
                  todavía se superponía con "Estado". Con 27% + min-w 1050px
                  quedan ~251px de contenido, con margen de sobra. */}
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[17%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[19%]" />
                <col className="w-[27%]" />
              </colgroup>
              <thead>
                {/* Encabezado con más peso — pedido explícito: "pasa muy
                    desapercibido". Fondo con tinte (no sombra, sigue la
                    regla de este sistema) + texto más oscuro en vez del
                    gris casi invisible de antes. */}
                {/* text-center acá, no en <table> — el cuerpo sigue alineado
                    a la izquierda (text-left en <table>), solo el
                    encabezado se centra sobre su columna. */}
                <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Recepción</th>
                  <th className="px-4 py-3">Fecha de recepción</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Formulario</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((l) => {
                  const resumen = resumenes[l.id]
                  const inspectionStatus = resumen && resumen !== 'error' ? resumen.summary.inspectionStatus : undefined
                  return (
                    <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                      <td className="truncate px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</td>
                      <td className="truncate px-4 py-3 text-marron-cafe" title={productoNombre(l.productId)}>
                        {productoNombre(l.productId)}
                      </td>
                      <td className="truncate px-4 py-3 text-marron-cafe" title={proveedorNombre(l.supplierId)}>
                        {proveedorNombre(l.supplierId)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {resumen === 'error' ? (
                          <span className="text-xs text-marron-cafe/40">—</span>
                        ) : resumen ? (
                          resumen.warehouseReceipt ? (
                            <Badge
                              tono={resumen.warehouseReceipt.status === 'FINALIZADA' ? 'positivo' : 'alerta'}
                              className="inline-flex items-center gap-1"
                            >
                              {resumen.warehouseReceipt.status === 'FINALIZADA' ? (
                                <CheckCircle2 className="size-3" strokeWidth={2.5} />
                              ) : (
                                <Pencil className="size-3" strokeWidth={2.5} />
                              )}
                              {resumen.warehouseReceipt.status}
                            </Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-marron-cafe/50">
                              <Circle className="size-3 shrink-0" strokeWidth={2.5} />
                              Sin iniciar
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-marron-cafe/40">Cargando…</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-marron-cafe/70">
                        {l.scheduledReceptionAt
                          ? new Date(l.scheduledReceptionAt).toLocaleDateString('es-BO', { dateStyle: 'medium' })
                          : <span className="text-xs text-marron-cafe/40">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {/* Grid de 3 columnas (1fr / auto / 1fr) en vez de
                            centrar el bloque entero — pedido explícito, dos
                            veces: primero "que el botón de completado no
                            mueva las celdas" y ahora "centrá un poco más,
                            pero el punto medio es la etapa 3/4, no del 1 al
                            check final". Las casillas viven SIEMPRE en la
                            columna del medio (`auto`), flanqueada por dos
                            columnas `1fr` iguales — eso las centra de
                            verdad en el ancho de la celda, y como los dos
                            costados son `1fr` sin importar cuánto pese la
                            derecha, agregar o sacar el check final nunca
                            corre las casillas de lugar. El check, cuando
                            existe, se ancla al borde izquierdo de la
                            columna derecha (`justify-self-start`) para que
                            quede pegado a las casillas y no salga volando
                            al borde de la celda. */}
                        {resumen === 'error' ? (
                          <span className="text-xs text-marron-cafe/40">—</span>
                        ) : resumen ? (
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                            <span aria-hidden="true" />
                            {/* Las 6 casillas del formulario — en qué sección
                                quedó la inspección, no el estado general del
                                lote (eso lo dice el símbolo de la derecha). */}
                            <IndicadorEtapas etapas={etapasFormularioDe(resumen, detallesInspeccion[l.id])} />
                            <div className="justify-self-start">
                              {(() => {
                                const etapa = etapaDe(resumen)
                                if (!etapa) return null
                                // Solo el símbolo, sin texto — pedido
                                // explícito: "en vez de poner 'APROBADO'
                                // arriba, poné un check". Separado de las
                                // casillas (borde a la izquierda), no
                                // apilado encima. El nombre completo sigue
                                // disponible al pasar el cursor.
                                return (
                                  <span className="flex items-center border-l border-marron-tierra/15 pl-3">
                                    <span
                                      title={etapa.texto}
                                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                                        etapa.tono === 'positivo' ? 'bg-verde-bosque text-crema-quinua' : 'bg-rojo-pasankalla text-crema-quinua'
                                      }`}
                                    >
                                      <etapa.Icon className="size-5" strokeWidth={2.5} />
                                    </span>
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-marron-cafe/40">Cargando…</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* El verbo, el ícono Y el color de borde cambian
                            según el estado real de LA INSPECCIÓN (no de la
                            recepción — esa es tarea de Almacén, ver
                            PanelAlmacen.jsx) — pedido explícito de Facundo:
                            rojo = "Iniciar" (todavía no existe), ámbar =
                            "Continuar" (hay que editar, INICIADA), verde =
                            "Ver" (ya está completa, FINALIZADA). `w-44` fijo
                            a propósito — pedido igual de explícito: "los
                            botones deben tener los mismos tamaños todos...
                            que cambie el texto y color según corresponda" —
                            texto acortado a un solo verbo ("Continuar
                            inspección" partía en dos renglones dentro de un
                            ancho fijo angosto, y ya sobra decir
                            "inspección" con la columna llamándose
                            "Formulario" al lado). Clic abre el formulario
                            directo, inline — sin variant primary/secondary
                            acá: el color YA dice el estado, no hace falta
                            además rellenar el fondo. */}
                        {/* flex-nowrap a propósito: los 3 botones siempre
                            quedan en una sola línea, a la misma altura — la
                            tabla entera ya scrollea horizontal
                            (overflow-x-auto en el contenedor) para pantallas
                            angostas, así que no hace falta que esta celda
                            parta en dos renglones. La columna se ensanchó
                            (24% + min-w 1000px) para que entren sin
                            superponerse. */}
                        <div className="flex flex-nowrap items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            className={`w-32 justify-center gap-1.5 border-2 px-3 py-1.5 text-xs whitespace-nowrap ${
                              !inspectionStatus
                                ? 'border-rojo-pasankalla!'
                                : inspectionStatus === 'INICIADA'
                                  ? 'border-oro-quinua!'
                                  : 'border-verde-bosque! text-verde-bosque!'
                            }`}
                            onClick={() => setLotAbierto(l.id)}
                          >
                            {!inspectionStatus ? (
                              <Play className="size-3.5 shrink-0" strokeWidth={2.25} />
                            ) : inspectionStatus === 'INICIADA' ? (
                              <Pencil className="size-3.5 shrink-0" strokeWidth={2.25} />
                            ) : (
                              <CheckCircle2 className="size-3.5 shrink-0" strokeWidth={2.25} />
                            )}
                            {!inspectionStatus ? 'Iniciar' : inspectionStatus === 'INICIADA' ? 'Continuar' : 'Ver'}
                          </Button>
                          {/* Formulario 3 (Nota de Recepción, P-ADM-03/R-11) —
                              solo lectura/imprimible, síntesis de este
                              formulario + el de Almacén. Ícono solo, sin
                              gatear por estado: los componentes ya saben
                              mostrar "—" para lo que todavía no existe,
                              mismo criterio que el resto de esta pantalla. */}
                          <button
                            type="button"
                            title="Nota de recepción (imprimible)"
                            aria-label="Ver nota de recepción"
                            onClick={() => setRemitoAbierto(l.id)}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-marron-tierra/20 text-marron-cafe/60 transition-colors duration-150 hover:border-marron-tierra/35 hover:text-marron-cafe"
                          >
                            <Receipt className="size-4" strokeWidth={2} />
                          </button>
                          {/* Ciclo de Resolución de Calidad (PanelAprobacionResolucion.jsx)
                              — antes esto solo se podía hacer desde Compras →
                              Lotes → PanelRecepcionLote.jsx; ahora el mismo
                              ícono lleva a las dos etapas sin salir de
                              Calidad. Un solo símbolo, tres estados por
                              color: gris (sin resolución emitida todavía) →
                              dorado (emitida, falta el visto bueno gerencial)
                              → verde (visto bueno ya dado). Solo se muestra a
                              quien podría hacer algo en algún momento del
                              ciclo (`puedeEmitir`/`puedeAprobar`) — si en el
                              momento puntual no le toca a esta persona (ej.
                              quien emitió no puede después aprobar su propia
                              resolución), la pantalla de destino ya lo
                              explica, no hace falta duplicar esa lógica acá. */}
                          {(() => {
                            const estado = estadoVistoBuenoDe(resumen)
                            if (!estado || !(puedeEmitir || puedeAprobar)) return null
                            const ESTILO = {
                              sin_resolucion: 'border-marron-tierra/30 text-marron-cafe/50 hover:bg-marron-tierra/10',
                              pendiente: 'border-oro-quinua text-oro-quinua hover:bg-oro-quinua/10',
                              aprobado: 'border-verde-bosque text-verde-bosque hover:bg-verde-bosque/10',
                            }
                            const TITULO = {
                              sin_resolucion: 'Emitir resolución de Calidad',
                              pendiente: 'Dar el visto bueno (visto bueno gerencial)',
                              aprobado: 'Visto bueno ya registrado',
                            }
                            return (
                              <button
                                type="button"
                                title={TITULO[estado]}
                                aria-label={TITULO[estado]}
                                onClick={() => navigate(`/panel/calidad/lotes/${l.id}/aprobacion`)}
                                className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${ESTILO[estado]}`}
                              >
                                <ShieldCheck className="size-4" strokeWidth={2.75} />
                              </button>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {paginados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                      No hay lotes de materia prima que coincidan con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Paginacion
            pagina={pagina}
            totalItems={filtrados.length}
            tamanioPagina={TAMANIO_PAGINA}
            cantidadMostrada={paginados.length}
            etiqueta="lotes"
            onCambiarPagina={setPagina}
          />
        </>
      )}
    </main>
  )
}
