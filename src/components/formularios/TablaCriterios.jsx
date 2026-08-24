import { CircleAlert, CircleCheck } from 'lucide-react'
import FilaPreguntaSiNo from './FilaPreguntaSiNo.jsx'

// Sección 2 del papel: condiciones de llegada del transporte.
//
// En la hoja esto es una tabla de 4 columnas (CRITERIOS | SÍ | NO |
// OBSERVACIONES), y así estaba maquetado. No funcionó: las preguntas son
// largas —hay una de 24 palabras— y al quedar en media pantalla el texto se
// partía en cinco renglones mientras el par Sí/No quedaba lejos, a la
// derecha. Ahora es un listado vertical a todo el ancho, y cada renglón se
// lee de izquierda a derecha en el orden en que se responde: pregunta →
// Sí/No.
//
// Sin columna de observación a propósito: `raw_material_inspections` y
// `form_responses` no tienen ninguna columna para guardar una nota por
// criterio (las 8 preguntas son BOOLEAN sueltos, sin ítem TEXT hermano) —
// se probó mostrarla igual (campo local, sin guardar) y se sacó porque era
// un campo que parecía persistirse y no lo hacía. `FilaPreguntaSiNo` sigue
// soportando observación para quien SÍ la persiste (Control de Documentos),
// simplemente acá no se le pasa `onCambiarObservacion`.
export default function TablaCriterios({ items, valorDe, onCambiar, soloLectura = false, codigoDecisivo }) {
  const sinResponder = items.filter((item) => valorDe(item) === null)
  const decisivoSinResponder = codigoDecisivo && sinResponder.some((item) => item.code === codigoDecisivo)

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {items.map((item, i) => (
          <FilaPreguntaSiNo
            key={item.id}
            numero={i + 1}
            pregunta={item.label}
            valor={valorDe(item)}
            onCambiar={(v) => onCambiar(item, v)}
            soloLectura={soloLectura}
            destacada={item.code === codigoDecisivo}
            avisoSiVacia='Sin esta respuesta no se puede cerrar la inspección — si es "No", se rechaza el lote completo.'
          />
        ))}
      </ol>

      <ContadorPendientes total={items.length} sinResponder={sinResponder.length} decisivaFalta={decisivoSinResponder} />
    </div>
  )
}

// Aviso de completitud al pie de la sección.
//
// Existe porque el costo de darse cuenta tarde es alto: hoy, si falta una
// respuesta obligatoria, el error aparece recién al intentar finalizar la
// inspección, como un 400 del backend que enumera códigos internos de ítem
// (`bags_properly_sewn`) en vez de decir cuál pregunta quedó en blanco. Para
// entonces el analista ya cerró el lote y se fue del galpón. Contar acá, en
// vivo, convierte eso en un dato visible mientras todavía está parado
// delante de los sacos.
function ContadorPendientes({ total, sinResponder, decisivaFalta }) {
  const completo = sinResponder === 0

  return (
    <p
      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
        completo
          ? 'bg-verde-hoja/15 text-verde-bosque'
          : decisivaFalta
            ? 'bg-marron-arcilla/18 text-marron-arcilla'
            : 'bg-marron-tierra/12 text-marron-cafe'
      }`}
    >
      {completo ? (
        <CircleCheck className="size-4 shrink-0" strokeWidth={2.5} />
      ) : (
        <CircleAlert className="size-4 shrink-0" strokeWidth={2.5} />
      )}
      {completo
        ? `Las ${total} condiciones están respondidas.`
        : `Faltan ${sinResponder} de ${total} condiciones por responder${decisivaFalta ? ', incluida la obligatoria' : ''}.`}
    </p>
  )
}
