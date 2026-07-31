import { colorVar } from '../../config/colorTokens'

// Gráfico de líneas a mano en SVG — sin librería nueva, mismo criterio
// que ParticleWave/AndeanWaves ya usados en el proyecto.
export default function GrowthChartCard({ crecimiento }) {
  const width = 320
  const height = 160
  const maxAltura = 16
  const paddingLeft = 8
  const paddingBottom = 20
  const plotWidth = width - paddingLeft - 8
  const plotHeight = height - paddingBottom - 8

  const puntos = (valores) =>
    valores
      .map((v, i) => {
        const x = paddingLeft + (i / (crecimiento.dias.length - 1)) * plotWidth
        const y = 8 + plotHeight - (v / maxAltura) * plotHeight
        return `${x},${y}`
      })
      .join(' ')

  return (
    <div className="rounded-3xl bg-marron-tierra/5 p-5">
      <p className="font-extrabold text-marron-cafe">Monitoreo de Crecimiento</p>
      <div className="mt-2 mb-1 flex flex-wrap gap-3">
        {crecimiento.series.map((s) => (
          <span key={s.nombre} className="flex items-center gap-1.5 text-xs text-marron-cafe/70">
            <span className="size-2 rounded-full" style={{ background: colorVar(s.color) }} />
            {s.nombre} · {s.alturaActualCm}cm
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <line
          x1={paddingLeft}
          y1={8 + plotHeight}
          x2={width - 8}
          y2={8 + plotHeight}
          stroke="var(--color-marron-tierra)"
          strokeOpacity="0.15"
        />
        {crecimiento.series.map((s) => (
          <polyline
            key={s.nombre}
            points={puntos(s.valores)}
            fill="none"
            stroke={colorVar(s.color)}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-marron-cafe/40">
        <span>Día {crecimiento.dias[0]}</span>
        <span>Día {crecimiento.dias[crecimiento.dias.length - 1]}</span>
      </div>
    </div>
  )
}
