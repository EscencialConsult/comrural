import { Check } from 'lucide-react'

// Bloque compacto de "casillas" de etapa — pedido explícito de Facundo:
// "cinco cuadraditos, seis cuadraditos, juntos en un solo bloque, no
// disperso" mostrando en qué punto está cada sección de un formulario, con
// el nombre de la etapa al pasar el cursor. No es específico de Inspección
// de Materia Prima — "todos los formularios van a tener etapas" — así que
// vive en components/ (no en components/formularios/) para que cualquier
// pantalla con un formulario por etapas lo reuse.
//
// `etapas`: [{ numero, titulo, estado: 'completo'|'pendiente'|'sin_iniciar', icono?, variante? }]
//   - completo: la etapa está resuelta — casilla verde con check.
//   - pendiente: la etapa se tocó pero falta terminarla — casilla ámbar.
//   - sin_iniciar: todavía no se llegó a esa etapa — casilla neutra, apenas
//     visible (a propósito: los dos estados que importan de un vistazo son
//     completo/pendiente, no iniciado es "ruido" hasta que corresponda).
//   - `icono`: componente de lucide-react a mostrar siempre en vez del
//     número/check — pedido puntual para la etapa de Firmas ("que esté el
//     símbolo de firma, sin el número 6").
//   - `variante: 'firma'`: mismo semáforo de 3 estados pero otro
//     significado de color (ver CLASES_FIRMA) — para etapas donde "sin
//     terminar" se lee como alarma (rojo) en vez de "a mitad de camino"
//     (ámbar).
const CLASES_ESTADO = {
  completo: 'bg-verde-bosque text-crema-quinua',
  // oro-quinua, no marron-arcilla: ese marrón es casi indistinguible del
  // rojo-pasankalla en una casilla chica — ver index.css.
  pendiente: 'bg-oro-quinua text-marron-cafe',
  sin_iniciar: 'bg-marron-tierra/10 text-marron-cafe/30',
}

// Firmas: rojo si todavía no se llegó a esa etapa, verde SIN rellenar si
// ya se puede firmar pero falta el visto bueno, verde relleno si ya está
// firmado — pedido explícito, "verde pero sin completar, rellenar el
// verde... rojo si no se llegó todavía... verde completo, ya se firmó".
const CLASES_FIRMA = {
  completo: 'bg-verde-bosque text-crema-quinua',
  pendiente: 'border-2 border-verde-bosque text-verde-bosque bg-transparent',
  sin_iniciar: 'bg-rojo-pasankalla/15 text-rojo-pasankalla/70',
}

const DESCRIPCION = {
  default: { completo: 'completa', pendiente: 'sin terminar', sin_iniciar: 'sin iniciar' },
  firma: { completo: 'firmado', pendiente: 'falta firmar', sin_iniciar: 'todavía no llegó a esta etapa' },
}

export default function IndicadorEtapas({ etapas, className = '' }) {
  return (
    <div className={`flex w-fit items-center gap-1.5 rounded-lg bg-marron-tierra/5 p-1.5 ${className}`}>
      {etapas.map((e) => {
        const clases = e.variante === 'firma' ? CLASES_FIRMA : CLASES_ESTADO
        const Icono = e.icono
        return (
          <div
            key={e.numero}
            title={`${e.numero}. ${e.titulo} — ${DESCRIPCION[e.variante ?? 'default'][e.estado]}`}
            className={`flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-bold tabular-nums ${clases[e.estado]}`}
          >
            {Icono ? (
              <Icono className="size-5" strokeWidth={e.estado === 'completo' ? 2.75 : 2} />
            ) : e.estado === 'completo' ? (
              <Check className="size-5" strokeWidth={3} />
            ) : (
              e.numero
            )}
          </div>
        )
      })}
    </div>
  )
}
