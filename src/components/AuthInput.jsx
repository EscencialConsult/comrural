// Input compartido de las pantallas de auth, con ícono opcional adentro
// (como en la referencia de Figma: sobre en el campo de email, candado
// en contraseña) — antes esto estaba triplicado entero en Login/Registro/
// RecuperarContrasena.
//
// `error`: mensaje de validación propio (los formularios usan noValidate,
// así que el navegador nunca muestra su globo nativo) — aparece debajo del
// input exacto que lo provocó, no como banner genérico arriba del form.
export default function AuthInput({ icon: Icon, label, error, id, ...inputProps }) {
  const inputId = id ?? inputProps.name
  const errorId = inputId ? `${inputId}-error` : undefined

  return (
    <label className="flex flex-col gap-1.5 text-sm text-crema-quinua/80">
      {label}
      <div className="relative">
        {Icon && (
          <Icon
            className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 ${
              error ? 'text-rojo-pasankalla/70' : 'text-crema-quinua/50'
            }`}
            strokeWidth={1.75}
          />
        )}
        <input
          id={inputId}
          {...inputProps}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl border bg-crema-quinua/5 py-2.5 text-crema-quinua outline-none transition-shadow ${
            error
              ? 'border-rojo-pasankalla/60 focus-visible:border-rojo-pasankalla focus-visible:ring-2 focus-visible:ring-rojo-pasankalla/40'
              : 'border-crema-quinua/20 focus-visible:border-verde-lima focus-visible:ring-2 focus-visible:ring-verde-lima/40'
          } ${Icon ? 'pl-11 pr-4' : 'px-4'}`}
        />
      </div>
      {error && (
        <span id={errorId} className="text-xs font-medium text-rojo-pasankalla">
          {error}
        </span>
      )}
    </label>
  )
}
