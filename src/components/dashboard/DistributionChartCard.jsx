export default function DistributionChartCard({ distribucion }) {
  const width = 320
  const height = 160
  const max = Math.max(...distribucion.valores)
  const paddingBottom = 20
  const plotWidth = width - 16
  const plotHeight = height - paddingBottom - 8

  const puntos = distribucion.valores.map((v, i) => {
    const x = 8 + (i / (distribucion.valores.length - 1)) * plotWidth
    const y = 8 + plotHeight - (v / max) * plotHeight
    return `${x},${y}`
  })

  const linea = puntos.join(' ')
  const area = `${8},${8 + plotHeight} ${linea} ${8 + plotWidth},${8 + plotHeight}`

  return (
    <div className="rounded-3xl bg-marron-tierra/5 p-5">
      <p className="font-extrabold text-marron-cafe">Distribución de Cultivos</p>
      <p className="mb-3 text-xs text-marron-cafe/50">Por área — últimas semanas</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <polygon points={area} fill="var(--color-verde-lima)" fillOpacity="0.15" />
        <polyline
          points={linea}
          fill="none"
          stroke="var(--color-verde-lima)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-marron-cafe/40">
        <span>{distribucion.etiquetas[0]}</span>
        <span>{distribucion.etiquetas[distribucion.etiquetas.length - 1]}</span>
      </div>
    </div>
  )
}
