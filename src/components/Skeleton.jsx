// Placeholder de carga (pulse) — reemplaza el "Cargando…" en texto plano
// que se repite en casi todas las pantallas del panel. `className` define
// forma/tamaño (alto, ancho, radio) desde donde se usa; acá solo se fija
// el color y la animación para que sea consistente en todos lados.
export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-marron-tierra/10 ${className}`} />
}
