import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders'

// Botón "liquid metal" adaptado del componente de referencia (21st.dev /
// paper-design/shaders) — sin TypeScript, sin el ícono lucide (no lo
// usamos), sin la lógica de tema oscuro/claro (no existe acá) y
// recoloreado con la paleta de COMRURAL vía los uniforms u_colorBack /
// u_colorTint que el shader ya expone para esto (no hacía falta tocar el
// shader). Reservado a UN solo botón (el CTA principal del hero) — cada
// instancia abre su propio contexto WebGL, no escala como sistema de
// botones repetido en toda la página.
export default function MetalButton({ to, href, onClick, label, width = 220, height = 52 }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [ripples, setRipples] = useState([])
  const shaderRef = useRef(null)
  const shaderMount = useRef(null)
  const buttonRef = useRef(null)
  const rippleId = useRef(0)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    if (!shaderRef.current) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    reducedMotionRef.current = reducedMotion

    shaderMount.current = new ShaderMount(
      shaderRef.current,
      liquidMetalFragmentShader,
      {
        u_repetition: 4,
        u_softness: 0.5,
        u_shiftRed: 0.3,
        u_shiftBlue: 0.3,
        u_distortion: 0,
        u_contour: 0,
        u_angle: 45,
        u_scale: 8,
        u_shape: 1,
        u_offsetX: 0.1,
        u_offsetY: -0.1,
        // Marrón café como base "metal" + tinte verde lima superpuesto
        // (color-burn) — ver LiquidMetalUniforms en el paquete.
        u_colorBack: [0.243, 0.137, 0.071, 1],
        u_colorTint: [0.518, 0.718, 0.224, 0.6],
      },
      undefined,
      reducedMotion ? 0 : 0.6,
    )

    return () => {
      shaderMount.current?.destroy?.()
      shaderMount.current = null
    }
  }, [])

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (!reducedMotionRef.current) shaderMount.current?.setSpeed?.(1)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setIsPressed(false)
    if (!reducedMotionRef.current) shaderMount.current?.setSpeed?.(0.6)
  }

  const handleClick = (e) => {
    if (!reducedMotionRef.current) {
      shaderMount.current?.setSpeed?.(2.4)
      setTimeout(() => shaderMount.current?.setSpeed?.(isHovered ? 1 : 0.6), 300)
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ }
      setRipples((prev) => [...prev, ripple])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== ripple.id)), 600)
    }

    onClick?.(e)
  }

  const Wrapper = to ? Link : 'a'
  const wrapperProps = to ? { to } : { href }

  return (
    <div
      className="relative inline-block"
      style={{ width, height }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={shaderRef}
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          transform: isPressed ? 'scale(0.97)' : 'scale(1)',
          transition: 'transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
      <Wrapper
        ref={buttonRef}
        {...wrapperProps}
        onClick={handleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        className="absolute inset-0 flex items-center justify-center rounded-full overflow-hidden"
      >
        <span
          className="relative z-10 text-sm font-medium text-crema-quinua"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {label}
        </span>
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full bg-white/40 ripple-effect"
            style={{ left: r.x, top: r.y, width: 12, height: 12 }}
          />
        ))}
      </Wrapper>
    </div>
  )
}
