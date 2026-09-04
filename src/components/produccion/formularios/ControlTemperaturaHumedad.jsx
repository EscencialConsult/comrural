import { useEffect, useState } from 'react'
import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { productsService } from '../../../services/productsService'
import { productionAreaAService } from '../../../services/productionAreaAService'
import { listarTodo } from '../../../services/paginacion'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import ComboboxLote from '../../formularios/ComboboxLote.jsx'
import Skeleton from '../../Skeleton.jsx'
import EmptyState from '../../EmptyState.jsx'

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Responsable de control' },
  { rol: 'Verifica', puesto: 'Supervisora' },
]

// Regla exacta del relevamiento (I-PRO-03/R-01): Secador 1 no debe trabajar
// por debajo de 70°C — mismo umbral que dispara la notificación del backend
// al cerrar (ver ProductionAreaAEntriesService.close,
// DRYER_TEMP_ALERT_THRESHOLD_C). Acá es solo aviso visual del lado
// cliente, la alerta real la manda el servidor.
const SECADOR_1_MIN = 70

const ESTADOS_CANDIDATOS = ['ACEPTADO_RECEPCION', 'LAVADO']

// Cierre de turno de production-area-a (avgDryer1TempC/avgDryer2TempC,
// PATCH .../close) — antes era un formulario de lecturas cada 30 minutos
// que el backend nunca modeló (ver docs/production-area-a.md §1: el
// servidor solo recibe el promedio, nunca las lecturas individuales). Se
// mantiene el papel/código del formulario original como referencia visual,
// pero el dato que se manda es un único promedio por secador, ya calculado
// fuera del sistema por el responsable de control.
export default function ControlTemperaturaHumedad() {
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [loteId, setLoteId] = useState('')
  const [entradas, setEntradas] = useState(null)
  const [promedios, setPromedios] = useState({}) // entryId -> { avg1, avg2 }
  const { enviando, ejecutar } = useSolicitud()
  const [cerrandoId, setCerrandoId] = useState(null)

  useEffect(() => {
    let cancelado = false
    listarTodo(productsService.listar)
      .then((productos) => !cancelado && setProductos(productos))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!loteId) {
      setEntradas(null)
      return
    }
    let cancelado = false
    productionAreaAService
      .listarPorLote(loteId)
      .then((data) => !cancelado && setEntradas(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [loteId])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const entradasAbiertas = (entradas ?? []).filter((e) => !e.closedAt)

  const actualizarPromedio = (entryId, campo) => (valor) =>
    setPromedios((p) => ({ ...p, [entryId]: { ...p[entryId], [campo]: valor } }))

  const cerrarEntrada = async (entryId) => {
    const { avg1, avg2 } = promedios[entryId] ?? {}
    if (avg1 == null || avg2 == null) {
      toast.error('Ingresá el promedio de los dos secadores.')
      return
    }
    setCerrandoId(entryId)
    try {
      const actualizada = await ejecutar(() =>
        productionAreaAService.cerrar(entryId, { avgDryer1TempC: avg1, avgDryer2TempC: avg2 }),
      )
      toast.success('Turno cerrado.')
      setEntradas((prev) => prev.map((e) => (e.id === entryId ? actualizada : e)))
    } catch (err) {
      toast.error(err.message ?? 'No se pudo cerrar el turno.')
    } finally {
      setCerrandoId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario
        antetitulo="Registro"
        titulo="Control de Temperatura de Secado y Humedad"
        codigo="I-PRO-03/R-01"
        version="04"
      />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Lote">
        {!productos ? (
          <Skeleton className="h-16" />
        ) : (
          <ComboboxLote
            label="Lote MP"
            value={loteId}
            onChange={setLoteId}
            estados={ESTADOS_CANDIDATOS}
            productoNombre={productoNombre}
          />
        )}
      </SeccionFormulario>

      <SeccionFormulario
        numero={2}
        titulo="Turnos abiertos"
        nota={`Secador 1 no debe bajar de ${SECADOR_1_MIN}°C — bajo ese umbral el cierre dispara una alerta.`}
      >
        {!loteId ? (
          <p className="text-sm text-marron-cafe/50">Elegí un lote arriba para ver sus turnos abiertos.</p>
        ) : entradas === null ? (
          <Skeleton className="h-24" />
        ) : entradasAbiertas.length === 0 ? (
          <EmptyState Icon={CheckCircle2} titulo="No hay turnos abiertos para este lote" />
        ) : (
          <div className="flex flex-col gap-3">
            {entradasAbiertas.map((e) => {
              const avg1 = promedios[e.id]?.avg1
              const secador1Bajo = avg1 != null && avg1 < SECADOR_1_MIN
              return (
                <div key={e.id} className="flex flex-wrap items-end gap-3 rounded-2xl bg-white/70 p-4">
                  <div className="flex flex-col gap-1 text-xs text-marron-cafe/60">
                    <span className="font-semibold text-marron-cafe">{e.entryDate}</span>
                    <span>Utilizados: {e.usedKg.toFixed(3)} kg · Lavados: {e.washedKg.toFixed(3)} kg</span>
                  </div>
                  <FormInput
                    label="Secador 1 (°C, promedio)"
                    type="number"
                    step="0.01"
                    value={avg1 ?? ''}
                    onChange={(ev) => actualizarPromedio(e.id, 'avg1')(ev.target.value === '' ? null : Number(ev.target.value))}
                    className="w-40"
                  />
                  <FormInput
                    label="Secador 2 (°C, promedio)"
                    type="number"
                    step="0.01"
                    value={promedios[e.id]?.avg2 ?? ''}
                    onChange={(ev) => actualizarPromedio(e.id, 'avg2')(ev.target.value === '' ? null : Number(ev.target.value))}
                    className="w-40"
                  />
                  {secador1Bajo && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-rojo-pasankalla">
                      <TriangleAlert className="size-3.5" strokeWidth={2} />
                      Bajo {SECADOR_1_MIN}°C
                    </span>
                  )}
                  <Button
                    variant="secondary"
                    className="ml-auto px-4 py-2 text-xs"
                    disabled={enviando && cerrandoId === e.id}
                    onClick={() => cerrarEntrada(e.id)}
                  >
                    {enviando && cerrandoId === e.id ? 'Cerrando…' : 'Cerrar turno'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {loteId && entradas && entradas.some((e) => e.closedAt) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {entradas
              .filter((e) => e.closedAt)
              .map((e) => (
                <Badge key={e.id} tono="positivo">
                  {e.entryDate} cerrado
                </Badge>
              ))}
          </div>
        )}
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Firmas">
        <FirmasResponsables responsables={RESPONSABLES} />
      </SeccionFormulario>
    </div>
  )
}
