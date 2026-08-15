// Capa de servicio de gestión de usuarios/roles (pantalla /panel/usuarios).
// A diferencia del resto de src/services/, este SÍ le pega directo al
// backend real (no hay mock acá — no tendría sentido simular altas/bajas
// de roles de verdad). Ver comrural_erp_backend/src/iam/controllers/.
import { apiClient } from '../lib/apiClient'

export const iamService = {
  async listarUsuarios() {
    const { data } = await apiClient.get('/iam/users?limit=100')
    return data
  },

  async actualizarUsuario(userId, patch) {
    return apiClient.patch(`/iam/users/${userId}`, patch)
  },

  async listarRoles() {
    const { data } = await apiClient.get('/iam/roles?limit=100')
    return data
  },

  // Detalle con permisos incluidos — el list de arriba NO trae permisos,
  // hay que pedirlos por rol (ver RolesService.getById en el backend).
  async getRol(roleId) {
    return apiClient.get(`/iam/roles/${roleId}`)
  },

  async getRolesDeUsuario(userId) {
    return apiClient.get(`/iam/users/${userId}/roles`)
  },

  async asignarRol(userId, roleId) {
    // sucursal siempre null: el alcance por sucursal todavía no está
    // implementado del lado del backend (Fase 3, ver comentario en
    // PermissionsLoaderService) — toda asignación hoy es global.
    return apiClient.post(`/iam/users/${userId}/roles`, { roleId, sucursal: null })
  },

  async revocarRol(userId, assignmentId) {
    return apiClient.delete(`/iam/users/${userId}/roles/${assignmentId}`)
  },
}
