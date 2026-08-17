// Input con label consistente — mismo estilo que ya se repetía suelto en
// UsuarioRoles.jsx, GestionUsuarios.jsx y los formularios de Compras/
// Almacén. Reusable para cualquier form del panel de acá en más.
export default function FormInput({ label, hint, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <input
        {...props}
        className={`rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/50 ${className}`}
      />
      {hint && <span className="text-xs text-marron-cafe/50">{hint}</span>}
    </label>
  )
}
