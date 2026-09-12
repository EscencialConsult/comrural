import { useEffect, useMemo, useState } from 'react'
import { Boxes, ClipboardList, Layers, Thermometer, TriangleAlert } from 'lucide-react'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import { productionAreaAService } from '../../services/productionAreaAService'
import { shiftsService } from '../../services/shiftsService'
import { listarTodo } from '../../services/paginacion'
import StatCard from '../dashboard/StatCard.jsx'
import Badge from '../Badge.jsx'
import FormSelect from '../FormSelect.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'

// Mismo umbral que usa el backend para la alerta de secado bajo al cerrar un
// turno (ver DRYER_TEMP_ALERT_THRESHOLD_C en
// production-area-a-entries.service.ts) — no hay endpoint que lo exponga,
// así que se replica acá para que el ícono de esta tabla coincida con la
// notificación real que ya dispara ese cierre.
const DRYER_TEMP_ALERT_THRESHOLD_C = 70

// Mismo criterio de tonos que PanelCompras/PanelCalidadRecepcion (ver
// TONO_ESTADO_LOTE ahí) — solo los estados que puede tener un lote PM que ya
// llegó a Producción (Área A).
const TONO_ESTADO_LOTE = {
  ACEPTADO_RECEPCION: 'info',
  LAVADO: 'ambar',
  EN_ANALISIS: 'violeta',
  PENDIENTE_LIBERACION: 'ambar',
  RETENIDO: 'negativo',
  LIBERADO: 'liberado',
  RECHAZADO: 'negativo',
}

// PROGRAMADO/EN_RECEPCION/CANCELADO todavía no llegan a Producción — el
// punto de entrada real es ACEPTADO_RECEPCION (ver SeccionLotesProduccion.jsx).
const ESTADOS_PRODUCCION = Object.keys(TONO_ESTADO_LOTE)

// Dashboard "Inicio" de Producción — real, Área A (production-area-a, ver
// comrural_erp_backend/docs/production-area-a.md). Área B se sacó por
// completo (era 100% mockup); esto ya no soporta una segunda área ni los
// campos que solo esa maqueta inventaba (humedad, "turnoActual"/"etapa"
// libres, kilos totales del lote) — sin un endpoint que devuelva el total de
// materia prima a lavar por lote, "avance" se muestra en kg reales
// (usedKg/washedKg de production-area-a.entries), no como % inventado.
export default function DashboardProduccion() {
  const [filas, setFilas] = useState(null)
  const [indicadores, setIndicadores] = useState(null)
  const [turnos, setTurnos] = useState([])
  const [errorCarga, setErrorCarga] = useState(null)
  const [turnoId, setTurnoId] = useState('todos')
  const [estado, setEstado] = useState('todos')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      const [lotesResp, productos, turnosResp, indicadoresResp] = await Promise.all([
        lotsService.listar({ limit: 100 }),
        listarTodo(productsService.listar),
        shiftsService.listar(),
        productionAreaAService.indicadores(),
      ])

      const lotesAreaA = lotesResp.data.filter((l) => l.nature === 'PM' && ESTADOS_PRODUCCION.includes(l.currentStatus))
      const entradasPorLote = await Promise.all(
        lotesAreaA.map((l) => productionAreaAService.listarPorLote(l.id)),
      )

      if (cancelado) return

      const productoNombre = (id) => productos.find((p) => p.id === id)?.name ?? '—'
      const turno = (id) => turnosResp.find((t) => t.id === id) ?? null

      const nuevasFilas = lotesAreaA.map((lote, i) => {
        const entradas = entradasPorLote[i]
        const ultimaEntrada = entradas[entradas.length - 1] ?? null
        const shift = ultimaEntrada ? turno(ultimaEntrada.shiftId) : null
        return {
          id: lote.id,
          code: lote.code,
          product: productoNombre(lote.productId),
          currentStatus: lote.currentStatus,
          turnoId: shift?.id ?? null,
          turnoNombre: shift?.name ?? '—',
          usedKg: entradas.reduce((acc, e) => acc + e.usedKg, 0),
          washedKg: entradas.reduce((acc, e) => acc + e.washedKg, 0),
          enProceso: entradas.some((e) => !e.closedAt),
          alertaSecado: entradas.some(
            (e) =>
              e.closedAt &&
              ((e.avgDryer1TempC !== null && e.avgDryer1TempC < DRYER_TEMP_ALERT_THRESHOLD_C) ||
                (e.avgDryer2TempC !== null && e.avgDryer2TempC < DRYER_TEMP_ALERT_THRESHOLD_C)),
          ),
        }
      })

      setFilas(nuevasFilas)
      setTurnos(turnosResp)
      setIndicadores(indicadoresResp)
    }

    cargar().catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const stats = useMemo(() => {
    if (!filas) return null
    const activos = filas.filter((f) => f.enProceso)
    const alertas = filas.filter((f) => f.alertaSecado).length
    const turnoConMasActividad = turnos.reduce(
      (max, t) => {
        const cantidad = activos.filter((f) => f.turnoId === t.id).length
        return cantidad > max.cantidad ? { turno: t, cantidad } : max
      },
      { turno: null, cantidad: 0 },
    ).turno
    return { activos: activos.length, alertas, turnoConMasActividad }
  }, [filas, turnos])

  const filasFiltradas = useMemo(() => {
    if (!filas) return []
    return filas.filter((f) => {
      if (turnoId !== 'todos' && f.turnoId !== turnoId) return false
      if (estado !== 'todos' && f.currentStatus !== estado) return false
      return true
    })
  }, [filas, turnoId, estado])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (!filas || !stats || !indicadores) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          Icon={Layers}
          tono="info"
          valor={stats.turnoConMasActividad?.name ?? '—'}
          etiqueta="Turno con más actividad"
        />
        <StatCard
          Icon={Boxes}
          tono="positivo"
          valor={`${indicadores.washedKg.toLocaleString('es-BO')} kg`}
          etiqueta="Kilos lavados (histórico)"
        />
        <StatCard Icon={ClipboardList} tono="neutro" valor={stats.activos} etiqueta="Lotes en proceso" />
        <StatCard Icon={TriangleAlert} tono={stats.alertas > 0 ? 'alerta' : 'positivo'} valor={stats.alertas} etiqueta="Alertas de secado" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FormSelect label="Turno" value={turnoId} onChange={(e) => setTurnoId(e.target.value)} className="w-48">
          <option value="todos">Todos los turnos</option>
          {turnos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="w-56">
          <option value="todos">Todos los estados</option>
          {ESTADOS_PRODUCCION.map((valor) => (
            <option key={valor} value={valor}>
              {valor.replace(/_/g, ' ')}
            </option>
          ))}
        </FormSelect>
      </div>

      {filasFiltradas.length === 0 ? (
        <EmptyState Icon={ClipboardList} titulo="Ningún lote coincide con el filtro" />
      ) : (
        <>
          {/* Tarjetas en mobile — la tabla de abajo obliga a scrollear
              horizontal en pantallas angostas (min-w-[720px]). */}
          <div className="flex flex-col gap-3 md:hidden">
            {filasFiltradas.map((f) => (
              <div key={f.id} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-marron-cafe/70">{f.code}</p>
                    <p className="truncate text-sm text-marron-cafe">{f.product}</p>
                  </div>
                  <Badge tono={TONO_ESTADO_LOTE[f.currentStatus] ?? 'neutro'} className="shrink-0">
                    {f.currentStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-marron-tierra/10 pt-2 text-xs">
                  <span className="text-marron-cafe/70">{f.turnoNombre}</span>
                  <span className="text-marron-cafe">
                    {f.usedKg.toLocaleString('es-BO')} kg / {f.washedKg.toLocaleString('es-BO')} kg
                  </span>
                  {f.alertaSecado && (
                    <span className="flex items-center gap-1 font-semibold text-marron-arcilla">
                      <Thermometer className="size-3.5" strokeWidth={1.75} />
                      Alerta de secado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 md:block">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-left text-xs font-semibold tracking-wide text-marron-cafe/50 uppercase">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Usado / Lavado</th>
                <th className="px-4 py-3">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {filasFiltradas.map((f) => (
                <tr key={f.id} className="border-b border-marron-tierra/10 last:border-b-0">
                  <td className="px-4 py-3.5">
                    <p className="font-mono text-xs font-semibold text-marron-cafe/70">{f.code}</p>
                    <p className="text-xs text-marron-cafe/50">{f.product}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tono={TONO_ESTADO_LOTE[f.currentStatus] ?? 'neutro'}>{f.currentStatus.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-marron-cafe/70">{f.turnoNombre}</td>
                  <td className="px-4 py-3.5 text-marron-cafe">
                    {f.usedKg.toLocaleString('es-BO')} kg / {f.washedKg.toLocaleString('es-BO')} kg
                  </td>
                  <td className="px-4 py-3.5">
                    {f.alertaSecado ? (
                      <div className="flex items-center gap-2 text-marron-arcilla">
                        <Thermometer className="size-4" strokeWidth={1.75} />
                      </div>
                    ) : (
                      <span className="text-xs text-marron-cafe/30">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  )
}
