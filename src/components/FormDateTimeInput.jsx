import { aInputLocal } from '../utils/fecha'

// Input de fecha/hora con botón "Hoy" integrado — hermano de FormInput/
// FormSelect, mismo estilo. `minAhora` fija el mínimo seleccionable a la
// fecha/hora actual del dispositivo (recalculada en cada render, no una
// sola vez al montar) para bloquear valores en el pasado.
export default function FormDateTimeInput({ label, hint, value, onChange, minAhora = false, min, className = '', ...props }) {
  const ahora = aInputLocal(new Date())

  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={minAhora ? ahora : min}
          {...props}
          className={`min-w-0 flex-1 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima ${className}`}
        />
        <button
          type="button"
          onClick={() => onChange(ahora)}
          className="shrink-0 rounded-xl bg-marron-tierra/10 px-3 py-2 text-xs font-semibold text-marron-cafe/70 transition-colors duration-150 hover:bg-marron-tierra/15"
        >
          Hoy
        </button>
      </div>
      {hint && <span className="text-xs text-marron-cafe/50">{hint}</span>}
    </label>
  )
}
