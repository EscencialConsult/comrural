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
// `acciones` es el rincón superior derecho de la pantalla — el lugar fijo
// donde vive el aviso de "falta un dato en el sistema". Se recibe como slot
// en vez de cablearlo acá adentro para que la cabecera siga sirviendo para
// cualquier formulario, tenga o no esa acción.
export default function CabeceraFormulario({ antetitulo = 'Registro', titulo, codigo, version, pagina, acciones }) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/40 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <div className="flex items-center gap-4">
          <img
            src="/logos/logorealcolor.webp"
            alt="COMRURAL XXI S.R.L."
            className="h-16 w-auto shrink-0 sm:h-20"
            loading="lazy"
          />
          <div className="flex flex-col gap-0.5 border-l border-verde-bosque/20 pl-4">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-verde-bosque/80">{antetitulo}</span>
            <h1 className="text-2xl font-extrabold tracking-tight text-marron-cafe">{titulo}</h1>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {acciones}
          <dl className="flex flex-wrap items-center justify-end gap-2">
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
