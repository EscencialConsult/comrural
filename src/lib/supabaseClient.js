// Cliente único de Supabase Auth — todo el resto de la app (authService,
// AuthContext) importa esta instancia en vez de crear la suya. El refresh
// de token lo maneja el SDK solo; la persistencia de sesión (dónde guarda
// el token) la decide `RECORDARME_STORAGE_KEY` de acá abajo.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el .env del frontend.',
  )
}

// Implementa la casilla "Recordarme" del login (ver AuthPage.jsx): el SDK
// de Supabase persiste la sesión en un único storage fijo pasado en
// `createClient`, así que no hay forma de elegir "esta vez sí, esta vez
// no" en el momento del login — el truco es que el storage en sí sea un
// adaptador que MIRA una preferencia (guardada aparte, siempre en
// localStorage para que sobreviva al cierre del navegador) y recién ahí
// decide si el token va a localStorage (sobrevive a cerrar el navegador) o
// a sessionStorage (se pierde al cerrar la pestaña/navegador). authService
// setea esta preferencia justo antes de llamar a signInWithPassword.
const RECORDARME_STORAGE_KEY = 'comrural.recordarme'

function backingStorage() {
  return localStorage.getItem(RECORDARME_STORAGE_KEY) === '0' ? sessionStorage : localStorage
}

const recordarmeAwareStorage = {
  getItem: (key) => backingStorage().getItem(key),
  setItem: (key, value) => backingStorage().setItem(key, value),
  removeItem: (key) => backingStorage().removeItem(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: recordarmeAwareStorage },
})
