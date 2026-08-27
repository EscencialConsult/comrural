import { useEffect, useState } from 'react'
import { Gauge } from 'lucide-react'
import { produccionService } from '../../services/produccionService'
import Badge from '../Badge.jsx'
import Skeleton from '../Skeleton.jsx'

// Umbrales fijos pedidos (sección 4 del brief) — `cumple(valor)` decide el
// semáforo (Badge positivo/negativo), `formato` solo cambia cómo se imprime
// el número (algunos son "≤ X", otros "< X").
const INDICADORES_POR_AREA = {
  A: [
    { key: 'rendimiento', etiqueta: 'Rendimiento', meta: '> 90%', cumple: (v) => v > 90 },
    { key: 'saponina', etiqueta: 'Saponina', meta: '≤ 8%', cumple: (v) => v <= 8 },
    { key: 'quinuaMenuda', etiqueta: 'Quinua Menuda', meta: '≤ 2%', cumple: (v) => v <= 2 },
  ],
  B: [
    { key: 'rendimiento', etiqueta: 'Rendimiento', meta: '> 90%', cumple: (v) => v > 90 },
    { key: 'quinuaSegunda', etiqueta: 'Quinua Segunda', meta: '< 3%', cumple: (v) => v < 3 },
    { key: 'quinuaTercera', etiqueta: 'Quinua Tercera', meta: '< 1,70%', cumple: (v) => v < 1.7 },
  ],
}

export default function IndicadoresProduccion() {
  const [indicadores, setIndicadores] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    produccionService
      .listarIndicadores()
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
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {['A', 'B'].map((area) => {
        const valores = indicadores.find((i) => i.area === area) ?? {}
        return (
          <div key={area} className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
                <Gauge className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-extrabold text-marron-cafe">Área {area}</h3>
            </div>
            <div className="flex flex-col gap-3">
              {INDICADORES_POR_AREA[area].map(({ key, etiqueta, meta, cumple }) => {
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
                      <Badge tono={ok ? 'positivo' : 'negativo'}>{ok ? 'Cumple' : 'Fuera de meta'}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
