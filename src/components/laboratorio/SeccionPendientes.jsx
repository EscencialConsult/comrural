import { useEffect, useState } from 'react'
import { FlaskConical, PackageCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { analysisRequestsService } from '../../services/analysisRequestsService'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import ModalRecibirMuestra from '../calidad/ModalRecibirMuestra.jsx'
import FormularioIniciarAnalisis from './FormularioIniciarAnalisis.jsx'

// Pestaña "Pendientes" de Laboratorio — Calidad solicita el análisis
// (SeccionMuestras.jsx, en el sub-item Muestras de Calidad), la solicitud
// aparece acá con estado PENDIENTE_MUESTRA, y es Laboratorio quien la
// recibe (POST /analysis-requests/:requestId/receive-sample). Al revés de
// como lo tenía antes — "Recibir muestra" vivía mal puesto del lado de
// Calidad, se movió acá a pedido explícito: Calidad pide, Laboratorio
// recibe, son roles distintos aunque hoy el mismo permiso (calidad) los
// cubra a los dos.
const TONO_ESTADO_SOLICITUD = {
  PENDIENTE_MUESTRA: 'alerta',
  RECIBIDA: 'positivo',
  EN_PROCESO: 'alerta',
  ANALIZADA: 'positivo',
  RECHAZADA: 'negativo',
}

export default function SeccionPendientes() {
  const { permisos } = useAuth()
  const puedeRecibir = permisos.has('analysis-requests:receive')
  // "Iniciar análisis" — el backend todavía no tiene un endpoint que mueva
  // la solicitud de RECIBIDA a EN_PROCESO (fuera de alcance del módulo
  // laboratory actual, ver docs/laboratory.md §1). Por pedido explícito se
  // implementa como acción local optimista: solo cambia el estado en el
  // cliente, no persiste — se revierte si se recarga la página. Sí se pide
  // el detalle real (GET /analysis-requests/:id) porque `items[].category`
  // existe de verdad en el backend — solo el guardado de resultados está
  // fuera de alcance, no el catálogo de ensayos ya solicitados. Reemplazar
  // por una llamada real al servicio en cuanto exista el endpoint.
  const puedeIniciarAnalisis = permisos.has('analysis-requests:receive')

  const [solicitudes, setSolicitudes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [recibirPara, setRecibirPara] = useState(null) // solicitud | null
  const [analisisEnCurso, setAnalisisEnCurso] = useState(null) // detalle completo | null
  const [cargandoAnalisisId, setCargandoAnalisisId] = useState(null)
  const [errorIniciarAnalisis, setErrorIniciarAnalisis] = useState(null)

  useEffect(() => {
    let cancelado = false
    analysisRequestsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setSolicitudes(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const alRecibir = (detalleActualizado) => {
    setSolicitudes((prev) =>
      prev.map((s) =>
        s.id === detalleActualizado.id
          ? { ...s, status: detalleActualizado.status, acceptanceCriteriaMet: detalleActualizado.acceptanceCriteriaMet }
          : s,
      ),
    )
    setRecibirPara(null)
  }

  const alClicarIniciarAnalisis = async (solicitudId) => {
    setErrorIniciarAnalisis(null)
    setCargandoAnalisisId(solicitudId)
    try {
      const detalle = await analysisRequestsService.obtener(solicitudId)
      setSolicitudes((prev) => prev.map((s) => (s.id === solicitudId ? { ...s, status: 'EN_PROCESO' } : s)))
      setAnalisisEnCurso(detalle)
    } catch (err) {
      setErrorIniciarAnalisis(err.message)
    } finally {
      setCargandoAnalisisId(null)
    }
  }

  if (analisisEnCurso) {
    return <FormularioIniciarAnalisis solicitud={analisisEnCurso} onVolver={() => setAnalisisEnCurso(null)} />
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  if (solicitudes === null) {
    return <p className="text-sm text-marron-cafe/50">Cargando…</p>
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Solicitudes de análisis</h2>
        <p className="text-xs text-marron-cafe/40">
          Todas las solicitudes que pidió Calidad — las que están en "PENDIENTE MUESTRA" esperan que Laboratorio
          confirme que la recibió.
        </p>
      </div>

      {errorIniciarAnalisis && (
        <p className="text-sm font-medium text-rojo-pasankalla">No se pudo abrir el análisis: {errorIniciarAnalisis}</p>
      )}

      {solicitudes.length === 0 ? (
        <p className="rounded-3xl bg-marron-tierra/5 px-4 py-10 text-center text-sm text-marron-cafe/50">
          Todavía no hay ninguna solicitud de análisis.
        </p>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
          {solicitudes.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
            >
              <span className="font-mono text-xs font-semibold text-marron-cafe/70">{s.sample.code}</span>
              <span className="text-sm text-marron-cafe">{s.product.name}</span>
              <span className="font-mono text-xs text-marron-cafe/50">{s.lot.code}</span>
              <Badge tono={s.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'}>{s.effectiveType}</Badge>
              <Badge tono={TONO_ESTADO_SOLICITUD[s.status] ?? 'neutro'} className="ml-auto">
                {s.status.replace(/_/g, ' ')}
              </Badge>
              {s.status === 'PENDIENTE_MUESTRA' && puedeRecibir && (
                <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={() => setRecibirPara(s)}>
                  <PackageCheck className="size-3.5" strokeWidth={2} />
                  Recibir
                </Button>
              )}
              {s.status === 'RECIBIDA' && puedeIniciarAnalisis && (
                <Button
                  variant="secondary"
                  className="gap-1.5 px-3 py-1.5 text-xs"
                  disabled={cargandoAnalisisId === s.id}
                  onClick={() => alClicarIniciarAnalisis(s.id)}
                >
                  <FlaskConical className="size-3.5" strokeWidth={2} />
                  {cargandoAnalisisId === s.id ? 'Abriendo…' : 'Iniciar análisis'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <ModalRecibirMuestra
        abierto={recibirPara !== null}
        muestraCodigo={recibirPara?.sample.code}
        solicitudId={recibirPara?.id}
        onCerrar={() => setRecibirPara(null)}
        onRecibida={alRecibir}
      />
    </section>
  )
}
