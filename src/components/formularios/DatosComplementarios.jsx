import { Wand2 } from 'lucide-react'
import Button from '../Button.jsx'

// Sección 5 del papel: DATOS COMPLEMENTARIOS.
//
// Los tres datos se pueden cargar a mano O traer del sistema con el botón
// "Traer del sistema", que los completa de una. Las dos formas conviven por
// la misma razón que en las horas: el sistema ya sabe estos números, pero no
// siempre a tiempo ni siempre bien, y el analista tiene que poder escribir
// lo que de verdad midió.
//
// De dónde sale cada uno cuando se autocompleta:
//   - Total recibido   → `summary.receivedPackageCount`, lo cargó Almacén.
//   - Total peso neto  → `summary.acceptedNetWeightKg`. Ojo: Almacén lo
//     registra al CERRAR la recepción, y el backend solo lo habilita después
//     de que Calidad ya resolvió (`canRegisterWeight`). Mientras el analista
//     llena esta hoja, ese número normalmente todavía no existe — por eso el
//     campo queda escribible en vez de mostrar un "—" muerto.
//   - ¿Se acepta?      → la decisión de la resolución de Calidad, que es un
//     paso posterior con su propio endpoint.
//
// Las fórmulas de cálculo propias (los métodos que usa Calidad) todavía no
// están definidas — cuando lleguen, entran acá como opciones del mismo botón,
// sin tocar la disposición.
export default function DatosComplementarios({ valores, onCambiar, summary, decision, soloLectura = false }) {
  const hayAlgoQueTraer = summary?.receivedPackageCount != null || summary?.acceptedNetWeightKg != null || decision != null

  const traerDelSistema = () => {
    if (summary?.receivedPackageCount != null) onCambiar('totalRecibido', summary.receivedPackageCount)
    if (summary?.acceptedNetWeightKg != null) onCambiar('pesoNeto', summary.acceptedNetWeightKg)
    if (decision != null) onCambiar('seAcepta', decision === 'APROBADA')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoNumero
          id="total-recibido"
          label="Total recibido"
          unidad="envases"
          valor={valores.totalRecibido}
          onChange={(v) => onCambiar('totalRecibido', v)}
          disabled={soloLectura}
          origen="Lo carga Almacén al abrir la recepción"
        />
        <CampoNumero
          id="peso-neto"
          label="Total peso neto"
          unidad="kg"
          paso="0.01"
          valor={valores.pesoNeto}
          onChange={(v) => onCambiar('pesoNeto', v)}
          disabled={soloLectura}
          origen="Lo registra Almacén al cerrar la recepción"
        />
        <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-verde-bosque/85">
            ¿Se acepta la materia prima?
          </span>
          <div className="mt-1 flex gap-1.5">
            {[
              { valor: true, etiqueta: 'Sí' },
              { valor: false, etiqueta: 'No' },
            ].map((op) => {
              const activo = valores.seAcepta === op.valor
              return (
                <button
                  key={op.etiqueta}
                  type="button"
                  aria-pressed={activo}
                  disabled={soloLectura}
                  onClick={() => onCambiar('seAcepta', activo ? null : op.valor)}
                  className={`min-w-12 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    activo ? 'bg-verde-lima text-marron-cafe' : 'bg-marron-tierra/10 text-marron-cafe/70 hover:bg-marron-tierra/20'
                  } ${soloLectura ? 'opacity-50' : ''}`}
                >
                  {op.etiqueta}
                </button>
              )
            })}
          </div>
          <span className="mt-auto pt-2 text-xs text-marron-cafe/65">Se confirma al emitir la resolución</span>
        </div>
      </div>

      {!soloLectura && (
        <Button
          variant="secondary"
          disabled={!hayAlgoQueTraer}
          onClick={traerDelSistema}
          className="w-fit gap-1.5 px-4 py-2 text-xs"
        >
          <Wand2 className="size-3.5" strokeWidth={1.75} />
          Traer del sistema
        </Button>
      )}
    </div>
  )
}

function CampoNumero({ id, label, unidad, valor, onChange, disabled, origen, paso = '1' }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/70 p-4">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-verde-bosque/85">
        {label}
      </label>
      <div className="mt-1 flex items-baseline gap-1.5">
        <input
          id={id}
          type="number"
          step={paso}
          min={0}
          value={valor ?? ''}
          disabled={disabled}
          placeholder="—"
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full rounded-xl border border-marron-tierra/25 bg-white px-3 py-2 text-sm tabular-nums font-semibold text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/70"
        />
        <span className="shrink-0 text-xs text-marron-cafe/70">{unidad}</span>
      </div>
      <span className="mt-auto pt-2 text-xs text-marron-cafe/65">{origen}</span>
    </div>
  )
}
