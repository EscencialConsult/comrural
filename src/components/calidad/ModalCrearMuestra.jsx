import { useState } from 'react'
import { Layers, Package, Handshake, Scale } from 'lucide-react'
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

function TituloSeccion({ Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-verde-bosque" strokeWidth={1.75} />
      <h3 className="text-sm font-bold text-marron-cafe">{children}</h3>
    </div>
  )
}

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

  const loteElegido = lotes.find((l) => l.id === lotId)

  return (
    <Modal abierto={abierto} titulo="Crear muestra" onCerrar={cerrar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        <div className="flex items-center gap-3 rounded-2xl bg-verde-hoja/5 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
            <Layers className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-marron-cafe">Muestra nueva</h3>
            <p className="text-xs text-marron-cafe/60">Código y fecha/hora de muestreo los asigna el sistema al crearla.</p>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Layers}>Lote de origen</TituloSeccion>
          <FormSelect label="Lote MP" value={lotId} onChange={(e) => setLotId(e.target.value)}>
            <option value="">Seleccioná un lote…</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} — {productoNombre(l.productId)}
              </option>
            ))}
          </FormSelect>

          {loteElegido && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-marron-tierra/5 p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-marron-cafe/60">
                  <Package className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Producto</p>
                  <p className="truncate text-sm font-medium text-marron-cafe">{productoNombre(loteElegido.productId)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-marron-tierra/5 p-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-marron-cafe/60">
                  <Handshake className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">Proveedor</p>
                  <p className="truncate text-sm font-medium text-marron-cafe">{proveedorNombre(loteElegido.supplierId)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Scale}>Cantidad</TituloSeccion>
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
              <FormInput
                label="Especificar unidad"
                value={otraUnidad}
                onChange={(e) => setOtraUnidad(e.target.value)}
                className="sm:col-span-2"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-marron-tierra/10 pt-4">
          <Button type="submit" disabled={enviando || !puedeEnviar} className="px-5 py-2.5">
            {enviando ? 'Creando…' : 'Crear muestra'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
