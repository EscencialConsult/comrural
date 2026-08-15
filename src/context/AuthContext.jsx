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

const SIN_PERMISOS = new Set()

// Cualquier error que ocurra DESPUÉS de que Supabase ya confirmó la
// contraseña (ej. cuenta inactiva/eliminada al traer el perfil real) — a
// esta altura ya sabemos que la contraseña era correcta, así que mostrar
// el mensaje real no filtra nada que el usuario no supiera de antemano.
// AuthPage lo distingue del error genérico de credenciales con
// `instanceof`, no comparando strings (el mensaje real lo pone el backend
// — "Usuario inactivo", "Usuario eliminado", etc. — no lo inventamos acá).
export class ErrorPostLogin extends Error {}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [permisos, setPermisos] = useState(SIN_PERMISOS)
  const [cargando, setCargando] = useState(true)

  // Trae perfil + permisos y los setea. Un usuario inactivo/eliminado hace
  // que /iam/users/me devuelva 403 ANTES de llegar al controller — el
  // AuthorizationGuard del backend lo corta ahí mismo (ver
  // comrural_erp_backend/src/iam/guards/authorization.guard.ts) — así que
  // authService.getPerfil() directamente rechaza con el mensaje real del
  // backend ("Usuario inactivo", etc.), no hay un perfil con isActive:false
  // que inspeccionar acá.
  const cargarPerfilYPermisos = useCallback(async () => {
    const perfil = await authService.getPerfil()
    setUsuario(perfil)
    const lista = await authService.getPermisos(perfil.id)
    setPermisos(new Set(lista))
  }, [])

  // Restaurar sesión al cargar la página / reaccionar a cambios de sesión
  // (refresh de token, logout en otra pestaña) — acá SÍ conviene tragar el
  // error: es sincronización de fondo, no una acción que el usuario está
  // esperando con un botón. Si falla, simplemente queda sin sesión.
  const sincronizarPerfil = useCallback(
    async (session) => {
      if (!session) {
        setUsuario(null)
        setPermisos(SIN_PERMISOS)
        return
      }
      try {
        await cargarPerfilYPermisos()
      } catch {
        setUsuario(null)
        setPermisos(SIN_PERMISOS)
      }
    },
    [cargarPerfilYPermisos],
  )

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

  // Espera el perfil (y los permisos) antes de resolver — a diferencia de
  // authService.login solo, que resuelve apenas Supabase confirma la
  // contraseña. Con eso AuthPage puede hacer navigate('/panel') sabiendo
  // que `usuario`/`permisos` ya están seteados, sin el rebote a "/" que
  // pasaba antes. Si cargarPerfilYPermisos falla, cierra la sesión de
  // Supabase que se acababa de abrir — no tiene sentido dejar a alguien
  // con sesión de Supabase válida pero sin poder usar la app — y envuelve
  // el error en ErrorPostLogin para que AuthPage sepa que es seguro
  // mostrarlo tal cual.
  const login = useCallback(
    async (credenciales) => {
      await authService.login(credenciales)
      try {
        await cargarPerfilYPermisos()
      } catch (err) {
        await authService.cerrarSesion()
        throw new ErrorPostLogin(err.message)
      }
    },
    [cargarPerfilYPermisos],
  )

  const value = {
    usuario,
    permisos,
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
