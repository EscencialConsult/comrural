import { PlayCircle, Printer, ShieldCheck } from 'lucide-react'
import { CATEGORIA_LABEL, CATEGORIA_ICON, CATEGORIA_ESTILO, ESTADO_CATEGORIA_LABEL, ESTADO_CATEGORIA_TONO } from '../../config/analisisCategorias'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'

// Tarjeta de categoría — puerta de entrada al formulario de resultados de
// esa categoría (InformeAnalisisFisicoquimico.jsx para PHYSICOCHEMICAL,
// FormularioResultadosCategoria.jsx genérico para el resto), o al registro
// de envío externo si `esExterno` (ver CATEGORIAS_EXTERNAS en
// analisisCategorias.js — hoy solo Toxicológico). No despliega nada
// inline: cada categoría tiene un formulario propio y potencialmente
// largo (ver P-LAB-10/R-04), así que a pedido explícito la tarjeta no es
// clicable entera — solo el botón de acción abre la pantalla completa.
//
// `flex-wrap` en vez de breakpoints `sm:`/`lg:` a propósito: esta tarjeta
// vive dentro de una grilla (FormularioIniciarAnalisis.jsx la muestra en
// 1/2/3 columnas según el viewport), así que su ancho real no coincide con
// el ancho de la ventana — un breakpoint de Tailwind fallaría en una
// celda angosta dentro de una ventana ancha. El wrap se resuelve solo
// contra el espacio disponible de la tarjeta, sea cual sea.
export default function TarjetaCategoria({ categoria, cantidadEnsayos, estado, esExterno = false, onClick }) {
  const Icono = CATEGORIA_ICON[categoria]
  const estilo = CATEGORIA_ESTILO[categoria]
  // Categoría ya finalizada: no hay nada más que "iniciar" — el botón pasa
  // a "Imprimir" y el clic ya genera el PDF directo (ver `autoImprimir` en
  // FormularioIniciarAnalisis.jsx), no solo abre la pantalla de solo
  // lectura a esperar un segundo clic ahí adentro.
  const finalizada = estado === 'FINALIZADO'

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border-l-4 bg-marron-tierra/5 p-4 ${estilo.borde}`}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${estilo.icono}`}>
          <Icono className="size-4" strokeWidth={1.75} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold text-marron-cafe">{CATEGORIA_LABEL[categoria]}</span>
          <span className="text-xs text-marron-cafe/50">
            {cantidadEnsayos} ensayo{cantidadEnsayos === 1 ? '' : 's'}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* El estado SIN_INICIAR/GUARDADO/FINALIZADO viene del borrador
            mock de resultados (useAnalisisDraft.js) — no aplica a
            Toxicológico, que no pasa por ese formulario, así que no
            muestra badge acá. */}
        {!esExterno && <Badge tono={ESTADO_CATEGORIA_TONO[estado]}>{ESTADO_CATEGORIA_LABEL[estado]}</Badge>}
        <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={onClick}>
          {esExterno ? (
            <>
              <ShieldCheck className="size-3.5" strokeWidth={2} />
              Autorizar envío
            </>
          ) : finalizada ? (
            <>
              <Printer className="size-3.5" strokeWidth={2} />
              Imprimir
            </>
          ) : (
            <>
              <PlayCircle className="size-3.5" strokeWidth={2} />
              Iniciar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
