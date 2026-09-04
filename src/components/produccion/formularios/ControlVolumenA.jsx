import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { productsService } from '../../../services/productsService'
import { shiftsService } from '../../../services/shiftsService'
import { productionAreaAService } from '../../../services/productionAreaAService'
import { listarTodo } from '../../../services/paginacion'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import ComboboxLote from '../../formularios/ComboboxLote.jsx'
import Skeleton from '../../Skeleton.jsx'
import EmptyState from '../../EmptyState.jsx'

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Encargado de grupo' },
  { rol: 'Verifica', puesto: 'Supervisor de Producción' },
]

// Sección "Subproductos/Mermas" del papel (a-e) — nombres reales según RP-09,
// mismos que la versión mock anterior. `merma_kg` = suma de las 5 (SUG-01
// del backend, ver comrural_erp_backend/docs/production-area-a.md §3).
const COLUMNAS_MERMA = [
  { key: 'trillarKg', label: 'Para trillar' },
  { key: 'menudaKg', label: 'Menuda' },
  { key: 'pajaKg', label: 'Paja húmeda' },
  { key: 'piedraKg', label: 'Piedra' },
  { key: 'saponinaKg', label: 'Saponina' },
]

const FORM_VACIO = {
  lotId: '',
  shiftId: '',
  entryDate: new Date().toLocaleDateString('en-CA'),
  usedBags: null,
  usedKg: null,
  washedBags: null,
  washedKg: null,
  trillarKg: null,
  menudaKg: null,
  pajaKg: null,
  piedraKg: null,
  saponinaKg: null,
}

// Estados de lote donde tiene sentido seguir cargando entradas de lavado —
// mismo criterio que SamplesService.create ampliado en 0035 (ver
// docs/production-area-a.md §3): un lote puede recibir varios turnos antes
// de completar el total almacenado y pasar a LAVADO.
const ESTADOS_CANDIDATOS = ['ACEPTADO_RECEPCION', 'LAVADO']

// Formulario 2 del relevamiento — registro real de Área A
// (production-area-a). A diferencia de la versión mock anterior (una tabla
// con muchas filas/turnos a la vez), el backend modela UNA fila por
// lote×turno×fecha operativa: acá se da de alta una entrada por vez, y
// abajo se lista el historial ya cargado de ese lote.
export default function ControlVolumenA({ loteInicialId }) {
  const [productos, setProductos] = useState(null)
  const [turnos, setTurnos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [form, setForm] = useState({ ...FORM_VACIO, lotId: loteInicialId ?? '' })
  const [historial, setHistorial] = useState(null)
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    let cancelado = false
    Promise.all([listarTodo(productsService.listar), shiftsService.listar()])
      .then(([productos, turnosResp]) => {
        if (cancelado) return
        setProductos(productos)
        setTurnos(turnosResp)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!form.lotId) {
      setHistorial(null)
      return
    }
    let cancelado = false
    productionAreaAService
      .listarPorLote(form.lotId)
      .then((data) => !cancelado && setHistorial(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [form.lotId])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const turnoNombre = (id) => turnos?.find((t) => t.id === id)?.name ?? '—'

  const actualizar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const merma = COLUMNAS_MERMA.reduce((acc, { key }) => acc + (form[key] ?? 0), 0)
  const dif =
    form.washedKg != null && form.usedKg != null ? form.washedKg + merma - form.usedKg : null

  const camposCompletos =
    form.lotId &&
    form.shiftId &&
    form.entryDate &&
    form.usedBags != null &&
    form.usedKg != null &&
    form.washedBags != null &&
    form.washedKg != null &&
    COLUMNAS_MERMA.every(({ key }) => form[key] != null)

  const registrar = async () => {
    try {
      const dto = {
        lotId: form.lotId,
        shiftId: form.shiftId,
        entryDate: form.entryDate,
        usedBags: form.usedBags,
        usedKg: form.usedKg,
        washedBags: form.washedBags,
        washedKg: form.washedKg,
        trillarKg: form.trillarKg,
        menudaKg: form.menudaKg,
        pajaKg: form.pajaKg,
        piedraKg: form.piedraKg,
        saponinaKg: form.saponinaKg,
      }
      const creada = await ejecutar(() => productionAreaAService.crear(dto))
      toast.success('Entrada de Volumen A registrada.')
      setHistorial((h) => [creada, ...(Array.isArray(h) ? h : [])])
      setForm({ ...FORM_VACIO, lotId: form.lotId })
    } catch (err) {
      toast.error(err.message ?? 'No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario
        antetitulo="Registro"
        titulo="Control de Volumen de Producción — Área A"
        codigo="P-PRO-01/R-24"
        version="02"
      />

      {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

      <SeccionFormulario numero={1} titulo="Cabecera">
        {!productos || !turnos ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ComboboxLote
              label="Lote MP"
              value={form.lotId}
              onChange={actualizar('lotId')}
              estados={ESTADOS_CANDIDATOS}
              productoNombre={productoNombre}
            />

            <FormSelect label="Turno" value={form.shiftId} onChange={(e) => actualizar('shiftId')(e.target.value)}>
              <option value="">Seleccionar…</option>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FormSelect>

            <FormInput
              label="Fecha operativa"
              type="date"
              value={form.entryDate}
              onChange={(e) => actualizar('entryDate')(e.target.value)}
            />
          </div>
        )}
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Volumen del turno">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormInput
            label="Bolsas utilizadas"
            type="number"
            min="0"
            value={form.usedBags ?? ''}
            onChange={(e) => actualizar('usedBags')(e.target.value === '' ? null : Number(e.target.value))}
          />
          <FormInput
            label="Kg utilizados"
            type="number"
            min="0"
            step="0.001"
            value={form.usedKg ?? ''}
            onChange={(e) => actualizar('usedKg')(e.target.value === '' ? null : Number(e.target.value))}
          />
          <FormInput
            label="Sacos lavados (bolsas)"
            type="number"
            min="0"
            value={form.washedBags ?? ''}
            onChange={(e) => actualizar('washedBags')(e.target.value === '' ? null : Number(e.target.value))}
          />
          <FormInput
            label="Sacos lavados (Kg)"
            type="number"
            min="0"
            step="0.001"
            value={form.washedKg ?? ''}
            onChange={(e) => actualizar('washedKg')(e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>
      </SeccionFormulario>

      <SeccionFormulario
        numero={3}
        titulo="Subproductos y merma"
        nota="DIF = Lavados + Merma − Utilizados (puede ser negativo — ganancia/pérdida de peso por humedad)."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLUMNAS_MERMA.map(({ key, label }) => (
            <FormInput
              key={key}
              label={label}
              type="number"
              min="0"
              step="0.001"
              value={form[key] ?? ''}
              onChange={(e) => actualizar(key)(e.target.value === '' ? null : Number(e.target.value))}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-marron-cafe">
          <span>Merma total: {merma.toFixed(3)} kg</span>
          {dif != null && (
            <span className={`font-semibold ${dif < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
              DIF: {dif.toFixed(3)} kg
            </span>
          )}
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={4} titulo="Firmas">
        <FirmasResponsables responsables={RESPONSABLES} />
      </SeccionFormulario>

      <div className="flex justify-end">
        <Button onClick={registrar} disabled={enviando || !camposCompletos}>
          <Plus className="mr-1.5 size-4" strokeWidth={2} />
          {enviando ? 'Guardando…' : 'Registrar entrada'}
        </Button>
      </div>

      <SeccionFormulario numero={5} titulo="Historial del lote">
        {!form.lotId ? (
          <p className="text-sm text-marron-cafe/50">Elegí un lote arriba para ver sus entradas registradas.</p>
        ) : historial === null ? (
          <Skeleton className="h-24" />
        ) : historial.length === 0 ? (
          <EmptyState Icon={Plus} titulo="Todavía no hay entradas para este lote" />
        ) : (
          <>
            {/* Tarjetas en mobile — la tabla de abajo obliga a scrollear
                horizontal en pantallas angostas (min-w-[720px]). */}
            <div className="flex flex-col gap-2 md:hidden">
              {historial.map((h) => (
                <div key={h.id} className="flex flex-col gap-2 rounded-2xl bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-marron-cafe">{h.entryDate}</p>
                      <p className="text-xs text-marron-cafe/60">{turnoNombre(h.shiftId)}</p>
                    </div>
                    <Badge tono={h.closedAt ? 'positivo' : 'alerta'}>{h.closedAt ? 'Cerrada' : 'Abierta'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-marron-tierra/15 pt-2 text-xs">
                    <span className="text-marron-cafe/60">
                      Utilizados: <span className="font-semibold text-marron-cafe">{h.usedKg.toFixed(3)} kg</span>
                    </span>
                    <span className="text-marron-cafe/60">
                      Lavados: <span className="font-semibold text-marron-cafe">{h.washedKg.toFixed(3)} kg</span>
                    </span>
                    <span className="text-marron-cafe/60">
                      Merma: <span className="font-semibold text-marron-cafe">{h.mermaKg.toFixed(3)} kg</span>
                    </span>
                    <span className="text-marron-cafe/60">
                      DIF:{' '}
                      <span className={`font-semibold ${h.difKg < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
                        {h.difKg.toFixed(3)} kg
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl bg-white/70 md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5">Utilizados (kg)</th>
                  <th className="px-3 py-2.5">Lavados (kg)</th>
                  <th className="px-3 py-2.5">Merma (kg)</th>
                  <th className="px-3 py-2.5">DIF (kg)</th>
                  <th className="px-3 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id} className="border-b border-marron-tierra/15 last:border-b-0">
                    <td className="px-3 py-2">{h.entryDate}</td>
                    <td className="px-3 py-2">{turnoNombre(h.shiftId)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.usedKg.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.washedKg.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.mermaKg.toFixed(3)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${h.difKg < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
                      {h.difKg.toFixed(3)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tono={h.closedAt ? 'positivo' : 'alerta'}>{h.closedAt ? 'Cerrada' : 'Abierta'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </SeccionFormulario>
    </div>
  )
}
