import { useCallback, useEffect, useState } from 'react'

const claveStorage = (solicitudId) => `comrural:lab-subdivision-muestra-mock:${solicitudId}`

const vacio = () => ({ seleccionados: [], asignaciones: {}, paquetes: {}, guardadoEn: null })

function persistir(solicitudId, datos) {
  try {
    localStorage.setItem(claveStorage(solicitudId), JSON.stringify(datos))
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) — el mock sigue
    // funcionando en memoria para esta sesión, solo no sobrevive a un
    // refresh ni se ve reflejado en SeccionSolicitudes.jsx.
  }
}

// Mock de la subdivisión de la muestra recibida en submuestras/paquetes por
// laboratorio destino — pedido explícito: Calidad solo define la muestra
// general (cantidad total, ver samples.quantity/unit) y los ensayos a
// realizar; es Laboratorio quien, ya con la muestra en mano, decide qué
// ensayos procesa ahora (`seleccionados`), a qué laboratorio va cada uno
// (`asignaciones`, { [itemId]: { labId, nombre } } — ver
// config/laboratoriosDestino.js) y cuánto peso le manda a cada uno
// (`paquetes`, { [claveDestino]: { cantidad, unidad } }).
//
// Cada paso (marcar ensayo, asignar laboratorio, escribir un peso) se
// persiste DE UNA en localStorage, no recién al final — a diferencia de
// otros mocks del módulo (useAnalisisDraft.js, useEnvioExternoDraft.js),
// que sí esperan un botón "Guardar" explícito. Acá conviene lo contrario:
// SeccionSolicitudes.jsx (`leerSubdivisionMuestra`) lee esto para armar los
// grupos por destino, y si el usuario asignaba varios ensayos y salía del
// asistente (con "Volver") antes de llegar a completar el peso del último
// paquete, esa asignación se perdía entera sin persistir nada — quedaba
// "invisible" en Solicitudes aunque ya se hubiera decidido el laboratorio.
// `guardar()` (paso 3) sigue existiendo, ahora solo para timestampear
// `guardadoEn` — los datos en sí ya estaban guardados antes de llegar ahí.
//
// 100% mock, mismo criterio que useModalidadEnsayos.js (al que reemplaza:
// esto es una versión más completa de la misma idea — antes solo se
// distinguía interno/externo, ahora se elige el laboratorio puntual y el
// peso de cada submuestra). El backend no modela laboratorios externos ni
// splits de muestra (ver docs/laboratory.md) — se pierde si se cambia de
// navegador/dispositivo o se borra el storage.
// `idsPorDefecto` — ids de TODOS los ensayos de la solicitud, para arrancar
// con todo marcado (pedido explícito: lo más común es procesar todo lo que
// pidió Calidad, no una selección parcial) la primera vez que se abre el
// asistente para esta solicitud. Si ya hay algo guardado, eso manda — nunca
// pisa una selección que el usuario ya hizo.
export function useSubdivisionMuestra(solicitudId, idsPorDefecto = []) {
  const [datos, setDatos] = useState(vacio())

  useEffect(() => {
    if (!solicitudId) return
    const guardado = leerSubdivisionMuestra(solicitudId)
    setDatos(guardado ?? { ...vacio(), seleccionados: idsPorDefecto })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId])

  const alternarSeleccion = useCallback(
    (itemId) => {
      setDatos((prev) => {
        const yaEsta = prev.seleccionados.includes(itemId)
        const siguiente = {
          ...prev,
          seleccionados: yaEsta ? prev.seleccionados.filter((id) => id !== itemId) : [...prev.seleccionados, itemId],
        }
        persistir(solicitudId, siguiente)
        return siguiente
      })
    },
    [solicitudId],
  )

  // "Marcar todos" / "Desmarcar todos" — reemplaza la selección entera de
  // una, en vez de tildar/destildar ensayo por ensayo.
  const reemplazarSeleccion = useCallback(
    (itemIds) => {
      setDatos((prev) => {
        const siguiente = { ...prev, seleccionados: itemIds }
        persistir(solicitudId, siguiente)
        return siguiente
      })
    },
    [solicitudId],
  )

  const asignarLaboratorio = useCallback(
    (itemIds, asignacion) => {
      setDatos((prev) => {
        const asignaciones = { ...prev.asignaciones }
        for (const id of itemIds) asignaciones[id] = asignacion
        const siguiente = { ...prev, asignaciones }
        persistir(solicitudId, siguiente)
        return siguiente
      })
    },
    [solicitudId],
  )

  const setPeso = useCallback(
    (clave, campo, valor) => {
      setDatos((prev) => {
        const siguiente = {
          ...prev,
          paquetes: { ...prev.paquetes, [clave]: { ...prev.paquetes[clave], [campo]: valor } },
        }
        persistir(solicitudId, siguiente)
        return siguiente
      })
    },
    [solicitudId],
  )

  const guardar = useCallback(() => {
    const guardadoEn = new Date().toISOString()
    setDatos((prev) => {
      const siguiente = { ...prev, guardadoEn }
      persistir(solicitudId, siguiente)
      return siguiente
    })
    return guardadoEn
  }, [solicitudId])

  return { ...datos, alternarSeleccion, reemplazarSeleccion, asignarLaboratorio, setPeso, guardar }
}

// Lectura suelta (sin hook) — la usa SeccionSolicitudes.jsx para agrupar
// TODAS las solicitudes ya recibidas por laboratorio destino.
export function leerSubdivisionMuestra(solicitudId) {
  try {
    const guardado = localStorage.getItem(claveStorage(solicitudId))
    return guardado ? JSON.parse(guardado) : null
  } catch {
    return null
  }
}
