import { Link } from 'react-router-dom'

// Parseo de fecha local (no new Date(iso) directo) — ya nos comimos el
// bug de zona horaria una vez en /novedades (Bolivia UTC-4 vs. medianoche
// UTC corría la fecha un día para atrás).
function formatFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-BO')
}

export default function LoteDestacadoCard({ lote }) {
  return (
    <div className="rounded-3xl bg-verde-hoja/10 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-extrabold text-marron-cafe">{lote.nombre}</p>
        <Link to="/panel/almacen" className="text-xs font-medium text-verde-bosque hover:text-verde-hoja">
          Más detalles →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-marron-cafe/60">Salud</p>
          <p className="text-sm font-semibold text-verde-bosque">{lote.estadoSalud}</p>
        </div>
        <div>
          <p className="text-xs text-marron-cafe/60">Siembra</p>
          <p className="text-sm font-semibold text-marron-cafe">{formatFecha(lote.fechaSiembra)}</p>
        </div>
        <div>
          <p className="text-xs text-marron-cafe/60">Cosecha</p>
          <p className="text-sm font-semibold text-marron-cafe">{lote.tiempoCosecha}</p>
        </div>
      </div>
    </div>
  )
}
