import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Plus, Trash2 } from 'lucide-react'
import { productsService } from '../../../services/productsService'
import { rawMaterialReceptionsService } from '../../../services/rawMaterialReceptionsService'
import { productionAreaAService } from '../../../services/productionAreaAService'
import { shiftsService } from '../../../services/shiftsService'
import { listarTodo } from '../../../services/paginacion'
import Button from '../../Button.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import Skeleton from '../../Skeleton.jsx'
import EmptyState from '../../EmptyState.jsx'

function CampoLote({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className="text-sm font-medium text-marron-cafe">{valor ?? '—'}</dd>
    </div>
  )
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Día de semana abreviado a partir de la fecha — solo para precargar el
// desplegable al agregar la fila; queda editable a mano después (pedido
// explícito, "el día también es un input").
const diaSemanaAbreviado = (fechaStr) => {
  if (!fechaStr) return ''
  const indiceDomingo0 = new Date(`${fechaStr}T00:00:00`).getDay()
  return DIAS_SEMANA[(indiceDomingo0 + 6) % 7]
}

let contadorFila = 0
const filaVacia = (tipo) => {
  const fecha = new Date().toLocaleDateString('en-CA')
  return {
    id: `fila-${++contadorFila}`,
    tipo, // 'entrada' | 'salida' — decide cuál de las dos columnas de cantidad se edita
    fecha,
    dia: diaSemanaAbreviado(fecha),
    turnoId: '',
    cantidadBolsas: '',
    saldo: '',
    entregadoPor: '',
    recibidoPor: '',
  }
}

// Formulario "Control de Existencias" — subpestaña de Área B (ver
// SeccionAreaB.jsx / SeccionControlExistencias.jsx). MOCKUP frontend-only a
// pedido explícito: las filas de entrada/salida viven solo en memoria
// (useState), no se guardan contra ningún backend todavía — el modelo de
// datos real (tabla/endpoints) se define después, cuando se decida bien.
// La cabecera sí es real: producto/lote/sacos vienen de
// rawMaterialReceptionsService, mismo endpoint que ya usa ControlVolumenA.jsx
// para el resumen del lote en Volumen A.
export default function FormularioExistencias({ lote, onVolver }) {
  const [productos, setProductos] = useState(null)
  const [datosLote, setDatosLote] = useState(null)
  const [turnos, setTurnos] = useState(null)
  const [entradasVolumenA, setEntradasVolumenA] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [filas, setFilas] = useState([])

  useEffect(() => {
    let cancelado = false
    Promise.all([
      listarTodo(productsService.listar),
      rawMaterialReceptionsService.obtener(lote.id),
      shiftsService.listar(),
      productionAreaAService.listarPorLote(lote.id),
    ])
      .then(([productosResp, datosLoteResp, turnosResp, entradasResp]) => {
        if (cancelado) return
        setProductos(productosResp)
        setDatosLote(datosLoteResp)
        setTurnos(turnosResp)
        setEntradasVolumenA(entradasResp)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [lote.id])

  const productoNombre = productos?.find((p) => p.id === lote.productId)?.name ?? '—'

  // Turnos que ya se usaron en Volumen A para este lote — no el catálogo
  // completo de turnos (pedido explícito: "autocompletados según las
  // entradas del formulario de Volumen A").
  const turnosDelLote = useMemo(() => {
    if (!turnos || !entradasVolumenA) return []
    const idsUsados = [...new Set(entradasVolumenA.map((e) => e.shiftId))]
    return turnos.filter((t) => idsUsados.includes(t.id))
  }, [turnos, entradasVolumenA])

  const actualizarFila = (id, campo) => (valor) =>
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))

  const agregarFila = (tipo) => setFilas((prev) => [...prev, filaVacia(tipo)])
  const quitarFila = (id) => setFilas((prev) => prev.filter((f) => f.id !== id))

  const cargando = !productos || !datosLote || !turnos || !entradasVolumenA

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onVolver}
        className="flex w-fit items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
        Volver
      </button>

      <CabeceraFormulario antetitulo="Registro" titulo="Control de Existencias" />

      <SeccionFormulario
        titulo="Cabecera y movimientos"
        acciones={
          <div className="flex flex-wrap gap-2">
            <Button className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => agregarFila('entrada')}>
              <Plus className="size-3.5" strokeWidth={2} />
              Registrar entrada
            </Button>
            <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => agregarFila('salida')}>
              <Plus className="size-3.5" strokeWidth={2} />
              Añadir salida
            </Button>
          </div>
        }
      >
        {cargando ? (
          <Skeleton className="h-16" />
        ) : (
          <dl className="grid gap-4 rounded-2xl bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <CampoLote etiqueta="Lote" valor={lote.code} />
            <CampoLote etiqueta="Producto" valor={productoNombre} />
            <CampoLote
              etiqueta="Promedio de sacos (kg)"
              valor={
                datosLote.warehouseReceipt?.averageAcceptedNetWeightKg != null
                  ? `${datosLote.warehouseReceipt.averageAcceptedNetWeightKg} kg`
                  : null
              }
            />
            <CampoLote etiqueta="Total de sacos" valor={datosLote.warehouseReceipt?.storedPackageCount} />
          </dl>
        )}

        {filas.length === 0 ? (
          <EmptyState Icon={Plus} titulo="Todavía no hay movimientos cargados" />
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Día</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5 text-verde-bosque">Ingreso bolsas</th>
                  <th className="px-3 py-2.5 text-rojo-pasankalla">Salida bolsas</th>
                  <th className="px-3 py-2.5">Saldo</th>
                  <th className="px-3 py-2.5">Entregado por</th>
                  <th className="px-3 py-2.5">Recibido por</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr
                    key={f.id}
                    className={`border-b border-marron-tierra/15 last:border-b-0 border-l-4 ${
                      f.tipo === 'entrada' ? 'border-l-verde-bosque bg-verde-hoja/10' : 'border-l-rojo-pasankalla bg-rojo-pasankalla/8'
                    }`}
                  >
                    <td className="px-3 py-2">
                      <FormInput
                        type="date"
                        value={f.fecha}
                        onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)}
                        className="w-36"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <FormSelect value={f.dia} onChange={(e) => actualizarFila(f.id, 'dia')(e.target.value)} className="w-20">
                        <option value="">—</option>
                        {DIAS_SEMANA.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </FormSelect>
                    </td>
                    <td className="px-3 py-2">
                      <FormSelect
                        value={f.turnoId}
                        onChange={(e) => actualizarFila(f.id, 'turnoId')(e.target.value)}
                        className="w-40"
                      >
                        <option value="">Seleccionar…</option>
                        {turnosDelLote.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </FormSelect>
                    </td>
                    <td className="px-3 py-2">
                      {f.tipo === 'entrada' ? (
                        <FormInput
                          type="number"
                          min="0"
                          value={f.cantidadBolsas}
                          onChange={(e) => actualizarFila(f.id, 'cantidadBolsas')(e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        <span className="text-marron-cafe/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {f.tipo === 'salida' ? (
                        <FormInput
                          type="number"
                          min="0"
                          value={f.cantidadBolsas}
                          onChange={(e) => actualizarFila(f.id, 'cantidadBolsas')(e.target.value)}
                          className="w-24"
                        />
                      ) : (
                        <span className="text-marron-cafe/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <FormInput
                        type="number"
                        value={f.saldo}
                        onChange={(e) => actualizarFila(f.id, 'saldo')(e.target.value)}
                        className="w-24"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <FormInput
                        value={f.entregadoPor}
                        onChange={(e) => actualizarFila(f.id, 'entregadoPor')(e.target.value)}
                        className="w-36"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <FormInput
                        value={f.recibidoPor}
                        onChange={(e) => actualizarFila(f.id, 'recibidoPor')(e.target.value)}
                        className="w-36"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => quitarFila(f.id)}
                        className="text-marron-cafe/40 transition-colors duration-150 hover:text-rojo-pasankalla"
                        aria-label="Quitar fila"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SeccionFormulario>
    </div>
  )
}
