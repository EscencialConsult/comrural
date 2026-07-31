// Capa de servicio de autenticación. Los componentes SIEMPRE importan de
// acá, nunca de src/mock directo. Ver src/mock/README.md — este archivo
// es lo único que backend necesita reescribir (Supabase Auth o lo que
// se termine usando).
import { usuarioActual, usuariosPrueba } from '../mock'

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms))

const SESSION_KEY = 'comrural_sesion_mock'

export const authService = {
  // Login real (mock): cualquier usuario/contraseña no vacíos "funciona"
  // — no hay backend todavía, así que no hay credenciales reales que
  // validar. Guarda la sesión en localStorage para que sobreviva un
  // refresh (simula "recordarme", que quedó confirmado como default).
  async login({ usuario, contrasena }) {
    await delay()
    if (!usuario || !contrasena) {
      throw new Error('Usuario o contraseña incorrectos.')
    }
    const sesion = { ...usuarioActual, email: usuario }
    localStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
    return sesion
  },

  // Switcher de desarrollo — loguea directo como uno de los usuarios de
  // prueba, sin pedir contraseña. Ver DevRoleSwitcher.jsx: se elimina
  // antes de producción.
  async loginComoUsuarioPrueba(usuarioId) {
    await delay(150)
    const usuario = usuariosPrueba.find((u) => u.id === usuarioId)
    if (!usuario) throw new Error('Usuario de prueba no encontrado.')
    localStorage.setItem(SESSION_KEY, JSON.stringify(usuario))
    return usuario
  },

  async getUsuariosPrueba() {
    await delay(100)
    return [...usuariosPrueba]
  },

  // Google/Facebook — mock hasta que exista un Client ID / App ID real
  // (los crea Facundo en Google Cloud Console / Facebook for Developers)
  // y un backend que verifique el token. Simula un login exitoso para
  // que el botón tenga un destino real mientras tanto.
  async loginConProveedor(proveedor) {
    await delay(300)
    const sesion = {
      ...usuarioActual,
      nombre: `Usuario de ${proveedor}`,
      email: `usuario@${proveedor.toLowerCase()}.mock`,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
    return sesion
  },

  async registrar({ nombre, email, contrasena, aceptaTerminos }) {
    await delay()
    if (!aceptaTerminos) {
      throw new Error('Tenés que aceptar los términos para crear la cuenta.')
    }
    const nuevoUsuario = { id: `usr_${Date.now()}`, nombre, email, rol: 'sin_asignar' }
    localStorage.setItem(SESSION_KEY, JSON.stringify(nuevoUsuario))
    return nuevoUsuario
  },

  async solicitarRecuperacion(email) {
    await delay()
    if (!email) throw new Error('Ingresá tu email.')
    // Mock: no envía nada de verdad, solo simula el flujo self-service.
    return { enviado: true, email }
  },

  getSesionActual() {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  },

  cerrarSesion() {
    localStorage.removeItem(SESSION_KEY)
  },
}
