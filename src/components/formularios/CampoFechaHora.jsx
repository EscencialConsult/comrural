import { CalendarDays, Clock } from 'lucide-react'
import './formularios.css'

// Campo de fecha u hora con un ícono que estampa el momento exacto.
//
// Dos gestos distintos que no se pisan:
//   - Clic en el CAMPO → abre el selector nativo para elegir a mano. El
//     indicador nativo de Chrome está estirado sobre todo el input e
//     invisible (ver `.campo-fechahora` en formularios.css), así que el área
//     clickeable es el campo entero y no 20px del borde.
//   - Clic en el ÍCONO → escribe la fecha/hora actual de una, sin abrir nada.
//
// El valor nunca queda fijo: después de usar el ícono se puede seguir
// editando el campo como cualquier otro. El ícono es un atajo, no un candado.
//
// El ícono va ADENTRO del campo, sobre el borde derecho, y no como pastilla
// de texto arriba: pegado al dato se lee como parte del control, mientras que
// flotando al lado de la etiqueta parecía una acción suelta sin dueño. Lleva
// `z-10` a propósito — sin eso queda tapado por el indicador nativo
// transparente que cubre todo el input, y el clic abriría el selector en vez
// de estampar la hora.
const AHORA = {
  date: {
    Icon: CalendarDays,
    titulo: 'Poner la fecha de hoy',
    valor: () => new Date().toLocaleDateString('en-CA'),
  },
  time: {
    Icon: Clock,
    titulo: 'Poner la hora actual',
    // getHours/getMinutes usa la hora local del equipo — toISOString() daría
    // UTC, que en Bolivia son 4 horas de más.
    valor: () => {
      const f = new Date()
      return `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`
    },
  },
}

export default function CampoFechaHora({ id, label, tipo = 'time', valor, onChange, disabled = false, hint }) {
  const { Icon, titulo, valor: ahora } = AHORA[tipo]

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-verde-bosque/85">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={tipo}
          step={tipo === 'time' ? 60 : undefined}
          value={valor ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
          className="campo-fechahora w-full cursor-pointer rounded-xl border border-marron-tierra/25 bg-white py-2 pl-3 pr-12 text-sm tabular-nums text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:cursor-default disabled:bg-marron-tierra/5 disabled:text-marron-cafe/60"
        />

        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(ahora())}
            title={titulo}
            aria-label={`${titulo} en ${label}`}
            className="absolute right-1.5 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-marron-cafe/45 transition-colors duration-150 hover:bg-verde-hoja/15 hover:text-verde-bosque"
          >
            <Icon className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {hint && <span className="text-xs text-marron-cafe/55">{hint}</span>}
    </div>
  )
}
