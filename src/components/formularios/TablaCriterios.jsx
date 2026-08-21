import { useState } from 'react'
import { CircleAlert, CircleCheck, MessageSquarePlus, X } from 'lucide-react'
import OpcionSiNo from './OpcionSiNo.jsx'

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
          <CriterioFila
            key={item.id}
            item={item}
            numero={i + 1}
            valor={valorDe(item)}
            observacion={observacionDe?.(item) ?? ''}
            onCambiar={(v) => onCambiar(item, v)}
            onCambiarObservacion={(t) => onCambiarObservacion(item, t)}
            soloLectura={soloLectura}
            esDecisivo={item.code === codigoDecisivo}
          />
        ))}
      </ol>

      <ContadorPendientes total={items.length} sinResponder={sinResponder.length} decisivaFalta={decisivoSinResponder} />
    </div>
  )
}

function CriterioFila({ item, numero, valor, observacion, onCambiar, onCambiarObservacion, soloLectura, esDecisivo }) {
  const [abierta, setAbierta] = useState(false)
  const mostrarObservacion = abierta || observacion !== ''
  const respondido = valor !== null && valor !== undefined

  return (
    <li
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-4 transition-colors duration-150 ${
        esDecisivo ? 'bg-verde-pistacho/70 ring-1 ring-verde-hoja/40' : 'bg-white/80'
      }`}
    >
      <p className="min-w-56 flex-1 text-sm leading-relaxed text-marron-cafe">
        <span className="mr-2 font-bold text-verde-bosque/70">{numero}.</span>
        {item.label}
      </p>

      <div className="flex shrink-0 items-center gap-2">
        {/* La marca de "obligatoria" no va como asterisco al final del texto:
            en una pregunta de 24 palabras queda perdida en el último
            renglón. Va al lado de la respuesta, que es donde está el ojo
            cuando decide si contestar o saltear. */}
        {esDecisivo && (
          <span className="rounded-full bg-verde-bosque px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-crema-quinua">
            Obligatoria
          </span>
        )}
        <OpcionSiNo valor={valor} onChange={onCambiar} disabled={soloLectura} etiquetaAccesible={item.label} />
      </div>

      {mostrarObservacion ? (
        <div className="flex min-w-56 flex-1 items-center gap-1.5">
          <input
            type="text"
            value={observacion}
            disabled={soloLectura}
            autoFocus={abierta && observacion === ''}
            placeholder="Observación…"
            onChange={(e) => onCambiarObservacion(e.target.value)}
            aria-label={`Observación de: ${item.label}`}
            className="w-full rounded-xl border border-marron-tierra/25 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/60"
          />
          {!soloLectura && (
            <button
              type="button"
              aria-label="Quitar la observación"
              onClick={() => {
                onCambiarObservacion('')
                setAbierta(false)
              }}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-marron-cafe/65 transition-colors duration-150 hover:bg-marron-tierra/10 hover:text-marron-cafe"
            >
              <X className="size-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      ) : (
        !soloLectura && (
          <button
            type="button"
            onClick={() => setAbierta(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-marron-tierra/8 px-3 py-2 text-xs font-semibold text-marron-cafe/70 transition-colors duration-150 hover:bg-marron-tierra/18 hover:text-marron-cafe"
          >
            <MessageSquarePlus className="size-3.5" strokeWidth={2} />
            Observación
          </button>
        )
      )}

      {esDecisivo && !respondido && (
        <p className="w-full text-xs font-semibold text-marron-arcilla">
          Sin esta respuesta no se puede cerrar la inspección — si es "No", se rechaza el lote completo.
        </p>
      )}
    </li>
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
