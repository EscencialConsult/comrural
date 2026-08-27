import { useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Skeleton from '../../Skeleton.jsx'

const PRODUCTOS = ['Quinua Blanca', 'Quinua Negra', 'Quinua Roja', 'Quinua Tricolor']
const TURNOS = [1, 2, 3]
const PERSONAL = ['Victor Mamani', 'Jhiner Nina', 'Brigido Herrera', 'Joel Choque', 'Claudia Rojas', 'Gabriela Tarqui']

// Regla fija del relevamiento — todos los sacos de quinua lavada pesan
// exactamente esto, no es un dato que se tipee por lote.
const PESO_SACO_KG = 45

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Encargado (Área A y B)' },
  { rol: 'Verifica', puesto: 'Supervisor de Producción' },
]

const CABECERA_VACIA = { producto: '', loteMpId: '', numeroSacos: null }

let siguienteFilaId = 1
function filaVacia() {
  return {
    id: siguienteFilaId++,
    fecha: new Date().toLocaleDateString('en-CA'),
    turno: 1,
    ingresoBolsas: null,
    salidaBolsas: null,
    entregadoPor: '',
    recibidoPor: '',
  }
}

function nombreDia(fechaIso) {
  if (!fechaIso) return '—'
  const dia = new Date(`${fechaIso}T00:00:00`).toLocaleDateString('es-BO', { weekday: 'long' })
  return dia.charAt(0).toUpperCase() + dia.slice(1)
}

// Formulario 4 — acá arranca el Área B (RP-12: "la etapa B abre con el
// registro de existencias de quinua lavada"). El saldo es corrido (arrastra
// turno a turno, no por fila aislada) porque es justamente lo que permite
// validar la regla del papel: el total ingresado tiene que terminar
// cuadrando con el total de salida (saldo final 0).
export default function ControlExistenciasB() {
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
  const actualizarFila = (id, campo) => (valor) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((fs) => [...fs, filaVacia()])
  const quitarFila = (id) => setFilas((fs) => fs.filter((f) => f.id !== id))

  let saldoCorrido = 0
  const filasConSaldo = filas.map((f) => {
    saldoCorrido += (f.ingresoBolsas ?? 0) - (f.salidaBolsas ?? 0)
    return { ...f, saldo: saldoCorrido }
  })

  const totalIngreso = filasConSaldo.reduce((acc, f) => acc + (f.ingresoBolsas ?? 0), 0)
  const totalSalida = filasConSaldo.reduce((acc, f) => acc + (f.salidaBolsas ?? 0), 0)
  const saldoFinal = totalIngreso - totalSalida
  const totalKg = cabecera.numeroSacos != null ? cabecera.numeroSacos * PESO_SACO_KG : null

  const registrar = async () => {
    try {
      await ejecutar(() => produccionService.registrarExistenciasB({ cabecera, filas: filasConSaldo }))
      toast.success('Registro de existencias guardado.')
    } catch {
      toast.error('No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Control de Existencias de Quinua Lavada"
          codigo="P-PRO-01/R-23"
          version="02"
          acciones={
            <div className="flex items-center gap-2">
              {filas.some((f) => f.ingresoBolsas != null || f.salidaBolsas != null) && (
                <Badge tono={saldoFinal === 0 ? 'liberado' : 'ambar'}>
                  {saldoFinal === 0 ? 'Saldo cuadra (0)' : `Saldo pendiente: ${saldoFinal} bolsas`}
                </Badge>
              )}
              <Button variant="secondary" onClick={generarPdf} disabled={generandoPdf} className="px-4 py-2 text-xs">
                <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
                {generandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
              </Button>
            </div>
          }
        />

        <SeccionFormulario numero={1} titulo="Cabecera" nota={`Todos los sacos de quinua lavada pesan ${PESO_SACO_KG} kg.`}>
          {!lotesMp ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormSelect label="Producto" value={cabecera.producto} onChange={(e) => actualizarCabecera('producto')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {PRODUCTOS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </FormSelect>

              <FormSelect label="Lote MP" value={cabecera.loteMpId} onChange={(e) => actualizarCabecera('loteMpId')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {lotesMp.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} · {l.product}
                  </option>
                ))}
              </FormSelect>

              <FormInput
                label="N° Sacos"
                type="number"
                min="0"
                value={cabecera.numeroSacos ?? ''}
                onChange={(e) => actualizarCabecera('numeroSacos')(e.target.value === '' ? null : Number(e.target.value))}
              />

              <div className="flex flex-col gap-1.5 text-sm text-marron-cafe">
                Total Kg / Prom. sacos
                <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-marron-tierra/20 bg-marron-tierra/5 px-3 py-2 text-sm">
                  <span className="font-semibold text-marron-cafe">{totalKg != null ? `${totalKg.toLocaleString('es-BO')} kg` : '—'}</span>
                  <span className="text-xs text-marron-cafe/50">{PESO_SACO_KG} kg/saco (fijo)</span>
                </div>
              </div>
            </div>
          )}
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo="Detalle por turno"
          acciones={
            <Button variant="secondary" onClick={agregarFila} className="px-3 py-1.5 text-xs">
              <Plus className="mr-1 size-3.5" strokeWidth={2} />
              Agregar turno
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Día</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5">Ingreso (bolsas)</th>
                  <th className="px-3 py-2.5">Salida (bolsas)</th>
                  <th className="px-3 py-2.5">Saldo (bolsas)</th>
                  <th className="px-3 py-2.5">Entregado por</th>
                  <th className="px-3 py-2.5">Recibido por</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filasConSaldo.map((f) => (
                  <tr key={f.id} className="border-b border-marron-tierra/15 last:border-b-0">
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={f.fecha}
                        onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)}
                        className="w-36 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2 text-xs text-marron-cafe/70">{nombreDia(f.fecha)}</td>
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
                        value={f.ingresoBolsas ?? ''}
                        onChange={(e) => actualizarFila(f.id, 'ingresoBolsas')(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="—"
                        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={f.salidaBolsas ?? ''}
                        onChange={(e) => actualizarFila(f.id, 'salidaBolsas')(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="—"
                        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-marron-cafe/70">{f.saldo}</td>
                    <td className="px-3 py-2">
                      <select
                        value={f.entregadoPor}
                        onChange={(e) => actualizarFila(f.id, 'entregadoPor')(e.target.value)}
                        className="w-36 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      >
                        <option value="">Seleccionar…</option>
                        {PERSONAL.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={f.recibidoPor}
                        onChange={(e) => actualizarFila(f.id, 'recibidoPor')(e.target.value)}
                        className="w-36 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      >
                        <option value="">Seleccionar…</option>
                        {PERSONAL.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
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
                  <td className="px-3 py-2.5" colSpan={3}>
                    Totales
                  </td>
                  <td className="px-3 py-2.5">{totalIngreso}</td>
                  <td className="px-3 py-2.5">{totalSalida}</td>
                  <td className="px-3 py-2.5">{saldoFinal}</td>
                  <td className="px-3 py-2.5" colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
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
