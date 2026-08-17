// Select con label consistente — hermano de FormInput.jsx, mismo estilo.
export default function FormSelect({ label, hint, children, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <select
        {...props}
        className={`rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima ${className}`}
      >
        {children}
      </select>
      {hint && <span className="text-xs text-marron-cafe/50">{hint}</span>}
    </label>
  )
}
