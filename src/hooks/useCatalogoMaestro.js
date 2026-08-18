import { useEffect, useRef, useState } from 'react'
import { siguienteCursor } from '../services/paginacion'

// Centraliza el patrón repetido en Personas/Organizaciones/Proveedores/
// Productos (M2-M5): listado paginado + vista de detalle con fetch propio +
// toast de confirmación. Nació DESPUÉS de escribir ese mismo bloque a mano
// 4 veces copiando el archivo anterior — y de que un fix (la guarda contra
// condición de carrera al abrir detalle) se aplicara bien en Organizaciones
// pero se perdiera al copiar el archivo para armar Proveedores. Un bug
// corregido acá se corrige en los 4 módulos a la vez, en vez de depender de
// acordarse de repetirlo cada vez que se copia el patrón a un archivo nuevo.
//
// Países queda AFUERA a propósito: es un catálogo chico sin paginación real
// (ver docs/countries.md) y sin vista de detalle con fetch propio — forzarlo
// acá sería generalizar para un caso que no lo necesita.
//
// `service` es cualquiera de countriesService/peopleService/... con la
// forma { listar({cursor,limit}), obtener(id) } — crear/actualizar quedan
// en cada pantalla porque el DTO de cada uno es distinto.
export function useCatalogoMaestro(service, { puedeVer, limit = 50 } = {}) {
  const [items, setItems] = useState(null)
  const [cursor, setCursor] = useState(null)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [errorCargarMas, setErrorCargarMas] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [detalle, setDetalle] = useState(null)
  const [errorDetalle, setErrorDetalle] = useState(null)
  // Guarda cuál es el pedido de detalle más reciente: si el usuario clickea
  // una fila y enseguida clickea otra, la respuesta del primer pedido puede
  // llegar DESPUÉS que la del segundo (orden de red no garantizado) — sin
  // este chequeo, esa respuesta vieja pisaba los datos de la fila que el
  // usuario ya está mirando, mostrando la entidad equivocada.
  const detalleSolicitadoRef = useRef(null)

  const [confirmacion, setConfirmacion] = useState(null)

  const cargarPrimeraPagina = () => {
    setErrorCarga(null)
    service
      .listar({ limit })
      .then((resp) => {
        setItems(resp.data)
        setCursor(siguienteCursor(resp))
      })
      .catch((err) => setErrorCarga(err.message))
  }

  const cargarMas = async () => {
    if (!cursor || cargandoMas) return
    setCargandoMas(true)
    setErrorCargarMas(null)
    try {
      const resp = await service.listar({ cursor, limit })
      setItems((prev) => [...prev, ...resp.data])
      setCursor(siguienteCursor(resp))
    } catch (err) {
      // A propósito NO usa errorCarga: eso reemplazaría el listado entero
      // por el banner de error, borrando de la pantalla los items que ya
      // habían cargado bien solo porque "cargar más" falló una vez.
      setErrorCargarMas(err.message)
    } finally {
      setCargandoMas(false)
    }
  }

  const abrirDetalle = (id) => {
    setDetalle(null)
    setErrorDetalle(null)
    detalleSolicitadoRef.current = id
    service
      .obtener(id)
      .then((data) => {
        if (detalleSolicitadoRef.current === id) setDetalle(data)
      })
      .catch((err) => {
        if (detalleSolicitadoRef.current === id) setErrorDetalle(err.message)
      })
  }

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    service
      .listar({ limit })
      .then((resp) => {
        if (cancelado) return
        setItems(resp.data)
        setCursor(siguienteCursor(resp))
      })
      .catch((err) => {
        if (!cancelado) setErrorCarga(err.message)
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `service` es
    // un objeto literal estable (definido a nivel de módulo en cada
    // *Service.js, no recreado por render); solo puedeVer determina si el
    // efecto tiene que volver a correr.
  }, [puedeVer])

  useEffect(() => {
    if (!confirmacion) return
    const id = setTimeout(() => setConfirmacion(null), 4000)
    return () => clearTimeout(id)
  }, [confirmacion])

  return {
    items,
    setItems,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle,
    setDetalle,
    errorDetalle,
    abrirDetalle,
    confirmacion,
    setConfirmacion,
  }
}
