import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, CheckCircle2, FlaskConical } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { qualityResolutionsService } from '../services/qualityResolutionsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Badge from '../components/Badge.jsx'
import Button from '../components/Button.jsx'
import FormInput from '../components/FormInput.jsx'

// Calidad y Laboratorio · Proceso 1 (recepción e inspección de materia
// prima) — ver comrural_erp_backend/docs/raw-material-receptions.md,
// docs/warehouse-receipts.md, docs/inspections.md y docs/quality-resolutions.md,
// los 4 leídos completos. Pantalla independiente de PanelLotes.jsx a
// propósito: el rol `calidad` NO tiene `lots:read` (ver
// 0019_business_modules_permissions.sql — solo `almacen` recibe esa capa
// técnica) así que el gate de acceso acá es `raw-material-receptions:read`,
// compartido entre almacen/calidad/superadmin, nunca `lots:read`.
//
// Mismo criterio en todo el flujo: nunca se calcula del lado del cliente si
// una acción "debería" estar permitida — siempre se lee el flag ya
// calculado por el backend (canRegisterWeight, canCompleteWithoutWeight,
// canApprove, storageAuthorized, receptionAccepted) desde la vista
// consolidada, y se vuelve a pedir esa vista después de CADA mutación.
const TONO_ESTADO_LOTE = {
  PROGRAMADO: 'neutro',
  EN_RECEPCION: 'alerta',
  ACEPTADO_RECEPCION: 'positivo',
  EN_ANALISIS: 'alerta',
  PENDIENTE_LIBERACION: 'alerta',
  RETENIDO: 'negativo',
  LIBERADO: 'positivo',
  RECHAZADO: 'negativo',
  CANCELADO: 'neutro',
}

const TONO_ESTADO_SUBFLUJO = { INICIADA: 'alerta', FINALIZADA: 'positivo', CANCELADA: 'negativo' }
const TONO_REVIEW = { PENDIENTE: 'alerta', APROBADO: 'positivo' }
const TONO_DECISION = { APROBADA: 'positivo', RECHAZADA: 'negativo' }

export default function PanelRecepcionLote() {
  const { lotId } = useParams()
  const navigate = useNavigate()
  const { permisos, usuario } = useAuth()
  const puedeVer = permisos.has('raw-material-receptions:read')

  const [datos, setDatos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  const [resolucionDetalle, setResolucionDetalle] = useState(null)

  const recargar = useCallback(() => {
    if (!puedeVer) return
    setErrorCarga(null)
    rawMaterialReceptionsService
      .obtener(lotId)
      .then(setDatos)
      .catch((err) => setErrorCarga(err.message))
  }, [lotId, puedeVer])

  useEffect(() => {
    recargar()
  }, [recargar])

  useEffect(() => {
    if (!confirmacion) return
    const id = setTimeout(() => setConfirmacion(null), 4000)
    return () => clearTimeout(id)
  }, [confirmacion])

  // `canApprove` NO viene en la vista consolidada (ReceptionSummaryView del
  // backend no lo incluye — se verificó leyendo raw-material-reception.service.ts
  // completo) — solo lo calcula GET /quality-resolutions/:id. Sin este
  // pedido aparte, el botón "Aprobar" nunca se mostraba, aunque
  // correspondiera: `summary.canApprove` siempre era `undefined`.
  useEffect(() => {
    const resolutionId = datos?.qualityResolution?.id
    if (!resolutionId) {
      setResolucionDetalle(null)
      return
    }
    let cancelado = false
    qualityResolutionsService
      .obtener(resolutionId)
      .then((d) => {
        if (!cancelado) setResolucionDetalle(d)
      })
      .catch(() => {
        // Si falla, `resolucionDetalle` queda null y el botón "Aprobar"
        // simplemente no se muestra — falla cerrado, no abierto.
      })
    return () => {
      cancelado = true
    }
  }, [datos])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a la recepción de materia prima." />
  }

  if (errorCarga) {
    return (
      <main className="flex w-full flex-col items-start gap-3 p-6 md:p-10">
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={recargar}>
          Reintentar
        </Button>
      </main>
    )
  }

  if (!datos) {
    return (
      <main className="w-full p-6 md:p-10">
        <p className="text-sm text-marron-cafe/50">Cargando…</p>
      </main>
    )
  }

  const { lot, summary, inspection, warehouseReceipt, qualityResolution } = datos

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          Volver
        </button>
      </div>

      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <FlaskConical className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">{lot.code}</h1>
          <p className="text-sm text-marron-cafe/60">
            {lot.productName} · {lot.supplierName ?? '—'}
          </p>
        </div>
        <Badge tono={TONO_ESTADO_LOTE[lot.currentStatus] ?? 'neutro'} className="ml-auto">
          {lot.currentStatus.replace(/_/g, ' ')}
        </Badge>
      </header>

      {confirmacion && (
        <p className="flex items-center gap-2 rounded-xl bg-verde-lima/15 px-3 py-2 text-sm font-medium text-verde-bosque">
          <CheckCircle2 className="size-4 shrink-0" strokeWidth={1.75} />
          {confirmacion}
        </p>
      )}

      {summary.receptionAccepted && (
        <p className="rounded-2xl bg-verde-lima/15 px-4 py-3 text-sm font-semibold text-verde-bosque">
          Ciclo de recepción cerrado — el lote quedó aceptado y almacenado.
        </p>
      )}
      {lot.currentStatus === 'RECHAZADO' && (
        <p className="rounded-2xl bg-rojo-pasankalla/10 px-4 py-3 text-sm font-semibold text-rojo-pasankalla">
          El lote fue rechazado en la recepción.
        </p>
      )}

      <SeccionRecepcion lot={lot} warehouseReceipt={warehouseReceipt} permisos={permisos} navigate={navigate} />

      <SeccionInspeccion lot={lot} inspection={inspection} permisos={permisos} navigate={navigate} />

      <SeccionResolucion
        inspection={inspection}
        qualityResolution={qualityResolution}
        decisionNotes={resolucionDetalle?.decisionNotes}
        resolucionCargada={resolucionDetalle?.id === qualityResolution?.id}
        canApprove={resolucionDetalle?.canApprove ?? false}
        warehouseReceipt={warehouseReceipt}
        summary={summary}
        permisos={permisos}
        usuario={usuario}
        onCambio={(msg) => {
          recargar()
          setConfirmacion(msg)
        }}
      />
    </main>
  )
}

// --- Recepción de Almacén -----------------------------------------------
//
// Igual que la Inspección de Calidad: el formulario en sí vive en su propia
// pantalla, pixel-perfect contra el papel real (P-ADM-03/R-02) —
// src/pages/PanelIngresoMateriaPrima.jsx. Acá solo queda un resumen + el
// botón que lleva ahí, por la misma razón: dos formularios vivos para lo
// mismo es la receta para que se desincronicen.

function SeccionRecepcion({ lot, warehouseReceipt, permisos, navigate }) {
  const puedeCrear = permisos.has('warehouse-receipts:create')

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-marron-cafe">Recepción de Almacén</h2>
        {warehouseReceipt && (
          <Badge tono={TONO_ESTADO_SUBFLUJO[warehouseReceipt.status] ?? 'neutro'}>{warehouseReceipt.status}</Badge>
        )}
      </div>

      {!warehouseReceipt && !puedeCrear ? (
        <p className="text-sm text-marron-cafe/50">Todavía no se inició la recepción de este lote.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {warehouseReceipt?.status === 'FINALIZADA' && (
            <p className="text-sm text-marron-cafe/70">
              {warehouseReceipt.storedPackageCount} envases almacenados
              {warehouseReceipt.acceptedNetWeightKg != null ? ` · ${warehouseReceipt.acceptedNetWeightKg} kg` : ''}
            </p>
          )}
          <Button
            variant={warehouseReceipt ? 'secondary' : 'primary'}
            className="self-start px-4 py-2 text-sm"
            onClick={() => navigate(`/panel/calidad/lotes/${lot.id}/ingreso`)}
          >
            {!warehouseReceipt ? 'Iniciar recepción' : warehouseReceipt.status === 'INICIADA' ? 'Continuar recepción' : 'Ver formulario'}
          </Button>
        </div>
      )}
    </section>
  )
}

// Usado por SeccionResolucion, más abajo — se había borrado por accidente
// al simplificar SeccionRecepcion (que ya no lo necesita), y se llevó
// puesta toda la pantalla: cualquier lote con una resolución de Calidad ya
// emitida (justo los más avanzados) tiraba abajo el render entero con
// "CampoDetalle is not defined" — página en blanco total, sin ningún aviso
// de error visible para quien la mira.
function CampoDetalle({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className="text-sm text-marron-cafe">{valor ?? '—'}</dd>
    </div>
  )
}

// --- Inspección de Calidad ------------------------------------------------
//
// El formulario en sí (iniciar / responder / finalizar) vive en su propia
// pantalla, pixel-perfect contra el papel real —
// src/pages/PanelInspeccionMateriaPrima.jsx, ver
// docs/formulario-inspeccion-materia-prima.md. Acá solo queda un resumen +
// el botón que lleva ahí: mantener el renderer genérico viejo
// (FormularioInspeccion.jsx) viviendo en paralelo era la receta para que
// ambas pantallas se desincronizaran, como ya avisaba esa misma doc.

function SeccionInspeccion({ lot, inspection, permisos, navigate }) {
  const puedeCrear = permisos.has('inspections:create')

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-marron-cafe">Inspección de Calidad</h2>
        {inspection && <Badge tono={TONO_ESTADO_SUBFLUJO[inspection.status] ?? 'neutro'}>{inspection.status}</Badge>}
      </div>

      {!inspection && !puedeCrear ? (
        <p className="text-sm text-marron-cafe/50">Todavía no se inició la inspección de este lote.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {inspection?.status === 'FINALIZADA' && (
            <p className="text-sm text-marron-cafe/70">Sacos rechazados: {inspection.rejectedBagCount}</p>
          )}
          <Button
            variant={inspection ? 'secondary' : 'primary'}
            className="self-start px-4 py-2 text-sm"
            onClick={() => navigate(`/panel/calidad/lotes/${lot.id}/inspeccion`)}
          >
            {!inspection ? 'Iniciar inspección' : inspection.status === 'INICIADA' ? 'Continuar inspección' : 'Ver formulario'}
          </Button>
        </div>
      )}
    </section>
  )
}

// --- Resolución de Calidad -------------------------------------------------

function SeccionResolucion({
  inspection,
  qualityResolution,
  decisionNotes,
  resolucionCargada,
  canApprove,
  warehouseReceipt,
  summary,
  permisos,
  usuario,
  onCambio,
}) {
  const puedeCrear = permisos.has('quality-resolutions:create')
  const puedeEditar = permisos.has('quality-resolutions:update')
  const puedeAprobar = permisos.has('quality-resolutions:approve')

  if (!inspection || inspection.status !== 'FINALIZADA') {
    return (
      <section className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
        <h2 className="text-lg font-bold text-marron-cafe">Resolución de Calidad</h2>
        <p className="text-sm text-marron-cafe/50">Se habilita cuando la inspección esté finalizada.</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-marron-cafe">Resolución de Calidad</h2>
        {qualityResolution && <Badge tono={TONO_DECISION[qualityResolution.decision]}>{qualityResolution.decision}</Badge>}
      </div>

      {!qualityResolution ? (
        puedeCrear ? (
          <FormularioEmitirResolucion inspectionId={inspection.id} onEmitida={() => onCambio('Resolución emitida.')} />
        ) : (
          <p className="text-sm text-marron-cafe/50">Todavía no se emitió una resolución para este lote.</p>
        )
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <CampoDetalle etiqueta="Envases recibidos" valor={summary.receivedPackageCount} />
            <CampoDetalle etiqueta="Envases rechazados" valor={summary.rejectedPackageCount} />
            <CampoDetalle etiqueta="Envases autorizados" valor={summary.authorizedPackageCount} />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">Visto bueno</dt>
              <dd>
                <Badge tono={TONO_REVIEW[qualityResolution.reviewStatus]}>{qualityResolution.reviewStatus}</Badge>
              </dd>
            </div>
          </dl>
          {decisionNotes && <p className="text-sm text-marron-cafe/70">"{decisionNotes}"</p>}

          <div className="flex flex-wrap gap-3">
            {/* Gateado también por `resolucionCargada`, no solo por
                reviewStatus/permiso: el formulario precarga sus campos con
                `useState(notasActuales)` en el montaje — si montara antes
                de que llegue GET /quality-resolutions/:id, arrancaría con
                notas vacías y una corrección podría pisar la justificación
                real en vez de editarla. */}
            {qualityResolution.reviewStatus === 'PENDIENTE' && puedeEditar && resolucionCargada && (
              <FormularioCorregirResolucion
                resolutionId={qualityResolution.id}
                decisionActual={qualityResolution.decision}
                notasActuales={decisionNotes ?? ''}
                // Regla real del backend (patchResolutionSchema +
                // quality-resolutions.md §5): la decisión se puede corregir
                // mientras la recepción de Almacén no esté FINALIZADA —
                // cambiarla después alteraría un pesaje ya cerrado. Con la
                // recepción finalizada, PATCH solo acepta decisionNotes.
                puedeCambiarDecision={warehouseReceipt?.status !== 'FINALIZADA'}
                onCorregida={() => onCambio('Resolución corregida.')}
              />
            )}
            {puedeAprobar && canApprove && (
              <BotonAprobar resolutionId={qualityResolution.id} onAprobada={() => onCambio('Resolución aprobada.')} />
            )}
          </div>
        </>
      )}
    </section>
  )
}

function FormularioEmitirResolucion({ inspectionId, onEmitida }) {
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

function FormularioCorregirResolucion({ resolutionId, decisionActual, notasActuales, puedeCambiarDecision, onCorregida }) {
  const [decision, setDecision] = useState(decisionActual)
  const [decisionNotes, setDecisionNotes] = useState(notasActuales)
  const { enviando, error, ejecutar } = useSolicitud()

  const notasValidas = decision === 'APROBADA' || decisionNotes.trim() !== ''
  // patchResolutionSchema exige al menos un campo presente en el body — si
  // ni la decisión cambió ni hay notas para mandar, no hay nada que
  // corregir todavía (el botón queda deshabilitado en vez de dejar que el
  // backend responda 400 por un body vacío).
  const hayCambios = decisionNotes.trim() !== '' || (puedeCambiarDecision && decision !== decisionActual)

  const submit = async (e) => {
    e.preventDefault()
    if (!notasValidas || !hayCambios) return
    try {
      // Solo se manda `decision` si de verdad cambió y está permitido —
      // patchResolutionSchema la acepta, pero el servicio la rechaza (409)
      // si la recepción ya está FINALIZADA (ver docs/quality-resolutions.md
      // §5); no tiene sentido ni intentarlo desde acá si el flag ya avisa.
      // `decisionNotes` en el schema es `min(1).optional()` — si está
      // presente no puede ser cadena vacía (una APROBADA puede no tener
      // notas), así que acá solo se incluye si de verdad hay texto.
      const dto = {}
      if (decisionNotes.trim() !== '') dto.decisionNotes = decisionNotes
      if (puedeCambiarDecision && decision !== decisionActual) dto.decision = decision
      await ejecutar(() => qualityResolutionsService.corregir(resolutionId, dto))
      onCorregida()
    } catch {
      // mensaje ya en `error`
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-2 rounded-2xl bg-white/60 p-4">
      <h3 className="text-sm font-bold text-marron-cafe">Corregir resolución</h3>
      {error && <p className="text-xs font-medium text-rojo-pasankalla">{error}</p>}
      {puedeCambiarDecision ? (
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
      ) : (
        <p className="text-xs text-marron-cafe/50">
          La recepción de Almacén ya cerró — la decisión queda fija, solo se puede corregir la justificación.
        </p>
      )}
      <FormInput label="Justificación" value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
      {!notasValidas && <p className="text-xs font-medium text-rojo-pasankalla">Un rechazo necesita justificación.</p>}
      <Button type="submit" variant="secondary" disabled={enviando || !hayCambios} className="self-start px-3 py-1.5 text-xs">
        {enviando ? 'Guardando…' : 'Guardar corrección'}
      </Button>
    </form>
  )
}

function BotonAprobar({ resolutionId, onAprobada }) {
  const { enviando, error, ejecutar } = useSolicitud()

  const aprobar = async () => {
    try {
      await ejecutar(() => qualityResolutionsService.aprobar(resolutionId))
      onAprobada()
    } catch {
      // mensaje ya en `error`
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs font-medium text-rojo-pasankalla">{error}</p>}
      <Button disabled={enviando} onClick={aprobar} className="px-4 py-2 text-sm">
        {enviando ? 'Aprobando…' : 'Aprobar (visto bueno)'}
      </Button>
    </div>
  )
}
