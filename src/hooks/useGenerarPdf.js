import { useRef, useState } from 'react'

// PDF real, no un screenshot de window.print() — mismo mecanismo que ya usan
// FormularioInspeccionMateriaPrima.jsx y NotaRecepcionMateriaPrima.jsx
// (captura el área imprimible ya aislada a un canvas de buena resolución y
// arma un PDF paginado a A4 con jsPDF), extraído acá como hook para no
// tener una tercera copia del mismo bloque en InformeAnalisisFisicoquimico.jsx.
//
// Uso:
//   const { areaImprimibleRef, generandoPdf, errorPdf, generarPdf } = useGenerarPdf()
//   <div ref={areaImprimibleRef}>...</div>
//   <button onClick={generarPdf} disabled={generandoPdf}>Imprimir</button>
export function useGenerarPdf({ backgroundColor = '#ffffff' } = {}) {
  const areaImprimibleRef = useRef(null)
  const [generandoPdf, setGenerandoPdf] = useState(false)
  const [errorPdf, setErrorPdf] = useState(null)

  const generarPdf = async () => {
    // Se abre la pestaña ANTES de esperar nada async — si se abre recién
    // después del await, la mayoría de los navegadores lo trata como popup
    // no disparado por el usuario y lo bloquea en silencio.
    const ventana = window.open('', '_blank')
    setGenerandoPdf(true)
    setErrorPdf(null)
    try {
      // Deja que React termine de pintar el estado actual antes de
      // capturar — sin este respiro el canvas se toma con el DOM todavía
      // en el estado de un frame atrás.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const nodo = areaImprimibleRef.current
      if (!nodo) throw new Error('No se encontró el contenido para imprimir.')
      const canvas = await html2canvas(nodo, { scale: 2, backgroundColor, useCORS: true })
      const imagen = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const anchoPagina = pdf.internal.pageSize.getWidth()
      const altoPagina = pdf.internal.pageSize.getHeight()
      const altoImagen = (canvas.height * anchoPagina) / canvas.width
      let alturaRestante = altoImagen
      let posicionY = 0
      pdf.addImage(imagen, 'JPEG', 0, posicionY, anchoPagina, altoImagen)
      alturaRestante -= altoPagina
      while (alturaRestante > 0) {
        posicionY = alturaRestante - altoImagen
        pdf.addPage()
        pdf.addImage(imagen, 'JPEG', 0, posicionY, anchoPagina, altoImagen)
        alturaRestante -= altoPagina
      }
      const url = URL.createObjectURL(pdf.output('blob'))
      if (ventana) ventana.location.href = url
      else window.open(url, '_blank') // el navegador no bloqueó el popup — fallback igual, por las dudas
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      ventana?.close()
      setErrorPdf(err.message ?? 'No se pudo generar el PDF.')
    } finally {
      setGenerandoPdf(false)
    }
  }

  return { areaImprimibleRef, generandoPdf, errorPdf, generarPdf }
}
