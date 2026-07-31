export default function TotalAreaCard({ areaTotal }) {
  return (
    <div className="rounded-3xl bg-marron-tierra/5 p-4">
      <p className="text-xs font-semibold text-marron-cafe/60">Área Total</p>
      <p className="mt-1 text-2xl font-black text-marron-cafe">{areaTotal.hectareas} ha</p>
      <p className="mt-1 text-xs font-medium text-verde-bosque">
        ↗ +{areaTotal.variacionHectareas} ha {areaTotal.periodo}
      </p>
    </div>
  )
}
