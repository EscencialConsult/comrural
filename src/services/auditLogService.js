// Servicio real — GET /iam/audit-log (comrural_erp_backend/src/iam/
// controllers/audit-log.controller.ts). Único punto de lectura de
// audit_log desde la app; el único camino de escritura es el trigger
// audit_generic() (migración 0006), nunca un POST/PATCH/DELETE. Solo lo
// tiene el permiso `audit:read` — hoy únicamente asignado a `superadmin`
// (ver 0006_audit_log.sql), no a `calidad`.
import { apiClient } from '../lib/apiClient'

export const auditLogService = {
  async listar({ tableName, recordId, userId, action, from, to, cursor, limit = 50, includePayload = true } = {}) {
    const params = new URLSearchParams()
    if (tableName) params.set('tableName', tableName)
    if (recordId) params.set('recordId', recordId)
    if (userId) params.set('userId', userId)
    if (action) params.set('action', action)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (cursor) params.set('cursor', cursor)
    params.set('limit', String(limit))
    params.set('includePayload', String(includePayload))
    return apiClient.get(`/iam/audit-log?${params.toString()}`)
  },
}
