import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { toast } from '../../lib/toast'
import { EXISTENCIAS_EJEMPLO } from '../../data/almacenMock.js'
import MockupBanner from '../MockupBanner.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import BarraFiltros from './BarraFiltros.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'

const GRUPOS = ['Materia Prima', 'Envases/Embalajes e Insumos de Proceso', 'Producto Terminado', 'Otros Almacenes']
const ESTADOS = ['Disponible', 'Bloqueada']

// Días de aviso para "próximo a vencer" — no está definido un umbral
// oficial en la documentación, 60 días es solo un valor razonable para el
// mockup.
const DIAS_AVISO_VENCIMIENTO = 60

function proximoAVencer(vencimiento) {
  if (!vencimiento) return false
  const dias = (new Date(vencimiento) - new Date()) / 86400000
  return dias >= 0 && dias <= DIAS_AVISO_VENCIMIENTO
}

// Consulta de Existencias (P-06 de la narrativa) — a diferencia del resto
// de las pantallas de Almacén, esto es una consulta de solo lectura del
// stock actual, no un formulario de movimiento. Sección 8/10 del
// relevamiento: "Debe haber un link de visualización con todos los
// stocks" / "Botón de stocks para ver OK, no OK y disponibilidad". Sin
// backend de existencias real todavía — datos de ejemplo (ver
// src/data/almacenMock.js). MOCKUP total.
// `grupoFijo`: cuando se pasa (ver PanelInventario.jsx — pestañas Materia
// Prima/Producto Terminado/Envases e Insumos), la pantalla queda anclada a
// ese grupo y no muestra el selector "Grupo" — es la misma consulta, solo
// que ya viene recortada por la pestaña en la que estás, en vez de que el
// usuario tenga que elegirlo cada vez.
export default function SeccionExistenciasAlmacen({ grupoFijo }) {
  const [busqueda, setBusqueda] = useState('')
  const [grupo, setGrupo] = useState('')
  const [estado, setEstado] = useState('')

  const grupoActivo = grupoFijo ?? grupo
  const hayFiltrosActivos = busqueda !== '' || (!grupoFijo && grupo !== '') || estado !== ''
  const limpiarFiltros = () => {
    setBusqueda('')
    setGrupo('')
    setEstado('')
  }

  const filtradas = useMemo(() => {
    return EXISTENCIAS_EJEMPLO.filter((e) => {
      if (grupoActivo && e.grupo !== grupoActivo) return false
      if (estado === 'Disponible' && e.disponible <= 0) return false
      if (estado === 'Bloqueada' && e.bloqueada <= 0) return false
      if (busqueda && !e.item.toLowerCase().includes(busqueda.toLowerCase()) && !(e.lote ?? '').toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [busqueda, grupoActivo, estado])

  const exportar = (formato) => {
    toast.info(`Exportado a ${formato} (mockup).`)
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario
        antetitulo="Consulta"
        titulo="Existencias de Almacén"
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

      <MockupBanner mensaje="Mockup — sin backend de existencias real todavía, datos de ejemplo (P-06)." />

      <BarraFiltros
        busqueda={busqueda}
        onBusquedaChange={(e) => setBusqueda(e.target.value)}
        placeholderBusqueda="Ítem o lote…"
        hayFiltrosActivos={hayFiltrosActivos}
        onLimpiar={limpiarFiltros}
      >
        {!grupoFijo && (
          <FormSelect label="Grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} className="min-w-[160px] flex-1 sm:max-w-[260px]">
            <option value="">Todos</option>
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </FormSelect>
        )}
        <FormSelect label="Estado" value={estado} onChange={(e) => setEstado(e.target.value)} className="min-w-[160px] flex-1 sm:max-w-[200px]">
          <option value="">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </FormSelect>
      </BarraFiltros>

      {/* Tarjetas en mobile — mismo criterio que PanelAlmacenRecepcion.jsx:
          la tabla de abajo obliga a scrollear horizontal en pantallas
          angostas (8 columnas, min-w-[900px]), acá se repite la misma
          info apilada en vez de forzar ese scroll. */}
      <div className="flex flex-col gap-3 md:hidden">
        {filtradas.map((e) => (
          <div key={e.id} className="flex flex-col gap-2.5 rounded-2xl bg-marron-tierra/5 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-marron-cafe/50">{e.grupo}</p>
                <p className="truncate font-semibold text-marron-cafe">
                  {e.item} <span className="font-mono text-xs font-normal text-marron-cafe/50">({e.almacen})</span>
                </p>
              </div>
              {e.lote && <span className="shrink-0 font-mono text-xs font-semibold text-marron-cafe/60">{e.lote}</span>}
            </div>

            <p className="text-xs text-marron-cafe/60">{e.ubicacion}</p>

            <div className="grid grid-cols-3 gap-2 border-t border-marron-tierra/10 pt-2.5 text-center">
              <div>
                <p className="text-sm font-semibold text-marron-cafe">
                  {e.cantidadFisica} <span className="text-xs font-normal text-marron-cafe/50">{e.unidad}</span>
                </p>
                <p className="text-[10px] uppercase tracking-wide text-marron-cafe/40">Física</p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${e.disponible > 0 ? 'text-verde-bosque' : 'text-marron-cafe/40'}`}>{e.disponible}</p>
                <p className="text-[10px] uppercase tracking-wide text-marron-cafe/40">Disponible</p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${e.bloqueada > 0 ? 'text-rojo-pasankalla' : 'text-marron-cafe/40'}`}>{e.bloqueada}</p>
                <p className="text-[10px] uppercase tracking-wide text-marron-cafe/40">Bloqueada</p>
              </div>
            </div>

            {e.vencimiento && (
              <p className={`flex items-center gap-1 text-xs ${proximoAVencer(e.vencimiento) ? 'font-semibold text-marron-arcilla' : 'text-marron-cafe/60'}`}>
                {proximoAVencer(e.vencimiento) && <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2} />}
                Vence: {new Date(e.vencimiento).toLocaleDateString('es-BO', { dateStyle: 'medium' })}
              </p>
            )}
          </div>
        ))}
        {filtradas.length === 0 && (
          <p className="rounded-2xl bg-marron-tierra/5 px-4 py-6 text-center text-sm text-marron-cafe/50">
            No hay existencias que coincidan con el filtro.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 p-2 md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
              <th className="px-4 py-3 text-left">Grupo</th>
              <th className="px-4 py-3 text-left">Ítem</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Ubicación</th>
              <th className="px-4 py-3">Física</th>
              <th className="px-4 py-3">Disponible</th>
              <th className="px-4 py-3">Bloqueada</th>
              <th className="px-4 py-3">Vencimiento</th>
            </tr>
          </thead>
          <tbody className="bg-white/70">
            {filtradas.map((e) => (
              <tr key={e.id} className="border-b border-marron-tierra/10 last:border-b-0">
                <td className="px-4 py-3 text-xs text-marron-cafe/60">{e.grupo}</td>
                <td className="px-4 py-3 text-marron-cafe">
                  {e.item} <span className="font-mono text-xs text-marron-cafe/50">({e.almacen})</span>
                </td>
                <td className="truncate px-4 py-3 text-center font-mono text-xs font-semibold text-marron-cafe/70">{e.lote ?? '—'}</td>
                <td className="px-4 py-3 text-center text-xs text-marron-cafe/60">{e.ubicacion}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">
                  {e.cantidadFisica} {e.unidad}
                </td>
                <td className={`px-4 py-3 text-center font-semibold ${e.disponible > 0 ? 'text-verde-bosque' : 'text-marron-cafe/40'}`}>{e.disponible}</td>
                <td className={`px-4 py-3 text-center font-semibold ${e.bloqueada > 0 ? 'text-rojo-pasankalla' : 'text-marron-cafe/40'}`}>{e.bloqueada}</td>
                <td className="px-4 py-3 text-center text-xs">
                  {e.vencimiento ? (
                    <span className={`inline-flex items-center gap-1 ${proximoAVencer(e.vencimiento) ? 'font-semibold text-marron-arcilla' : 'text-marron-cafe/60'}`}>
                      {proximoAVencer(e.vencimiento) && <AlertTriangle className="size-3.5" strokeWidth={2} />}
                      {new Date(e.vencimiento).toLocaleDateString('es-BO', { dateStyle: 'medium' })}
                    </span>
                  ) : (
                    <span className="text-marron-cafe/30">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                  No hay existencias que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
