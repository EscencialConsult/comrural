// Capa de servicio de autenticación. Los componentes SIEMPRE importan de
// acá, nunca de supabaseClient/apiClient directo.
//
// Login real vía Supabase Auth (el backend NestJS no tiene endpoint de
// login propio: solo valida el JWT que emite Supabase — ver
// src/auth/strategies/jwt.strategy.ts en comrural_erp_backend). El estado
// reactivo de sesión vive en AuthContext, que escucha
// supabase.auth.onAuthStateChange; este archivo solo dispara las acciones.
//
// Registro self-service, login social y recuperación de contraseña siguen
// en mock: el backend crea usuarios por invitación de un superadmin
// (UsersManagementService.create), no hay endpoint público de alta ni
// Client ID de Google/Facebook configurado todavía.
import { supabase } from '../lib/supabaseClient'
import { apiClient } from '../lib/apiClient'

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export const authService = {
  // Devuelve la sesión recién creada — AuthContext la usa para traer el
  // perfil ANTES de resolver, así quien llama a login() (AuthPage) puede
  // navegar a /panel con la certeza de que ya hay usuario cargado, sin
  // pasar por un instante intermedio con sesión pero sin perfil.
  async login({ email, contrasena }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: contrasena,
    })
    if (error) {
      // Mensaje genérico por seguridad (no revela si el usuario existe o
      // no) — decisión confirmada en wiki/comrural-shell-frontend.md.
      throw new Error('Usuario o contraseña incorrectos.')
    }
    return data.session
  },

  // Perfil de la app (nombre, estado) para el usuario ya autenticado en
  // Supabase — lo usa AuthContext tras cada cambio de sesión.
  async getPerfil() {
    const perfil = await apiClient.get('/iam/users/me')
    return {
      id: perfil.id,
      nombre: perfil.fullName,
      email: perfil.email,
      isActive: perfil.isActive,
      avatar_url: null,
    }
  },

  async cerrarSesion() {
    await supabase.auth.signOut()
  },

  // Google/Facebook — mock hasta que exista un Client ID/App ID real y el
  // backend soporte alta vía proveedor externo.
  async loginConProveedor(proveedor) {
    await delay()
    throw new Error(`Login con ${proveedor} todavía no está disponible.`)
  },

  // Alta self-service — mock: el backend hoy solo crea usuarios por
  // invitación de un superadmin (no hay endpoint público de registro).
  async registrar() {
    await delay()
    throw new Error('El alta de cuentas todavía no está disponible desde acá — hablá con un administrador.')
  },

  async solicitarRecuperacion(email) {
    await delay()
    if (!email) throw new Error('Ingresá tu email.')
    // Mock: no envía nada de verdad todavía.
    return { enviado: true, email }
  },
}
