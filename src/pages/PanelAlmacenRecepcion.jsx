import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClipboardList, X, Pencil, CheckCircle2, XCircle, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { lotsService } from '../services/lotsService'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { listarTodo } from '../services/paginacion'
import { useLotesBuscables } from '../hooks/useLotesBuscables'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Button from '../components/Button.jsx'
import SearchInput from '../components/SearchInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import FormInput from '../components/FormInput.jsx'
import IndicadorEtapas from '../components/IndicadorEtapas.jsx'
import Skeleton from '../components/Skeleton.jsx'
import FormularioIngresoMateriaPrima from '../components/formularios/FormularioIngresoMateriaPrima.jsx'
import { SECCIONES_INGRESO_MATERIA_PRIMA } from '../components/formularios/seccionesIngresoMateriaPrima.js'
import { compararPorFechaRecepcion } from '../utils/fecha'

// Segundo formulario de la maqueta ya con el molde confirmado en
// Calidad y Laboratorio → Inspección (PanelCalidadRecepcion.jsx): misma
// tabla (filtros, columnas, casillas de etapa, botón de acción con borde
// de color fijo), mismo criterio de "el botón abre el formulario
// directo" — sin pantalla intermedia, sin lógica de creación acá (la
// tiene FormularioIngresoMateriaPrima.jsx, que además ya no la necesita:
// a diferencia de Inspección, acá TODAS las secciones se ven siempre,
// "Finalizar recepción" es un botón más adentro del propio formulario, no
// un estado especial que haya que resolver antes de mostrar nada).
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

// Check final de la columna "Estado" — mismo criterio que Calidad: solo
// aparece cuando el ciclo de la recepción está genuinamente cerrado
// (FINALIZADA o CANCELADA), nunca mientras sigue INICIADA. A diferencia
// de Calidad, acá no hay un segundo visto bueno gerencial separado — el
// propio cierre de la recepción de Almacén ES el evento final.
function etapaDe(resumen) {
  const wr = resumen && resumen !== 'error' ? resumen.warehouseReceipt : null
  if (!wr) return null
  if (wr.status === 'FINALIZADA') return { texto: 'Cerrada', tono: 'positivo', Icon: CheckCircle2 }
  if (wr.status === 'CANCELADA') return { texto: 'Cancelada', tono: 'negativo', Icon: XCircle }
  return null
}

// Las casillas del formulario — mismas secciones reales que ve quien
// completa P-ADM-03/R-02, leídas de seccionesIngresoMateriaPrima.js (única
// fuente de verdad, la comparte con FormularioIngresoMateriaPrima.jsx —
// antes cada archivo tenía su propia lista y se desincronizaron: acá
// aparecían 6 casillas cuando el papel real solo tiene 4 secciones +
// firmas). A diferencia de Inspección, acá NO hace falta un segundo
// pedido por fila: todo lo necesario para calcular el estado de cada
// sección ya viene en `warehouseReceipt` de la vista consolidada.
function estadoDeSeccion(numero, resumen) {
  const wr = resumen?.warehouseReceipt
  if (numero === 5) {
    // Firmas: mismo criterio que Calidad — sin firma digital conectada al
    // sistema todavía, se usa el visto bueno gerencial de Calidad
    // (`qualityReviewStatus === 'APROBADO'`) como la firma real más
    // cercana que SÍ queda registrada, último paso de la cadena real de
    // firmas del papel (Recepción → Transporte → Calidad → Almacén).
    if (wr?.status !== 'FINALIZADA') return 'sin_iniciar'
    return resumen.summary?.qualityReviewStatus === 'APROBADO' ? 'completo' : 'pendiente'
  }
  if (!wr) return 'sin_iniciar'

  if (numero === 1) {
    const prodOk = wr.producerListVerified === true || (wr.producerListNotes ?? '').trim() !== ''
    const guiaOk = wr.shippingGuideVerified === true || (wr.shippingGuideNotes ?? '').trim() !== ''
    if (!prodOk && !guiaOk) return 'sin_iniciar'
    return prodOk && guiaOk ? 'completo' : 'pendiente'
  }

  if (numero === 2) return 'completo' // datos de referencia, ya vienen del lote

  if (numero === 3) {
    // Mismos 5 campos que exige FormularioIngresoMateriaPrima.jsx para
    // considerar el transporte completo (identityDocument/licenseCategory/
    // brand/model ya no existen, ver DatosTransporte.jsx) — todo o nada,
    // pero acá se permite un estado intermedio (algunos cargados) para la
    // casilla.
    const campos = [
      wr.transportInfo?.driver?.fullName,
      wr.transportInfo?.driver?.licenseNumber,
      wr.transportInfo?.vehicle?.plate,
      wr.transportInfo?.vehicle?.type,
      wr.transportInfo?.vehicle?.color,
    ]
    const llenos = campos.filter((v) => (v ?? '').trim() !== '').length
    if (llenos === 0) return 'sin_iniciar'
    return llenos === campos.length ? 'completo' : 'pendiente'
  }

  if (numero === 4) {
    // Sección 4 real del papel: envase/N. de bolsas Y el cierre con
    // pesaje van juntos bajo el mismo encabezado — ver
    // FormularioIngresoMateriaPrima.jsx. Completa recién cuando las dos
    // mitades lo están; sin nada cargado en ninguna, sin iniciar; todo lo
    // demás, en curso.
    const productoOk = Boolean(wr.packagingType) && wr.receivedPackageCount > 0
    if (!wr.packagingType && !wr.receivedPackageCount) return 'sin_iniciar'
    return productoOk && wr.status === 'FINALIZADA' ? 'completo' : 'pendiente'
  }

  return 'sin_iniciar'
}

function etapasFormularioDe(resumen) {
  return SECCIONES_INGRESO_MATERIA_PRIMA.map((s) => ({ ...s, estado: estadoDeSeccion(s.numero, resumen) }))
}

export default function PanelAlmacenRecepcion() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')

  const {
    lotes,
    busqueda,
    setBusqueda,
    cursor,
    cargandoMas,
    errorCarga,
    cargarMas,
    recargar: recargarLotes,
  } = useLotesBuscables({ puedeVer })
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [lotAbierto, setLotAbierto] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const [estado, setEstado] = useState('')
  const [productoId, setProductoId] = useState('')
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState('')

  const hayFiltrosActivos = busqueda !== '' || estado !== '' || productoId !== '' || proveedorId !== '' || fecha !== ''
  const limpiarFiltros = () => {
    setBusqueda('')
    setEstado('')
    setProductoId('')
    setProveedorId('')
    setFecha('')
  }

  const [resumenes, setResumenes] = useState({}) // lotId -> vista consolidada (o 'error')

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    Promise.all([listarTodo(productsService.listar), listarTodo(suppliersService.listar)])
      .then(([productos, proveedores]) => {
        if (cancelado) return
        setProductos(productos)
        setProveedores(proveedores)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  // Deep-link desde notificación (?lote=, ver
  // src/config/notificacionesRutas.js): pide el lote directo por id — ya no
  // alcanza con buscarlo en `lotes` (con paginación real, un lote nuevo
  // puede no estar en la primera página cargada). Si no existe o no es PM
  // (ej. es PT), no hace nada y queda el listado normal.
  useEffect(() => {
    const loteId = searchParams.get('lote')
    if (!loteId) return
    setSearchParams(
      (prev) => {
        const siguiente = new URLSearchParams(prev)
        siguiente.delete('lote')
        return siguiente
      },
      { replace: true },
    )
    lotsService
      .obtener(loteId)
      .then((lote) => {
        if (lote.nature === 'PM') setLotAbierto(loteId)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => {
    const s = proveedores?.find((p) => p.id === id)
    if (!s) return '—'
    return s.person ? `${s.person.firstNames} ${s.person.lastNames}` : s.organization ? s.organization.tradeName || s.organization.legalName : '—'
  }

  // busqueda (código) ya filtra del lado del servidor (ver
  // useLotesBuscables) — acá solo quedan los filtros que el backend todavía
  // no soporta.
  const filtrados = useMemo(() => {
    if (!lotes) return []
    return lotes
      .filter((l) => {
        if (estado && l.currentStatus !== estado) return false
        if (productoId && l.productId !== productoId) return false
        if (proveedorId && l.supplierId !== proveedorId) return false
        if (fecha && (!l.scheduledReceptionAt || new Date(l.scheduledReceptionAt).toLocaleDateString('en-CA') !== fecha)) return false
        return true
      })
      .sort(compararPorFechaRecepcion)
  }, [lotes, estado, productoId, proveedorId, fecha])

  // Enriquecimiento acotado a lo visible — mismo criterio que
  // PanelCalidadRecepcion.jsx: no existe un endpoint de listado con
  // resumen, así que se pide la vista consolidada por lote en paralelo.
  useEffect(() => {
    let cancelado = false
    Promise.allSettled(filtrados.map((l) => rawMaterialReceptionsService.obtener(l.id))).then((resultados) => {
      if (cancelado) return
      setResumenes((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[filtrados[i].id] = r.status === 'fulfilled' ? r.value : 'error'
        })
        return siguiente
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes, estado, productoId, proveedorId, fecha])

  const volverALista = () => {
    setLotAbierto(null)
    recargarLotes() // el estado pudo cambiar mientras se editaba
  }

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Almacén." />
  }

  if (lotAbierto) {
    return (
      <main className="flex w-full flex-col gap-6 p-6 md:p-10">
        <FormularioIngresoMateriaPrima lotId={lotAbierto} onVolver={volverALista} tituloVolver="Volver al listado" />
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
          <h1 className="text-2xl font-extrabold text-marron-cafe">Recepción</h1>
          <p className="text-sm text-marron-cafe/60">Lotes de materia prima — recepción de Almacén.</p>
        </div>
      </header>

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

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
                placeholder="Código de lote…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <FormSelect label="Producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Todos</option>
              {productos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Proveedor" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}>
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
              onChange={(e) => setFecha(e.target.value)}
            />
            <FormSelect label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
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

          {/* Tarjetas en mobile — la tabla de abajo obliga a scrollear
              horizontal en pantallas angostas (min-w-[820px]), acá se
              repite la misma info apilada. */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtrados.map((l) => {
              const resumen = resumenes[l.id]
              const wrStatus = resumen && resumen !== 'error' ? resumen.warehouseReceipt?.status : undefined
              return (
                <div key={l.id} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</p>
                    <p className="truncate text-sm text-marron-cafe">{productoNombre(l.productId)}</p>
                    <p className="truncate text-xs text-marron-cafe/60">{proveedorNombre(l.supplierId)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-marron-tierra/10 pt-2">
                    <span className="text-xs text-marron-cafe/60">
                      {l.scheduledReceptionAt ? (
                        new Date(l.scheduledReceptionAt).toLocaleDateString('es-BO', { dateStyle: 'medium' })
                      ) : (
                        <span className="text-marron-cafe/40">Sin fecha</span>
                      )}
                    </span>
                    {resumen && resumen !== 'error' && <IndicadorEtapas etapas={etapasFormularioDe(resumen)} />}
                  </div>
                  <Button
                    variant="secondary"
                    className={`w-full justify-center gap-1.5 border-2 px-3 py-1.5 text-xs ${
                      !wrStatus
                        ? 'border-rojo-pasankalla!'
                        : wrStatus === 'INICIADA'
                          ? 'border-oro-quinua!'
                          : 'border-verde-bosque! text-verde-bosque!'
                    }`}
                    onClick={() => setLotAbierto(l.id)}
                  >
                    {!wrStatus ? (
                      <Play className="size-3.5 shrink-0" strokeWidth={2.25} />
                    ) : wrStatus === 'INICIADA' ? (
                      <Pencil className="size-3.5 shrink-0" strokeWidth={2.25} />
                    ) : (
                      <CheckCircle2 className="size-3.5 shrink-0" strokeWidth={2.25} />
                    )}
                    {!wrStatus ? 'Iniciar' : wrStatus === 'INICIADA' ? 'Continuar' : 'Ver'}
                  </Button>
                </div>
              )
            })}
            {filtrados.length === 0 && (
              <p className="rounded-2xl bg-marron-tierra/5 px-4 py-6 text-center text-sm text-marron-cafe/50">
                No hay lotes de materia prima que coincidan con el filtro.
              </p>
            )}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 md:block">
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[24%]" />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Fecha de recepción</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Formulario</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l) => {
                  const resumen = resumenes[l.id]
                  const wrStatus = resumen && resumen !== 'error' ? resumen.warehouseReceipt?.status : undefined
                  return (
                    <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                      <td className="truncate px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</td>
                      <td className="truncate px-4 py-3 text-marron-cafe" title={productoNombre(l.productId)}>
                        {productoNombre(l.productId)}
                      </td>
                      <td className="truncate px-4 py-3 text-marron-cafe" title={proveedorNombre(l.supplierId)}>
                        {proveedorNombre(l.supplierId)}
                      </td>
                      <td className="px-4 py-3 text-center text-marron-cafe/70">
                        {l.scheduledReceptionAt ? (
                          new Date(l.scheduledReceptionAt).toLocaleDateString('es-BO', { dateStyle: 'medium' })
                        ) : (
                          <span className="text-xs text-marron-cafe/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {resumen === 'error' ? (
                          <span className="text-xs text-marron-cafe/40">—</span>
                        ) : resumen ? (
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                            <span aria-hidden="true" />
                            <IndicadorEtapas etapas={etapasFormularioDe(resumen)} />
                            <div className="justify-self-start">
                              {(() => {
                                const etapa = etapaDe(resumen)
                                if (!etapa) return null
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
                        {/* Mismo criterio de color que Inspección: rojo =
                            "Iniciar" (todavía no existe), ámbar =
                            "Continuar" (INICIADA), verde = "Ver" (cerrada o
                            cancelada). El botón abre el formulario directo
                            — sin lógica de creación acá. */}
                        <Button
                          variant="secondary"
                          className={`w-32 justify-center gap-1.5 border-2 px-3 py-1.5 text-xs whitespace-nowrap ${
                            !wrStatus
                              ? 'border-rojo-pasankalla!'
                              : wrStatus === 'INICIADA'
                                ? 'border-oro-quinua!'
                                : 'border-verde-bosque! text-verde-bosque!'
                          }`}
                          onClick={() => setLotAbierto(l.id)}
                        >
                          {!wrStatus ? (
                            <Play className="size-3.5 shrink-0" strokeWidth={2.25} />
                          ) : wrStatus === 'INICIADA' ? (
                            <Pencil className="size-3.5 shrink-0" strokeWidth={2.25} />
                          ) : (
                            <CheckCircle2 className="size-3.5 shrink-0" strokeWidth={2.25} />
                          )}
                          {!wrStatus ? 'Iniciar' : wrStatus === 'INICIADA' ? 'Continuar' : 'Ver'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                      No hay lotes de materia prima que coincidan con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {cursor && (
            <div className="flex justify-center">
              <Button variant="secondary" className="px-4 py-2 text-sm" disabled={cargandoMas} onClick={cargarMas}>
                {cargandoMas ? 'Cargando…' : 'Cargar más'}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
