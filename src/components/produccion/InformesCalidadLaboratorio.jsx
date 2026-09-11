import { useEffect, useState } from 'react'
import { FlaskConical, Droplets } from 'lucide-react'
import { productsService } from '../../services/productsService'
import { qualityAreaBInspectionsService } from '../../services/qualityAreaBInspectionsService'
import { listarTodo } from '../../services/paginacion'
import Badge from '../Badge.jsx'
import MockupBanner from '../MockupBanner.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import ComboboxLote from '../formularios/ComboboxLote.jsx'

// Punto 3 del relevamiento (secciones 2.21 y 3): Producción necesita ver
// pureza/impurezas de Calidad y el número de calidad de agua de
// Laboratorio, sin duplicar el registro de humedad.
//
// "Calidad — pureza e impurezas" ya es real: son literalmente los campos
// de quality_area_b_inspections (pureza_pct/humedad_pct/impurezas/
// disposition) — GET /quality-area-b-inspections/lots/:lotId, ver
// comrural_erp_backend/docs/quality-area-b-inspections.md §5.
//
// "Laboratorio — agua y pesticidas" sigue en mock: el módulo `laboratory`
// no modela "calidad de agua"/"pesticidas" como campos propios (son
// ensayos de catálogo libre dentro de reportData JSONB) y no hay ningún
// endpoint que cruce informes de Laboratorio por lote — lot-traceability
// sí existe, pero solo expone un status genérico de la última solicitud de
// análisis (RECIBIDA/EN_PROCESO/ANALIZADA/RECHAZADA), no el detalle
// pureza/agua/pesticidas que pide esta tabla, y su permiso
// (lot-traceability:read) ni siquiera se lo dieron a produccion. Sigue
// siendo dato de ejemplo hasta que eso exista.
// quality_area_b_inspections cuelga de una corrida de ENVASADO
// (packaging_sources -> production_area_b_entries.lotId) — solo puede
// existir para un lote que ya llegó a Área B. Un lote todavía en
// LIBERADO/LAVADO (recién arrancando Área A) nunca va a tener nada acá.
const ESTADOS_CANDIDATOS = ['EN_AREA_B', 'PROCESADO']

const INFORMES_LABORATORIO = [
  { lote: 'MP-2026-0148', calidadAgua: 'Dentro de norma', pesticidas: 'Sin detección' },
  { lote: 'MP-2026-0149', calidadAgua: 'Dentro de norma', pesticidas: 'Sin detección' },
  { lote: 'MP-2026-0150', calidadAgua: 'Fuera de norma', pesticidas: 'Sin detección' },
]

function Tabla({ titulo, Icon, columnas, filas, vacio }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
        <h3 className="font-extrabold text-marron-cafe">{titulo}</h3>
      </div>
      {filas.length === 0 ? (
        vacio
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white/70">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                {columnas.map((c) => (
                  <th key={c.key} className="px-3 py-2.5">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className="border-b border-marron-tierra/15 last:border-b-0">
                  {columnas.map((c) => (
                    <td key={c.key} className="px-3 py-2">
                      {c.render ? c.render(fila[c.key], fila) : fila[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function InformesCalidadLaboratorio() {
  const [productos, setProductos] = useState(null)
  const [loteId, setLoteId] = useState('')
  const [inspecciones, setInspecciones] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    listarTodo(productsService.listar)
      .then((data) => !cancelado && setProductos(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!loteId) {
      setInspecciones(null)
      return
    }
    let cancelado = false
    setInspecciones(null)
    qualityAreaBInspectionsService
      .listarPorLote(loteId)
      .then((data) => !cancelado && setInspecciones(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [loteId])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  return (
    <div className="flex flex-col gap-4">
      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <div className="max-w-md">
        {!productos ? (
          <Skeleton className="h-16" />
        ) : (
          <ComboboxLote
            label="Lote MP"
            value={loteId}
            onChange={setLoteId}
            estados={ESTADOS_CANDIDATOS}
            productoNombre={productoNombre}
          />
        )}
      </div>

      {!loteId ? (
        <EmptyState Icon={FlaskConical} titulo="Elegí un lote para ver sus controles de Calidad" />
      ) : (
        <Tabla
          titulo="Calidad — pureza e impurezas (Área B)"
          Icon={FlaskConical}
          columnas={[
            { key: 'inspectedAt', label: 'Fecha', render: (v) => new Date(v).toLocaleDateString('es-BO') },
            { key: 'purezaPct', label: 'Pureza (%)' },
            { key: 'humedadPct', label: 'Humedad (%)' },
            { key: 'rejectedPackageCount', label: 'Paquetes rechazados' },
            {
              key: 'disposition',
              label: 'Resultado',
              render: (v) => <Badge tono={v === 'APROBADO' ? 'positivo' : v === 'PARCIAL' ? 'alerta' : 'negativo'}>{v}</Badge>,
            },
          ]}
          filas={inspecciones ?? []}
          vacio={
            inspecciones === null ? (
              <Skeleton className="h-16" />
            ) : (
              <EmptyState Icon={FlaskConical} titulo="Este lote todavía no tiene controles de Calidad registrados" />
            )
          }
        />
      )}

      <MockupBanner mensaje="Mockup — Laboratorio (agua/pesticidas) todavía no tiene un endpoint que cruce informes por lote. Datos de ejemplo." />

      <Tabla
        titulo="Laboratorio — agua y pesticidas"
        Icon={Droplets}
        columnas={[
          { key: 'lote', label: 'Lote MP' },
          {
            key: 'calidadAgua',
            label: 'Calidad del agua',
            render: (v) => <Badge tono={v === 'Dentro de norma' ? 'positivo' : 'negativo'}>{v}</Badge>,
          },
          { key: 'pesticidas', label: 'Pesticidas' },
        ]}
        filas={INFORMES_LABORATORIO}
        vacio={null}
      />
    </div>
  )
}
