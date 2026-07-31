import { useEffect, useMemo, useState } from 'react'

// Granos de quinua cayendo lento, en vez de la textura de puntos genérica
// — reemplaza el rol "atmosférico" de .hero-dots solo en el panel de auth,
// con colores de la paleta COMRURAL (nunca hex inventados). Respeta
// prefers-reduced-motion como el resto de las animaciones del proyecto.
const COLORES = [
  'var(--color-crema-quinua)',
  'var(--color-marron-arcilla)',
  'var(--color-verde-lima)',
  'var(--color-marron-cafe)',
]

export default function FloatingQuinoa({ count = 16 }) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const granos = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        size: Math.random() * 5 + 4,
        left: Math.random() * 100,
        color: COLORES[i % COLORES.length],
        duracion: Math.random() * 10 + 14,
        delay: Math.random() * -20,
        opacidad: Math.random() * 0.4 + 0.3,
        deriva: (Math.random() - 0.5) * 40,
      })),
    [count],
  )

  if (reducedMotion) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <style>{`
        @keyframes grano-cae {
          0% { transform: translateY(-10%) translateX(0) rotate(0deg); }
          50% { transform: translateY(55%) translateX(var(--deriva)) rotate(180deg); }
          100% { transform: translateY(120%) translateX(0) rotate(360deg); }
        }
      `}</style>
      {granos.map((g) => (
        <span
          key={g.id}
          className="absolute block rounded-full"
          style={{
            left: `${g.left}%`,
            top: 0,
            width: g.size,
            height: g.size * 1.3,
            background: g.color,
            opacity: g.opacidad,
            animation: `grano-cae ${g.duracion}s linear infinite`,
            animationDelay: `${g.delay}s`,
            '--deriva': `${g.deriva}px`,
          }}
        />
      ))}
    </div>
  )
}
