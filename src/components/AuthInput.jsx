// Input compartido de las pantallas de auth, con ícono opcional adentro
// (como en la referencia de Figma: sobre en el campo de email, candado
// en contraseña) — antes esto estaba triplicado entero en Login/Registro/
// RecuperarContrasena.
export default function AuthInput({ icon: Icon, label, ...inputProps }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-crema-quinua/80">
      {label}
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-crema-quinua/50"
            strokeWidth={1.75}
          />
        )}
        <input
          {...inputProps}
          className={`w-full rounded-xl border border-crema-quinua/20 bg-crema-quinua/5 py-2.5 text-crema-quinua outline-none focus-visible:border-verde-lima focus-visible:ring-2 focus-visible:ring-verde-lima/40 transition-shadow ${
            Icon ? 'pl-11 pr-4' : 'px-4'
          }`}
        />
      </div>
    </label>
  )
}
