// Cliente único de Supabase Auth — todo el resto de la app (authService,
// AuthContext) importa esta instancia en vez de crear la suya. La
// persistencia de sesión (localStorage) y el refresh de token los maneja
// el SDK solo.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el .env del frontend.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
