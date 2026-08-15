// Cada módulo de negocio tiene su propio permiso "<moduloId>:read" (ver
// comrural_erp_backend/src/database/migrations/0019_business_modules_permissions.sql)
// — es una regla uniforme para los 8, no hace falta un mapeo caso por caso.
// "Resumen" y "Configuración" NUNCA pasan por acá: son de acceso libre para
// cualquier usuario autenticado, no son "módulos" en este sentido.
export function puedeVerModulo(moduloId, permisos) {
  return permisos.has(`${moduloId}:read`)
}
