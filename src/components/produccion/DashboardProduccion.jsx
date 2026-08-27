import { useEffect, useMemo, useState } from 'react'
import { Boxes, ClipboardList, Droplets, Layers, Thermometer, TriangleAlert } from 'lucide-react'
import { produccionService } from '../../services/produccionService'
import StatCard from '../dashboard/StatCard.jsx'
import Badge from '../Badge.jsx'
import FormSelect from '../FormSelect.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'

const TURNOS = [
  { id: 1, nombre: 'Turno 1 · Mañana' },
  { id: 2, nombre: 'Turno 2 · Tarde' },
  { id: 3, nombre: 'Turno 3 · Noche' },
]

// Paleta de estado pedida (sección 5 del brief) — mapea al tono de Badge más
// cercano disponible (ver comentario en Badge.jsx sobre por qué "amarillo"/
// "morado" usan ambar/violeta en vez de un color literal nuevo).
const ESTADOS_PROCESO = {
  EN_PROCESO: { label: 'En proceso', tono: 'info' },
  PAUSADO: { label: 'Pausado', tono: 'ambar' },
  FINALIZADO: { label: 'Finalizado', tono: 'positivo' },
  ESPERA_LAB_EXTERNO: { label: 'Espera de Lab externo', tono: 'violeta' },
  ESPERA_CALIDAD: { label: 'Espera de reporte de Calidad', tono: 'violeta' },
  LIBERADO: { label: 'Liberado', tono: 'liberado' },
  RECHAZADO: { label: 'Rechazado', tono: 'negativo' },
}

function fueraDeRango({ valor, min, max }) {
  return valor < min || valor > max
}

export default function DashboardProduccion() {
  const [lotes, setLotes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [turno, setTurno] = useState('todos')
  const [estado, setEstado] = useState('todos')

  useEffect(() => {
    let cancelado = false
    produccionService
      .listarLotes()
      .then((data) => !cancelado && setLotes(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const stats = useMemo(() => {
    if (!lotes) return null
    const activos = lotes.filter((l) => l.currentStatus === 'EN_PROCESO' || l.currentStatus === 'PAUSADO')
    const kilosHoy = lotes.reduce((acc, l) => acc + l.kilosProcesados, 0)
    const alertas = lotes.filter((l) => fueraDeRango(l.humedad) || fueraDeRango(l.temperatura)).length
    const turnoConMasActividad = TURNOS.reduce(
      (max, t) => {
        const cantidad = activos.filter((l) => l.turnoActual === t.id).length
        return cantidad > max.cantidad ? { turno: t, cantidad } : max
      },
      { turno: null, cantidad: -1 },
    ).turno
    return { activos: activos.length, kilosHoy, alertas, turnoConMasActividad }
  }, [lotes])

  const lotesFiltrados = useMemo(() => {
    if (!lotes) return []
    return lotes.filter((l) => {
      if (turno !== 'todos' && l.turnoActual !== Number(turno)) return false
      if (estado !== 'todos' && l.currentStatus !== estado) return false
      return true
    })
  }, [lotes, turno, estado])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (!lotes || !stats) {
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
          valor={stats.turnoConMasActividad?.nombre.split(' · ')[0] ?? '—'}
          etiqueta="Turno con más actividad"
        />
        <StatCard Icon={Boxes} tono="positivo" valor={`${stats.kilosHoy.toLocaleString('es-BO')} kg`} etiqueta="Kilos procesados" />
        <StatCard Icon={ClipboardList} tono="neutro" valor={stats.activos} etiqueta="Lotes en proceso" />
        <StatCard Icon={TriangleAlert} tono={stats.alertas > 0 ? 'alerta' : 'positivo'} valor={stats.alertas} etiqueta="Alertas de humedad/temp." />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <FormSelect label="Turno" value={turno} onChange={(e) => setTurno(e.target.value)} className="w-48">
          <option value="todos">Todos los turnos</option>
          {TURNOS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </FormSelect>
        <FormSelect label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="w-56">
          <option value="todos">Todos los estados</option>
          {Object.entries(ESTADOS_PROCESO).map(([valor, { label }]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </FormSelect>
      </div>

      {lotesFiltrados.length === 0 ? (
        <EmptyState Icon={ClipboardList} titulo="Ningún lote coincide con el filtro" />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-left text-xs font-semibold tracking-wide text-marron-cafe/50 uppercase">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Área / etapa</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Avance</th>
                <th className="px-4 py-3">Alertas</th>
              </tr>
            </thead>
            <tbody>
              {lotesFiltrados.map((l) => {
                const avance = Math.round((l.kilosProcesados / l.kilosTotal) * 100)
                const estadoInfo = ESTADOS_PROCESO[l.currentStatus] ?? { label: l.currentStatus, tono: 'neutro' }
                const alertaHumedad = fueraDeRango(l.humedad)
                const alertaTemperatura = fueraDeRango(l.temperatura)
                return (
                  <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0">
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</p>
                      <p className="text-xs text-marron-cafe/50">{l.product}</p>
                    </td>
                    <td className="px-4 py-3.5 text-marron-cafe">
                      Área {l.area} · {l.etapa}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tono={estadoInfo.tono}>{estadoInfo.label}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-marron-cafe/70">Turno {l.turnoActual}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-marron-tierra/10">
                          <div className="h-full rounded-full bg-verde-lima" style={{ width: `${avance}%` }} />
                        </div>
                        <span className="text-xs text-marron-cafe/60">{avance}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {alertaHumedad || alertaTemperatura ? (
                        <div className="flex items-center gap-2 text-marron-arcilla">
                          {alertaHumedad && <Droplets className="size-4" strokeWidth={1.75} />}
                          {alertaTemperatura && <Thermometer className="size-4" strokeWidth={1.75} />}
                        </div>
                      ) : (
                        <span className="text-xs text-marron-cafe/30">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
