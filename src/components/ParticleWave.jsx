import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// Fondo animado del hero de /servicio. Fiel a los parámetros del snippet
// de referencia (cámara, grilla, tamaño de punto) — el look de la
// referencia depende de esos números exactos combinados con un contenedor
// a pantalla completa, no de reinventar la cámara. Adaptado a nuestro
// stack en lo esencial nada más: JS plano (sin TS), sin lógica de
// dark/light (no existe en este proyecto, un solo color de marca en vez
// de blanco/negro), fondo transparente (se ve la crema-quinua de la
// página, no un clear color sólido), tamaño atado al contenedor en vez de
// window.innerWidth/Height directo. Se sacó el tracking de mouse: el
// shader original nunca lo usaba, quedaba ahí sin hacer nada.

const VERTEX_SHADER = `
  attribute float scale;
  uniform float uTime;
  void main() {
    vec3 p = position;
    float s = scale;
    p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
    p.x += (sin(p.y + uTime) * 0.5);
    s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 0.5);
  }
`

// Marrón arcilla del kit de marca, en 0-1 para el shader (en vez del
// blanco/negro según tema del snippet original).
const PARTICLE_COLOR = new THREE.Vector3(0x9c / 255, 0x41 / 255, 0x19 / 255)

export default function ParticleWave({ className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas.parentElement
    if (!canvas || !container) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) return undefined

    const { clientWidth: width, clientHeight: height } = container

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000)
    camera.position.set(0, 6, 5)

    const scene = new THREE.Scene()

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)

    const gap = 0.3
    const amountX = 200
    const amountY = 200
    const count = amountX * amountY
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)

    let i = 0
    let j = 0
    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        positions[i] = ix * gap - (amountX * gap) / 2
        positions[i + 1] = 0
        positions[i + 2] = iy * gap - (amountX * gap) / 2
        scales[j] = 1
        i += 3
        j += 1
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))

    const material = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: PARTICLE_COLOR },
      },
    })

    const particles = new THREE.Points(geometry, material)
    scene.add(particles)

    let animationId = null
    const animate = () => {
      material.uniforms.uTime.value += 0.015
      camera.lookAt(scene.position)
      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = container
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    resizeObserver.observe(container)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      scene.remove(particles)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} aria-hidden="true" />
}
