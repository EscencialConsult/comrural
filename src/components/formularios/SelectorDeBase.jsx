import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

// Selector contra los maestros del sistema: se escribe para BUSCAR, no para
// inventar. El valor final siempre es una fila que ya existe en la base.
//
// Reemplaza al `<input list>` + `<datalist>` que había antes, que parecía lo
// mismo pero no lo era: datalist sugiere, no obliga — cualquier texto suelto
// quedaba como valor válido. Con productos y proveedores eso es un problema
// real: "Quinua Real", "quinua real" y "Quinua Rael" pasarían como tres
// proveedores distintos, y ninguno apuntaría a la fila que el sistema
// conoce. Acá el input filtra y el valor solo cambia al elegir de la lista.
//
// Tampoco es un `<select>` nativo: con decenas de proveedores, abrir una
// lista entera para bajar hasta el que se busca es más lento que tipear tres
// letras. Se escribe, se filtra, se elige.
//
// NFD separa cada letra acentuada en letra + marca combinante, y el replace
// borra esas marcas: así "Pérez" se encuentra tipeando "perez". Sin esto,
// buscar sin acentos —que es como se tipea rápido— no encuentra nada.
const normalizar = (t) =>
  (t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export default function SelectorDeBase({
  label,
  valor,
  opciones = [],
  onSeleccionar,
  disabled = false,
  cargando = false,
  placeholder = 'Escribí para buscar…',
  className = '',
}) {
  const id = useId()
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [resaltado, setResaltado] = useState(0)
  const contenedor = useRef(null)

  const filtradas = useMemo(() => {
    const q = normalizar(consulta)
    if (q === '') return opciones
    return opciones.filter((op) => normalizar(op.nombre).includes(q) || normalizar(op.detalle).includes(q))
  }, [opciones, consulta])

  // Cerrar al clickear afuera. Sin esto la lista queda abierta encima de la
  // sección siguiente y tapa campos que el usuario está intentando tocar.
  useEffect(() => {
    if (!abierto) return
    const alClickear = (e) => {
      if (!contenedor.current?.contains(e.target)) {
        setAbierto(false)
        setConsulta('')
      }
    }
    document.addEventListener('mousedown', alClickear)
    return () => document.removeEventListener('mousedown', alClickear)
  }, [abierto])

  const elegir = (op) => {
    onSeleccionar(op)
    setAbierto(false)
    setConsulta('')
  }

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAbierto(true)
      setResaltado((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setResaltado((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && abierto) {
      e.preventDefault()
      if (filtradas[resaltado]) elegir(filtradas[resaltado])
    } else if (e.key === 'Escape') {
      setAbierto(false)
      setConsulta('')
    }
  }

  return (
    <div ref={contenedor} className={`relative flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-verde-bosque/85">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled || cargando}
          // Mientras está abierto se muestra lo que se está tipeando; cerrado,
          // el nombre de lo elegido. Así el campo nunca queda mostrando una
          // búsqueda a medias como si fuera el valor guardado.
          value={abierto ? consulta : (valor?.nombre ?? '')}
          placeholder={cargando ? 'Cargando…' : placeholder}
          onFocus={() => {
            setAbierto(true)
            setResaltado(0)
          }}
          onChange={(e) => {
            setConsulta(e.target.value)
            setAbierto(true)
            setResaltado(0)
          }}
          onKeyDown={alTeclear}
          className="w-full rounded-xl border border-marron-tierra/25 bg-white py-2 pl-9 pr-8 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/70"
        />
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marron-cafe/45"
          strokeWidth={1.75}
        />
        <ChevronDown
          className={`pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-marron-cafe/70 transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
        />
      </div>

      {abierto && !disabled && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-marron-tierra/15 bg-white py-1"
        >
          {filtradas.map((op, i) => {
            const elegida = valor?.id === op.id
            return (
              <li key={op.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={elegida}
                  onMouseEnter={() => setResaltado(i)}
                  onClick={() => elegir(op)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    i === resaltado ? 'bg-verde-hoja/10' : ''
                  }`}
                >
                  <span className="flex-1 text-marron-cafe">
                    {op.nombre}
                    {op.detalle && <span className="ml-2 text-xs font-medium text-marron-cafe/60">{op.detalle}</span>}
                  </span>
                  {elegida && <Check className="size-3.5 shrink-0 text-verde-bosque" strokeWidth={2.5} />}
                </button>
              </li>
            )
          })}

          {filtradas.length === 0 && (
            <li className="px-3 py-3 text-sm text-marron-cafe/70">
              {opciones.length === 0
                ? 'No hay registros cargados en el sistema.'
                : `Ningún resultado para "${consulta}".`}
            </li>
          )}
        </ul>
      )}

    </div>
  )
}
