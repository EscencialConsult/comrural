import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import { productsService } from '../../../services/productsService'
import { rawMaterialReceptionsService } from '../../../services/rawMaterialReceptionsService'
import { productionAreaAService } from '../../../services/productionAreaAService'
import { productionAreaBService } from '../../../services/productionAreaBService'
import { lotTraceabilityService } from '../../../services/lotTraceabilityService'
import { shiftsService } from '../../../services/shiftsService'
import { listarTodo } from '../../../services/paginacion'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import Skeleton from '../../Skeleton.jsx'
import EmptyState from '../../EmptyState.jsx'
import ModalRegistrarSalidaAreaB from './ModalRegistrarSalidaAreaB.jsx'

function CampoLote({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className="text-sm font-medium text-marron-cafe">{valor ?? '—'}</dd>
    </div>
  )
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const diaSemanaAbreviado = (fechaStr) => {
  if (!fechaStr) return ''
  const indiceDomingo0 = new Date(`${fechaStr}T00:00:00`).getDay()
  return DIAS_SEMANA[(indiceDomingo0 + 6) % 7]
}

// Formulario "Control de Existencias" — subpestaña de Área B (ver
// SeccionAreaB.jsx / SeccionControlExistencias.jsx). Real de punta a punta:
// la tabla de movimientos es el kardex de quinua lavada (GET
// /lots/:lotId/kardex-lavada, ver comrural_erp_backend/docs/
// lot-traceability.md §4) — INGRESO = entradas cerradas de Volumen A,
// SALIDA = entradas de Área B con inputType='NUEVA', saldo corrido ya
// calculado por el backend. "Añadir salida" abre
// ModalRegistrarSalidaAreaB.jsx — el formulario completo P-PRO-01/R-25
// ("Volumen B"), que llama a POST /production-area-b/entries de verdad. Es
// el único punto de entrada para registrar una salida (ver el comentario de
// cabecera de ese archivo).
//
// Sin "Entregado por"/"Recibido por" — decisión explícita del cliente (ver
// docs/production-area-b.md §1): no hace falta tabla de traspaso entre
// Área A y Área B, alcanza con el responsable que cada lado ya registra
// por su cuenta.
export default function FormularioExistencias({ lote, onVolver }) {
  const [productos, setProductos] = useState(null)
  const [datosLote, setDatosLote] = useState(null)
  const [turnos, setTurnos] = useState(null)
  const [entradasVolumenA, setEntradasVolumenA] = useState(null)
  const [kardex, setKardex] = useState(null)
  const [saldoDisponibleKg, setSaldoDisponibleKg] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [modalSalidaAbierto, setModalSalidaAbierto] = useState(false)

  const cargarMovimientos = useCallback(async () => {
    const [kardexResp, saldoResp] = await Promise.all([
      lotTraceabilityService.kardexLavada(lote.id),
      productionAreaBService.saldoLavado(lote.id),
    ])
    setKardex(kardexResp)
    setSaldoDisponibleKg(saldoResp.washedKgDisponible)
  }, [lote.id])

  useEffect(() => {
    let cancelado = false
    Promise.all([
      listarTodo(productsService.listar),
      rawMaterialReceptionsService.obtener(lote.id),
      shiftsService.listar(),
      productionAreaAService.listarPorLote(lote.id),
      cargarMovimientos(),
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
  }, [lote.id, cargarMovimientos])

  const productoNombre = productos?.find((p) => p.id === lote.productId)?.name ?? '—'

  // Turnos que ya se usaron en Volumen A para este lote — no el catálogo
  // completo de turnos (pedido explícito: "autocompletados según las
  // entradas del formulario de Volumen A").
  const turnosDelLote = useMemo(() => {
    if (!turnos || !entradasVolumenA) return []
    const idsUsados = [...new Set(entradasVolumenA.map((e) => e.shiftId))]
    return turnos.filter((t) => idsUsados.includes(t.id))
  }, [turnos, entradasVolumenA])

  const turnoNombre = (shiftId) => turnos?.find((t) => t.id === shiftId)?.name ?? '—'

  const cargando = !productos || !datosLote || !turnos || !entradasVolumenA || !kardex

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
          <Button
            variant="secondary"
            className="gap-1.5 px-3 py-1.5 text-xs"
            onClick={() => setModalSalidaAbierto(true)}
            disabled={cargando}
          >
            <Plus className="size-3.5" strokeWidth={2} />
            Añadir salida
          </Button>
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

        {!cargando && kardex.length === 0 ? (
          <EmptyState Icon={Plus} titulo="Todavía no hay movimientos cargados" />
        ) : cargando ? null : (
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Día</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5 text-verde-bosque">Ingreso bolsas</th>
                  <th className="px-3 py-2.5 text-rojo-pasankalla">Salida bolsas</th>
                  <th className="px-3 py-2.5">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {kardex.map((m) => (
                  <tr
                    key={m.entryId}
                    className={`border-b border-marron-tierra/15 last:border-b-0 border-l-4 ${
                      m.tipo === 'INGRESO' ? 'border-l-verde-bosque bg-verde-hoja/10' : 'border-l-rojo-pasankalla bg-rojo-pasankalla/8'
                    }`}
                  >
                    <td className="px-3 py-2 text-marron-cafe">{m.fecha}</td>
                    <td className="px-3 py-2 text-marron-cafe">{diaSemanaAbreviado(m.fecha)}</td>
                    <td className="px-3 py-2 text-marron-cafe">{turnoNombre(m.shiftId)}</td>
                    <td className="px-3 py-2 tabular-nums text-marron-cafe">{m.tipo === 'INGRESO' ? m.bolsas : <span className="text-marron-cafe/30">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-marron-cafe">{m.tipo === 'SALIDA' ? m.bolsas : <span className="text-marron-cafe/30">—</span>}</td>
                    <td className="px-3 py-2 tabular-nums text-marron-cafe">{m.saldoBolsas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SeccionFormulario>

      {!cargando && (
        <ModalRegistrarSalidaAreaB
          abierto={modalSalidaAbierto}
          onCerrar={() => setModalSalidaAbierto(false)}
          lote={lote}
          turnos={turnosDelLote}
          saldoDisponibleKg={saldoDisponibleKg}
          onCreada={cargarMovimientos}
        />
      )}
    </div>
  )
}
