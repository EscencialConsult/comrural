import { useState } from 'react'
import { CheckCircle2, Download, FileUp, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { documentsService } from '../../services/documentsService'
import { toast } from '../../lib/toast'
import Button from '../Button.jsx'

// Panel que acompaña a un informe interno ya enviado a validación —
// se muestra DEBAJO de la planilla (InformeAnalisisFisicoquimico.jsx /
// InformeAnalisisMicrobiologico.jsx), que a partir de PENDIENTE_VALIDACION
// queda de solo lectura. Acá vive lo que falta para cerrarlo:
//
//   PENDIENTE_VALIDACION sin PDF  → generar+subir+descargar el PDF (un
//                                    solo botón, ver `generarYSubir` abajo)
//   PENDIENTE_VALIDACION con PDF  → validar (permiso laboratory-reports:validate)
//   VALIDADO                      → solo el enlace de descarga
//
// "Firmas" en el sentido de firma digital NO existe todavía en el sistema —
// esto es la misma mecánica que ya usa el resto de la app (quién y cuándo
// hizo la acción, gateado por permiso), no una firma electrónica.
export default function PanelValidacionInforme({ informe, onDocumentoAdjuntado, onValidar, validando, generarPdfComoArchivo }) {
  const { permisos } = useAuth()
  const puedeGestionar = permisos.has('laboratory-reports:manage')
  const puedeValidar = permisos.has('laboratory-reports:validate')
  const [generandoYSubiendo, setGenerandoYSubiendo] = useState(false)
  const [errorGeneracion, setErrorGeneracion] = useState(null)

  if (informe.status === 'BORRADOR') return null

  const descargar = async () => {
    try {
      const url = await documentsService.urlDescarga(informe.documentId)
      window.open(url, '_blank')
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Antes: "Imprimir" generaba el PDF en una pestaña aparte, el usuario lo
  // descargaba a mano y después lo volvía a elegir en un selector de
  // archivo para subirlo — dos pasos manuales sobre el mismo archivo. Ahora
  // un solo botón genera el PDF de la planilla, lo sube como documento del
  // informe Y además lo descarga localmente, para que quede una copia en
  // el equipo sin el paso manual.
  const generarYSubir = async () => {
    setErrorGeneracion(null)
    setGenerandoYSubiendo(true)
    try {
      const archivo = await generarPdfComoArchivo(`informe-${informe.id}.pdf`)

      const urlDescarga = URL.createObjectURL(archivo)
      const enlace = document.createElement('a')
      enlace.href = urlDescarga
      enlace.download = archivo.name
      enlace.click()
      setTimeout(() => URL.revokeObjectURL(urlDescarga), 60_000)

      const documento = await documentsService.subir(archivo)
      await onDocumentoAdjuntado(documento)
      toast.success('PDF generado, subido y descargado.')
    } catch (err) {
      setErrorGeneracion(err.message)
    } finally {
      setGenerandoYSubiendo(false)
    }
  }

  if (informe.status === 'VALIDADO') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-verde-hoja/10 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-verde-bosque" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-verde-bosque">Informe validado</p>
          <p className="text-xs text-verde-bosque/70">
            {new Date(informe.validatedAt).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <Button type="button" variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={descargar}>
          <Download className="size-3.5" strokeWidth={2} />
          Descargar PDF
        </Button>
      </div>
    )
  }

  // PENDIENTE_VALIDACION
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-l-4 border-marron-arcilla/40 bg-marron-tierra/5 p-4">
      <p className="text-sm font-bold text-marron-cafe">Pendiente de validación</p>

      {!informe.documentId ? (
        puedeGestionar ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              disabled={generandoYSubiendo}
              onClick={generarYSubir}
              className="w-fit gap-1.5 px-3 py-1.5 text-xs"
            >
              {generandoYSubiendo ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                  Generando y subiendo…
                </>
              ) : (
                <>
                  <FileUp className="size-3.5" strokeWidth={2} />
                  Generar y subir PDF
                </>
              )}
            </Button>
            <p className="text-xs text-marron-cafe/45">Genera el PDF de la planilla de arriba, lo sube y lo descarga a tu equipo.</p>
            {errorGeneracion && <p className="text-xs font-medium text-rojo-pasankalla">{errorGeneracion}</p>}
          </div>
        ) : (
          <p className="text-xs text-marron-cafe/60">Falta adjuntar el PDF del informe.</p>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={descargar}>
            <Download className="size-3.5" strokeWidth={2} />
            Ver PDF adjunto
          </Button>
          {puedeValidar ? (
            <Button type="button" disabled={validando} onClick={onValidar} className="gap-1.5 px-3 py-1.5 text-xs">
              <ShieldCheck className="size-3.5" strokeWidth={2} />
              {validando ? 'Validando…' : 'Validar informe'}
            </Button>
          ) : (
            <span className="text-xs text-marron-cafe/50">Esperando validación.</span>
          )}
        </div>
      )}
    </div>
  )
}
