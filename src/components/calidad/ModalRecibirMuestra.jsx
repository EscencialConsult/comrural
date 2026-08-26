import { useState } from 'react'
import { PackageCheck } from 'lucide-react'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import { useSolicitud } from '../../hooks/useSolicitud'
import Modal from '../Modal.jsx'
import FormInput from '../FormInput.jsx'
import Button from '../Button.jsx'

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

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-marron-cafe">¿Cumple el criterio de aceptación?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCumple(true)}
              aria-pressed={cumple}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                cumple ? 'bg-verde-lima text-marron-cafe' : 'bg-marron-tierra/10 text-marron-cafe/60 hover:bg-marron-tierra/15'
              }`}
            >
              Cumple
            </button>
            <button
              type="button"
              onClick={() => setCumple(false)}
              aria-pressed={!cumple}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                !cumple ? 'bg-rojo-pasankalla text-white' : 'bg-marron-tierra/10 text-marron-cafe/60 hover:bg-marron-tierra/15'
              }`}
            >
              No cumple
            </button>
          </div>
        </div>

        {cumple ? (
          <div className="grid gap-3 sm:grid-cols-2">
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
          <FormInput
            label="Motivo de rechazo"
            placeholder="Por qué no se acepta la muestra"
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
          />
        )}

        <Button type="submit" disabled={enviando || !puedeEnviar} className="self-start">
          {enviando ? 'Confirmando…' : 'Confirmar recepción'}
        </Button>
      </form>
    </Modal>
  )
}
