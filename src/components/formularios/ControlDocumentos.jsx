import FilaPreguntaSiNo from './FilaPreguntaSiNo.jsx'

// Sección "CONTROL DE DOCUMENTOS" del papel P-ADM-03/R-02: dos preguntas,
// Lista de Productores y Guía de Remisión.
//
// Antes esto era una tabla propia con encabezado DESCRIPCIÓN/CUMPLE — pero
// es la misma clase de dato que Condiciones de llegada del formulario de
// Inspección (pregunta → Sí/No → observación), y no se veía igual. Pedido
// explícito de Facundo viendo las dos capturas lado a lado: "siempre que
// haya este formato... es un formato predeterminado" — usa el mismo
// renglón (FilaPreguntaSiNo.jsx), no una tabla aparte.
//
// La observación es OBLIGATORIA en cuanto la respuesta es "No" — el
// backend exige `producerListNotes`/`shippingGuideNotes` en ese caso — así
// que queda siempre desplegada y sin botón para cerrarla
// (`observacionObligatoria`), a diferencia de Condiciones de llegada donde
// la observación siempre es opcional.
const DOCUMENTOS = [
  { clave: 'productores', pregunta: '¿Tiene lista de productores?' },
  { clave: 'guia', pregunta: '¿Tiene guía de remisión?' },
]

export default function ControlDocumentos({ valores, onCambiar, soloLectura = false }) {
  return (
    <ol className="flex flex-col gap-2">
      {DOCUMENTOS.map(({ clave, pregunta }, i) => (
        <FilaPreguntaSiNo
          key={clave}
          numero={i + 1}
          pregunta={pregunta}
          valor={valores[clave]?.verificado ?? null}
          observacion={valores[clave]?.notas ?? ''}
          onCambiar={(v) => onCambiar(clave, 'verificado', v)}
          onCambiarObservacion={(t) => onCambiar(clave, 'notas', t)}
          soloLectura={soloLectura}
          observacionObligatoria={valores[clave]?.verificado === false}
        />
      ))}
    </ol>
  )
}
