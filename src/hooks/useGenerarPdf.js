import { useRef, useState } from 'react'

// PDF real, no un screenshot de window.print() — captura el área imprimible
// ya aislada a un canvas de buena resolución y arma un PDF paginado a A4
// con jsPDF. Único lugar que genera PDFs en el proyecto — antes había 4
// copias casi idénticas de este mismo bloque (FormularioIngresoMateriaPrima.jsx,
// FormularioInspeccionMateriaPrima.jsx, NotaRecepcionMateriaPrima.jsx,
// InformeAnalisisFisicoquimico.jsx/InformeAnalisisMicrobiologico.jsx vía este
// hook) — se centralizan acá para arreglar el corte de página una sola vez,
// no cuatro.
//
// `html2canvas-pro` (no `html2canvas` a secas) — la paleta de este proyecto
// vive en Tailwind v4, que compila los modificadores de opacidad
// (`bg-x/25`, `text-x/60`...) a `color-mix(in oklab, ...)`; el html2canvas
// original no sabe parsear esa función CSS ("Attempting to parse an
// unsupported color function 'oklab'") y tira abajo la captura entera. El
// fork -pro es API-compatible pero sí soporta oklch/oklab/color-mix.
//
// Paginación "consciente del contenido": antes se cortaba el canvas entero
// a una altura de hoja FIJA, sin mirar qué había ahí — cualquier fila de
// tabla, párrafo o campo que cayera justo en el borde quedaba partido a la
// mitad entre una hoja y la siguiente.
//
// Primer intento (ya descartado): solo permitir el corte entre los HIJOS
// DIRECTOS del área imprimible (una sección entera = un bloque atómico).
// Funcionaba para no cortar nada, pero cuando una sección no entraba
// completa en lo que quedaba de hoja, saltaba entera a la siguiente —
// dejando mucho espacio en blanco debajo de secciones chicas que sí
// hubieran entrado junto con la próxima.
//
// Segundo intento (también descartado): "un corte es seguro si NINGÚN
// elemento del árbol lo atraviesa". Sonaba bien pero un contenedor
// (`<div>`, `<section>`, `<table>`, `<tr>`...) por definición mide desde
// el borde de su primer hijo hasta el de su último — así que CUALQUIER
// contenedor "atraviesa" cualquier corte interno suyo, y terminaba
// bloqueando todo igual que el primer intento (una tabla entera, por
// ejemplo, quedaba atómica solo por tener una celda con `rowSpan` que
// abarca todas sus filas).
//
// Ahora solo bloquean los elementos que tienen contenido PROPIO real —
// texto directo, un control atómico (input/select/textarea/botón/ícono),
// o una hoja sin hijos-elemento — nunca un simple contenedor que agrupa a
// otros. Eso deja que el corte pase por adentro de una sección, de una
// grilla, o entre filas de una tabla, sin nunca partir un campo o una
// fila real por la mitad.
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
      // en el estado de un frame atrás. `setTimeout`, no `requestAnimationFrame`:
      // `window.open()` de arriba enfoca la pestaña nueva, así que ESTA
      // pestaña (donde sigue corriendo esta función) queda en segundo
      // plano — y ahí los navegadores pausan rAF por completo (solo corre
      // en pestañas visibles), dejando esta espera colgada para siempre
      // hasta que alguien vuelva a esta pestaña a mano. Un timeout sigue
      // disparando igual en segundo plano (como mucho, más lento).
      await new Promise((resolve) => setTimeout(resolve, 50))
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
      const nodo = areaImprimibleRef.current
      if (!nodo) throw new Error('No se encontró el contenido para imprimir.')

      const topNodo = nodo.getBoundingClientRect().top
      const elementos = Array.from(nodo.querySelectorAll('*'))

      // Controles/gráficos que el navegador renderiza como una sola unidad
      // visual — no tiene sentido mirar sus hijos internos (las <option>
      // de un <select>, los <path> de un ícono svg) para decidir si
      // bloquean o no: si son ESTO, bloquean siempre.
      const TAGS_ATOMICOS = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'IMG', 'SVG', 'CANVAS'])

      // Texto suelto directamente adentro del elemento (no de un hijo) —
      // ej. la palabra del label en `<label>Fecha{"  "}<input/></label>`.
      // Si existe, ese elemento tiene que seguir bloqueando aunque tenga
      // hijos-elemento: sin esto, el corte podía caer entre el texto del
      // campo y su input, separándolos entre dos hojas.
      const tieneTextoPropio = (el) =>
        Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')

      const esBloqueante = (el) => {
        // Una <td>/<th> con rowSpan (ej. la columna "Categoría" fusionada
        // de TablaResultadosEnsayo.jsx) abarca TODAS las filas de esa
        // tabla por diseño — cortarla a la mitad entre dos hojas es
        // cosmético (la celda fusionada queda partida), no pérdida de
        // datos como cortar una fila real.
        if ((el.tagName === 'TD' || el.tagName === 'TH') && el.rowSpan > 1) return false
        if (TAGS_ATOMICOS.has(el.tagName)) return true
        if (el.children.length === 0) return true // hoja real (con o sin texto)
        return tieneTextoPropio(el) // envuelve texto propio + elementos — bloquea igual
      }

      // Rectángulo [top, bottom] de cada elemento BLOQUEANTE, en px del DOM
      // relativos al propio `nodo` — son los que un corte no puede
      // atravesar. Los candidatos a corte, en cambio, salen de TODOS los
      // elementos (bloqueantes o no): el borde inferior de un simple
      // contenedor suele ser justo el hueco que se quiere aprovechar.
      const rectsBloqueantes = elementos
        .filter(esBloqueante)
        .map((el) => {
          const r = el.getBoundingClientRect()
          return { top: r.top - topNodo, bottom: r.bottom - topNodo }
        })
        .filter((r) => r.bottom > r.top)

      const EPS = 0.5 // margen en px para no rechazar un corte por redondeo
      const cortesDom = [...new Set(elementos.map((el) => Math.round(el.getBoundingClientRect().bottom - topNodo)))]
        .filter((y) => y > 0)
        .filter((y) => rectsBloqueantes.every((r) => y <= r.top + EPS || y >= r.bottom - EPS))
        .sort((a, b) => a - b)

      const canvas = await html2canvas(nodo, { scale: 2, backgroundColor, useCORS: true })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const anchoPagina = pdf.internal.pageSize.getWidth()
      const altoPagina = pdf.internal.pageSize.getHeight()

      // `nodo.scrollHeight` (DOM) y `canvas.height` (rasterizado a `scale:
      // 2`) miden lo mismo a distinta resolución — este factor pasa
      // cualquier medida DOM a su equivalente en px del canvas, sea cual
      // sea el `scale` real que terminó usando html2canvas.
      const canvasPxPorDomPx = nodo.scrollHeight > 0 ? canvas.height / nodo.scrollHeight : 1
      const alturaPaginaPx = (altoPagina * canvas.width) / anchoPagina

      const cortesPx = cortesDom.map((y) => y * canvasPxPorDomPx).filter((y) => y > 0 && y < canvas.height)
      cortesPx.push(canvas.height) // el final del documento siempre es un corte válido
      cortesPx.sort((a, b) => a - b)

      let inicioPx = 0
      let primeraHoja = true
      while (inicioPx < canvas.height - 1) {
        const limitePx = inicioPx + alturaPaginaPx
        // el corte "seguro" más grande que todavía entra en esta hoja
        const candidatos = cortesPx.filter((c) => c > inicioPx && c <= limitePx)
        const cortePx = candidatos.length > 0 ? candidatos[candidatos.length - 1] : Math.min(limitePx, canvas.height)

        const altoSlicePx = Math.max(1, Math.round(cortePx - inicioPx))
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = canvas.width
        sliceCanvas.height = altoSlicePx
        sliceCanvas.getContext('2d').drawImage(canvas, 0, inicioPx, canvas.width, altoSlicePx, 0, 0, canvas.width, altoSlicePx)
        const imagenSlice = sliceCanvas.toDataURL('image/jpeg', 0.95)
        const altoSliceMm = (altoSlicePx * anchoPagina) / canvas.width

        if (!primeraHoja) pdf.addPage()
        pdf.addImage(imagenSlice, 'JPEG', 0, 0, anchoPagina, altoSliceMm)
        primeraHoja = false
        inicioPx += altoSlicePx
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
