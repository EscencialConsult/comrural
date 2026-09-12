import { FlaskConical, Droplets } from 'lucide-react'
import Badge from '../Badge.jsx'
import MockupBanner from '../MockupBanner.jsx'

// Punto 3 del relevamiento (secciones 2.21 y 3): Producción necesita ver
// pureza/impurezas de Calidad y el número de calidad de agua de
// Laboratorio, sin duplicar el registro de humedad. Todavía no hay un
// endpoint que cruce esos informes por lote para Producción (Calidad y
// Laboratorio los guardan del lado de sus propios módulos), así que esto es
// una vista mock de solo lectura hasta que ese cruce exista en el backend.
const INFORMES_CALIDAD = [
  { lote: 'MP-2026-0148', pureza: 99.99, impurezasPct: 0.4, resultado: 'Apto' },
  { lote: 'MP-2026-0149', pureza: 99.95, impurezasPct: 1.1, resultado: 'Apto' },
  { lote: 'MP-2026-0150', pureza: 98.7, impurezasPct: 3.2, resultado: 'Reproceso' },
]

const INFORMES_LABORATORIO = [
  { lote: 'MP-2026-0148', calidadAgua: 'Dentro de norma', pesticidas: 'Sin detección' },
  { lote: 'MP-2026-0149', calidadAgua: 'Dentro de norma', pesticidas: 'Sin detección' },
  { lote: 'MP-2026-0150', calidadAgua: 'Fuera de norma', pesticidas: 'Sin detección' },
]

function Tabla({ titulo, Icon, columnas, filas }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
        <h3 className="font-extrabold text-marron-cafe">{titulo}</h3>
      </div>
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
    </div>
  )
}

export default function InformesCalidadLaboratorio() {
  return (
    <div className="flex flex-col gap-4">
      <MockupBanner mensaje="Mockup — informes de Calidad y Laboratorio filtrados por lote de Producción. Todavía no hay endpoint que los cruce; datos de ejemplo." />

      <Tabla
        titulo="Calidad — pureza e impurezas"
        Icon={FlaskConical}
        columnas={[
          { key: 'lote', label: 'Lote MP' },
          { key: 'pureza', label: 'Pureza (%)' },
          { key: 'impurezasPct', label: 'Impurezas (%)' },
          {
            key: 'resultado',
            label: 'Resultado',
            render: (v) => <Badge tono={v === 'Apto' ? 'positivo' : 'negativo'}>{v}</Badge>,
          },
        ]}
        filas={INFORMES_CALIDAD}
      />

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
      />
    </div>
  )
}
