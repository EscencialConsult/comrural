// Servicio real — comrural_erp_backend/src/documents/.
//
// El binario NUNCA pasa por el backend: se sube directo al bucket privado de
// Supabase Storage con una URL firmada de un solo uso. Son 3 pasos:
//
//   1. POST /documents          → crea la fila en CARGANDO + URL firmada
//   2. PUT  <url firmada>       → el navegador manda el archivo al bucket
//   3. POST /documents/:id/confirm → el backend verifica contra el bucket qué
//                                    quedó realmente guardado (tamaño y tipo
//                                    REAL) y recién ahí marca DISPONIBLE
//
// `subir()` encadena los tres — es lo que usan las pantallas. Los métodos
// sueltos quedan expuestos por si hace falta control fino (ej. una barra de
// progreso que reintente solo el paso 2).
import { apiClient } from '../lib/apiClient'

// SHA-256 del archivo, calculado en el navegador antes de subir. El backend
// lo guarda para control de integridad y detección de duplicados, y exige
// hexadecimal minúscula de 64 caracteres.
async function sha256Hex(file) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const documentsService = {
  sha256Hex,

  async crear({ originalName, mimeType, sizeBytes, sha256, replacesDocumentId }) {
    return apiClient.post('/documents', {
      originalName,
      mimeType,
      sizeBytes,
      sha256,
      ...(replacesDocumentId ? { replacesDocumentId } : {}),
    })
  },

  async confirmar(documentId) {
    return apiClient.post(`/documents/${documentId}/confirm`, {})
  },

  async obtener(documentId) {
    return apiClient.get(`/documents/${documentId}`)
  },

  // Enlace temporal de descarga, emitido en el momento y de vida corta — no
  // se guarda ni se puede repartir.
  async urlDescarga(documentId) {
    const { url } = await apiClient.get(`/documents/${documentId}/download-url`)
    return url
  },

  // Paso 2 suelto. NO usa apiClient a propósito: va al bucket de Supabase,
  // no al backend, así que no lleva el Bearer de la sesión ni el prefijo
  // /api/v1 — la autorización es la propia firma de la URL.
  async subirBinario({ url, token }, file) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': file.type || 'application/pdf',
      },
      body: file,
    })
    if (!res.ok) {
      throw new Error(`No se pudo subir el archivo al almacenamiento (${res.status}).`)
    }
  },

  // Los 3 pasos encadenados. Devuelve el documento ya en DISPONIBLE, listo
  // para adjuntarse a un informe.
  async subir(file, { replacesDocumentId } = {}) {
    const sha256 = await sha256Hex(file)
    const creado = await documentsService.crear({
      originalName: file.name,
      mimeType: file.type || 'application/pdf',
      sizeBytes: file.size,
      sha256,
      replacesDocumentId,
    })
    await documentsService.subirBinario(creado.upload, file)
    return documentsService.confirmar(creado.id)
  },
}
