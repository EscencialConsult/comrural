import { useState } from 'react'
import { Download, FileSpreadsheet, ClipboardCheck, Repeat } from 'lucide-react'
import { toast } from '../../lib/toast'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import PillTabs from '../dashboard/PillTabs.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'

const TIPOS_INVENTARIO = [
  { id: 'mensual', nombre: 'Mensual', Icon: ClipboardCheck },
  { id: 'ciclico', nombre: 'Cíclico', Icon: Repeat },
]

const CRITERIOS_CICLICO = ['Alta rotación', 'Sin movimiento']

// Datos ilustrativos — P-10/P-11 de la narrativa: "el sistema genera un
// listado por almacén, subalmacén, ubicación, ítem, lote, unidad, estado y
// saldo teórico [...] los participantes realizan el conteo físico". No hay
// backend de existencias reales todavía (ver auditoría de servicios), así
// que el saldo teórico también es de ejemplo, igual que Almacén
// Intermedio.
const ITEMS_INVENTARIO = [
  { id: 1, almacen: 'Materia Prima', subalmacen: 'MP', item: 'Quinua blanca en grano', lote: 'C-08816-MP', unidad: 'kg', estado: 'Disponible', saldoTeorico: 6525 },
  { id: 2, almacen: 'Envases y Embalaje', subalmacen: 'ML', item: 'Bolsas kraft marrón 25kg', lote: '120525-EEKM2-05', unidad: 'Piezas', estado: 'Disponible', saldoTeorico: 340 },
  { id: 3, almacen: 'Producto Terminado', subalmacen: 'PTL', item: 'Barra de chocolate 30gr', lote: '3135173', unidad: 'Piezas', estado: 'Disponible', saldoTeorico: 1625 },
  { id: 4, almacen: 'Almacén General', subalmacen: 'ESC', item: 'Resma de papel A4', lote: '—', unidad: 'Piezas', estado: 'Disponible', saldoTeorico: 18 },
]

// Formularios/reportes de Inventario mensual y cíclico (P-10/P-11 de la
// narrativa) — a diferencia del resto de los mockups de Almacén, esto no
// es una nota de un solo movimiento sino un reporte de conteo: saldo
// teórico vs. físico por ítem. Sin formulario en papel de referencia.
// MOCKUP total, sin backend propio.
export default function SeccionInventarioAlmacen() {
  const [tipo, setTipo] = useState('mensual')
  const [fechaCorte, setFechaCorte] = useState('')
  const [criterioCiclico, setCriterioCiclico] = useState(CRITERIOS_CICLICO[0])
  const [conteos, setConteos] = useState({})

  const actualizarConteo = (id, valor) => setConteos((prev) => ({ ...prev, [id]: valor }))

  const filas = ITEMS_INVENTARIO.map((f) => {
    const fisico = conteos[f.id]
    const diferencia = fisico === undefined || fisico === '' ? null : Number(fisico) - f.saldoTeorico
    return { ...f, fisico, diferencia }
  })

  const exportar = (formato) => {
    toast.info(`Exportado a ${formato} (mockup).`)
  }

  const generarReporte = () => {
    toast.info('Reporte de conciliación generado.')
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario
        antetitulo="Reporte"
        titulo="Inventario de Almacén"
        acciones={
          <div className="flex gap-2">
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => exportar('CSV')}>
              <Download className="size-3.5" strokeWidth={2} />
              CSV
            </Button>
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => exportar('Excel')}>
              <FileSpreadsheet className="size-3.5" strokeWidth={2} />
              Excel
            </Button>
          </div>
        }
      />

      <MockupBanner mensaje="Mockup — sin formulario en papel de referencia, campos y saldos de ejemplo derivados de la narrativa de procesos (P-10/P-11)." />

      <PillTabs pestañas={TIPOS_INVENTARIO} activa={tipo} onCambiar={setTipo} />

      <SeccionFormulario
        numero={1}
        titulo={tipo === 'mensual' ? 'Inventario mensual — coordinado con Contabilidad' : 'Inventario cíclico — control interno'}
        nota={
          tipo === 'mensual'
            ? 'Corte formal del mes. Las bajas del período se registran antes de esta fecha.'
            : 'Lo ejecuta el Responsable de Almacén en cualquier momento, priorizando alta rotación y artículos sin movimiento.'
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {tipo === 'mensual' ? (
            <FormInput label="Fecha de corte" type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} />
          ) : (
            <>
              <FormInput label="Fecha" type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} />
              <FormSelect label="Criterio" value={criterioCiclico} onChange={(e) => setCriterioCiclico(e.target.value)}>
                {CRITERIOS_CICLICO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </FormSelect>
            </>
          )}
        </div>
      </SeccionFormulario>

      {/* Tarjetas en mobile — la tabla de abajo obliga a scrollear
          horizontal en pantallas angostas (7 columnas, min-w-[860px]), acá
          se repite la misma info apilada, con el mismo input de conteo. */}
      <div className="flex flex-col gap-3 md:hidden">
        {filas.map((f) => (
          <div key={f.id} className="flex flex-col gap-2.5 rounded-2xl bg-marron-tierra/5 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-marron-cafe/50">
                  {f.almacen} <span className="font-mono normal-case text-marron-cafe/40">({f.subalmacen})</span>
                </p>
                <p className="truncate font-semibold text-marron-cafe">{f.item}</p>
              </div>
              <span className="shrink-0 font-mono text-xs font-semibold text-marron-cafe/60">{f.lote}</span>
            </div>

            <div className="grid grid-cols-3 items-end gap-2 border-t border-marron-tierra/10 pt-2.5">
              <div>
                <p className="text-sm font-semibold text-marron-cafe">
                  {f.saldoTeorico} <span className="text-xs font-normal text-marron-cafe/50">{f.unidad}</span>
                </p>
                <p className="text-[10px] uppercase tracking-wide text-marron-cafe/40">Saldo teórico</p>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  value={f.fisico ?? ''}
                  onChange={(e) => actualizarConteo(f.id, e.target.value)}
                  className="w-full rounded-lg border border-marron-tierra/20 bg-white px-2 py-1 text-center text-sm text-marron-cafe outline-none focus-visible:border-verde-lima focus-visible:ring-2 focus-visible:ring-verde-lima/20"
                />
                <p className="mt-1 text-[10px] uppercase tracking-wide text-marron-cafe/40">Física</p>
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    f.diferencia == null ? 'text-marron-cafe/40' : f.diferencia === 0 ? 'text-marron-cafe/70' : f.diferencia < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'
                  }`}
                >
                  {f.diferencia == null ? '—' : f.diferencia}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-marron-cafe/40">Diferencia</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 p-2 md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
              <th className="px-4 py-3">Almacén</th>
              <th className="px-4 py-3">Ítem</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Saldo teórico</th>
              <th className="px-4 py-3">Cantidad física</th>
              <th className="px-4 py-3">Diferencia</th>
            </tr>
          </thead>
          <tbody className="bg-white/70">
            {filas.map((f) => (
              <tr key={f.id} className="border-b border-marron-tierra/10 last:border-b-0">
                <td className="px-4 py-3 text-marron-cafe">
                  {f.almacen} <span className="font-mono text-xs text-marron-cafe/50">({f.subalmacen})</span>
                </td>
                <td className="px-4 py-3 text-marron-cafe">{f.item}</td>
                <td className="truncate px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{f.lote}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">{f.unidad}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">{f.saldoTeorico}</td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min="0"
                    value={f.fisico ?? ''}
                    onChange={(e) => actualizarConteo(f.id, e.target.value)}
                    className="w-24 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1 text-center text-sm text-marron-cafe outline-none focus-visible:border-verde-lima focus-visible:ring-2 focus-visible:ring-verde-lima/20"
                  />
                </td>
                <td
                  className={`px-4 py-3 text-center font-semibold ${
                    f.diferencia == null ? 'text-marron-cafe/40' : f.diferencia === 0 ? 'text-marron-cafe/70' : f.diferencia < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'
                  }`}
                >
                  {f.diferencia == null ? '—' : f.diferencia}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={generarReporte}>Generar reporte de conciliación</Button>
      </div>
    </div>
  )
}
