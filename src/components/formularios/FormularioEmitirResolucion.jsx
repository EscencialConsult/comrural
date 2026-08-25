import { useState } from 'react'
import { useSolicitud } from '../../hooks/useSolicitud'
import { qualityResolutionsService } from '../../services/qualityResolutionsService'
import FormInput from '../FormInput.jsx'
import Button from '../Button.jsx'

// Paso 1 de la Resolución de Calidad: decidir APROBADA/RECHAZADA +
// justificación (obligatoria en un rechazo) para una inspección ya
// FINALIZADA. Extraído de PanelRecepcionLote.jsx para reusarlo también en
// PanelAprobacionResolucion.jsx — antes ese paso solo existía en Compras vía
// esa pantalla, obligando a Calidad a pasar por ahí para emitir su propia
// resolución.
export default function FormularioEmitirResolucion({ inspectionId, onEmitida }) {
  const [decision, setDecision] = useState('APROBADA')
  const [decisionNotes, setDecisionNotes] = useState('')
  const [notesTocado, setNotesTocado] = useState(false)
  const { enviando, error, ejecutar } = useSolicitud()

  const notasValidas = decision === 'APROBADA' || decisionNotes.trim() !== ''

  const submit = async (e) => {
    e.preventDefault()
    setNotesTocado(true)
    if (!notasValidas) return
    try {
      await ejecutar(() => qualityResolutionsService.emitir(inspectionId, { decision, decisionNotes: decisionNotes || undefined }))
      onEmitida()
    } catch {
      // mensaje ya en `error`
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-2xl bg-white/60 p-4">
      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}
      <div className="flex gap-2">
        {['APROBADA', 'RECHAZADA'].map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => setDecision(valor)}
            aria-pressed={decision === valor}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
              decision === valor ? 'bg-verde-lima text-marron-cafe' : 'bg-marron-tierra/10 text-marron-cafe/60 hover:bg-marron-tierra/15'
            }`}
          >
            {valor}
          </button>
        ))}
      </div>
      <div>
        <FormInput
          label={`Justificación${decision === 'RECHAZADA' ? ' (obligatoria)' : ''}`}
          value={decisionNotes}
          onChange={(e) => setDecisionNotes(e.target.value)}
          onBlur={() => setNotesTocado(true)}
        />
        {notesTocado && !notasValidas && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Un rechazo necesita justificación.</p>
        )}
      </div>
      <Button type="submit" disabled={enviando} className="self-start">
        {enviando ? 'Emitiendo…' : 'Emitir resolución'}
      </Button>
    </form>
  )
}
