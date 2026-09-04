import { useEffect, useMemo, useState } from 'react'
import { PackageCheck, Package, Layers, Scale, ChevronDown, CircleCheck, CircleX } from 'lucide-react'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { useSolicitud } from '../../hooks/useSolicitud'
import { CATEGORIA_LABEL, CATEGORIA_ICON, CATEGORIA_ESTILO, ORDEN_CATEGORIAS } from '../../config/analisisCategorias'
import Modal from '../Modal.jsx'
import FormInput from '../FormInput.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'

// POST /analysis-requests/:requestId/receive-sample — el paso que faltaba:
// el laboratorio confirma que la muestra llegó físicamente, y en el mismo
// paso decide si cumple el criterio de aceptación o no. Es lo único que
// mueve la muestra a RECIBIDA (o RECHAZADA) — crear la solicitud NO lo hace
// (ver ModalSolicitarAnalisis.jsx / SamplesService.assignDeliveryResponsible,
// que solo asigna el responsable de entrega).
//
// Qué ensayos van a laboratorio interno o externo (y con qué peso de
// submuestra) YA NO se decide acá — se movió a un paso posterior y más
// completo, "Subdividir muestra" sobre la solicitud ya RECIBIDA (ver
// SeccionPendientes.jsx / FormularioSubdividirMuestra.jsx), que reemplaza
// el mock simple interno/externo que existió acá.
const hoy = () => new Date().toLocaleDateString('en-CA')

export default function ModalRecibirMuestra({ abierto, muestraCodigo, solicitudId, onCerrar, onRecibida }) {
  const [cumple, setCumple] = useState(true)
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const { enviando, error, ejecutar, limpiarError } = useSolicitud()

  // Detalle de la solicitud (cantidad declarada, producto/lote, ensayos
  // pedidos) — pedido explícito del usuario tras revisar este modal: antes
  // solo mostraba el código de la muestra, sin nada contra qué comparar la
  // muestra física a la hora de decidir "cumple"/"no cumple". `obtener()`
  // ya trae `sample.quantity/unit` e `items[]` en una sola llamada (mismo
  // endpoint que usa ModalDetalleMuestra.jsx), no hace falta pedir nada
  // nuevo al backend.
  const [detalle, setDetalle] = useState(null)
  // Qué categoría está desplegada en el acordeón de "Ensayos solicitados"
  // — a pedido explícito: antes eran todos los ensayos sueltos en chips,
  // ahora se agrupan por categoría (mismo criterio visual que
  // FormularioAsignarLaboratorio.jsx/TarjetaCategoria.jsx) y arrancan
  // colapsados, un clic en la categoría despliega solo esos.
  const [categoriaAbierta, setCategoriaAbierta] = useState(null)

  useEffect(() => {
    if (!abierto || !solicitudId) {
      setDetalle(null)
      return
    }
    setCategoriaAbierta(null)
    let cancelado = false
    analysisRequestsService
      .obtener(solicitudId)
      .then((d) => !cancelado && setDetalle(d))
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [abierto, solicitudId])

  const porCategoria = useMemo(() => {
    if (!detalle) return []
    const mapa = new Map()
    for (const item of detalle.items) {
      if (!mapa.has(item.category)) mapa.set(item.category, [])
      mapa.get(item.category).push(item)
    }
    return ORDEN_CATEGORIAS.filter((c) => mapa.has(c)).map((c) => [c, mapa.get(c)])
  }, [detalle])

  const cerrar = () => {
    setCumple(true)
    setFechaEntrega('')
    setObservaciones('')
    setMotivoRechazo('')
    limpiarError()
    onCerrar()
  }

  const puedeEnviar = cumple ? fechaEntrega !== '' : motivoRechazo.trim() !== ''

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar) return
    const dto = cumple
      ? {
          acceptanceCriteriaMet: true,
          expectedResultDate: fechaEntrega,
          ...(observaciones.trim() ? { receptionNotes: observaciones.trim() } : {}),
        }
      : { acceptanceCriteriaMet: false, rejectionReason: motivoRechazo.trim() }
    try {
      const detalleRecibido = await ejecutar(() => analysisRequestsService.recibirMuestra(solicitudId, dto))
      onRecibida(detalleRecibido)
      cerrar()
    } catch {
      // el mensaje legible ya quedó en `error`
    }
  }

  return (
    <Modal abierto={abierto} titulo="Recibir muestra" onCerrar={cerrar} maxWidth="max-w-2xl">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-2xl bg-verde-hoja/5 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
            <PackageCheck className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-marron-cafe">{muestraCodigo}</h3>
            <p className="text-xs text-marron-cafe/60">Confirmá que la muestra llegó al laboratorio.</p>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}

        {!detalle ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">
                Detalle de la solicitud
              </p>
              <div className="grid gap-3 rounded-2xl border border-marron-tierra/10 p-4 sm:grid-cols-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/60">
                    <Package className="size-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Producto</p>
                    <p className="truncate text-sm font-medium text-marron-cafe">{detalle.product.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/60">
                    <Layers className="size-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Lote</p>
                    <p className="truncate font-mono text-sm font-medium text-marron-cafe">{detalle.lot.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marron-tierra/10 text-marron-cafe/60">
                    <Scale className="size-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Cantidad declarada</p>
                    <p className="truncate text-sm font-medium text-marron-cafe">
                      {detalle.sample.quantity} {detalle.sample.unit === 'OTRA' ? detalle.sample.otherUnit : detalle.sample.unit}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">
                Ensayos solicitados ({detalle.items.length})
              </p>
              <div className="flex flex-col gap-2">
                {porCategoria.map(([categoria, items]) => {
                  const abierta = categoriaAbierta === categoria
                  const Icono = CATEGORIA_ICON[categoria]
                  const estilo = CATEGORIA_ESTILO[categoria]
                  return (
                    <div key={categoria} className={`overflow-hidden rounded-2xl border-l-4 bg-white/60 ${estilo.borde}`}>
                      <button
                        type="button"
                        onClick={() => setCategoriaAbierta(abierta ? null : categoria)}
                        aria-expanded={abierta}
                        className="flex w-full items-center gap-3 p-3 text-left"
                      >
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${estilo.icono}`}>
                          <Icono className="size-4" strokeWidth={1.75} />
                        </div>
                        <span className="flex-1 text-sm font-bold text-marron-cafe">{CATEGORIA_LABEL[categoria]}</span>
                        <span className={`text-xs font-bold ${estilo.contador}`}>{items.length}</span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-marron-cafe/40 transition-transform duration-150 ${abierta ? 'rotate-180' : ''}`}
                          strokeWidth={2}
                        />
                      </button>
                      {abierta && (
                        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                          {items.map((item) => (
                            <span key={item.id} className="rounded-full bg-marron-tierra/5 px-3 py-1 text-xs text-marron-cafe">
                              {item.isCustom ? item.otherTestName : item.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-marron-cafe">¿Cumple el criterio de aceptación?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCumple(true)}
              aria-pressed={cumple}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                cumple ? 'bg-verde-lima text-marron-cafe' : 'bg-marron-tierra/10 text-marron-cafe/60 hover:bg-marron-tierra/15'
              }`}
            >
              <CircleCheck className="size-4" strokeWidth={1.75} />
              Cumple
            </button>
            <button
              type="button"
              onClick={() => setCumple(false)}
              aria-pressed={!cumple}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                !cumple ? 'bg-rojo-pasankalla text-white' : 'bg-marron-tierra/10 text-marron-cafe/60 hover:bg-marron-tierra/15'
              }`}
            >
              <CircleX className="size-4" strokeWidth={1.75} />
              No cumple
            </button>
          </div>
        </div>

        {cumple ? (
          <div className="grid gap-3 rounded-2xl border border-marron-tierra/10 p-4 sm:grid-cols-2">
            <FormInput
              label="Fecha de entrega de resultados"
              type="date"
              min={hoy()}
              value={fechaEntrega}
              onChange={(e) => setFechaEntrega(e.target.value)}
            />
            <FormInput
              label="Observaciones"
              placeholder="Opcional"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-marron-tierra/10 p-4">
            <FormInput
              label="Motivo de rechazo"
              placeholder="Por qué no se acepta la muestra"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-end border-t border-marron-tierra/10 pt-4">
          <Button type="submit" disabled={enviando || !puedeEnviar} className="w-full px-5 py-2.5 sm:w-auto">
            {enviando ? 'Confirmando…' : 'Confirmar recepción'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
