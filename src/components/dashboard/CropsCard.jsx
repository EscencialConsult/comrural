import { colorVar } from '../../config/colorTokens'

export default function CropsCard({ lotesPorVariedad }) {
  return (
    <div className="rounded-3xl bg-marron-tierra/5 p-4">
      <p className="mb-2 text-xs font-semibold text-marron-cafe/60">Cultivos</p>
      <ul className="flex flex-col gap-1.5">
        {lotesPorVariedad.map((lote) => (
          <li key={lote.nombre} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-marron-cafe">
              <span className="size-2 rounded-full" style={{ background: colorVar(lote.color) }} />
              {lote.nombre}
            </span>
            <span className="font-semibold text-marron-cafe">
              {(lote.kg / 1000).toLocaleString('es-BO')} k
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
