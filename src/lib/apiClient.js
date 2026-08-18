// Cliente único para el backend NestJS (comrural_erp_backend). Adjunta el
// access_token de la sesión de Supabase como Bearer en cada request — el
// backend no tiene login propio, solo valida ese token (ver
// src/auth/strategies/jwt.strategy.ts en el backend).
//
// FE·M0 · Requisitos transversales — cubre acá las 7 subtareas: Bearer
// token, interceptor 401 (renovar sesión, si no se puede limpiar y
// redirigir), interceptor 403 (sin reintentar), manejo 400/404/409 con el
// mensaje real de la API + 500 genérico con requestId (contrato
// confirmado leyendo comrural_erp_backend/src/common/filters/
// all-exceptions.filter.ts — SIEMPRE responde { statusCode, message,
// requestId, timestamp }, y para 500 el `message` ya viene genérico
// "Internal server error" desde el propio backend), x-request-id en
// creaciones/actualizaciones (el backend lo lee de vuelta — ver
// request-id.interceptor.ts — y si no llega genera el suyo, así que
// mandarlo desde acá permite trazar un mismo pedido en los dos logs). El
// helper de paginación keyset vive en src/services/paginacion.js, y
// deshabilitar botones durante una petición en src/hooks/useSolicitud.js
// — no entran acá porque no son responsabilidad del cliente HTTP en sí.
import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error('Falta VITE_API_URL en el .env del frontend.')
}

const BASE_URL = `${API_URL.replace(/\/$/, '')}/api/v1`
const METODOS_CON_REQUEST_ID = new Set(['POST', 'PATCH'])

class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function ejecutarFetch(path, { method, body, headers }) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      // Content-Type solo si hay body: Fastify rechaza con "Body cannot be
      // empty when content-type is set to 'application/json'" un DELETE
      // (u otro request sin body) que igual mande ese header — no es un
      // endpoint faltante, es este header sobrando.
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      // x-request-id solo en creaciones/actualizaciones — el backend lo
      // usa para correlacionar logs y el audit log de esa mutación
      // puntual; no hace falta en lecturas.
      ...(METODOS_CON_REQUEST_ID.has(method) ? { 'x-request-id': crypto.randomUUID() } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : null
  return { res, payload }
}

// El backend SIEMPRE responde { statusCode, message, requestId, timestamp }
// en error (ver all-exceptions.filter.ts). 400/404/409 ya traen un
// `message` legible y específico — se pasa tal cual. 500 el backend ya lo
// manda genérico ("Internal server error") a propósito, para no filtrar
// detalles internos; acá solo se le suma el requestId para que se pueda
// reportar. 403 se resuelve con su propio mensaje ("No tenés permiso...")
// y explícitamente SIN reintentar (a diferencia de 401, renovar el token
// no cambia que el usuario no tenga el permiso).
function mensajeLegible(res, payload) {
  if (res.status >= 500) {
    return payload?.requestId
      ? `Ocurrió un error inesperado. Si persiste, compartí este código: ${payload.requestId}`
      : 'Ocurrió un error inesperado. Probá de nuevo en un momento.'
  }
  return payload?.message ?? `Error ${res.status} al llamar a ${res.url}`
}

async function request(path, { method = 'GET', body, headers, _reintentado = false } = {}) {
  const { res, payload } = await ejecutarFetch(path, { method, body, headers })

  if (res.status === 401 && !_reintentado) {
    // Interceptor 401: "renovar O limpiar sesión" — primero se intenta
    // refrescar el token (Supabase puede tener un refresh_token válido
    // aunque el access_token ya haya vencido) y reintentar UNA vez con el
    // token nuevo. Si el refresh también falla, ya no hay forma de seguir
    // autenticado: se limpia la sesión y se manda al login con un hard
    // redirect (este cliente se llama desde services, no siempre dentro
    // de un componente con acceso al router de React).
    const { data, error } = await supabase.auth.refreshSession()
    if (!error && data.session) {
      return request(path, { method, body, headers, _reintentado: true })
    }
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') window.location.assign('/')
    throw new ApiError('Tu sesión venció — iniciá sesión de nuevo.', 401, payload)
  }

  if (!res.ok) {
    throw new ApiError(mensajeLegible(res, payload), res.status, payload)
  }

  return payload
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
