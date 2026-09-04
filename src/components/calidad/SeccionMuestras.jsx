import { useEffect, useMemo, useState } from 'react'
import { Plus, MoreVertical, FlaskConical } from 'lucide-react'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import { suppliersService } from '../../services/suppliersService'
import { samplesService } from '../../services/samplesService'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import EmptyState from '../EmptyState.jsx'
import ModalCrearMuestra from './ModalCrearMuestra.jsx'
import ModalSolicitarAnalisis from './ModalSolicitarAnalisis.jsx'
import ModalDetalleMuestra from './ModalDetalleMuestra.jsx'

// Pestaña "Muestras" — crear muestra + solicitar análisis por muestra.
// Reutilizada tal cual en PanelCalidad.jsx y PanelLaboratorio.jsx (pedido
// explícito: la misma pantalla en los dos módulos, no una copia). No existe
// un GET /samples general — se listan por lote
// (GET /raw-material-lots/:lotId/samples) — como tampoco hay un endpoint
// que diga "qué lotes tienen muestras", se pide primero la lista de lotes
// PM y después, en paralelo, las muestras de cada uno — mismo criterio ya
// aceptado en el resto del proyecto para volúmenes chicos (ver
// PanelAlmacen.jsx, comentario sobre rawMaterialReceptionsService).

// Lotes en ACEPTADO_RECEPCION o LAVADO pueden tener una muestra nueva — el
// backend lo valida con 409 en cualquier otro estado (SamplesService.create,
// ver comrural_erp_backend/src/laboratory/samples/services/samples.service.ts).
// LAVADO se sumó en 0035 (Producción cerrando el lavado de Área A no debe
// bloquear que Calidad tome su propia muestra sobre el mismo lote).
const ESTADOS_HABILITAN_MUESTREO = ['ACEPTADO_RECEPCION', 'LAVADO']

// Muestras cuya nature no es la toma manual de Calidad — se etiquetan para
// no confundirlas con las 'MP' (ver docs/laboratory.md, sección "samples
// (alterada)"). 'PROCESO' es la que production-area-a auto-crea al cerrar
// el lavado de un lote.
const LABEL_NATURE = { PROCESO: 'Proceso', PT: 'Producto terminado' }

// Una muestra no puede tener una solicitud nueva mientras ya tenga una sin
// cerrar (analysis_requests_one_active_per_sample_idx, backend) — se usa
// para decidir si el botón de la fila es "Solicitar análisis" o solo
// muestra el estado de la que ya está en curso.
const ESTADOS_SOLICITUD_ACTIVA = ['PENDIENTE_MUESTRA', 'RECIBIDA', 'EN_PROCESO']
const TONO_ESTADO_SOLICITUD = {
  PENDIENTE_MUESTRA: 'alerta',
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  ANALIZADA: 'positivo',
  RECHAZADA: 'negativo',
}
const TONO_ESTADO_MUESTRA = {
  TOMADA: 'neutro',
  ENTREGADA: 'alerta',
  RECIBIDA: 'positivo',
  CERRADA: 'positivo',
  RECHAZADA: 'negativo',
}

export default function SeccionMuestras() {
  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [muestrasPorLote, setMuestrasPorLote] = useState({}) // lotId -> muestras[] | 'error'
  const [errorCarga, setErrorCarga] = useState(null)

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false)
  const [solicitudPara, setSolicitudPara] = useState(null) // { muestra, lote } | null

  useEffect(() => {
    let cancelado = false
    Promise.all([
      lotsService.listar({ limit: 100 }),
      productsService.listar({ limit: 100 }),
      suppliersService.listar({ limit: 100 }),
    ])
      .then(([lotesResp, productosResp, proveedoresResp]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM'))
        setProductos(productosResp.data)
        setProveedores(proveedoresResp.data)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!lotes || lotes.length === 0) return
    let cancelado = false
    Promise.allSettled(lotes.map((l) => samplesService.listarPorLote(l.id))).then((resultados) => {
      if (cancelado) return
      const siguiente = {}
      resultados.forEach((r, i) => {
        siguiente[lotes[i].id] = r.status === 'fulfilled' ? r.value : 'error'
      })
      setMuestrasPorLote(siguiente)
    })
    return () => {
      cancelado = true
    }
  }, [lotes])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'
  const proveedorNombre = (id) => {
    const s = proveedores?.find((p) => p.id === id)
    if (!s) return '—'
    return s.person ? `${s.person.firstNames} ${s.person.lastNames}` : s.organization ? s.organization.tradeName || s.organization.legalName : '—'
  }

  const lotesCandidatos = useMemo(
    () => (lotes ?? []).filter((l) => ESTADOS_HABILITAN_MUESTREO.includes(l.currentStatus)),
    [lotes],
  )

  const lotesConMuestras = useMemo(
    () =>
      (lotes ?? [])
        .map((l) => ({ lote: l, muestras: muestrasPorLote[l.id] }))
        .filter(({ muestras }) => Array.isArray(muestras) && muestras.length > 0),
    [lotes, muestrasPorLote],
  )

  const [detalleDe, setDetalleDe] = useState(null) // { muestra, lote } | null

  const abrirDetalle = (muestra, lote) => setDetalleDe({ muestra, lote })
  const abrirSolicitud = (muestra, lote) => {
    setDetalleDe(null)
    setSolicitudPara({ muestra, lote })
  }

  const alCrearMuestra = (muestra) => {
    setMuestrasPorLote((prev) => ({ ...prev, [muestra.lot.id]: [muestra, ...(Array.isArray(prev[muestra.lot.id]) ? prev[muestra.lot.id] : [])] }))
  }

  const alCrearSolicitud = (solicitud) => {
    if (!solicitudPara) return
    const { muestra, lote } = solicitudPara
    setMuestrasPorLote((prev) => {
      const actuales = Array.isArray(prev[lote.id]) ? prev[lote.id] : []
      return {
        ...prev,
        [lote.id]: actuales.map((m) =>
          m.id === muestra.id
            ? { ...m, analysisRequests: [{ id: solicitud.id, status: solicitud.status, requestedType: solicitud.requestedType, effectiveType: solicitud.effectiveType }, ...(m.analysisRequests ?? [])] }
            : m,
        ),
      }
    })
    setSolicitudPara(null)
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-marron-cafe">Muestras</h2>
          <p className="text-xs text-marron-cafe/40">Agrupadas por lote — cada una puede tener su propia solicitud de análisis.</p>
        </div>
        <Button className="gap-1.5 px-4 py-2 text-sm" onClick={() => setModalCrearAbierto(true)} disabled={lotes === null}>
          <Plus className="size-4" strokeWidth={2} />
          Crear muestra
        </Button>
      </div>

      {lotes === null ? (
        <div className="flex flex-col gap-2 rounded-3xl bg-marron-tierra/5 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16" />
        </div>
      ) : lotesConMuestras.length === 0 ? (
        <EmptyState Icon={FlaskConical} titulo="Todavía no se creó ninguna muestra" />
      ) : (
        lotesConMuestras.map(({ lote, muestras }) => (
          <div key={lote.id} className="flex flex-col gap-2 rounded-3xl bg-marron-tierra/5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-marron-cafe/70">{lote.code}</span>
              <span className="text-sm font-semibold text-marron-cafe">{productoNombre(lote.productId)}</span>
              <span className="text-sm text-marron-cafe/60">{proveedorNombre(lote.supplierId)}</span>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white/60">
              {muestras.map((m) => {
                const solicitudActiva = (m.analysisRequests ?? []).find((r) => ESTADOS_SOLICITUD_ACTIVA.includes(r.status))
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => abrirDetalle(m, lote)}
                    className="flex w-full flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3 text-left transition-colors duration-150 last:border-b-0 hover:bg-marron-tierra/10"
                  >
                    <span className="font-mono text-xs text-marron-cafe/70">{m.code}</span>
                    {m.nature && m.nature !== 'MP' && (
                      <Badge tono="info">{LABEL_NATURE[m.nature] ?? m.nature}</Badge>
                    )}
                    <span className="text-xs text-marron-cafe/60">
                      {m.quantity} {m.unit === 'OTRA' ? m.otherUnit : m.unit}
                    </span>
                    <Badge tono={TONO_ESTADO_MUESTRA[m.status] ?? 'neutro'}>{m.status}</Badge>
                    {solicitudActiva && (
                      <Badge tono={TONO_ESTADO_SOLICITUD[solicitudActiva.status] ?? 'neutro'}>
                        {solicitudActiva.effectiveType} · {solicitudActiva.status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    <MoreVertical className="ml-auto size-4 shrink-0 text-marron-cafe/30" strokeWidth={2} />
                  </button>
                )
              })}
            </div>
          </div>
        ))
      )}

      <ModalCrearMuestra
        abierto={modalCrearAbierto}
        onCerrar={() => setModalCrearAbierto(false)}
        lotes={lotesCandidatos}
        productoNombre={productoNombre}
        proveedorNombre={proveedorNombre}
        onCreada={alCrearMuestra}
      />

      <ModalSolicitarAnalisis
        abierto={solicitudPara !== null}
        muestra={solicitudPara?.muestra ?? null}
        loteCodigo={solicitudPara?.lote.code}
        productoNombre={solicitudPara ? productoNombre(solicitudPara.lote.productId) : ''}
        proveedorNombre={solicitudPara ? proveedorNombre(solicitudPara.lote.supplierId) : ''}
        onCerrar={() => setSolicitudPara(null)}
        onCreada={alCrearSolicitud}
      />

      <ModalDetalleMuestra
        abierto={detalleDe !== null}
        muestra={detalleDe?.muestra ?? null}
        lote={detalleDe?.lote ?? null}
        onCerrar={() => setDetalleDe(null)}
        onSolicitar={abrirSolicitud}
      />
    </section>
  )
}
