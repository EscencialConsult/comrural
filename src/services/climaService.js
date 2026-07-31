// Clima REAL (WeatherAPI.com, no mock) — la única llamada a un servicio
// externo real que tiene el proyecto hasta ahora. La key vive en .env
// (VITE_WEATHERAPI_KEY), nunca hardcodeada acá.
//
// TODO(backend): la key queda expuesta en el bundle del cliente (así son
// las env vars de Vite: todo lo que empieza con VITE_ se inyecta en el
// build, cualquiera puede verla con F12 → Network). Aceptable para esta
// fase de frontend-solo (plan de prueba, 10.000.000 llamadas/mes, sin
// datos sensibles de negocio en juego), pero es dato sensible y no debe
// viajar al navegador en producción. Migración: crear un endpoint propio
// (ej. GET /api/clima) que guarde la key como variable de entorno del
// SERVIDOR (no VITE_*) y haga este mismo fetch a WeatherAPI ahí adentro.
// Este archivo pasaría a pedirle a ESE endpoint en vez de a WeatherAPI
// directo — mismo nombre de archivo, mismo objeto exportado, misma forma
// de respuesta, así ningún componente que consuma climaService se entera
// del cambio (mismo patrón que el resto de src/services/, ver README.md).
//
// Ubicación: El Alto, La Paz, Bolivia — planta/oficinas de COMRURAL XXI
// (ver wiki/comrural-arquitectura-general.md en el vault).
const LAT = -16.5047
const LON = -68.1633

const API_KEY = import.meta.env.VITE_WEATHERAPI_KEY
const BASE_URL = 'https://api.weatherapi.com/v1/current.json'

export const climaService = {
  async getClimaActual() {
    if (!API_KEY) {
      throw new Error('Falta VITE_WEATHERAPI_KEY en .env')
    }

    const url = `${BASE_URL}?key=${API_KEY}&q=${LAT},${LON}&lang=es`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`No se pudo obtener el clima (${res.status})`)
    }

    const data = await res.json()
    if (!data.current) {
      throw new Error('Respuesta de clima sin datos')
    }

    return {
      temperaturaC: Math.round(data.current.temp_c),
      // La API devuelve el nombre de la localidad más cercana a las
      // coordenadas (ej. "Callampaya"), no la ciudad real — para estas
      // coordenadas fijas siempre es El Alto, La Paz, así que se muestra
      // ese nombre reconocible en vez del que resuelve el geocoder.
      ubicacion: 'El Alto, La Paz',
      condicion: data.current.condition?.text ?? '',
    }
  },
}
