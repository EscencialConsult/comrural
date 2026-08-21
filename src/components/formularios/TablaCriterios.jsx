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
// Sí/No → observación.
//
// La observación arranca PLEGADA, como un botón chico. Antes era un input a
// todo el ancho debajo de cada pregunta, y ocupaba tanto espacio como la
// pregunta misma aunque casi nunca se use: ocho campos vacíos empujaban la
// sección al doble de alto y competían con lo único que de verdad hay que
// responder. Se despliega al tocarlo, y si ya tiene texto se muestra abierta
// sola.
export default function TablaCriterios({
  items,
  valorDe,
  observacionDe,
  onCambiar,
  onCambiarObservacion,
  soloLectura = false,
  codigoDecisivo,
}) {
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
            observacion={observacionDe?.(item) ?? ''}
            onCambiar={(v) => onCambiar(item, v)}
            onCambiarObservacion={(t) => onCambiarObservacion(item, t)}
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
