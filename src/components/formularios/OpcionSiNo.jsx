// Par SÍ/NO explícito — reemplaza al <Switch/> para las preguntas booleanas
// del formulario de inspección.
//
// Por qué NO un switch: un switch tiene dos estados (prendido/apagado) y no
// puede representar "todavía no respondí". El renderer viejo
// (FormularioInspeccion.jsx) tuvo que rastrear los ítems tocados en un Set
// aparte justamente por eso, y aun así, si la respuesta correcta era "No" y
// el usuario no movía nada, el campo quedaba sin responder y el backend
// rechazaba el cierre sin que se viera por qué en pantalla.
//
// Acá el tercer estado es `null` y es visible: ninguna de las dos pastillas
// queda marcada, y las dos muestran un borde que pide ser tocado. Además es
// la misma forma que tiene el papel (dos casilleros, SÍ y NO), que es lo que
// la gente de planta ya conoce.
//
// Es el control con más peso visual de la sección a propósito: responder
// estas ocho preguntas ES la sección, todo lo demás la acompaña. Pastillas
// grandes, texto en mayúscula y borde marcado cuando están sin responder —
// antes eran dos chips chicos y grises que se perdían al costado del texto.
//
// El seleccionado va SIEMPRE en verde lima, tanto para Sí como para No: no
// hay una respuesta buena y una mala. En la pregunta 2 ("¿se transportan
// sustancias peligrosas?") la respuesta deseable es "No", y pintar ese "No"
// de color de alerta induciría a error justo donde más importa.
const OPCIONES = [
  { valor: true, etiqueta: 'Sí' },
  { valor: false, etiqueta: 'No' },
]

export default function OpcionSiNo({ valor, onChange, disabled = false, etiquetaAccesible }) {
  const sinResponder = valor === null || valor === undefined

  return (
    <div role="radiogroup" aria-label={etiquetaAccesible} className="flex gap-1.5">
      {OPCIONES.map((op) => {
        const activo = valor === op.valor
        return (
          <button
            key={op.etiqueta}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={disabled}
            onClick={() => onChange(activo ? null : op.valor)}
            className={`min-w-14 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors duration-150 ${
              activo
                ? 'border-verde-lima bg-verde-lima text-marron-cafe'
                : sinResponder
                  ? 'border-marron-tierra/35 bg-white text-marron-cafe/70 hover:border-verde-lima hover:text-marron-cafe'
                  : 'border-transparent bg-marron-tierra/8 text-marron-cafe/45 hover:bg-marron-tierra/15'
            } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
          >
            {op.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
