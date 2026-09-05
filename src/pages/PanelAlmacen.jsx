import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, Warehouse } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { lotsService } from '../services/lotsService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { compararPorFechaRecepcion } from '../utils/fecha'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Skeleton from '../components/Skeleton.jsx'

// Almacén — Inicio del área: solo analytics, sin tabla ni acciones. La
// tabla de trabajo del día a día (lotes pendientes/en curso + el
// formulario de recepción) es su propia pantalla con submenú propio en el
// sidebar — "Recepción" (ver config/gruposMaestros.js y
// PanelAlmacenRecepcion.jsx), mismo mecanismo que ya tienen Compras
// (Personas/Organizaciones/...) y Calidad y Laboratorio (Inspección).
// Pedido explícito de Facundo: "que en almacén aparezca solo los datos
// como de inicio y se abra la nueva pestaña que sea recepción".
export default function PanelAlmacen() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')

  const [lotes, setLotes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  // lotId -> vista consolidada real (o 'error') — mismo criterio que
  // PanelAlmacenRecepcion.jsx: nunca se usa `lot.currentStatus` para
  // decidir si una recepción está iniciada, cerrada o sin arrancar, porque
  // ese campo agregado puede quedar desactualizado. La única fuente real
  // es `warehouseReceipt.status` de la vista consolidada.
  const [resumenes, setResumenes] = useState({})

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    lotsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setLotes(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const lotesPM = useMemo(() => (lotes ?? []).filter((l) => l.nature === 'PM'), [lotes])

  // Igual que la pantalla de trabajo: sin endpoint de agregados, se pide
  // la vista consolidada de cada lote PM para poder contar de verdad.
  // Volumen hoy chico (decenas, no miles) — si crece, esto necesita un
  // endpoint de agregados del backend.
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
  // dato falso, es el estado real de la base hoy.
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

  // Preview de "Sin recepción" — mismos lotes que ya cuenta kpis.sinRecepcion,
  // sin pedir nada nuevo al backend (0 llamadas extra, para no volver esto
  // más lento). Los primeros 5 por fecha de llegada más próxima, mismo
  // criterio de orden que la tabla de "Recepción".
  const resumenesCargando = lotesPM.length > 0 && lotesPM.some((l) => resumenes[l.id] === undefined)
  const pendientes = useMemo(
    () =>
      lotesPM
        .filter((l) => resumenes[l.id] !== undefined && !receiptDe(l))
        .sort(compararPorFechaRecepcion)
        .slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotesPM, resumenes],
  )

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
          No se pudo cargar: {errorCarga}
        </p>
      )}

      {!lotes ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard valor={kpis.sinRecepcion} etiqueta="Sin recepción" />
            <StatCard valor={kpis.enProceso} etiqueta="En proceso" />
            <StatCard valor={kpis.liberados} etiqueta="Liberados" />
            <StatCard valor={kpis.rechazados} etiqueta="Rechazados" />
          </div>
          <p className="text-xs text-marron-cafe/40">
            Cuenta todos los lotes de materia prima cargados hoy — no hay un endpoint de agregados en el backend
            todavía. El detalle por lote — iniciar o continuar una recepción — está en "Recepción", en el menú
            lateral.
          </p>

          <div className="mt-3 flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-extrabold text-marron-cafe">Pendientes de recepción</h2>
              <Link
                to="/panel/almacen/recepcion"
                className="flex items-center gap-1 text-sm font-medium text-verde-bosque hover:text-verde-hoja"
              >
                Ver todos
                <ArrowRight className="size-3.5" strokeWidth={2} />
              </Link>
            </div>

            {resumenesCargando ? (
              <Skeleton className="h-32" />
            ) : pendientes.length === 0 ? (
              <EmptyState Icon={ClipboardList} titulo="No hay lotes pendientes de recepción" />
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white/70">
                {pendientes.map((l) => (
                  <div
                    key={l.id}
                    className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3 last:border-b-0"
                  >
                    <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                    <span className="text-sm text-marron-cafe/60">
                      {l.scheduledReceptionAt
                        ? new Date(l.scheduledReceptionAt).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Sin fecha programada'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
