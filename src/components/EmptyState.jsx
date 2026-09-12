// Mensaje de "no hay nada acá" con ícono — reemplaza los `<p>` de texto
// plano sueltos que se repetían en cada listado ("Todavía no hay
// proveedores cargados", "Ninguna solicitud coincide con el filtro", etc.)
// con algo un poco más amigable. `accion` es un slot opcional (ej. un
// botón "Reintentar" o "+ Agregar") para cuando el estado vacío tiene una
// salida clara.
export default function EmptyState({ Icon, titulo, descripcion, accion, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-3 rounded-3xl bg-marron-tierra/5 px-4 py-12 text-center ${className}`}>
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/35">
          <Icon className="size-6" strokeWidth={1.5} />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-marron-cafe">{titulo}</p>
        {descripcion && <p className="mt-1 text-xs text-marron-cafe/50">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}
