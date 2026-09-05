import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { lotsService } from '../../services/lotsService'
import { useDebounce } from '../../hooks/useDebounce'

// Selector de lote con búsqueda real (a diferencia de un FormSelect con
// todas las opciones precargadas): escribís y busca en el servidor con
// debounce (ver useDebounce), trayendo como máximo 50 coincidencias a la
// vez — no carga los lotes enteros de una, mismo criterio que
// useLotesBuscables (páginas de Almacén/Calidad).
//
// `estados` (array de currentStatus válidos) y `nature` filtran del lado
// del cliente sobre lo que ya trajo el servidor — el backend no soporta
// filtrar por estado/naturaleza en GET /lots todavía (mismo criterio que el
// resto de las pantallas de lotes, no es parte de este cambio).
//
// `productoNombre` lo resuelve quien usa este combobox (ya tiene el
// catálogo de productos cargado con listarTodo) — este componente no pide
// productos por su cuenta, para no duplicar ese fetch.
export default function ComboboxLote({ label, value, onChange, estados, nature = 'PM', productoNombre, disabled }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [opciones, setOpciones] = useState([])
  const [cargando, setCargando] = useState(false)
  const busquedaDebounced = useDebounce(busqueda, 400)
  const contenedorRef = useRef(null)

  const etiquetaDe = (l) => `${l.code} · ${productoNombre(l.productId)}`

  // Trae el lote puntual por id cuando `value` cambia desde afuera (o al
  // montar con un valor inicial) — así el texto mostrado siempre refleja el
  // lote elegido, sin depender de que siga entre las últimas 50 opciones
  // buscadas.
  useEffect(() => {
    if (!value) {
      setBusqueda('')
      return
    }
    let cancelado = false
    lotsService
      .obtener(value)
      .then((l) => !cancelado && setBusqueda(etiquetaDe(l)))
      .catch(() => {})
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    setCargando(true)
    // Sin `code` acá a propósito: el backend (GET /lots) solo sabe buscar
    // por código de lote, no por nombre de producto — pedido explícito de
    // que el buscador encuentre también por nombre de producto, sin tocar
    // el backend. Se trae una tanda (mismo límite de antes) sin filtrar por
    // texto y se filtra acá por code O nombre de producto. Limitación real:
    // si hay más de 50 lotes de esta `nature` en total, uno que matchee por
    // fuera de esos primeros 50 (orden por id, no por relevancia) no
    // aparece — aceptable hoy porque `estados` ya acota bastante el universo
    // real (ver ESTADOS_CANDIDATOS de quien usa este combobox).
    lotsService
      .listar({ limit: 50 })
      .then((resp) => {
        if (cancelado) return
        const texto = busquedaDebounced.trim().toLowerCase()
        setOpciones(
          resp.data.filter((l) => {
            if (l.nature !== nature) return false
            if (estados && !estados.includes(l.currentStatus)) return false
            if (!texto) return true
            return l.code.toLowerCase().includes(texto) || productoNombre(l.productId).toLowerCase().includes(texto)
          }),
        )
      })
      .finally(() => !cancelado && setCargando(false))
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, busquedaDebounced, nature, estados])

  useEffect(() => {
    const alClickearFuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClickearFuera)
    return () => document.removeEventListener('mousedown', alClickearFuera)
  }, [])

  const elegir = (lote) => {
    setBusqueda(etiquetaDe(lote))
    setAbierto(false)
    onChange(lote.id)
  }

  return (
    <div ref={contenedorRef} className="relative flex min-w-0 flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls="combobox-lote-opciones"
          disabled={disabled}
          value={busqueda}
          onFocus={() => setAbierto(true)}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setAbierto(true)
            if (value) onChange('')
          }}
          placeholder="Buscar por código…"
          className="w-full min-w-0 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 pr-8 text-sm text-marron-cafe outline-none transition-all duration-200 focus-visible:border-verde-lima focus-visible:ring-2 focus-visible:ring-verde-lima/20 disabled:opacity-50"
        />
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-marron-cafe/40"
          strokeWidth={2}
        />
      </div>

      {abierto && (
        <ul
          id="combobox-lote-opciones"
          role="listbox"
          className="absolute top-full left-0 z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl bg-white py-1 ring-1 ring-marron-tierra/15"
        >
          {cargando ? (
            <li className="flex items-center gap-2 px-3 py-2 text-xs text-marron-cafe/50">
              <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
              Buscando…
            </li>
          ) : opciones.length === 0 ? (
            <li className="px-3 py-2 text-xs text-marron-cafe/50">Sin lotes que coincidan.</li>
          ) : (
            opciones.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.id === value}
                  onClick={() => elegir(l)}
                  className="w-full px-3 py-2 text-left text-sm text-marron-cafe hover:bg-marron-tierra/10"
                >
                  {etiquetaDe(l)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
