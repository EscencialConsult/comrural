// Textarea con label consistente — hermano de FormInput.jsx/FormSelect.jsx,
// mismo estilo. No existía una versión reusable: los textarea sueltos del
// proyecto (ej. CampoObservaciones.jsx) tienen su propio wrapper porque
// resuelven un caso particular; este es el genérico para cualquier form.
export default function FormTextarea({ label, hint, className = '', rows = 3, ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <textarea
        {...props}
        rows={rows}
        className={`resize-y rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-all duration-200 focus-visible:border-verde-lima focus-visible:ring-2 focus-visible:ring-verde-lima/20 disabled:bg-marron-tierra/5 disabled:text-marron-cafe/50 ${className}`}
      />
      {hint && <span className="text-xs text-marron-cafe/50">{hint}</span>}
    </label>
  )
}
