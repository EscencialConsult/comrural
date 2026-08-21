import { useState } from 'react'
import { samplesService } from '../../services/samplesService'
import { useSolicitud } from '../../hooks/useSolicitud'
import Modal from '../Modal.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'

// Solo crea la MUESTRA (POST /raw-material-lots/:lotId/samples) — no la
// solicitud de análisis. Son dos pasos separados a propósito (charlado con
// el usuario): un lote puede tener varias muestras, y cada muestra puede
// tener su propia solicitud más adelante (ModalSolicitarAnalisis.jsx),
// nunca en el mismo paso. `productNature`/`intendedUse` NO van acá aunque
// se vean parecidos a datos "de la muestra" en el papel — esos campos
// viven en analysis_requests, no en samples, así que están en el otro
// modal.
const UNIDADES = ['G', 'KG', 'ML', 'L', 'PIEZA', 'OTRA']

export default function ModalCrearMuestra({ abierto, onCerrar, lotes, productoNombre, proveedorNombre, onCreada }) {
  const [lotId, setLotId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState('KG')
  const [otraUnidad, setOtraUnidad] = useState('')
  const { enviando, error, ejecutar, limpiarError } = useSolicitud()

  const cerrar = () => {
    setLotId('')
    setCantidad('')
    setUnidad('KG')
    setOtraUnidad('')
    limpiarError()
    onCerrar()
  }

  const puedeEnviar = lotId !== '' && cantidad !== '' && Number(cantidad) > 0 && (unidad !== 'OTRA' || otraUnidad.trim() !== '')

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar) return
    try {
      const muestra = await ejecutar(() =>
        samplesService.crear(lotId, {
          quantity: Number(cantidad),
          unit: unidad,
          ...(unidad === 'OTRA' ? { otherUnit: otraUnidad.trim() } : {}),
        }),
      )
      onCreada(muestra)
      cerrar()
    } catch {
      // el mensaje legible ya quedó en `error`
    }
  }

  return (
    <Modal abierto={abierto} titulo="Crear muestra" onCerrar={cerrar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}

        <FormSelect label="Lote MP" value={lotId} onChange={(e) => setLotId(e.target.value)}>
          <option value="">Seleccioná un lote…</option>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code} — {productoNombre(l.productId)}
            </option>
          ))}
        </FormSelect>

        {lotId && (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormInput label="Descripción (producto)" disabled value={productoNombre(lotes.find((l) => l.id === lotId)?.productId)} />
            <FormInput label="Proveedor" disabled value={proveedorNombre(lotes.find((l) => l.id === lotId)?.supplierId)} />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput
            label="Cantidad de muestra"
            type="number"
            min="0.001"
            step="0.001"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <FormSelect label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
            {UNIDADES.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </FormSelect>
          {unidad === 'OTRA' && (
            <FormInput label="Especificar unidad" value={otraUnidad} onChange={(e) => setOtraUnidad(e.target.value)} />
          )}
        </div>

        <p className="text-xs text-marron-cafe/50">
          El código de la muestra y la fecha/hora de muestreo los asigna el sistema al crearla.
        </p>

        <Button type="submit" disabled={enviando || !puedeEnviar} className="self-start">
          {enviando ? 'Creando…' : 'Crear muestra'}
        </Button>
      </form>
    </Modal>
  )
}
