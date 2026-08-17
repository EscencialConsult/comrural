// Tarjeta chica de KPI — reusable en cualquier módulo (Compras, Almacén, y
// los que vengan) en vez de repetir el mismo div con clases a mano.
export default function StatCard({ valor, etiqueta }) {
  return (
    <div className="rounded-3xl bg-marron-tierra/5 p-5">
      <p className="text-2xl font-extrabold text-marron-cafe">{valor}</p>
      <p className="text-sm text-marron-cafe/60">{etiqueta}</p>
    </div>
  )
}
