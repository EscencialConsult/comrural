import { colorVar } from '../../config/colorTokens'

function Donut({ segments, size = 128, stroke = 14 }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let acumulado = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-marron-tierra)"
        strokeOpacity="0.08"
        strokeWidth={stroke}
      />
      {segments.map((seg) => {
        const largo = (seg.porcentaje / 100) * circumference
        const dasharray = `${largo} ${circumference - largo}`
        const dashoffset = -((acumulado / 100) * circumference)
        acumulado += seg.porcentaje
        return (
          <circle
            key={seg.categoria}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorVar(seg.color)}
            strokeWidth={stroke}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
          />
        )
      })}
    </svg>
  )
}

// La "vista aérea" es una ilustración (gradientes + contornos), no una
// imagen satelital real — sería engañoso presentar datos de sensores
// falsos como si vinieran de un satélite de verdad.
export default function HealthScoreCard({ salud }) {
  return (
    <div className="relative row-span-2 overflow-hidden rounded-3xl bg-verde-bosque/15 p-6">
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 25% 20%, var(--color-verde-lima) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, var(--color-verde-hoja) 0%, transparent 60%), var(--color-marron-tierra)',
          }}
        />
        <div className="hero-dots absolute inset-0 opacity-30" />
        <div className="absolute top-[22%] left-[12%] h-36 w-52 -rotate-6 rounded-[45%] border-2 border-crema-quinua/30" />
        <div className="absolute top-[40%] right-[10%] h-28 w-44 rotate-3 rounded-[40%] border-2 border-crema-quinua/30" />
      </div>

      <div className="relative z-10 inline-block rounded-2xl bg-crema-quinua/90 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold text-marron-cafe/60">Puntaje de Salud (IA)</p>
        <div className="relative mt-2 flex items-center justify-center">
          <Donut segments={salud.distribucion} />
          <div className="absolute flex flex-col items-center">
            <span className="text-3xl font-black text-marron-cafe">{salud.puntaje}</span>
            <span className="text-xs font-medium text-verde-bosque">{salud.estado}</span>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-1">
          {salud.distribucion.map((seg) => (
            <li key={seg.categoria} className="flex items-center gap-1.5 text-xs text-marron-cafe/70">
              <span className="size-2 rounded-full" style={{ background: colorVar(seg.color) }} />
              {seg.categoria} {seg.porcentaje}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
