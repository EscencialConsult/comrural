import { Monitor, Smartphone, Globe } from 'lucide-react'
import { ESTADO_LABEL, ESTADO_STYLE } from './ModuloCard'

const DESCARGA_ICON = {
  pc: Monitor,
  celular: Smartphone,
  'acceso-directo': Globe,
}

export default function DescargaCard({ descarga, index, visible }) {
  const Icon = DESCARGA_ICON[descarga.id]
  const disponible = descarga.estado === 'disponible'

  return (
    <div
      className={`rounded-3xl border border-marron-tierra/10 bg-marron-tierra/5 p-6 flex flex-col gap-4 transition-all duration-500 hover:-translate-y-1 hover:bg-marron-tierra/10 hover:border-marron-tierra/15 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: visible ? `${index * 60}ms` : '0ms' }}
    >
      <div className="rounded-full bg-marron-tierra/10 p-2 self-start">
        {Icon && <Icon className="size-5 text-marron-tierra" strokeWidth={1.75} />}
      </div>
      <div>
        <h3 className="font-extrabold text-marron-cafe">{descarga.nombre}</h3>
        <p className="text-sm text-marron-cafe/70 mt-1">{descarga.descripcion}</p>
      </div>
      <span
        className={`self-start rounded-full px-3 py-1 text-xs font-medium ${
          disponible ? 'bg-verde-hoja/15 text-verde-bosque' : ESTADO_STYLE.proximamente
        }`}
      >
        {ESTADO_LABEL[descarga.estado]}
      </span>
    </div>
  )
}
