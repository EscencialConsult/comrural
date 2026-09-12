import { MODULO_ICON } from '../config/moduloIcons'

export const ESTADO_LABEL = {
  relevado: 'Relevado',
  relevado_parcial: 'Relevado (parcial)',
  pendiente: 'Pendiente',
  proximamente: 'Próximamente',
}

// Contraste verificado con WCAG (ver contrast-check.mjs, 2026-07-30):
// azul-andino sobre celeste-aqua/20 daba 3.29:1 (falla el mínimo 4.5:1 para
// texto chico) — se cambió a marron-cafe, que sobre ese mismo fondo da
// 11.58:1. El tinte celeste sigue distinguiendo el estado visualmente.
export const ESTADO_STYLE = {
  relevado: 'bg-verde-hoja/15 text-verde-bosque',
  relevado_parcial: 'bg-celeste-aqua/20 text-marron-cafe',
  pendiente: 'bg-marron-tierra/10 text-marron-tierra',
  proximamente: 'bg-marron-tierra/10 text-marron-tierra',
}

// reveal-on-scroll (no mount): opacity/translate se anima solo cuando el
// grid contenedor entra en viewport (ver useRevealOnScroll), con stagger
// por índice vía transition-delay.
export default function ModuloCard({ modulo, index, visible }) {
  const Icon = MODULO_ICON[modulo.id]
  const destacado = modulo.id === 'almacen'

  return (
    <div
      className={`rounded-3xl p-6 flex flex-col gap-3 transition-all duration-500 hover:-translate-y-1 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${
        destacado
          ? 'sm:col-span-2 border border-verde-hoja/20 bg-verde-hoja/10 hover:bg-verde-hoja/15'
          : 'border border-marron-tierra/10 bg-marron-tierra/5 hover:bg-marron-tierra/10'
      }`}
      style={{ transitionDelay: visible ? `${index * 60}ms` : '0ms' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-full p-2 ${destacado ? 'bg-verde-hoja/20' : 'bg-marron-tierra/10'}`}>
          {Icon && (
            <Icon className={`size-5 ${destacado ? 'text-verde-bosque' : 'text-marron-tierra'}`} strokeWidth={1.75} />
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_STYLE[modulo.estado]}`}
        >
          {ESTADO_LABEL[modulo.estado]}
        </span>
      </div>
      <div>
        <h3 className="font-extrabold text-marron-cafe">{modulo.nombre}</h3>
        <p className="text-sm text-marron-cafe/70 mt-1">{modulo.descripcion}</p>
      </div>
    </div>
  )
}
