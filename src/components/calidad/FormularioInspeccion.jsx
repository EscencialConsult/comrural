import { useEffect, useMemo, useState } from 'react'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Switch from '../Switch.jsx'
import Button from '../Button.jsx'

// Formulario dinámico — renderiza form.items (ver comrural_erp_backend/
// docs/form-items.md §3, leído completo) según su dataType. No hay ningún
// renderer de formularios "data-driven" previo en el proyecto: esto es
// terreno nuevo, no una extracción de algo existente.
//
// Guardado en batch (un botón "Guardar respuestas", no autosave por campo)
// — más simple y sin carreras de red para el volumen real de un formulario
// de inspección. Solo se mandan los campos que cambiaron desde la última
// carga/guardado (comparando contra `iniciales`), más `clear:true` para los
// que tenían valor y se vaciaron.
//
// Nota sobre BOOLEAN: un Switch es binario (prendido/apagado), no tiene un
// tercer estado "sin responder" — por eso un ítem BOOLEAN recién creado
// arranca en "apagado" pero NO se manda hasta que el usuario lo toque de
// verdad (se rastrea aparte en `tocados`). Si la respuesta correcta es
// "false" y nadie mueve el switch, el campo obligatorio sigue sin
// responder — es una limitación conocida del control, no del cálculo del
// backend (que sí exige la respuesta real en `POST .../complete`).
const claveRespuesta = (itemId, occurrence) => `${itemId}:${occurrence}`

function valorDesdeRespuesta(item, respuesta) {
  if (!respuesta) return item.dataType === 'BOOLEAN' ? false : ''
  switch (item.dataType) {
    case 'BOOLEAN':
      return respuesta.valueBoolean ?? false
    case 'INTEGER':
    case 'DECIMAL':
      return respuesta.valueNumber ?? ''
    case 'TEXT':
      return respuesta.valueText ?? ''
    case 'DATE':
      return respuesta.valueDate ?? ''
    case 'SELECT':
      return respuesta.valueOption ?? ''
    default:
      return ''
  }
}

function campoValor(item, valor) {
  switch (item.dataType) {
    case 'BOOLEAN':
      return { valueBoolean: !!valor }
    case 'INTEGER':
    case 'DECIMAL':
      return { valueNumber: valor === '' ? null : Number(valor) }
    case 'TEXT':
      return { valueText: valor }
    case 'DATE':
      return { valueDate: valor }
    case 'SELECT':
      return { valueOption: valor }
    default:
      return {}
  }
}

function CampoItem({ item, valor, onChange, soloLectura }) {
  const label = `${item.label}${item.isRequired ? ' *' : ''}${item.unit ? ` (${item.unit})` : ''}`

  if (item.dataType === 'BOOLEAN') {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-sm text-marron-cafe">{label}</span>
        <Switch checked={!!valor} onChange={onChange} disabled={soloLectura} label={item.label} />
      </div>
    )
  }

  if (item.dataType === 'SELECT') {
    return (
      <FormSelect label={label} value={valor} onChange={(e) => onChange(e.target.value)} disabled={soloLectura}>
        <option value="">Seleccioná…</option>
        {item.config?.options?.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </FormSelect>
    )
  }

  if (item.dataType === 'DATE') {
    return (
      <FormInput
        label={label}
        type="date"
        value={valor}
        min={item.config?.min}
        max={item.config?.max}
        onChange={(e) => onChange(e.target.value)}
        disabled={soloLectura}
      />
    )
  }

  if (item.dataType === 'INTEGER' || item.dataType === 'DECIMAL') {
    return (
      <FormInput
        label={label}
        type="number"
        step={item.dataType === 'DECIMAL' ? Math.pow(10, -(item.config?.decimalPlaces ?? 2)) : 1}
        min={item.config?.min}
        max={item.config?.max}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={soloLectura}
      />
    )
  }

  return (
    <FormInput
      label={label}
      type="text"
      minLength={item.config?.minLength}
      maxLength={item.config?.maxLength}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      disabled={soloLectura}
    />
  )
}

export default function FormularioInspeccion({ form, respuestasIniciales, soloLectura, guardando, error, onGuardar }) {
  const [valores, setValores] = useState({})
  const [tocados, setTocados] = useState(new Set())
  const [filasExtra, setFilasExtra] = useState({}) // key: itemId o groupCode -> ocurrencias extra agregadas a mano

  const iniciales = useMemo(() => {
    const mapa = {}
    for (const item of form.items) {
      for (const r of respuestasIniciales.filter((r) => r.itemId === item.id)) {
        mapa[claveRespuesta(item.id, r.occurrence)] = valorDesdeRespuesta(item, r)
      }
    }
    return mapa
  }, [form.items, respuestasIniciales])

  // Depende SOLO de `form.id` (una inspección nueva), no de `iniciales` —
  // `PanelRecepcionLote.jsx` vuelve a pedir el detalle de la inspección
  // después de CUALQUIER mutación de la pantalla (no solo las de acá), así
  // que `respuestasIniciales` llega con una referencia nueva incluso
  // cuando lo que cambió fue, por ejemplo, la recepción de Almacén. Si este
  // efecto dependiera de `iniciales`, cada uno de esos refrescos reseteaba
  // `valores`/`tocados` y borraba en silencio lo que el usuario ya había
  // tipeado acá sin guardar todavía.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setValores(iniciales)
    setTocados(new Set())
    setFilasExtra({})
  }, [form.id])

  const itemsPorId = useMemo(() => new Map(form.items.map((i) => [i.id, i])), [form.items])

  // Agrupa por section, y dentro de cada section separa ítems sueltos de
  // grupos repetibles (groupCode compartido) — ver docs/form-items.md §4:
  // los miembros de un mismo groupCode comparten `occurrences`.
  const secciones = useMemo(() => {
    const porSeccion = new Map()
    for (const item of form.items) {
      if (!porSeccion.has(item.section)) porSeccion.set(item.section, [])
      porSeccion.get(item.section).push(item)
    }
    return Array.from(porSeccion.entries()).map(([section, items]) => {
      const grupos = new Map()
      const sueltos = []
      for (const item of items) {
        if (item.groupCode) {
          if (!grupos.has(item.groupCode)) grupos.set(item.groupCode, [])
          grupos.get(item.groupCode).push(item)
        } else {
          sueltos.push(item)
        }
      }
      return { section, sueltos, grupos: Array.from(grupos.entries()) }
    })
  }, [form.items])

  const ocurrenciasDe = (item) => {
    const guardadas = respuestasIniciales.filter((r) => r.itemId === item.id).map((r) => r.occurrence)
    const base = item.occurrences === 1 ? 1 : Math.max(1, ...guardadas, filasExtra[item.groupCode ?? item.id] ?? 1)
    return base
  }

  const cambiarValor = (itemId, occurrence, valor) => {
    setValores((prev) => ({ ...prev, [claveRespuesta(itemId, occurrence)]: valor }))
    setTocados((prev) => new Set(prev).add(claveRespuesta(itemId, occurrence)))
  }

  // `filasExtra` es un contador auxiliar, no la cantidad real de filas
  // visibles — esa la calcula `ocurrenciasDe` combinando `filasExtra` con
  // las ocurrencias que ya vinieron guardadas del servidor. Por eso acá
  // recibe `filasActuales` (el valor que YA se está mostrando) en vez de
  // asumir que arranca de 1: si un ítem ya tiene 3 respuestas guardadas y
  // nadie tocó nunca "+ Agregar fila", `filasExtra[clave]` seguía en
  // `undefined` — sumarle 1 daba 2, que `Math.max(3, 2)` seguía ignorando,
  // así que el botón no hacía nada visible.
  const agregarFila = (clave, filasActuales, maxOcurrencias) => {
    if (maxOcurrencias && filasActuales >= maxOcurrencias) return
    setFilasExtra((prev) => ({ ...prev, [clave]: filasActuales + 1 }))
  }

  const puedeGuardar = tocados.size > 0 && !soloLectura

  const submit = (e) => {
    e.preventDefault()
    const cambios = []
    for (const clave of tocados) {
      const [itemId, occurrenceStr] = clave.split(':')
      const occurrence = Number(occurrenceStr)
      const item = itemsPorId.get(itemId)
      if (!item) continue
      const valorActual = valores[clave]
      const valorPrevio = iniciales[clave]
      const vacio = valorActual === '' || valorActual === undefined
      if (vacio && valorPrevio !== undefined) {
        cambios.push({ itemId, occurrence, clear: true })
      } else if (!vacio) {
        cambios.push({ itemId, occurrence, ...campoValor(item, valorActual) })
      }
    }
    if (cambios.length === 0) return
    onGuardar(cambios)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      {secciones.map(({ section, sueltos, grupos }) => (
        <div key={section} className="flex flex-col gap-3 rounded-2xl bg-marron-tierra/5 p-4">
          <h4 className="text-sm font-bold text-marron-cafe">{section}</h4>

          {sueltos.map((item) => {
            const filas = ocurrenciasDe(item)
            const repetible = item.occurrences === null || item.occurrences > 1
            return (
              <div key={item.id} className="flex flex-col gap-2">
                {Array.from({ length: filas }, (_, i) => i + 1).map((occurrence) => (
                  <div key={occurrence} className="flex items-end gap-2">
                    <div className="flex-1">
                      {repetible && filas > 1 && (
                        <span className="text-xs font-semibold text-marron-cafe/40">Fila {occurrence}</span>
                      )}
                      <CampoItem
                        item={item}
                        valor={valores[claveRespuesta(item.id, occurrence)] ?? (item.dataType === 'BOOLEAN' ? false : '')}
                        onChange={(v) => cambiarValor(item.id, occurrence, v)}
                        soloLectura={soloLectura}
                      />
                    </div>
                  </div>
                ))}
                {repetible && !soloLectura && (
                  <button
                    type="button"
                    onClick={() => agregarFila(item.id, filas, item.occurrences)}
                    className="self-start text-xs font-semibold text-verde-bosque hover:underline"
                  >
                    + Agregar fila
                  </button>
                )}
              </div>
            )
          })}

          {grupos.map(([groupCode, items]) => {
            const filas = ocurrenciasDe(items[0])
            const repetible = items[0].occurrences === null || items[0].occurrences > 1
            return (
              <div key={groupCode} className="flex flex-col gap-2 rounded-xl bg-white/60 p-3">
                {Array.from({ length: filas }, (_, i) => i + 1).map((occurrence) => (
                  <div key={occurrence} className="grid gap-3 sm:grid-cols-2">
                    {repetible && filas > 1 && (
                      <span className="col-span-full text-xs font-semibold text-marron-cafe/40">Fila {occurrence}</span>
                    )}
                    {items.map((item) => (
                      <CampoItem
                        key={item.id}
                        item={item}
                        valor={valores[claveRespuesta(item.id, occurrence)] ?? (item.dataType === 'BOOLEAN' ? false : '')}
                        onChange={(v) => cambiarValor(item.id, occurrence, v)}
                        soloLectura={soloLectura}
                      />
                    ))}
                  </div>
                ))}
                {repetible && !soloLectura && (
                  <button
                    type="button"
                    onClick={() => agregarFila(groupCode, filas, items[0].occurrences)}
                    className="self-start text-xs font-semibold text-verde-bosque hover:underline"
                  >
                    + Agregar fila
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {!soloLectura && (
        <Button type="submit" disabled={guardando || !puedeGuardar} className="self-start">
          {guardando ? 'Guardando…' : 'Guardar respuestas'}
        </Button>
      )}
    </form>
  )
}
