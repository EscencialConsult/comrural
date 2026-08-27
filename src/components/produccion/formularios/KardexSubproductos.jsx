import { useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'

const TURNOS = [1, 2, 3]
const DESTINOS = ['Mercado local', 'Alimento balanceado']

// Los 6 subproductos del relevamiento — RP-16: SIN trazabilidad de lote (no
// van a exportación), por eso el kardex es por tipo de subproducto, no por
// lote MP como el resto de los formularios de Producción.
const SUBPRODUCTOS = [
  { id: 'quinua-segunda', nombre: 'Quinua segunda' },
  { id: 'quinua-tercera', nombre: 'Quinua tercera' },
  { id: 'puntos-negros', nombre: 'Puntos negros' },
  { id: 'rechazo', nombre: 'Rechazo' },
  { id: 'polvillo', nombre: 'Polvillo' },
  { id: 'menuda', nombre: 'Menuda (Área A)' },
]

let siguienteFilaId = 1
function filaVacia() {
  return {
    id: siguienteFilaId++,
    fecha: new Date().toLocaleDateString('en-CA'),
    turno: 1,
    entradaKg: null,
    salidaKg: null,
    destino: '',
    observaciones: '',
  }
}

// Formulario 7 — kardex digital de subproductos (RP-16). A diferencia del
// resto (papel por lote), acá "Llena: Supervisores (sistema digital)" — es
// justamente el único de los 8 pensado para vivir directo en el sistema,
// no en un papel que se digitaliza después. Reporta a Administración al
// cierre de cada turno, que es quien gestiona la venta local (fuera del
// alcance de Producción).
export default function KardexSubproductos() {
  const [kardexPorTipo, setKardexPorTipo] = useState(() => Object.fromEntries(SUBPRODUCTOS.map((s) => [s.id, []])))
  const [tipoSeleccionado, setTipoSeleccionado] = useState(SUBPRODUCTOS[0].id)
  const { areaImprimibleRef, generandoPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#faf4e8' })
  const { enviando, ejecutar } = useSolicitud()

  const filas = kardexPorTipo[tipoSeleccionado]

  const actualizarFila = (id, campo) => (valor) =>
    setKardexPorTipo((k) => ({
      ...k,
      [tipoSeleccionado]: k[tipoSeleccionado].map((f) => (f.id === id ? { ...f, [campo]: valor } : f)),
    }))
  const agregarFila = () => setKardexPorTipo((k) => ({ ...k, [tipoSeleccionado]: [...k[tipoSeleccionado], filaVacia()] }))
  const quitarFila = (id) =>
    setKardexPorTipo((k) => ({ ...k, [tipoSeleccionado]: k[tipoSeleccionado].filter((f) => f.id !== id) }))

  const saldoDe = (tipoId) => {
    let saldo = 0
    for (const f of kardexPorTipo[tipoId]) saldo += (f.entradaKg ?? 0) - (f.salidaKg ?? 0)
    return saldo
  }

  let saldoCorrido = 0
  const filasConSaldo = filas.map((f) => {
    saldoCorrido += (f.entradaKg ?? 0) - (f.salidaKg ?? 0)
    return { ...f, saldo: saldoCorrido }
  })

  const registrar = async () => {
    try {
      await ejecutar(() => produccionService.registrarMovimientoKardex({ tipo: tipoSeleccionado, filas: filasConSaldo }))
      toast.success('Movimientos de kardex guardados.')
    } catch {
      toast.error('No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Kardex de Subproductos — Área B"
          codigo="P-PRO-01/R-19"
          version="01"
          acciones={
            <Button variant="secondary" onClick={generarPdf} disabled={generandoPdf} className="px-4 py-2 text-xs">
              <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
              {generandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
            </Button>
          }
        />

        <SeccionFormulario
          numero={1}
          titulo="Saldo actual por subproducto"
          nota="Destino: mercado local o alimento balanceado. Sin trazabilidad de lote — no van a exportación."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SUBPRODUCTOS.map((s) => {
              const saldo = saldoDe(s.id)
              const activo = s.id === tipoSeleccionado
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTipoSeleccionado(s.id)}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-150 ${
                    activo ? 'bg-verde-lima/20' : 'bg-white/70 hover:bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-marron-cafe">{s.nombre}</span>
                  <Badge tono={saldo < 0 ? 'negativo' : activo ? 'liberado' : 'neutro'}>
                    {saldo.toLocaleString('es-BO')} kg
                  </Badge>
                </button>
              )
            })}
          </div>
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo={`Movimientos — ${SUBPRODUCTOS.find((s) => s.id === tipoSeleccionado).nombre}`}
          acciones={
            <Button variant="secondary" onClick={agregarFila} className="px-3 py-1.5 text-xs">
              <Plus className="mr-1 size-3.5" strokeWidth={2} />
              Agregar movimiento
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5">Entrada (kg)</th>
                  <th className="px-3 py-2.5">Salida (kg)</th>
                  <th className="px-3 py-2.5">Destino</th>
                  <th className="px-3 py-2.5">Saldo (kg)</th>
                  <th className="px-3 py-2.5">Observaciones</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filasConSaldo.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-marron-cafe/50">
                      Sin movimientos registrados todavía.
                    </td>
                  </tr>
                ) : (
                  filasConSaldo.map((f) => (
                    <tr key={f.id} className="border-b border-marron-tierra/15 last:border-b-0">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={f.fecha}
                          onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)}
                          className="w-36 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.turno}
                          onChange={(e) => actualizarFila(f.id, 'turno')(Number(e.target.value))}
                          className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        >
                          {TURNOS.map((t) => (
                            <option key={t} value={t}>
                              Turno {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={f.entradaKg ?? ''}
                          onChange={(e) => actualizarFila(f.id, 'entradaKg')(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="—"
                          className="w-24 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={f.salidaKg ?? ''}
                          onChange={(e) => actualizarFila(f.id, 'salidaKg')(e.target.value === '' ? null : Number(e.target.value))}
                          placeholder="—"
                          className="w-24 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.destino}
                          onChange={(e) => actualizarFila(f.id, 'destino')(e.target.value)}
                          className="w-40 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        >
                          <option value="">Seleccionar…</option>
                          {DESTINOS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={`px-3 py-2 text-center font-semibold ${f.saldo < 0 ? 'text-rojo-pasankalla' : 'text-marron-cafe/70'}`}>
                        {f.saldo}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={f.observaciones}
                          onChange={(e) => actualizarFila(f.id, 'observaciones')(e.target.value)}
                          placeholder="—"
                          className="w-40 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        />
                      </td>
                      <td className="px-3 py-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => quitarFila(f.id)}
                          aria-label="Quitar movimiento"
                          className="flex size-7 items-center justify-center rounded-full text-marron-cafe/40 transition-colors duration-150 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla"
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="px-1 text-xs italic text-marron-cafe/60">
            Se reporta a Administración al finalizar cada turno — Administración gestiona la venta local.
          </p>
        </SeccionFormulario>
      </div>

      <div className="flex justify-end print:hidden">
        <Button onClick={registrar} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar movimientos'}
        </Button>
      </div>
    </div>
  )
}
