import { useEffect, useState } from 'react'
import { Boxes } from 'lucide-react'
import { productionAreaBService } from '../../../services/productionAreaBService'
import { qualityAreaBInspectionsService } from '../../../services/qualityAreaBInspectionsService'
import { useSolicitud } from '../../../hooks/useSolicitud'
import Modal from '../../Modal.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Button from '../../Button.jsx'

// Registra una entrada real de production_area_b_entries (POST
// /production-area-b/entries, ver comrural_erp_backend/docs/
// production-area-b.md §5) — reemplaza el "Añadir salida" que antes solo
// guardaba en memoria. inputType default 'NUEVA' porque es el único que
// aparece en el kardex de quinua lavada (§4 del mismo doc); los otros tres
// (RECUPERADA/SALDO_FINAL/REPROCESO) se pueden elegir igual, quedan
// registrados, pero no suman/restan en esa tabla.
const INPUT_TYPES = [
  { value: 'NUEVA', label: 'Nueva (quinua recién lavada por Área A)' },
  { value: 'RECUPERADA', label: 'Recuperada' },
  { value: 'SALDO_FINAL', label: 'Saldo final (retiro del subalmacén)' },
  { value: 'REPROCESO', label: 'Reproceso (retorno de un rechazo de Calidad)' },
]

const CAMPOS_KG = [
  ['usedKg', 'Kg consumidos'],
  ['finalKg', 'Kg de quinua final'],
  ['secondKg', 'Segunda (kg)'],
  ['thirdKg', 'Tercera (kg)'],
  ['blackPointsKg', 'Puntos negros (kg)'],
  ['rejectionKg', 'Rechazo (kg)'],
  ['powderKg', 'Polvo (kg)'],
  ['recoverableKg', 'Recuperable (kg)'],
  ['saldoQfTransferidoKg', 'Saldo QF transferido a subalmacén (kg)'],
]

const FORM_VACIO = {
  shiftId: '',
  entryDate: new Date().toLocaleDateString('en-CA'),
  inputType: 'NUEVA',
  reprocessOfId: '',
  qualityInspectionId: '',
  usedBags: '',
  usedKg: '',
  finalBags: '',
  finalKg: '',
  secondKg: '',
  thirdKg: '',
  blackPointsKg: '',
  rejectionKg: '',
  powderKg: '',
  recoverableKg: '',
  saldoQfTransferidoKg: '',
}

export default function ModalRegistrarSalidaAreaB({
  abierto,
  onCerrar,
  lotId,
  turnos,
  saldoDisponibleKg,
  onCreada,
}) {
  const [form, setForm] = useState(FORM_VACIO)
  const [entradasReproceso, setEntradasReproceso] = useState(null)
  const [rechazosPendientes, setRechazosPendientes] = useState(null)
  const { enviando, error, ejecutar, limpiarError } = useSolicitud()

  useEffect(() => {
    if (!abierto) return
    setForm(FORM_VACIO)
    setEntradasReproceso(null)
    setRechazosPendientes(null)
    limpiarError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  useEffect(() => {
    if (form.inputType !== 'REPROCESO' || entradasReproceso !== null) return
    productionAreaBService.listarPorLote(lotId).then(setEntradasReproceso)
  }, [form.inputType, entradasReproceso, lotId])

  // Opcional — el selector de abajo deja "Sin rechazo puntual" como opción
  // válida (Producción puede no tener a mano a qué control corresponde).
  useEffect(() => {
    if (form.inputType !== 'REPROCESO' || rechazosPendientes !== null) return
    qualityAreaBInspectionsService.pendientesDeReproceso(lotId).then(setRechazosPendientes)
  }, [form.inputType, rechazosPendientes, lotId])

  const actualizar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const CAMPOS_OBLIGATORIOS = [
    'shiftId',
    'entryDate',
    'usedBags',
    'usedKg',
    'finalBags',
    'finalKg',
    'secondKg',
    'thirdKg',
    'blackPointsKg',
    'rejectionKg',
    'powderKg',
    'recoverableKg',
    'saldoQfTransferidoKg',
  ]
  const faltaReprocessOfId = form.inputType === 'REPROCESO' && !form.reprocessOfId
  const puedeEnviar = CAMPOS_OBLIGATORIOS.every((c) => form[c] !== '') && !faltaReprocessOfId

  const cerrar = () => {
    limpiarError()
    onCerrar()
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar) return
    try {
      const dto = {
        lotId,
        shiftId: form.shiftId,
        entryDate: form.entryDate,
        inputType: form.inputType,
        ...(form.inputType === 'REPROCESO'
          ? {
              reprocessOfId: form.reprocessOfId,
              ...(form.qualityInspectionId ? { qualityInspectionId: form.qualityInspectionId } : {}),
            }
          : {}),
        usedBags: Number(form.usedBags),
        usedKg: Number(form.usedKg),
        finalBags: Number(form.finalBags),
        finalKg: Number(form.finalKg),
        secondKg: Number(form.secondKg),
        thirdKg: Number(form.thirdKg),
        blackPointsKg: Number(form.blackPointsKg),
        rejectionKg: Number(form.rejectionKg),
        powderKg: Number(form.powderKg),
        recoverableKg: Number(form.recoverableKg),
        saldoQfTransferidoKg: Number(form.saldoQfTransferidoKg),
      }
      const creada = await ejecutar(() => productionAreaBService.crear(dto))
      onCreada(creada)
      cerrar()
    } catch {
      // el mensaje legible ya quedó en `error`
    }
  }

  return (
    <Modal abierto={abierto} titulo="Registrar salida — Área B" onCerrar={cerrar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        <div className="flex items-center gap-3 rounded-2xl bg-verde-hoja/5 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
            <Boxes className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-marron-cafe">Consumo de Área B</h3>
            <p className="text-xs text-marron-cafe/60">
              {saldoDisponibleKg != null
                ? `Quinua lavada disponible: ${saldoDisponibleKg} kg`
                : 'Cargando saldo disponible…'}
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormSelect label="Origen" value={form.inputType} onChange={actualizar('inputType')}>
            {INPUT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </FormSelect>
          <FormSelect label="Turno" value={form.shiftId} onChange={actualizar('shiftId')}>
            <option value="">Seleccionar…</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </FormSelect>
          <FormInput label="Fecha" type="date" value={form.entryDate} onChange={actualizar('entryDate')} />
          {form.inputType === 'REPROCESO' && (
            <FormSelect label="Entrada de origen del rechazo" value={form.reprocessOfId} onChange={actualizar('reprocessOfId')}>
              <option value="">Seleccionar…</option>
              {(entradasReproceso ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.entryDate} — {e.inputType} — {e.usedKg} kg
                </option>
              ))}
            </FormSelect>
          )}
          {form.inputType === 'REPROCESO' && (
            <FormSelect
              label="Control de Calidad que resuelve"
              hint="Opcional — para que el rechazo deje de contar como pendiente."
              value={form.qualityInspectionId}
              onChange={actualizar('qualityInspectionId')}
            >
              <option value="">Sin rechazo puntual / no lo tengo a mano</option>
              {(rechazosPendientes ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.inspectedAt).toLocaleDateString('es-BO')} — {r.disposition} — {r.rejectedPackageCount} paquetes rechazados
                </option>
              ))}
            </FormSelect>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Sacos consumidos" type="number" min="0" value={form.usedBags} onChange={actualizar('usedBags')} />
          <FormInput label="Sacos de quinua final" type="number" min="0" value={form.finalBags} onChange={actualizar('finalBags')} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPOS_KG.map(([campo, etiqueta]) => (
            <FormInput
              key={campo}
              label={etiqueta}
              type="number"
              min="0"
              step="0.001"
              value={form[campo]}
              onChange={actualizar(campo)}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-marron-tierra/10 pt-4">
          <Button type="submit" disabled={enviando || !puedeEnviar} className="px-5 py-2.5">
            {enviando ? 'Guardando…' : 'Registrar salida'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
