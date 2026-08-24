import { FileText, Download } from 'lucide-react'
import {
  ORDEN_CATEGORIAS,
  CATEGORIA_LABEL,
  CATEGORIA_ICON,
  CATEGORIA_ESTILO,
  ESTADO_CATEGORIA_LABEL,
  ESTADO_CATEGORIA_TONO,
} from '../../config/analisisCategorias'
import { PARAMETROS_QUIMICO, PARAMETROS_FISICO } from '../../config/informeFisicoquimicoParametros'
import Badge from '../Badge.jsx'

// Pestaña "Informe" del detalle de muestra (ModalDetalleMuestra.jsx,
// Calidad). El backend no genera ningún informe real todavía (fuera de
// alcance del módulo laboratory, ver docs/laboratory.md §1) — esto es una
// vista previa armada 100% en el cliente: combina datos REALES de la
// solicitud (muestra/lote/producto/proveedor, ya vienen de GET
// /samples/:sampleId + GET /analysis-requests/:id) con el progreso MOCK
// por categoría de useAnalisisDraft.js. Si Fisicoquímico tiene valores
// guardados en ESTE navegador, se adelanta un resumen — mismos datos que
// InformeAnalisisFisicoquimico.jsx (Laboratorio) lee del mismo localStorage.
export default function SeccionInformeMuestra({ detalle, solicitudDetalle, categoriaDraft }) {
  if (!solicitudDetalle) {
    return (
      <p className="rounded-2xl bg-marron-tierra/5 px-4 py-8 text-center text-sm text-marron-cafe/50">
        Esta muestra todavía no tiene una solicitud de análisis — no hay nada que mostrar en el informe.
      </p>
    )
  }

  const categoriasSolicitud = ORDEN_CATEGORIAS.filter((cat) => solicitudDetalle.items.some((i) => i.category === cat))
  const fisicoquimico = categoriaDraft('PHYSICOCHEMICAL')
  const parametrosConValor = [...PARAMETROS_QUIMICO, ...PARAMETROS_FISICO].filter((p) => fisicoquimico.valores[p.id])

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl bg-marron-arcilla/10 px-4 py-3 text-xs text-marron-cafe/70">
        El backend todavía no genera informes reales — esto es una vista previa armada en el navegador con los datos
        que ya existen más el progreso guardado localmente en Laboratorio.
      </p>

      <div className="rounded-2xl border border-marron-tierra/10 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-marron-cafe">
          <FileText className="size-4 text-verde-bosque" strokeWidth={1.75} />
          Informe de análisis — {detalle.code}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Producto</dt>
            <dd className="text-sm text-marron-cafe">{detalle.lot.product.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Lote</dt>
            <dd className="font-mono text-sm text-marron-cafe">{detalle.lot.code}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Proveedor</dt>
            <dd className="text-sm text-marron-cafe">{detalle.lot.supplier?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Estado de la solicitud</dt>
            <dd className="text-sm text-marron-cafe">{solicitudDetalle.status.replace(/_/g, ' ')}</dd>
          </div>
        </dl>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Categorías analizadas</p>
        <div className="flex flex-col gap-1.5">
          {categoriasSolicitud.map((cat) => {
            const Icono = CATEGORIA_ICON[cat]
            const estilo = CATEGORIA_ESTILO[cat]
            const d = categoriaDraft(cat)
            return (
              <div
                key={cat}
                className={`flex flex-wrap items-center gap-2.5 rounded-xl border-l-4 bg-marron-tierra/5 px-3 py-2 ${estilo.borde}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${estilo.icono}`}>
                    <Icono className="size-3.5" strokeWidth={1.75} />
                  </div>
                  <span className="truncate text-xs font-semibold text-marron-cafe">{CATEGORIA_LABEL[cat]}</span>
                </div>
                <Badge tono={ESTADO_CATEGORIA_TONO[d.estado]} className="shrink-0">
                  {ESTADO_CATEGORIA_LABEL[d.estado]}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>

      {parametrosConValor.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">
            Adelanto de resultados fisicoquímicos{' '}
            <span className="font-normal normal-case text-marron-cafe/35">(borrador local)</span>
          </p>
          <div className="overflow-hidden rounded-2xl border border-marron-tierra/10">
            {parametrosConValor.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 border-b border-marron-tierra/10 px-4 py-2 last:border-b-0"
              >
                <span className="min-w-0 flex-1 text-xs text-marron-cafe">{p.parametro}</span>
                <span className="shrink-0 text-sm font-semibold text-marron-cafe">
                  {fisicoquimico.valores[p.id]} {p.unidad}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled
        title="El backend todavía no genera el documento — disponible cuando exista el endpoint de informes."
        className="flex w-fit cursor-not-allowed items-center gap-1.5 self-start rounded-full bg-marron-tierra/10 px-4 py-2 text-sm font-semibold text-marron-cafe/40"
      >
        <Download className="size-4" strokeWidth={1.75} />
        Descargar informe (próximamente)
      </button>
    </div>
  )
}
