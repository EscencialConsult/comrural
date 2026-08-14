// Cliente único para el backend NestJS (comrural_erp_backend). Adjunta el
// access_token de la sesión de Supabase como Bearer en cada request — el
// backend no tiene login propio, solo valida ese token (ver
// src/auth/strategies/jwt.strategy.ts en el backend).
import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL

if (!API_URL) {
  throw new Error('Falta VITE_API_URL en el .env del frontend.')
}

const BASE_URL = `${API_URL.replace(/\/$/, '')}/api/v1`

class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new ApiError(payload?.message ?? `Error ${res.status} al llamar a ${path}`, res.status, payload)
  }

  return payload
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
