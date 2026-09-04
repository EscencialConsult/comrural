import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import { productionAreaAService } from '../../services/productionAreaAService'
import Badge from '../Badge.jsx'
import Skeleton from '../Skeleton.jsx'

// Umbrales fijos pedidos (sección 4 del brief) — `cumple(valor)` decide el
// semáforo (Badge positivo/negativo).
const INDICADORES = [
  { key: 'rendimiento', etiqueta: 'Rendimiento', meta: '> 90%', cumple: (v) => v > 90 },
  { key: 'saponina', etiqueta: 'Saponina', meta: '≤ 8%', cumple: (v) => v <= 8 },
  { key: 'quinuaMenuda', etiqueta: 'Quinua Menuda', meta: '≤ 2%', cumple: (v) => v <= 2 },
]

// Pestaña "Indicadores" de Área A — real, `GET /production-area-a/indicators`
// (agregado site-wide sobre entradas cerradas, ver
// comrural_erp_backend/docs/production-area-a.md §3). Área B se sacó por
// completo (era 100% mockup, sin backend) — este componente ya no necesita
// soportar una segunda área ni el modo "las dos lado a lado" que tenía
// antes, ninguno de los dos tenía otro consumidor.
export default function IndicadoresProduccion() {
  const [indicadores, setIndicadores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    productionAreaAService
      .indicadores()
      .then((data) => !cancelado && setIndicadores(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (!indicadores) {
    return <Skeleton className="h-48" />
  }

  const valores = {
    rendimiento: indicadores.rendimientoPct,
    saponina: indicadores.saponinaPct,
    quinuaMenuda: indicadores.quinuaMenudaPct,
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
          <Gauge className="size-5" strokeWidth={1.75} />
        </div>
        <h3 className="font-extrabold text-marron-cafe">Área A</h3>
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
