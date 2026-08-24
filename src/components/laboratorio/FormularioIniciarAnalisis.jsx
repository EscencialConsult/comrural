import { useMemo, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { ORDEN_CATEGORIAS } from '../../config/analisisCategorias'
import { useAnalisisDraft } from '../../hooks/useAnalisisDraft'
import Badge from '../Badge.jsx'
import BotonVolver from '../BotonVolver.jsx'
import TarjetaCategoria from './TarjetaCategoria.jsx'
import InformeAnalisisFisicoquimico from './InformeAnalisisFisicoquimico.jsx'
import InformeAnalisisMicrobiologico from './InformeAnalisisMicrobiologico.jsx'
import FormularioResultadosCategoria from './FormularioResultadosCategoria.jsx'

// Categorías con su propio documento oficial ya maquetado — cada una
// recibe `solicitud` completa además de las props comunes (estado/
// valores/onCambiarValor/onGuardar/onFinalizar/onVolver), porque arman
// planillas FIJAS (P-LAB-10/R-04, P-LAB-06/R-07) que no dependen de qué
// ensayos eligió Calidad. La categoría que no está acá cae al formulario
// genérico por ensayo, FormularioResultadosCategoria.jsx.
const INFORME_POR_CATEGORIA = {
  PHYSICOCHEMICAL: InformeAnalisisFisicoquimico,
  MICROBIOLOGICAL: InformeAnalisisMicrobiologico,
}

// Vista de "Iniciar análisis" — se abre al clicar el botón homónimo en
// SeccionPendientes.jsx sobre una solicitud RECIBIDA. Agrupa por categoría
// los ensayos ACTIVOS de la solicitud (GET /analysis-requests/:id, ya trae
// `items[].category` — ver docs/laboratory.md §5.6) en tarjetas de
// categoría; clicar una navega a pantalla completa a su propio formulario
// de resultados — ver INFORME_POR_CATEGORIA para las que ya tienen
// documento oficial, el resto cae a un formulario genérico
// (FormularioResultadosCategoria.jsx).
//
// El backend todavía no tiene endpoint para registrar resultados de
// ensayos (fuera de alcance del módulo laboratory actual, ver §1 de la
// doc) — "Guardar cambios"/"Finalizar categoría" son 100% mock: persisten
// solo en localStorage vía useAnalisisDraft.js, para poder cerrar esta
// vista y reanudar después sin perder lo tipeado. Reemplazar por llamadas
// reales en cuanto exista el endpoint.
export default function FormularioIniciarAnalisis({ solicitud, onVolver }) {
  const { categoria, cambiarValor, guardarCategoria, finalizarCategoria } = useAnalisisDraft(solicitud.id)
  const [categoriaAbierta, setCategoriaAbierta] = useState(null)

  const porCategoria = useMemo(() => {
    const mapa = new Map()
    for (const item of solicitud.items) {
      if (!mapa.has(item.category)) mapa.set(item.category, [])
      mapa.get(item.category).push(item)
    }
    return ORDEN_CATEGORIAS.filter((c) => mapa.has(c)).map((c) => [c, mapa.get(c)])
  }, [solicitud.items])

  if (categoriaAbierta) {
    const draft = categoria(categoriaAbierta)
    const props = {
      estado: draft.estado,
      valores: draft.valores,
      onCambiarValor: (clave, valor) => cambiarValor(categoriaAbierta, clave, valor),
      onGuardar: () => guardarCategoria(categoriaAbierta),
      onFinalizar: () => finalizarCategoria(categoriaAbierta),
      onVolver: () => setCategoriaAbierta(null),
    }
    const Informe = INFORME_POR_CATEGORIA[categoriaAbierta]
    if (Informe) {
      return <Informe solicitud={solicitud} {...props} />
    }
    const items = porCategoria.find(([c]) => c === categoriaAbierta)?.[1] ?? []
    return <FormularioResultadosCategoria categoria={categoriaAbierta} items={items} {...props} />
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Sin fondo en tarjeta a propósito — con el mismo tinte que
          TarjetaCategoria.jsx (bg-marron-tierra/5) se leía como una
          categoría más de la lista. Un borde inferior alcanza para
          separarlo del contenido sin que compita visualmente con las
          tarjetas de abajo.
          `flex-wrap` + `basis` en el bloque de texto: si no entra volver +
          título + badge en una fila, el badge (shrink-0, último ítem) cae
          a su propia línea en vez de forzar el título a truncar — el
          título nunca corta, solo hace salto de línea. */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-marron-tierra/10 pb-4">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a Pendientes" />
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

      <p className="text-xs text-marron-cafe/50">Elegí una categoría para ver o cargar sus resultados.</p>

      {porCategoria.length === 0 ? (
        <p className="rounded-3xl bg-marron-tierra/5 px-4 py-10 text-center text-sm text-marron-cafe/50">
          Esta solicitud no tiene ensayos activos.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {porCategoria.map(([cat, items]) => (
            <TarjetaCategoria
              key={cat}
              categoria={cat}
              cantidadEnsayos={items.length}
              estado={categoria(cat).estado}
              onClick={() => setCategoriaAbierta(cat)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
