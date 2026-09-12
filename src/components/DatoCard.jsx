// Tarjeta chica de dato — círculo con ícono + etiqueta + valor. Mismo
// lenguaje que StatCard.jsx pero para valores de texto en vez de KPIs
// numéricos. Extraída de ModalDetalleMuestra.jsx (Calidad) para reusarla
// en cualquier modal de detalle de solo lectura (ej. ModalDetalleActividad
// en Laboratorio).
export default function DatoCard({ Icon, etiqueta, children }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-marron-tierra/10 bg-white/60 p-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</p>
        <div className="truncate text-sm font-medium text-marron-cafe">{children}</div>
      </div>
    </div>
  )
}
