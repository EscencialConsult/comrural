// Input con label consistente — mismo estilo que ya se repetía suelto en
// UsuarioRoles.jsx, GestionUsuarios.jsx y los formularios de Compras/
// Almacén. Reusable para cualquier form del panel de acá en más.
//
// En `type="number"` se bloquea el scroll del mouse (blur apenas se
// detecta un wheel con el input enfocado) — es demasiado fácil cambiar un
// valor sin querer al scrollear la página con el cursor encima; el valor
// solo debería cambiar tipeando.
export default function FormInput({ label, hint, className = '', type, onWheel, ...props }) {
  const manejarWheel = type === 'number' ? (e) => { onWheel?.(e); e.currentTarget.blur() } : onWheel
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <input
        type={type}
        onWheel={manejarWheel}
        {...props}
        className={`min-w-0 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-all duration-200 focus-visible:border-verde-lima focus-visible:ring-2 focus-visible:ring-verde-lima/20 disabled:bg-marron-tierra/5 disabled:text-marron-cafe/50 ${className}`}
      />
      {hint && <span className="text-xs text-marron-cafe/50">{hint}</span>}
    </label>
  )
}
