import { useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { PRESENTACIONES_COMERCIALES } from '../../../config/presentacionesComerciales'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormSelect from '../../FormSelect.jsx'
import Skeleton from '../../Skeleton.jsx'

const TIPOS_QUINUA = ['Blanca', 'Negra', 'Roja', 'Tricolor']
const TURNOS = [1, 2, 3]
const PRESENTACIONES = PRESENTACIONES_COMERCIALES

const NORMAS_CERTIFICADAS = ['Reg. CE 834/07', 'NB-Ley 3525', 'LPO México', 'NOP', 'BIOSUISSE', 'Otro']

const TIPOS_PRODUCTO = [
  { valor: 'N', label: 'N · Lavado (nuevo)' },
  { valor: 'R', label: 'R · Por recuperar' },
  { valor: 'E', label: 'E · Quinua final (saldo)' },
]

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Encargado de grupo' },
  { rol: 'Verifica', puesto: 'Supervisor de Producción' },
]

const CABECERA_VACIA = { tipoQuinua: '', loteMpId: '', presentacionId: '', normas: [] }

let siguienteFilaId = 1
function filaVacia() {
  return {
    id: siguienteFilaId++,
    fecha: new Date().toLocaleDateString('en-CA'),
    turno: 1,
    tipo: 'N',
    sacosUtilizadosBolsas: null,
    sacosUtilizadosKg: null,
    sacosEnvasadosBolsas: null,
    sacosEnvasadosKg: null,
    a: null,
    b: null,
    c: null,
    d: null,
    saldoQf: null,
    x: null,
    observaciones: '',
  }
}

// Formulario 5 — registro central de Área B (limpieza final y envasado).
// A diferencia de Volumen A, el documento NO da una fórmula de balance para
// esta tabla (solo pide totales en el pie) — no se inventa una acá, se
// respeta lo que dice el relevamiento.
//
// RP-15 es explícita: "en Área B NO hay merma real" — Q.2da/P.Negros/
// Rechazo/Polvillo son subproductos comercializables, no pérdida. El papel
// original llama a esa columna "Merma" en el pie, pero acá se rotula
// "Subproductos" para no contradecir la regla de negocio real.
export default function ControlVolumenB() {
  const [lotesMp, setLotesMp] = useState(null)
  const [cabecera, setCabecera] = useState(CABECERA_VACIA)
  const [filas, setFilas] = useState([filaVacia()])
  const { areaImprimibleRef, generandoPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#faf4e8' })
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    let cancelado = false
    produccionService.listarLotesMp().then((data) => !cancelado && setLotesMp(data))
    return () => {
      cancelado = true
    }
  }, [])

  const actualizarCabecera = (campo) => (valor) => setCabecera((c) => ({ ...c, [campo]: valor }))
  const alternarNorma = (norma) =>
    setCabecera((c) => ({
      ...c,
      normas: c.normas.includes(norma) ? c.normas.filter((n) => n !== norma) : [...c.normas, norma],
    }))
  const actualizarFila = (id, campo) => (valor) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((fs) => [...fs, filaVacia()])
  const quitarFila = (id) => setFilas((fs) => fs.filter((f) => f.id !== id))

  const presentacionSeleccionada = PRESENTACIONES.find((p) => p.id === cabecera.presentacionId)

  const totalEnvasadosKg = filas.reduce((acc, f) => acc + (f.sacosEnvasadosKg ?? 0), 0)
  const totalSubproductosKg = filas.reduce((acc, f) => acc + (f.a ?? 0) + (f.b ?? 0) + (f.c ?? 0) + (f.d ?? 0), 0)

  const registrar = async () => {
    try {
      await ejecutar(() => produccionService.registrarVolumenB({ cabecera, filas }))
      toast.success('Registro de Volumen B guardado.')
    } catch {
      toast.error('No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Control de Volumen de Producción — Área B"
          codigo="P-PRO-01/R-25"
          version="02"
          acciones={
            <Button variant="secondary" onClick={generarPdf} disabled={generandoPdf} className="px-4 py-2 text-xs">
              <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
              {generandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
            </Button>
          }
        />

        <SeccionFormulario numero={1} titulo="Cabecera">
          {!lotesMp ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormSelect
                  label="Tipo de quinua"
                  value={cabecera.tipoQuinua}
                  onChange={(e) => actualizarCabecera('tipoQuinua')(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {TIPOS_QUINUA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </FormSelect>

                <FormSelect
                  label="Lote MP"
                  value={cabecera.loteMpId}
                  onChange={(e) => actualizarCabecera('loteMpId')(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {lotesMp.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} · {l.product}
                    </option>
                  ))}
                </FormSelect>

                <FormSelect
                  label="Presentación"
                  value={cabecera.presentacionId}
                  onChange={(e) => actualizarCabecera('presentacionId')(e.target.value)}
                  hint={presentacionSeleccionada ? presentacionSeleccionada.notaLiberacion : undefined}
                >
                  <option value="">Seleccionar…</option>
                  {PRESENTACIONES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </FormSelect>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-sm text-marron-cafe">Normas certificadas</p>
                <div className="flex flex-wrap gap-2">
                  {NORMAS_CERTIFICADAS.map((norma) => {
                    const activa = cabecera.normas.includes(norma)
                    return (
                      <button
                        key={norma}
                        type="button"
                        onClick={() => alternarNorma(norma)}
                        aria-pressed={activa}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                          activa
                            ? 'border-verde-lima bg-verde-lima/20 text-verde-bosque'
                            : 'border-marron-tierra/20 text-marron-cafe/60 hover:border-marron-tierra/40'
                        }`}
                      >
                        {norma}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo="Columnas por turno"
          nota="Tipo — N: lavado (nuevo). R: por recuperar. E: quinua final (saldo que no completó presentación)."
          acciones={
            <Button variant="secondary" onClick={agregarFila} className="px-3 py-1.5 text-xs">
              <Plus className="mr-1 size-3.5" strokeWidth={2} />
              Agregar turno
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[1440px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">N°</th>
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5">Tipo</th>
                  <th className="px-3 py-2.5">Sacos utilizados (bolsas)</th>
                  <th className="px-3 py-2.5">Sacos utilizados (Kg)</th>
                  <th className="px-3 py-2.5">Sacos envasados B (bolsas)</th>
                  <th className="px-3 py-2.5">Sacos envasados B (Kg)</th>
                  <th className="px-3 py-2.5">Q.2da (a)</th>
                  <th className="px-3 py-2.5">P. Negros (b)</th>
                  <th className="px-3 py-2.5">Rechazo (c)</th>
                  <th className="px-3 py-2.5">Polvillo (d)</th>
                  <th className="px-3 py-2.5">Saldo Q.F.</th>
                  <th className="px-3 py-2.5">X (por recuperar)</th>
                  <th className="px-3 py-2.5">Observaciones</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.id} className="border-b border-marron-tierra/15 last:border-b-0">
                    <td className="px-3 py-2 text-center font-semibold text-marron-cafe/60">{i + 1}</td>
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
                      <select
                        value={f.tipo}
                        onChange={(e) => actualizarFila(f.id, 'tipo')(e.target.value)}
                        className="w-32 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      >
                        {TIPOS_PRODUCTO.map((t) => (
                          <option key={t.valor} value={t.valor}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <CeldaNumero valor={f.sacosUtilizadosBolsas} onChange={actualizarFila(f.id, 'sacosUtilizadosBolsas')} />
                    <CeldaNumero valor={f.sacosUtilizadosKg} onChange={actualizarFila(f.id, 'sacosUtilizadosKg')} decimales={1} />
                    <CeldaNumero valor={f.sacosEnvasadosBolsas} onChange={actualizarFila(f.id, 'sacosEnvasadosBolsas')} />
                    <CeldaNumero valor={f.sacosEnvasadosKg} onChange={actualizarFila(f.id, 'sacosEnvasadosKg')} decimales={1} />
                    <CeldaNumero valor={f.a} onChange={actualizarFila(f.id, 'a')} decimales={1} />
                    <CeldaNumero valor={f.b} onChange={actualizarFila(f.id, 'b')} decimales={1} />
                    <CeldaNumero valor={f.c} onChange={actualizarFila(f.id, 'c')} decimales={1} />
                    <CeldaNumero valor={f.d} onChange={actualizarFila(f.id, 'd')} decimales={1} />
                    <CeldaNumero valor={f.saldoQf} onChange={actualizarFila(f.id, 'saldoQf')} decimales={1} />
                    <CeldaNumero valor={f.x} onChange={actualizarFila(f.id, 'x')} decimales={1} />
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
                        aria-label="Quitar turno"
                        className="flex size-7 items-center justify-center rounded-full text-marron-cafe/40 transition-colors duration-150 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-verde-hoja/35 text-xs font-bold text-marron-cafe">
                  <td className="px-3 py-2.5" colSpan={7}>
                    Envasados: {totalEnvasadosKg.toFixed(1)} kg
                  </td>
                  <td className="px-3 py-2.5" colSpan={4}>
                    Subproductos (a+b+c+d): {totalSubproductosKg.toFixed(1)} kg
                  </td>
                  <td className="px-3 py-2.5" colSpan={5} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="px-1 text-xs italic text-marron-cafe/60">
            RP-15: en Área B no hay merma real — Q.2da/P.Negros/Rechazo/Polvillo son subproductos comercializables
            (mercado local o alimento balanceado), no pérdida de proceso.
          </p>
        </SeccionFormulario>

        <SeccionFormulario numero={3} titulo="Firmas">
          <FirmasResponsables responsables={RESPONSABLES} />
        </SeccionFormulario>
      </div>

      <div className="flex justify-end print:hidden">
        <Button onClick={registrar} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar registro'}
        </Button>
      </div>
    </div>
  )
}

// Celda numérica compacta, propia de esta tabla — mismo criterio que
// ControlVolumenA.jsx (el estilo/ancho está pensado para encajar entre las
// ~16 columnas de esta grilla, no para reusarse en otro formulario).
function CeldaNumero({ valor, onChange, decimales = 0 }) {
  return (
    <td className="px-3 py-2">
      <input
        type="number"
        inputMode="decimal"
        step={decimales > 0 ? 0.1 : 1}
        min="0"
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="—"
        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
      />
    </td>
  )
}
