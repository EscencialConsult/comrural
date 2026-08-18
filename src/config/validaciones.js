// Regex compartidas para dar feedback inmediato en formularios, calcadas
// EXACTO de los CHECK constraints reales de Postgres (no inventadas acá) —
// ver comrural_erp_backend/src/organizations/organizations.schema.ts,
// constraints "organizations_phone_e164_check" y
// "organizations_email_format_check". Mismos formatos que reutilizan
// people/suppliers (ver sus docs/*.md — mismo `CHECK` de teléfono/email).
//
// La fuente de verdad real sigue siendo la base: si esta regex se
// desactualiza, el submit igual se rechaza con 400 del servidor — esto es
// solo para no hacerle esperar el roundtrip a alguien que tipeó mal.
export const REGEX_TELEFONO_E164 = /^\+[1-9]\d{7,14}$/
export const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
// CI boliviano: 6-8 dígitos, sin complemento ni lugar de expedición — ver
// comrural_erp_backend/src/people/dtos/person.dto.ts (bolivianCiSchema). El
// backend acepta separadores (".", " ", "-") y los saca con un `.transform`
// antes de validar el regex — se replica ese mismo normalizado acá para que
// "1.234.567" valide igual de un lado que del otro.
export const REGEX_CI = /^[0-9]{6,8}$/

export function telefonoValido(valor) {
  return valor.trim().length === 0 || REGEX_TELEFONO_E164.test(valor.trim())
}

export function emailValido(valor) {
  return valor.trim().length === 0 || REGEX_EMAIL.test(valor.trim())
}

export function normalizarCi(valor) {
  return valor.replace(/[.\s-]/g, '')
}

export function ciValido(valor) {
  const normalizado = normalizarCi(valor.trim())
  return normalizado.length === 0 || REGEX_CI.test(normalizado)
}
