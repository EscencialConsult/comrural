// Pastilla de estado — extraída de los <span> que ya se repetían sueltos en
// Lotes/Proveedores (y se iban a repetir de nuevo en Recepción/Inspección/
// Resolución con sus propios estados). Mismas clases que ya existían, solo
// centralizadas.
const TONOS = {
  neutro: 'bg-marron-tierra/10 text-marron-cafe/60',
  positivo: 'bg-verde-hoja/15 text-verde-bosque',
  negativo: 'bg-rojo-pasankalla/10 text-rojo-pasankalla',
  alerta: 'bg-marron-arcilla/15 text-marron-arcilla',
}

export default function Badge({ tono = 'neutro', className = '', children }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${TONOS[tono]} ${className}`}
    >
      {children}
    </span>
  )
}
