import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { authService } from '../services/authService'

// Fuente única de verdad de la sesión. Reemplaza las lecturas sueltas de
// localStorage que había antes en App.jsx/RutaProtegida.jsx/useSitioBase —
// necesarias porque la sesión de Supabase se restaura de forma asíncrona
// (getSession() es una promesa) y puede cambiar en cualquier momento
// (refresh de token, logout en otra pestaña), no alcanza con leerla una
// sola vez de forma síncrona.
const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Se comparte entre el efecto de montaje (restaurar sesión + escuchar
  // cambios) y `login` de acá abajo — `login` necesita poder esperar a
  // que el perfil quede cargado ANTES de resolver, si no quien la llama
  // navega a /panel con `usuario` todavía en null y RutaProtegida rebota.
  const sincronizarPerfil = useCallback(async (session) => {
    if (!session) {
      setUsuario(null)
      return
    }
    try {
      const perfil = await authService.getPerfil()
      setUsuario(perfil)
    } catch {
      setUsuario(null)
    }
  }, [])

  useEffect(() => {
    let cancelado = false

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!cancelado) await sincronizarPerfil(session)
      if (!cancelado) setCargando(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_evento, session) => {
      sincronizarPerfil(session)
    })

    return () => {
      cancelado = true
      subscription.subscription.unsubscribe()
    }
  }, [sincronizarPerfil])

  // Espera el perfil antes de resolver (a diferencia de authService.login
  // solo, que resuelve apenas Supabase confirma la contraseña) — con eso
  // AuthPage puede hacer navigate('/panel') sabiendo que `usuario` ya está
  // seteado, sin el rebote a "/" que pasaba antes.
  const login = useCallback(
    async (credenciales) => {
      const session = await authService.login(credenciales)
      await sincronizarPerfil(session)
    },
    [sincronizarPerfil],
  )

  const value = {
    usuario,
    cargando,
    haySesion: Boolean(usuario),
    login,
    cerrarSesion: authService.cerrarSesion,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return context
}
