// Bloque numerado del formulario ("1. DATOS GENERALES", "2. CONDICIONES
// LLEGADA DE TRANSPORTE"...). En el papel la numeración es parte del
// título; acá se pasa aparte para que el número no se pueda desincronizar
// del orden real en que se renderizan las secciones.
//
// Superficie plana con tinte verde (`bg-verde-pistacho/25`), nunca sombra —
// Regla Plana por Defecto de DESIGN.md. El tinte pasó de marrón a verde
// porque sobre el fondo crema el marrón al 5% era indistinguible del fondo:
// las secciones no se leían como bloques separados.
//
// `acciones` es el rincón derecho del título de la sección — para acciones
// que pertenecen a ESA sección y no a la pantalla entera.
export default function SeccionFormulario({ numero, titulo, nota, acciones, children, className = '' }) {
  return (
    <section className={`flex flex-col gap-4 rounded-3xl bg-verde-pistacho/25 p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex items-start gap-3">
          {/* El número va en pastilla verde y no como "1." en el texto: es el
              ancla que permite saltar de la pantalla al renglón del papel, y
              en gris se perdía adentro del título. */}
          {numero != null && (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-verde-bosque text-xs font-bold text-crema-quinua">
              {numero}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">{titulo}</h2>
            {nota && <p className="text-xs text-marron-cafe/70">{nota}</p>}
          </div>
        </div>
        {acciones && <div className="shrink-0">{acciones}</div>}
      </div>
      {children}
    </section>
  )
}
