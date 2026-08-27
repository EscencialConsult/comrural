import { useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { PRESENTACIONES_COMERCIALES } from '../../../config/presentacionesComerciales'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import Skeleton from '../../Skeleton.jsx'

const PRODUCTOS = ['Quinua Blanca', 'Quinua Negra', 'Quinua Roja', 'Quinua Tricolor']

let siguienteFilaId = 1
function filaVacia() {
  return {
    id: siguienteFilaId++,
    producto: '',
    loteMpId: '',
    presentacionId: '',
    ingresoCantidad: null,
    salidaCantidad: null,
    destino: '',
  }
}

// Formulario 8 — el último del relevamiento, el almacén de PT que
// administra Producción hasta el despacho (RP-20). "Llena: Supervisores
// (base de datos)" — igual que el kardex, es una pantalla pensada para
// vivir en el sistema, no un papel que se digitaliza después.
//
// Regla exacta (RP-22): asignar un lote de despacho a una fila da de baja
// esa existencia (se registra como Salida con Destino = ese lote); un
// saldo que no llega a completar una presentación entera queda "Sin
// destino" — se marca con un badge, no se oculta ni se fuerza a cero.
export default function ControlProductoAlmacen() {
  const [lotesMp, setLotesMp] = useState(null)
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

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((fs) => [...fs, filaVacia()])
  const quitarFila = (id) => setFilas((fs) => fs.filter((f) => f.id !== id))

  const filasConCalculo = filas.map((f) => {
    const presentacion = PRESENTACIONES_COMERCIALES.find((p) => p.id === f.presentacionId)
    const pesoNetoKg = presentacion?.pesoNetoKg ?? 0
    const ingresoKg = (f.ingresoCantidad ?? 0) * pesoNetoKg
    const salidaKg = (f.salidaCantidad ?? 0) * pesoNetoKg
    const saldoCantidad = (f.ingresoCantidad ?? 0) - (f.salidaCantidad ?? 0)
    const saldoKg = saldoCantidad * pesoNetoKg
    let estado = null
    if (f.ingresoCantidad != null) {
      if (saldoCantidad <= 0) estado = { tono: 'neutro', label: 'Agotado' }
      else if (f.destino.trim() !== '') estado = { tono: 'liberado', label: 'Asignado a despacho' }
      else estado = { tono: 'ambar', label: 'Sin destino' }
    }
    return { ...f, presentacion, ingresoKg, salidaKg, saldoCantidad, saldoKg, estado }
  })

  const totales = filasConCalculo.reduce(
    (acc, f) => ({
      ingresoKg: acc.ingresoKg + f.ingresoKg,
      salidaKg: acc.salidaKg + f.salidaKg,
      saldoKg: acc.saldoKg + f.saldoKg,
    }),
    { ingresoKg: 0, salidaKg: 0, saldoKg: 0 },
  )

  const registrar = async () => {
    try {
      await ejecutar(() => produccionService.registrarProductoAlmacen({ filas: filasConCalculo }))
      toast.success('Existencias de almacén guardadas.')
    } catch {
      toast.error('No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Control de Producto en Almacén"
          codigo="P-PRO-01/R-21"
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
          titulo="Existencias por producto, lote MP y presentación"
          nota="Asignar un lote de despacho da de baja la existencia. Los saldos que no completan una presentación quedan sin destino."
          acciones={
            <Button variant="secondary" onClick={agregarFila} className="px-3 py-1.5 text-xs">
              <Plus className="mr-1 size-3.5" strokeWidth={2} />
              Agregar existencia
            </Button>
          }
        >
          {!lotesMp ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-white/70">
              <table className="w-full min-w-[1180px] border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                    <th className="px-3 py-2.5">Producto</th>
                    <th className="px-3 py-2.5">Lote MP</th>
                    <th className="px-3 py-2.5">Presentación / Peso neto</th>
                    <th className="px-3 py-2.5">Ingreso (Cant.)</th>
                    <th className="px-3 py-2.5">Ingreso (Kg)</th>
                    <th className="px-3 py-2.5">Salida (Cant.)</th>
                    <th className="px-3 py-2.5">Salida (Kg)</th>
                    <th className="px-3 py-2.5">Saldo (Cant. / Kg)</th>
                    <th className="px-3 py-2.5">Destino (lote de despacho)</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filasConCalculo.map((f) => (
                    <tr key={f.id} className="border-b border-marron-tierra/15 last:border-b-0">
                      <td className="px-3 py-2">
                        <select
                          value={f.producto}
                          onChange={(e) => actualizarFila(f.id, 'producto')(e.target.value)}
                          className="w-32 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        >
                          <option value="">Seleccionar…</option>
                          {PRODUCTOS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.loteMpId}
                          onChange={(e) => actualizarFila(f.id, 'loteMpId')(e.target.value)}
                          className="w-32 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        >
                          <option value="">Seleccionar…</option>
                          {lotesMp.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={f.presentacionId}
                          onChange={(e) => actualizarFila(f.id, 'presentacionId')(e.target.value)}
                          className="w-44 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        >
                          <option value="">Seleccionar…</option>
                          {PRESENTACIONES_COMERCIALES.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <CeldaNumero valor={f.ingresoCantidad} onChange={actualizarFila(f.id, 'ingresoCantidad')} />
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-marron-cafe/60">
                        {f.ingresoKg > 0 ? f.ingresoKg.toLocaleString('es-BO') : '—'}
                      </td>
                      <CeldaNumero valor={f.salidaCantidad} onChange={actualizarFila(f.id, 'salidaCantidad')} />
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-marron-cafe/60">
                        {f.salidaKg > 0 ? f.salidaKg.toLocaleString('es-BO') : '—'}
                      </td>
                      <td className="px-3 py-2 text-center text-xs font-semibold text-marron-cafe/70">
                        {f.saldoCantidad} / {f.saldoKg.toLocaleString('es-BO')} kg
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={f.destino}
                          onChange={(e) => actualizarFila(f.id, 'destino')(e.target.value)}
                          placeholder="Ej. COM-QB-3560726"
                          className="w-40 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        />
                      </td>
                      <td className="px-3 py-2">{f.estado && <Badge tono={f.estado.tono}>{f.estado.label}</Badge>}</td>
                      <td className="px-3 py-2 print:hidden">
                        <button
                          type="button"
                          onClick={() => quitarFila(f.id)}
                          aria-label="Quitar existencia"
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
                    <td className="px-3 py-2.5" colSpan={4}>
                      Totales
                    </td>
                    <td className="px-3 py-2.5">{totales.ingresoKg.toLocaleString('es-BO')} kg</td>
                    <td className="px-3 py-2.5" />
                    <td className="px-3 py-2.5">{totales.salidaKg.toLocaleString('es-BO')} kg</td>
                    <td className="px-3 py-2.5">{totales.saldoKg.toLocaleString('es-BO')} kg</td>
                    <td className="px-3 py-2.5" colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SeccionFormulario>
      </div>

      <div className="flex justify-end print:hidden">
        <Button onClick={registrar} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar existencias'}
        </Button>
      </div>
    </div>
  )
}

// Celda numérica compacta, propia de esta tabla — mismo criterio que el
// resto de los formularios de Producción.
function CeldaNumero({ valor, onChange }) {
  return (
    <td className="px-3 py-2">
      <input
        type="number"
        min="0"
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="—"
        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
      />
    </td>
  )
}
