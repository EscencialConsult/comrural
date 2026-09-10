import { Gauge } from 'lucide-react'
import { sumar } from './formularios/volumenBFilas.js'
import Badge from '../Badge.jsx'

// Mismos 3 indicadores que IndicadoresProduccion.jsx (Área A), pero
// calculados en el cliente sobre `filas` de Volumen B en vez de pedirlos a
// un endpoint — no existe production-area-b en el backend todavía (ver
// ControlVolumenB.jsx). `filas` la dueña es SeccionAreaB.jsx, compartida con
// el formulario de Volumen B para no duplicar el registro del turno.
const INDICADORES = [
  { key: 'rendimiento', etiqueta: 'Rendimiento', meta: '> 90%', cumple: (v) => v > 90 },
  { key: 'quinuaSegunda', etiqueta: 'Quinua Segunda', meta: '< 3%', cumple: (v) => v < 3 },
  { key: 'quinuaTercera', etiqueta: 'Quinua Tercera', meta: '< 1,70%', cumple: (v) => v < 1.7 },
]

const porcentaje = (parte, total) => (total > 0 ? Number(((parte / total) * 100).toFixed(2)) : null)

export default function IndicadoresAreaB({ filas }) {
  const totalUsadosKg = sumar(filas, 'usadosKg')
  const totalEnvasadosKg = sumar(filas, 'envasadosKg')
  const totalQ2daKg = sumar(filas, 'q2daKg')
  const totalTerceraKg = sumar(filas, 'terceraKg')

  const valores = {
    rendimiento: porcentaje(totalEnvasadosKg, totalUsadosKg),
    quinuaSegunda: porcentaje(totalQ2daKg, totalUsadosKg),
    quinuaTercera: porcentaje(totalTerceraKg, totalUsadosKg),
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
          <Gauge className="size-5" strokeWidth={1.75} />
        </div>
        <h3 className="font-extrabold text-marron-cafe">Área B</h3>
      </div>
      <div className="flex flex-col gap-3">
        {INDICADORES.map(({ key, etiqueta, meta, cumple }) => {
          const valor = valores[key]
          const ok = valor != null && cumple(valor)
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-marron-cafe">{etiqueta}</p>
                <p className="text-xs text-marron-cafe/50">Meta: {meta}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-marron-cafe">
                  {valor != null ? `${valor}%`.replace('.', ',') : '—'}
                </span>
                {valor != null ? (
                  <Badge tono={ok ? 'positivo' : 'negativo'}>{ok ? 'Cumple' : 'Fuera de meta'}</Badge>
                ) : (
                  <Badge tono="neutro">Sin datos</Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
