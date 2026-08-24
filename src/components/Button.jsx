import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// Botón en pastilla con feedback táctil (press + ripple), inspirado en la
// idea de interacción del "liquid metal button" de referencia, pero SIN
// el shader WebGL ni las sombras en capas: eso rompe las reglas que ya
// fijamos en DESIGN.md (cero box-shadow, un solo acento, sin dark mode) y
// además cada botón con shader abre su propio contexto WebGL — no escala
// si hay varios en pantalla. Esto logra la sensación "premium" solo con
// transform + una animación de ripple, que es gratis en cualquier
// cantidad de botones.
//
// variant: 'primary' (verde-lima) | 'secondary' (borde, transparente)
export default function Button({
  to,
  href,
  type = 'button',
  disabled = false,
  onClick,
  variant = 'primary',
  className = '',
  children,
}) {
  const [ripples, setRipples] = useState([])
  const rippleId = useRef(0)

  const base =
    'relative overflow-hidden inline-flex items-center justify-center rounded-full px-6 py-3 font-medium whitespace-nowrap ' +
    'transition-all duration-300 active:scale-95 active:duration-100 select-none'

  const variants = {
    primary: 'bg-verde-lima text-marron-cafe hover:bg-verde-hoja hover:-translate-y-0.5',
    secondary:
      'border border-marron-tierra/20 text-marron-cafe hover:bg-marron-tierra/5 hover:-translate-y-0.5',
    // Para botones sobre fondos oscuros (paneles de auth, hero con partículas).
    ghost: 'border border-crema-quinua/25 text-crema-quinua hover:bg-crema-quinua/10 hover:-translate-y-0.5',
  }

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ }
    setRipples((prev) => [...prev, ripple])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600)
    onClick?.(e)
  }

  const content = (
    <>
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-white/40 ripple-effect"
          style={{ left: r.x, top: r.y, width: 12, height: 12 }}
        />
      ))}
    </>
  )

  const classes = `${base} ${variants[variant]} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`

  if (to) {
    return (
      <Link to={to} onClick={handleClick} className={classes}>
        {content}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} onClick={handleClick} className={classes}>
        {content}
      </a>
    )
  }

  return (
    <button type={type} disabled={disabled} onClick={handleClick} className={classes}>
      {content}
    </button>
  )
}
