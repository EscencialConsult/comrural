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

  // Crea la identidad en Supabase Auth + le asigna roleId en un solo paso —
  // el backend exige que quien haga esto sea superadmin global activo, no
  // alcanza con el permiso "users:create" solo (ver
  // UsersManagementService.create). `password` es opcional: si se manda, la
  // cuenta queda lista para entrar con esa contraseña ya mismo; si no, sigue
  // el flujo por defecto (correo de invitación, la persona la define ella).
  async crearUsuario({ email, fullName, roleId, password }) {
    return apiClient.post('/iam/users', { email, fullName, roleId, ...(password ? { password } : {}) })
  },

  async actualizarUsuario(userId, patch) {
    return apiClient.patch(`/iam/users/${userId}`, patch)
  },

  async listarRoles() {
    const { data } = await apiClient.get('/iam/roles?limit=100')
    return data
  },

  // name/description del rol — nunca code (inmutable) ni isSystem (el
  // backend lo rechaza si se manda). Roles de sistema (isSystem) también
  // rechazan esto — ConflictException, ver RolesService.update.
  async actualizarRol(roleId, patch) {
    return apiClient.patch(`/iam/roles/${roleId}`, patch)
  },

  // code/name obligatorios, description/areaId opcionales — isSystem NUNCA
  // se manda (el servidor lo fuerza a false, ver RolesService.create).
  async crearRol({ code, name, description, areaId }) {
    return apiClient.post('/iam/roles', { code, name, description: description || null, areaId: areaId || null })
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

  // Catálogo completo de permisos (module/action/description) — universo de
  // opciones para armar el checklist al editar los permisos de un rol.
  async listarPermisos() {
    const { data } = await apiClient.get('/iam/permissions')
    return data
  },

  async actualizarPermisosDeRol(roleId, permissionIds) {
    return apiClient.put(`/iam/roles/${roleId}/permissions`, { permissionIds })
  },
}
