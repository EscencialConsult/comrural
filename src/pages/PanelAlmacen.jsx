import { useEffect, useMemo, useState } from 'react'
import { Warehouse } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { productsService } from '../services/productsService'
import { lotsService } from '../services/lotsService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import Button from '../components/Button.jsx'
import FormularioIngresoMateriaPrima from '../components/formularios/FormularioIngresoMateriaPrima.jsx'

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

// Almacén — la "Recepción" es la subpestaña real que pidió Milenka en la
// reunión (ver video1788040555.txt): "necesito ponerle otra subpestaña a
// este almacén que diga recepción". Antes había acá un prototipo local
// (sesiones en memoria de React, sin tabla ni endpoint, se perdía al
// recargar la página) que ya intentaba esta misma forma con datos
// simulados — se reemplaza entero por el formulario real, contra el
// backend real: el mismo FormularioIngresoMateriaPrima.jsx que audita el
// DTO de warehouse-receipts completo (ver docs/formulario-ingreso-materia-prima.md).
//
// Por qué es una vista local (`pantalla.vista`) y no una ruta con URL
// propia: es exactamente lo que la reunión pidió — una subpestaña DENTRO
// de Almacén, no una pantalla aparte a la que hay que navegar saliendo de
// acá. Entrar y salir de un lote no cambia la URL.
export default function PanelAlmacen() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')

  const [productos, setProductos] = useState(null)
  const [lotes, setLotes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [pantalla, setPantalla] = useState({ vista: 'lista', lotId: null })
  // lotId -> vista consolidada real (o 'error') — NUNCA se usa
  // `lot.currentStatus` para decidir si una recepción está iniciada,
  // cerrada o sin arrancar. Se encontró en vivo que un lote puede quedar
  // con `currentStatus: PROGRAMADO` aunque su `warehouseReceipt` ya esté
  // FINALIZADA (el estado agregado del lote no siempre se pone al día) —
  // con el criterio viejo, ese lote aparecía en "pendientes" con el botón
  // "Iniciar recepción", como si nada se hubiera hecho todavía. La única
  // fuente real de si YA se inició/cerró una recepción es
  // `warehouseReceipt.status`, de la vista consolidada.
  const [resumenes, setResumenes] = useState({})

  const recargarLotes = () => {
    lotsService
      .listar({ limit: 100 })
      .then((resp) => setLotes(resp.data))
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    // productsService.listar() devuelve el sobre paginado real
    // { data, nextCursor, hasMore } (mismo criterio que countries/people/
    // organizations). Los .catch() son necesarios: sin ellos, si cualquiera
    // de las dos cargas falla, la pantalla queda en "Cargando…" para
    // siempre sin ningún aviso.
    productsService
      .listar()
      .then((resp) => !cancelado && setProductos(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    lotsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setLotes(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  const lotesPM = useMemo(() => (lotes ?? []).filter((l) => l.nature === 'PM'), [lotes])

  // Enriquecimiento con el estado real de recepción de cada lote PM — el
  // volumen hoy es chico (decenas de lotes, no miles), así que se pide de
  // una sola vez para toda la lista, no paginado como en PanelCalidad.jsx
  // (que sí puede tener cientos de filas). Si el volumen real crece mucho,
  // esto necesita el mismo acotado a la página visible.
  useEffect(() => {
    if (lotesPM.length === 0) return
    let cancelado = false
    Promise.allSettled(lotesPM.map((l) => rawMaterialReceptionsService.obtener(l.id))).then((resultados) => {
      if (cancelado) return
      setResumenes((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[lotesPM[i].id] = r.status === 'fulfilled' ? r.value : 'error'
        })
        return siguiente
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes])

  const receiptDe = (l) => {
    const r = resumenes[l.id]
    return r && r !== 'error' ? r.warehouseReceipt : undefined // undefined = todavía no llegó la respuesta
  }

  // KPIs reales — "Liberados"/"Rechazados" van a mostrar 0 hasta que exista
  // el flujo de liberación (Proceso 2, todavía sin endpoints); no es un
  // dato falso, es el estado real de la base hoy. Esos dos SÍ pueden
  // quedarse en `currentStatus` (no dependen de warehouse-receipts). Las
  // otras dos cuentan la recepción real, no el estado agregado del lote.
  const kpis = useMemo(() => {
    const cargados = lotesPM.filter((l) => receiptDe(l) !== undefined)
    return {
      sinRecepcion: cargados.filter((l) => !receiptDe(l)).length,
      enProceso: cargados.filter((l) => receiptDe(l)?.status === 'INICIADA').length,
      liberados: lotesPM.filter((l) => l.currentStatus === 'LIBERADO').length,
      rechazados: lotesPM.filter((l) => l.currentStatus === 'RECHAZADO').length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotesPM, resumenes])

  const pendientes = useMemo(
    () => lotesPM.filter((l) => receiptDe(l) === undefined || !receiptDe(l) || receiptDe(l).status === 'INICIADA'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotesPM, resumenes],
  )
  const cerradas = useMemo(
    () => lotesPM.filter((l) => receiptDe(l) && ['FINALIZADA', 'CANCELADA'].includes(receiptDe(l).status)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotesPM, resumenes],
  )

  const abrirRecepcion = (lotId) => setPantalla({ vista: 'recepcion', lotId })
  const volverALista = () => {
    setPantalla({ vista: 'lista', lotId: null })
    recargarLotes() // el estado del lote (currentStatus) pudo cambiar mientras se editaba
  }

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Warehouse className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Almacén</h1>
          <p className="text-sm text-marron-cafe/60">Recepción de materia prima.</p>
        </div>
      </header>

      {errorCarga && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
          No se pudo cargar todo lo necesario: {errorCarga}
        </p>
      )}

      {pantalla.vista === 'lista' ? (
        <>
          <section className="grid gap-3 sm:grid-cols-4">
            <StatCard valor={kpis.sinRecepcion} etiqueta="Sin recepción" />
            <StatCard valor={kpis.enProceso} etiqueta="En proceso" />
            <StatCard valor={kpis.liberados} etiqueta="Liberados" />
            <StatCard valor={kpis.rechazados} etiqueta="Rechazados" />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">Recepción — lotes pendientes o en curso</h2>
            {lotes === null ? (
              <p className="text-sm text-marron-cafe/50">Cargando…</p>
            ) : (
              <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
                {pendientes.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
                  >
                    <div>
                      <p className="font-mono text-xs text-marron-cafe/50">{l.code}</p>
                      <p className="font-semibold text-marron-cafe">{productoNombre(l.productId)}</p>
                      <p className="text-xs text-marron-cafe/50">
                        Llegada programada: {l.scheduledReceptionAt ? formatearFechaHora(l.scheduledReceptionAt) : '—'}
                      </p>
                    </div>
                    <Button className="px-4 py-1.5 text-sm" onClick={() => abrirRecepcion(l.id)}>
                      {receiptDe(l) === undefined ? 'Ver' : !receiptDe(l) ? 'Iniciar recepción' : 'Continuar recepción'}
                    </Button>
                  </div>
                ))}
                {pendientes.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                    No hay lotes de materia prima esperando recepción.
                  </p>
                )}
              </div>
            )}
          </section>

          {cerradas.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-marron-cafe">Recepciones cerradas</h2>
              <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
                {cerradas.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
                  >
                    <div>
                      <p className="font-mono text-xs text-marron-cafe/50">{l.code}</p>
                      <p className="font-semibold text-marron-cafe">{productoNombre(l.productId)}</p>
                    </div>
                    <Button variant="secondary" className="px-4 py-1.5 text-sm" onClick={() => abrirRecepcion(l.id)}>
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <FormularioIngresoMateriaPrima lotId={pantalla.lotId} onVolver={volverALista} tituloVolver="Volver al listado" />
      )}
    </main>
  )
}
