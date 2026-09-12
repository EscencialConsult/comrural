// Encabezado del formulario impreso, traducido a pantalla.
//
// En el papel el encabezado es UNA franja donde conviven logo, título y la
// tabla de Código/Versión/Página. Acá se replica esa unidad: mismo fondo,
// mismo recuadro, todo junto — el logo a la izquierda como en la hoja, el
// nombre en el medio y los metadatos a la derecha.
//
// Es el mismo `logorealcolor.webp` que usa el sidebar expandido, no una
// versión aparte: si mañana cambia la marca, cambia en un solo lugar.
//
// `acciones` es el rincón superior derecho de la pantalla, para cualquier
// acción propia del formulario. Se recibe como slot en vez de cablearlo acá
// adentro para que la cabecera siga sirviendo para cualquier formulario,
// tenga o no esa acción.
export default function CabeceraFormulario({ antetitulo = 'Registro', titulo, codigo, version, pagina, acciones }) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/40 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        {/* `min-w-0` acá y en el bloque de texto: por defecto un ítem flex
            no se achica más allá del ancho de su contenido (min-width:
            auto), así que sin esto el título nunca llegaba a bajar de
            línea en mobile — el texto se cortaba contra el borde de la
            pantalla en vez de ajustarse. */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <img
            src="/logos/logorealcolor.webp"
            alt="COMRURAL XXI S.R.L."
            className="h-12 w-auto shrink-0 sm:h-16 lg:h-20"
            loading="lazy"
          />
          <div className="flex min-w-0 flex-col gap-0.5 border-l border-verde-bosque/20 pl-3 sm:pl-4">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-verde-bosque/80">{antetitulo}</span>
            <h1 className="text-lg font-extrabold tracking-tight text-marron-cafe sm:text-2xl">{titulo}</h1>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          {acciones}
          <dl className="flex flex-wrap items-center gap-2 sm:justify-end">
            <DatoCabecera etiqueta="Código" valor={codigo} />
            <DatoCabecera etiqueta="Versión" valor={version} />
            {pagina && <DatoCabecera etiqueta="Página" valor={pagina} />}
          </dl>
        </div>
      </div>
    </header>
  )
}

function DatoCabecera({ etiqueta, valor }) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-full bg-white/70 px-3.5 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-marron-cafe/60">{etiqueta}</dt>
      <dd className="text-sm font-semibold text-marron-cafe">{valor ?? '—'}</dd>
    </div>
  )
}
