import { Save, CircleCheck } from 'lucide-react'
import { CATEGORIA_LABEL, CATEGORIA_ICON, CATEGORIA_CAMPOS } from '../../config/analisisCategorias'
import BotonVolver from '../BotonVolver.jsx'
import Button from '../Button.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import FormTextarea from '../FormTextarea.jsx'

function CampoResultado({ campo, valor, onChange, soloLectura }) {
  if (campo.type === 'select') {
    return (
      <FormSelect label={campo.label} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} disabled={soloLectura}>
        <option value="">Seleccioná…</option>
        {campo.options.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </FormSelect>
    )
  }
  if (campo.type === 'textarea') {
    return (
      <FormTextarea label={campo.label} rows={2} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} disabled={soloLectura} />
    )
  }
  return (
    <FormInput
      label={campo.label}
      type={campo.type}
      placeholder={campo.placeholder}
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={soloLectura}
    />
  )
}

// Formulario de resultados GENÉRICO — se usa para cualquier categoría que
// todavía no tiene un documento oficial propio definido (hoy: todas menos
// Fisicoquímico, ver InformeAnalisisFisicoquimico.jsx para ese caso
// especial). Campos data-driven por CATEGORIA_CAMPOS
// (config/analisisCategorias.js) — mock sin confirmar, reemplazar por el
// documento real de cada categoría a medida que se defina, igual que se
// hizo con Fisicoquímico.
export default function FormularioResultadosCategoria({ categoria, items, estado, valores, onCambiarValor, onVolver, onGuardar, onFinalizar }) {
  const Icono = CATEGORIA_ICON[categoria]
  const campos = CATEGORIA_CAMPOS[categoria]
  const finalizada = estado === 'FINALIZADO'

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a categorías" />
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
          <Icono className="size-5" strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-bold text-marron-cafe">{CATEGORIA_LABEL[categoria]}</h2>
      </div>

      <p className="rounded-2xl bg-marron-arcilla/10 px-4 py-3 text-xs text-marron-cafe/70">
        Este formulario todavía no tiene un documento oficial definido para {CATEGORIA_LABEL[categoria].toLowerCase()} — son
        campos genéricos de vista previa. Nada de lo que se anote acá se guarda en el servidor todavía.
      </p>

      {finalizada && (
        <p className="rounded-xl bg-verde-hoja/10 px-3 py-2 text-xs font-medium text-verde-bosque">
          Categoría finalizada — solo lectura.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-marron-tierra/5 p-4">
            <div className="text-sm text-marron-cafe">
              <span className="font-mono text-xs font-semibold text-marron-cafe/50">{item.code}</span>{' '}
              {item.isCustom ? item.otherTestName : item.name}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {campos.map((campo) => {
                const clave = `${item.id}:${campo.key}`
                return (
                  <CampoResultado
                    key={campo.key}
                    campo={campo}
                    valor={valores[clave]}
                    onChange={(v) => onCambiarValor(clave, v)}
                    soloLectura={finalizada}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {!finalizada && (
        <div className="flex items-center justify-end gap-2 border-t border-marron-tierra/10 pt-4">
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={onGuardar}>
            <Save className="size-3.5" strokeWidth={2} />
            Guardar cambios
          </Button>
          <Button className="gap-1.5 px-3 py-1.5 text-xs" onClick={onFinalizar}>
            <CircleCheck className="size-3.5" strokeWidth={2} />
            Finalizar categoría
          </Button>
        </div>
      )}
    </section>
  )
}
