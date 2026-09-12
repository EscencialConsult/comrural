import { useEffect, useState } from 'react'
import { lotsService } from '../services/lotsService'
import { siguienteCursor } from '../services/paginacion'
import { useDebounce } from './useDebounce'

// Centraliza el patrón repetido en Almacén/Recepción, Calidad/Inspección y
// Calidad/Remito: lista de lotes PM con buscador por código, real —
// pagina de a 50 contra el servidor (GET /lots?code=…, ver LotsService.list
// del backend) en vez de traer 100 de una y filtrar en el cliente, así no se
// pone lento a medida que crece la tabla con los años. El buscador manda
// `code` recién 400ms después de que la persona deja de tipear (debounce) —
// sin eso, cada letra dispararía un request nuevo.
//
// `estado`/`productoId`/`proveedorId`/`fecha` siguen siendo filtros del lado
// del cliente sobre lo ya cargado — el backend no los soporta todavía (no es
// parte de este cambio, ver charla sobre alcance del buscador). No es peor
// que antes: "Cargar más" sigue revelando más lotes hasta que aparezca lo
// buscado, solo que ahora de a 50 reales en vez de un tope fijo de 100.
export function useLotesBuscables({ puedeVer }) {
  const [lotes, setLotes] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorCarga, setErrorCarga] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const busquedaDebounced = useDebounce(busqueda, 400)

  const cargarPrimeraPagina = () => {
    setErrorCarga(null)
    return lotsService
      .listar({ limit: 50, code: busquedaDebounced || undefined })
      .then((resp) => {
        setLotes(resp.data.filter((l) => l.nature === 'PM'))
        setCursor(siguienteCursor(resp))
      })
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    setErrorCarga(null)
    lotsService
      .listar({ limit: 50, code: busquedaDebounced || undefined })
      .then((resp) => {
        if (cancelado) return
        setLotes(resp.data.filter((l) => l.nature === 'PM'))
        setCursor(siguienteCursor(resp))
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [puedeVer, busquedaDebounced])

  const cargarMas = async () => {
    if (!cursor || cargandoMas) return
    setCargandoMas(true)
    try {
      const resp = await lotsService.listar({ limit: 50, cursor, code: busquedaDebounced || undefined })
      setLotes((prev) => [...prev, ...resp.data.filter((l) => l.nature === 'PM')])
      setCursor(siguienteCursor(resp))
    } finally {
      setCargandoMas(false)
    }
  }

  return {
    lotes,
    setLotes,
    busqueda,
    setBusqueda,
    cursor,
    cargandoMas,
    errorCarga,
    cargarMas,
    recargar: cargarPrimeraPagina,
  }
}
