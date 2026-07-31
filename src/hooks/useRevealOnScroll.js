import { useCallback, useEffect, useState } from 'react'

// Revela una sola vez cuando el elemento entra en viewport. Si
// IntersectionObserver no está disponible, o el elemento ya está a la
// vista al montar, queda visible de entrada — nunca se gatea la
// visibilidad detrás de JS que pueda fallar (ver emil-design-eng:
// "reveal animations must enhance an already-visible default").
//
// Bug real encontrado en /modulos (2026-07-30), dos veces:
// 1. rootMargin negativo en el borde inferior dejaba el umbral tan
//    justo que un elemento arriba del fold nunca lo cruzaba.
// 2. La causa de fondo: se usaba useRef + un useEffect con deps [] —
//    pero el <div> con el ref no existe en el DOM mientras `loading` es
//    true (se renderiza "Cargando…" en su lugar), así que el efecto
//    corría con ref.current = null y nunca armaba el observer. Al pasar
//    a loading=false y aparecer el div recién, el efecto ya no se
//    volvía a ejecutar (deps vacías) — quedaba opacity-0 para siempre.
// Fix: callback ref (useState en vez de useRef) para que el efecto
// vuelva a correr cada vez que el nodo real aparece, sin importar
// cuándo monta.
export function useRevealOnScroll() {
  const [node, setNode] = useState(null)
  const [visible, setVisible] = useState(false)
  const ref = useCallback((el) => setNode(el), [])

  useEffect(() => {
    if (!node || visible) return undefined

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { rootMargin: '0px', threshold: 0 },
    )
    observer.observe(node)

    // Piso de seguridad: si por lo que sea el observer nunca dispara,
    // el contenido no se queda invisible para siempre.
    const fallback = setTimeout(() => setVisible(true), 1200)

    return () => {
      observer.disconnect()
      clearTimeout(fallback)
    }
  }, [node, visible])

  return [ref, visible]
}
