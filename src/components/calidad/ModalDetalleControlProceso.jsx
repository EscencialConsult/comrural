import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { controlProcesoAService } from '../../services/controlProcesoAService'
import { useSolicitud } from '../../hooks/useSolicitud'
import { toast } from '../../lib/toast'
import Modal from '../Modal.jsx'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'

const LABEL_IMPUREZAS = {
  paja: 'Paja',
  heces_raton: 'Heces de ratón',
  heces_ave: 'Heces de ave',
  larva: 'Larva',
  semilla: 'Semilla',
  piedra_volcanica: 'Piedra volcánica',
  piedra_dura: 'Piedra dura',
  piedra_cuarzo: 'Piedra cuarzo',
  otros: 'Otros',
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</span>
      <span className="text-sm font-medium text-marron-cafe">{valor}</span>
    </div>
  )
}

// Resumen de un control de proceso ya guardado, previo a dar el visto
// bueno — evita que un clic accidental en "Dar visto bueno" (acción sin
// vuelta atrás) confirme sin que nadie haya revisado los datos cargados.
export default function ModalDetalleControlProceso({ abierto, control, puedeAprobar, onCerrar, onVoboRegistrado }) {
  const { enviando, ejecutar } = useSolicitud()
  const [confirmando, setConfirmando] = useState(false)

  if (!control) return null

  const confirmarVobo = async () => {
    setConfirmando(true)
    try {
      const actualizado = await ejecutar(() => controlProcesoAService.darVobo(control.id))
      toast.success('Visto bueno registrado.')
      onVoboRegistrado(actualizado)
      onCerrar()
    } catch (err) {
      toast.error(err.message ?? 'No se pudo registrar el visto bueno.')
    } finally {
      setConfirmando(false)
    }
  }

  const impurezasConValor = Object.entries(LABEL_IMPUREZAS).filter(([key]) => (control.impurezas?.[key] ?? 0) > 0)

  return (
    <Modal abierto={abierto} titulo="Resumen del control de proceso" onCerrar={onCerrar} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-3">
          <Dato etiqueta="Fecha operativa" valor={control.entryDate} />
          <Dato etiqueta="Pureza" valor={`${control.purezaPct.toFixed(2)}%`} />
          <Dato etiqueta="Humedad de lavado" valor={`${control.washHumidityPct.toFixed(2)}%`} />
          <Dato etiqueta="Saponina escarificado" valor={`${control.saponinaEscarificadoMm.toFixed(2)} mm`} />
          <Dato etiqueta="Saponina secado" valor={`${control.saponinaSecadoMm.toFixed(2)} mm`} />
          <Dato etiqueta="Peso de impurezas" valor={`${control.pesoImpurezaG} g`} />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-marron-tierra/10 p-4">
          <h3 className="text-sm font-bold text-marron-cafe">Impurezas encontradas</h3>
          {impurezasConValor.length === 0 ? (
            <p className="text-xs text-marron-cafe/50">Sin impurezas registradas.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {impurezasConValor.map(([key, label]) => (
                <Badge key={key} tono="alerta">
                  {label}: {control.impurezas[key]}
                </Badge>
              ))}
            </div>
          )}
          {control.impurezas?.otros_descripcion && (
            <p className="text-xs text-marron-cafe/60">Otros: {control.impurezas.otros_descripcion}</p>
          )}
        </div>

        <div className="grid gap-4 rounded-2xl border border-marron-tierra/10 p-4 sm:grid-cols-4">
          <Dato etiqueta="Malla 12" valor={`${control.tamanoGrano.m12_pct}%`} />
          <Dato etiqueta="Malla 14" valor={`${control.tamanoGrano.m14_pct}%`} />
          <Dato etiqueta="Malla 16" valor={`${control.tamanoGrano.m16_pct}%`} />
          <Dato etiqueta="Polvillo" valor={`${control.tamanoGrano.polvillo_pct}%`} />
          <Dato etiqueta="Contrastante" valor={control.clasificacionGrano.contrastante} />
          <Dato etiqueta="Otros controles" valor={control.clasificacionGrano.otros_controles} />
          {control.clasificacionGrano.descripcion && (
            <Dato etiqueta="Descripción" valor={control.clasificacionGrano.descripcion} />
          )}
        </div>

        <div className="grid gap-4 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-2">
          <Dato etiqueta="Pallets / no conformes" valor={`${control.cantidadPallets} / ${control.palletsNoConformes}`} />
          <Dato etiqueta="Sacos / no conformes" valor={`${control.cantidadSacos} / ${control.sacosNoConformes}`} />
        </div>

        {control.observaciones && (
          <div className="rounded-2xl border border-marron-tierra/10 p-4">
            <Dato etiqueta="Observaciones" valor={control.observaciones} />
          </div>
        )}

        {control.voboEn ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-verde-bosque">
            <CheckCircle2 className="size-4" strokeWidth={2} />
            Ya tiene visto bueno.
          </p>
        ) : puedeAprobar ? (
          <div className="flex items-center justify-end gap-3 border-t border-marron-tierra/10 pt-4">
            <Button variant="secondary" onClick={onCerrar} className="px-4 py-2 text-sm">
              Cancelar
            </Button>
            <Button onClick={confirmarVobo} disabled={enviando || confirmando} className="px-5 py-2.5">
              {enviando || confirmando ? 'Guardando…' : 'Confirmar visto bueno'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end border-t border-marron-tierra/10 pt-4">
            <Button variant="secondary" onClick={onCerrar} className="px-4 py-2 text-sm">
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
