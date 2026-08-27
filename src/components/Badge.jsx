// Pastilla de estado — extraída de los <span> que ya se repetían sueltos en
// Lotes/Proveedores (y se iban a repetir de nuevo en Recepción/Inspección/
// Resolución con sus propios estados). Mismas clases que ya existían, solo
// centralizadas.
const TONOS = {
  neutro: 'bg-marron-tierra/10 text-marron-cafe/60',
  positivo: 'bg-verde-hoja/15 text-verde-bosque',
  negativo: 'bg-rojo-pasankalla/10 text-rojo-pasankalla',
  alerta: 'bg-marron-arcilla/15 text-marron-arcilla',
  // Sumados para los estados de proceso de Producción (7 estados, ver
  // PanelProduccion) — el kit de marca no tiene amarillo ni morado
  // nombrados, así que se reusan los tonos fríos/ámbar más cercanos que ya
  // existen en index.css en vez de inventar un color nuevo: `info` es el
  // mismo azul-andino que StatCard ya llama "info", `ambar` es
  // --color-oro-quinua (pensado explícito para semáforos), `violeta` es
  // azul-indigo (el único frío distinto de azul-andino disponible) y
  // `liberado` es un tinte más fuerte de verde-bosque para distinguirse de
  // `positivo` (Finalizado vs. Liberado son estados distintos).
  info: 'bg-azul-andino/15 text-azul-andino',
  ambar: 'bg-oro-quinua/15 text-oro-quinua',
  violeta: 'bg-azul-indigo/15 text-azul-indigo',
  liberado: 'bg-verde-bosque/20 text-verde-bosque',
}

export default function Badge({ tono = 'neutro', className = '', children, ...props }) {
  return (
    <span
      {...props}
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  )
}
