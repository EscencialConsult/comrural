import { useRef, useState } from 'react'
import { FileUp, FileCheck2, Loader2 } from 'lucide-react'
import { documentsService } from '../../services/documentsService'
import Button from '../Button.jsx'

// Subida de un PDF al almacenamiento privado. El archivo NO pasa por el
// backend: `documentsService.subir()` encadena los 3 pasos reales (crear la
// fila + URL firmada → PUT al bucket → confirmar), y el backend verifica
// contra el bucket el tamaño y el tipo REAL antes de darlo por bueno.
//
// Reutilizable: cualquier pantalla que necesite adjuntar un documento (hoy
// los informes de laboratorio, mañana facturas de Compras) puede usarlo
// pasando `onSubido`, que recibe el documento ya en estado DISPONIBLE.
export default function SubidorDocumento({
  etiqueta = 'Adjuntar PDF',
  ayuda,
  accept = 'application/pdf',
  disabled = false,
  onSubido,
}) {
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const [subido, setSubido] = useState(null)
  const [error, setError] = useState(null)

  const alElegir = async (e) => {
    const file = e.target.files?.[0]
    // Se limpia el input siempre: si no, elegir el mismo archivo dos veces
    // seguidas (después de un error) no dispara `change`.
    e.target.value = ''
    if (!file) return

    if (file.type && file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF.')
      return
    }

    setError(null)
    setSubiendo(true)
    try {
      const documento = await documentsService.subir(file)
      setSubido({ ...documento, nombre: file.name })
      await onSubido?.(documento)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={inputRef} type="file" accept={accept} onChange={alElegir} className="hidden" />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || subiendo}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5"
        >
          {subiendo ? (
            <>
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              Subiendo…
            </>
          ) : (
            <>
              <FileUp className="size-4" strokeWidth={2} />
              {etiqueta}
            </>
          )}
        </Button>

        {subido && !subiendo && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-verde-bosque">
            <FileCheck2 className="size-4 shrink-0" strokeWidth={2} />
            {subido.nombre}
          </span>
        )}
      </div>

      {ayuda && !error && <p className="text-xs text-marron-cafe/45">{ayuda}</p>}
      {error && <p className="text-xs font-medium text-rojo-pasankalla">{error}</p>}
    </div>
  )
}
