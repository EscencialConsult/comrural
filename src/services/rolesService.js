// Capa de servicio de roles. Los componentes SIEMPRE importan de acá,
// nunca de src/mock directo. Ver src/mock/README.md — este archivo es
// lo único que backend necesita reescribir cuando exista una tabla
// `roles` real (con permisos/módulos visibles por rol).
//
// Hoy los 8 roles son placeholders sin distinción ("Rol N°1".."Rol N°8")
// a propósito — todavía no está definido qué rol ve qué. Cuando se
// establezcan los roles reales (probablemente 1 por módulo operativo:
// Almacén, Calidad, Producción, Compras, Contabilidad, Gerencia,
// Mantenimiento, Despacho — ver wiki/comrural-arquitectura-general.md —
// o una combinación más fina, a confirmar), esta es la única función que
// hay que tocar para que el resto de la app (dashboard, nav, permisos)
// lea la lista real sin cambiar nada más.
import { roles } from '../mock'

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

export const rolesService = {
  async getRoles() {
    await delay()
    return [...roles]
  },

  async getRolPorId(id) {
    await delay(100)
    return roles.find((r) => r.id === id) ?? null
  },
}
