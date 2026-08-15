// Toggle reutilizable — verde-lima cuando está prendido, tierra apagado
// cuando no, mismo lenguaje visual que el resto de los controles del panel.
export default function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde-lima/50 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-verde-lima' : 'bg-marron-tierra/25'
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}
