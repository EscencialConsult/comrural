import { useEffect, useMemo, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { laboratoryReportsService } from '../../services/laboratoryReportsService'
import Badge from '../Badge.jsx'
import BotonVolver from '../BotonVolver.jsx'
import TarjetaCategoria from './TarjetaCategoria.jsx'
import PanelValidacionInforme from './PanelValidacionInforme.jsx'
import InformeAnalisisFisicoquimico from './InformeAnalisisFisicoquimico.jsx'
import InformeAnalisisMicrobiologico from './InformeAnalisisMicrobiologico.jsx'

// Snapshot version del contrato JSON de `reportData` — el backend no
// interpreta el contenido, solo lo guarda con este número al lado
// (informe_schema_version) para poder migrar el contrato el día que la
// planilla cambie de forma sin romper informes viejos.
const SCHEMA_VERSION = 1

const INFORME_POR_TIPO = {
  FISICO_QUIMICO: { Componente: InformeAnalisisFisicoquimico, label: 'Físico-Químico' },
  MICROBIOLOGICO: { Componente: InformeAnalisisMicrobiologico, label: 'Microbiológico' },
}
const ORDEN_TIPOS = ['FISICO_QUIMICO', 'MICROBIOLOGICO']

// Vista de "Iniciar análisis" — se abre desde SeccionSolicitudes.jsx sobre
// una solicitud con ensayos asignados a Laboratorio interno (ver
// FormularioAsignarLaboratorio.jsx). A diferencia de la versión vieja, ya NO
// agrupa por las 5 categorías del catálogo (PHYSICOCHEMICAL/MICROBIOLOGICAL/
// TOXICOLOGICAL/SENSORY/OTHER): agrupa por `internalReportType`
// (FISICO_QUIMICO agrupa químico+físico+sensorial, MICROBIOLOGICO va aparte)
// — es la granularidad real del backend (laboratory_reports.internal_report_type,
// ver docs/laboratory-executions-shipments-reports.md). Un ensayo sin
// planilla interna nunca llega acá: no puede asignarse a INTERNAL (lo
// rechaza el backend en assign-modality).
//
// Cada tipo tiene como mucho UN informe vigente por solicitud
// (laboratory_reports_one_current_internal_idx) — se crea la primera vez
// que se abre la tarjeta, y de ahí en más se reabre el mismo. El JSONB
// (`reportData`) se guarda con bloqueo optimista (reportDataVersion) y solo
// mientras el informe está en BORRADOR; al enviarlo a validación
// (PanelValidacionInforme.jsx) queda de solo lectura.
export default function FormularioIniciarAnalisis({ solicitud, onVolver }) {
  const [informes, setInformes] = useState(null) // { FISICO_QUIMICO?: informe, MICROBIOLOGICO?: informe }
  const [error, setError] = useState(null)
  const [tipoAbierto, setTipoAbierto] = useState(null)
  const [creando, setCreando] = useState(null)
  const [validando, setValidando] = useState(false)
  // Buffer editable local — tipear NO guarda en cada tecla (mismo criterio
  // que FormularioInspeccion.jsx). Se sincroniza desde `informe.reportData`
  // recién al ABRIR una planilla, y solo se manda al servidor con
  // "Guardar"/"Enviar a validación".
  const [valoresLocal, setValoresLocal] = useState({})

  const itemsInternos = useMemo(
    () => solicitud.items.filter((i) => i.status !== 'REMOVED' && i.assignedExecutionMode === 'INTERNAL'),
    [solicitud.items],
  )

  const gruposPorTipo = useMemo(() => {
    const mapa = new Map()
    for (const item of itemsInternos) {
      if (!item.internalReportType) continue // no debería pasar (ver assign-modality), defensivo
      if (!mapa.has(item.internalReportType)) mapa.set(item.internalReportType, [])
      mapa.get(item.internalReportType).push(item)
    }
    return ORDEN_TIPOS.filter((t) => mapa.has(t)).map((t) => [t, mapa.get(t)])
  }, [itemsInternos])

  const cargarInformes = () => {
    laboratoryReportsService
      .listarPorSolicitud(solicitud.id)
      .then((lista) => {
        const vigentes = {}
        for (const informe of lista) {
          if (informe.origin !== 'INTERNO') continue
          if (informe.status === 'REEMPLAZADO' || informe.status === 'ANULADO') continue
          vigentes[informe.internalReportType] = informe
        }
        setInformes(vigentes)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(cargarInformes, [solicitud.id])

  const abrirTipo = async (tipo, items) => {
    setError(null)
    if (informes[tipo]) {
      setValoresLocal(informes[tipo].reportData ?? {})
      setTipoAbierto(tipo)
      return
    }
    // Primera vez que se abre esta planilla: se crea el borrador vacío.
    setCreando(tipo)
    try {
      const creado = await laboratoryReportsService.crearInterno(solicitud.id, {
        internalReportType: tipo,
        itemIds: items.map((i) => i.id),
      })
      setInformes((prev) => ({ ...prev, [tipo]: creado }))
      setValoresLocal(creado.reportData ?? {})
      setTipoAbierto(tipo)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreando(null)
    }
  }

  const cambiarValor = (clave, valor) => setValoresLocal((prev) => ({ ...prev, [clave]: valor }))

  if (error) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {error}</p>
  }

  if (informes === null) {
    return <p className="text-sm text-marron-cafe/50">Cargando…</p>
  }

  if (tipoAbierto) {
    const informe = informes[tipoAbierto]
    const { Componente } = INFORME_POR_TIPO[tipoAbierto]
    const finalizada = informe.status !== 'BORRADOR'

    const guardar = async () => {
      const actualizado = await laboratoryReportsService.guardarDatos(informe.id, {
        reportData: valoresLocal,
        reportSchemaVersion: SCHEMA_VERSION,
        expectedDataVersion: informe.reportDataVersion,
      })
      setInformes((prev) => ({ ...prev, [tipoAbierto]: actualizado }))
      return actualizado
    }

    const enviarAValidacion = async () => {
      await guardar()
      const actualizado = await laboratoryReportsService.enviarAValidacion(informe.id)
      setInformes((prev) => ({ ...prev, [tipoAbierto]: actualizado }))
    }

    const validar = async () => {
      setValidando(true)
      try {
        const actualizado = await laboratoryReportsService.validar(informe.id)
        setInformes((prev) => ({ ...prev, [tipoAbierto]: actualizado }))
      } catch (err) {
        setError(err.message)
      } finally {
        setValidando(false)
      }
    }

    return (
      <div className="flex flex-col gap-4">
        <Componente
          solicitud={solicitud}
          estado={finalizada ? 'FINALIZADO' : 'GUARDADO'}
          valores={valoresLocal}
          onCambiarValor={cambiarValor}
          onVolver={() => {
            setTipoAbierto(null)
            cargarInformes()
          }}
          onGuardar={guardar}
          onFinalizar={enviarAValidacion}
        />
        <PanelValidacionInforme
          informe={informe}
          validando={validando}
          onDocumentoAdjuntado={async (documento) => {
            const actualizado = await laboratoryReportsService.adjuntarDocumento(informe.id, documento.id)
            setInformes((prev) => ({ ...prev, [tipoAbierto]: actualizado }))
          }}
          onValidar={validar}
        />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-marron-tierra/10 pb-4">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a Solicitudes" />
        <div className="flex min-w-0 flex-1 basis-[220px] items-center gap-3">
          <div className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque sm:flex">
            <FlaskConical className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-marron-cafe sm:text-lg">Iniciar análisis — {solicitud.sample.code}</h2>
            <p className="truncate text-xs text-marron-cafe/60">
              Lote {solicitud.lot.code} · {solicitud.product.name}
              {solicitud.supplier ? ` · ${solicitud.supplier.name}` : ''}
            </p>
          </div>
        </div>
        <Badge tono={solicitud.effectiveType === 'EXPRESS' ? 'positivo' : 'neutro'} className="shrink-0 self-center">
          {solicitud.effectiveType}
        </Badge>
      </div>

      <p className="text-xs text-marron-cafe/50">Elegí una planilla para ver o cargar sus resultados.</p>

      {gruposPorTipo.length === 0 ? (
        <p className="rounded-3xl bg-marron-tierra/5 px-4 py-10 text-center text-sm text-marron-cafe/50">
          Esta solicitud no tiene ensayos internos activos.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {gruposPorTipo.map(([tipo, items]) => {
            const informe = informes[tipo]
            const estado = !informe ? 'SIN_INICIAR' : informe.status === 'BORRADOR' ? 'GUARDADO' : 'FINALIZADO'
            return (
              <TarjetaCategoria
                key={tipo}
                categoria={tipo === 'FISICO_QUIMICO' ? 'PHYSICOCHEMICAL' : 'MICROBIOLOGICAL'}
                cantidadEnsayos={items.length}
                estado={estado}
                onClick={() => abrirTipo(tipo, items)}
              />
            )
          })}
        </div>
      )}
      {creando && <p className="text-xs text-marron-cafe/50">Abriendo planilla {INFORME_POR_TIPO[creando].label}…</p>}
    </section>
  )
}
