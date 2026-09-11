import { useEffect, useState } from 'react'
import { ShieldCheck, PackageCheck } from 'lucide-react'
import { packagingService } from '../../services/packagingService'
import { qualityAreaBInspectionsService } from '../../services/qualityAreaBInspectionsService'
import { useSolicitud } from '../../hooks/useSolicitud'
import { toast } from '../../lib/toast'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'

// Categorías del ejemplo documentado en comrural_erp_backend/docs/
// quality-area-b-inspections.md §1 — el diseño las deja como JSON abierto
// (no hay un catálogo fijo confirmado con el cliente), así que se ofrecen
// como punto de partida editable, no como enum cerrado.
const CATEGORIAS_IMPUREZA = ['paja', 'piedras', 'semilla_silvestre', 'larvas', 'heces_ave', 'otros']
const impurezasVacias = () => Object.fromEntries(CATEGORIAS_IMPUREZA.map((k) => [k, { cantidad: '', peso_g: '' }]))

const numero = (v) => (v === '' || v == null ? '' : Number(v))
const num = (v) => Number(v) || 0

// Liberación formal de Calidad sobre producto YA ENVASADO — real, sin
// mockup previo que adaptar (SeccionInspeccionAreaB.jsx es otra cosa: el
// control informal ANTES de envasar, que el propio documento dice que no
// tiene tabla propia — ver docs/quality-area-b-inspections.md §1). Lista
// las corridas de envasado cerradas (GET /packaging/entries?closed=true) y
// marca cuáles ya tienen control (GET .../by-packaging-entry/:id) para no
// dejar elegir una duplicada — el backend igual la rechaza con 409.
export default function SeccionLiberacionEnvasado() {
  const [corridas, setCorridas] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [corridaId, setCorridaId] = useState('')
  const [inspeccion, setInspeccion] = useState(null) // undefined mientras carga, null si no existe
  const { enviando, ejecutar } = useSolicitud()

  const [approvedPackageCount, setApprovedPackageCount] = useState('')
  const [rejectedPackageCount, setRejectedPackageCount] = useState('')
  const [disposition, setDisposition] = useState('APROBADO')
  const [rejectionReason, setRejectionReason] = useState('')
  const [purezaPct, setPurezaPct] = useState('')
  const [humedadPct, setHumedadPct] = useState('')
  const [enteroPct, setEnteroPct] = useState('')
  const [partidoPct, setPartidoPct] = useState('')
  const [quebradoPct, setQuebradoPct] = useState('')
  const [m12, setM12] = useState('')
  const [m14, setM14] = useState('')
  const [m16, setM16] = useState('')
  const [polvoPct, setPolvoPct] = useState('')
  const [impurezas, setImpurezas] = useState(impurezasVacias())
  const [observaciones, setObservaciones] = useState('')

  const cargarCorridas = () => {
    setCorridas(null)
    packagingService
      .listar({ closed: true })
      .then(async (data) => {
        const conControl = await Promise.all(
          data.map(async (c) => ({ ...c, tieneControl: (await qualityAreaBInspectionsService.porCorrida(c.id)) !== null })),
        )
        setCorridas(conControl)
      })
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(cargarCorridas, [])

  useEffect(() => {
    if (!corridaId) {
      setInspeccion(undefined)
      return
    }
    setInspeccion(undefined)
    qualityAreaBInspectionsService.porCorrida(corridaId).then(setInspeccion).catch(() => setInspeccion(null))
  }, [corridaId])

  const corridaElegida = corridas?.find((c) => c.id === corridaId)

  const limpiarFormulario = () => {
    setApprovedPackageCount('')
    setRejectedPackageCount('')
    setDisposition('APROBADO')
    setRejectionReason('')
    setPurezaPct('')
    setHumedadPct('')
    setEnteroPct('')
    setPartidoPct('')
    setQuebradoPct('')
    setM12('')
    setM14('')
    setM16('')
    setPolvoPct('')
    setImpurezas(impurezasVacias())
    setObservaciones('')
  }

  const puedeGuardar =
    corridaId !== '' &&
    num(approvedPackageCount) + num(rejectedPackageCount) === (corridaElegida?.packageCount ?? -1) &&
    purezaPct !== '' &&
    humedadPct !== '' &&
    m12 !== '' &&
    m14 !== '' &&
    m16 !== '' &&
    polvoPct !== '' &&
    (disposition === 'APROBADO' ? rejectionReason.trim() === '' : rejectionReason.trim() !== '')

  const guardar = async () => {
    if (!puedeGuardar) return
    try {
      await ejecutar(() =>
        qualityAreaBInspectionsService.crear({
          packagingEntryId: corridaId,
          inspectedAt: new Date().toISOString(),
          approvedPackageCount: num(approvedPackageCount),
          rejectedPackageCount: num(rejectedPackageCount),
          disposition,
          ...(disposition !== 'APROBADO' ? { rejectionReason: rejectionReason.trim() } : {}),
          impurezas: Object.fromEntries(
            CATEGORIAS_IMPUREZA.map((k) => [k, { cantidad: num(impurezas[k].cantidad), peso_g: num(impurezas[k].peso_g) }]),
          ),
          purezaPct: num(purezaPct),
          humedadPct: num(humedadPct),
          clasificacionGrano: { entero_pct: num(enteroPct), partido_pct: num(partidoPct), quebrado_pct: num(quebradoPct) },
          granulometriaM12: num(m12),
          granulometriaM14: num(m14),
          granulometriaM16: num(m16),
          granulometriaPolvoPct: num(polvoPct),
          observaciones: observaciones.trim() || undefined,
        }),
      )
      toast.success('Control registrado.')
      limpiarFormulario()
      setCorridaId('')
      cargarCorridas()
    } catch (err) {
      toast.error(err.message ?? 'No se pudo guardar el control.')
    }
  }

  const darVobo = async () => {
    try {
      const actualizado = await ejecutar(() => qualityAreaBInspectionsService.darVobo(inspeccion.id))
      setInspeccion(actualizado)
      toast.success('Visto bueno registrado.')
    } catch (err) {
      toast.error(err.message ?? 'No se pudo dar el visto bueno.')
    }
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Liberación" titulo="Liberación de Envasado — Área B" />

      <SeccionFormulario numero={1} titulo="Corrida de envasado">
        {corridas === null ? (
          <Skeleton className="h-16" />
        ) : corridas.length === 0 ? (
          <EmptyState Icon={PackageCheck} titulo="Todavía no hay corridas de envasado cerradas" />
        ) : (
          <FormSelect label="Corrida" value={corridaId} onChange={(e) => setCorridaId(e.target.value)} className="max-w-md">
            <option value="">Seleccionar…</option>
            {corridas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.presentationLabel} — {c.packageCount} unidades {c.tieneControl ? '(ya tiene control)' : ''}
              </option>
            ))}
          </FormSelect>
        )}
      </SeccionFormulario>

      {corridaId && inspeccion === undefined && <Skeleton className="h-24" />}

      {corridaId && inspeccion && (
        <div className="flex flex-col gap-4 rounded-2xl bg-verde-hoja/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tono={inspeccion.disposition === 'APROBADO' ? 'positivo' : inspeccion.disposition === 'PARCIAL' ? 'alerta' : 'negativo'}>
                {inspeccion.disposition}
              </Badge>
              <span className="text-sm text-marron-cafe">
                {inspeccion.approvedPackageCount} aprobadas / {inspeccion.rejectedPackageCount} rechazadas
              </span>
            </div>
            {inspeccion.voboEn ? (
              <Badge tono="positivo">Con visto bueno</Badge>
            ) : (
              <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={darVobo} disabled={enviando}>
                <ShieldCheck className="size-3.5" strokeWidth={2} />
                Dar visto bueno
              </Button>
            )}
          </div>
        </div>
      )}

      {corridaId && inspeccion === null && corridaElegida && (
        <>
          <SeccionFormulario numero={2} titulo="Resultado" nota={`Total de la corrida: ${corridaElegida.packageCount} unidades — aprobadas + rechazadas debe sumar ese total.`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormInput label="Aprobadas" type="number" min="0" value={approvedPackageCount} onChange={(e) => setApprovedPackageCount(numero(e.target.value))} />
              <FormInput label="Rechazadas" type="number" min="0" value={rejectedPackageCount} onChange={(e) => setRejectedPackageCount(numero(e.target.value))} />
              <FormSelect label="Disposición" value={disposition} onChange={(e) => setDisposition(e.target.value)}>
                <option value="APROBADO">Aprobado</option>
                <option value="PARCIAL">Parcial</option>
                <option value="RECHAZADO">Rechazado</option>
              </FormSelect>
              {disposition !== 'APROBADO' && (
                <FormInput label="Motivo del rechazo" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="lg:col-span-1" />
              )}
            </div>
          </SeccionFormulario>

          <SeccionFormulario numero={3} titulo="Pureza y humedad" nota="Sobre muestra base de 2.000 g — distinto del certificado de Laboratorio (4.000 g).">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput label="Pureza (%)" type="number" min="0" max="100" step="0.01" value={purezaPct} onChange={(e) => setPurezaPct(numero(e.target.value))} />
              <FormInput label="Humedad (%)" type="number" min="0" max="100" step="0.01" value={humedadPct} onChange={(e) => setHumedadPct(numero(e.target.value))} />
            </div>
          </SeccionFormulario>

          <SeccionFormulario numero={4} titulo="Clasificación de grano">
            <div className="grid gap-3 sm:grid-cols-3">
              <FormInput label="Entero (%)" type="number" min="0" max="100" step="0.01" value={enteroPct} onChange={(e) => setEnteroPct(numero(e.target.value))} />
              <FormInput label="Partido (%)" type="number" min="0" max="100" step="0.01" value={partidoPct} onChange={(e) => setPartidoPct(numero(e.target.value))} />
              <FormInput label="Quebrado (%)" type="number" min="0" max="100" step="0.01" value={quebradoPct} onChange={(e) => setQuebradoPct(numero(e.target.value))} />
            </div>
          </SeccionFormulario>

          <SeccionFormulario numero={5} titulo="Granulometría">
            <div className="grid gap-3 sm:grid-cols-4">
              <FormInput label="M12 (%)" type="number" min="0" max="100" step="0.01" value={m12} onChange={(e) => setM12(numero(e.target.value))} />
              <FormInput label="M14 (%)" type="number" min="0" max="100" step="0.01" value={m14} onChange={(e) => setM14(numero(e.target.value))} />
              <FormInput label="M16 (%)" type="number" min="0" max="100" step="0.01" value={m16} onChange={(e) => setM16(numero(e.target.value))} />
              <FormInput label="Polvo (%)" type="number" min="0" max="100" step="0.01" value={polvoPct} onChange={(e) => setPolvoPct(numero(e.target.value))} />
            </div>
          </SeccionFormulario>

          <SeccionFormulario numero={6} titulo="Impurezas">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORIAS_IMPUREZA.map((k) => (
                <div key={k} className="flex flex-col gap-2 rounded-xl bg-white/70 p-3">
                  <span className="text-xs font-semibold text-marron-cafe capitalize">{k.replace(/_/g, ' ')}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <FormInput
                      label="Cantidad"
                      type="number"
                      min="0"
                      value={impurezas[k].cantidad}
                      onChange={(e) => setImpurezas((prev) => ({ ...prev, [k]: { ...prev[k], cantidad: numero(e.target.value) } }))}
                    />
                    <FormInput
                      label="Peso (g)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={impurezas[k].peso_g}
                      onChange={(e) => setImpurezas((prev) => ({ ...prev, [k]: { ...prev[k], peso_g: numero(e.target.value) } }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SeccionFormulario>

          <SeccionFormulario numero={7} titulo="Observaciones">
            <FormTextarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </SeccionFormulario>

          <div className="flex justify-end">
            <Button onClick={guardar} disabled={enviando || !puedeGuardar}>
              {enviando ? 'Guardando…' : 'Registrar control'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
