export default function SoilAnalysisCard({ analisisSuelo }) {
  return (
    <div className="rounded-3xl bg-marron-tierra/5 p-5">
      <p className="font-extrabold text-marron-cafe">Análisis de Suelo</p>
      <p className="mb-4 text-xs text-marron-cafe/50">Niveles NPK — {analisisSuelo.periodo}</p>
      <ul className="flex flex-col gap-4">
        {analisisSuelo.nutrientes.map((n) => (
          <li key={n.nombre}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-marron-cafe">{n.nombre}</span>
              <span className="font-semibold text-marron-cafe">{n.valor}/100</span>
            </div>
            <div className="h-2 rounded-full bg-marron-tierra/10">
              <div className="h-2 rounded-full bg-verde-lima" style={{ width: `${n.valor}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
