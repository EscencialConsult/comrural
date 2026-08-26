import { useCallback, useEffect, useState } from 'react'

const claveStorage = (solicitudId) => `comrural:lab-envio-externo-mock:${solicitudId}`

const VACIO = {
  analisisSolicitados: '',
  tipoServicio: '',
  tipoCuantificacion: '',
  cantidad: '',
  unidad: '',
  laboratorioDestino: '',
  precioUnitario: '',
  precioTotal: '',
  fechaEnvio: '',
  solicitadoPor: '',
  justificacion: '',
  verificadoPorEnvio: '',
  autorizadoPor: '',
  facturaNumero: '',
  conforme: '',
  verificadoPorLiberacion: '',
  codigoLaboratorioExterno: '',
  fechaRecepcionResultados: '',
  reporteAnalisis: '',
  categoria: '',
  estado: '',
}

// Mock de "Registro de envío de muestras" (I-LAB-16/R-01) para análisis
// externo (Laboratorio, FormularioAutorizarEnvio.jsx). El backend no tiene
// ningún endpoint para esto — es puro frontend, igual que
// useAnalisisDraft.js: se guarda solo en localStorage del navegador, se
// pierde si se cambia de dispositivo o se borra el storage. Un registro
// plano por solicitud (a diferencia de useAnalisisDraft.js no hay
// categorías, es un solo formulario con todos los campos del papel).
export function useEnvioExternoDraft(solicitudId) {
  const [valores, setValores] = useState(VACIO)
  const [guardadoEn, setGuardadoEn] = useState(null)

  useEffect(() => {
    if (!solicitudId) return
    try {
      const guardado = localStorage.getItem(claveStorage(solicitudId))
      const parsed = guardado ? JSON.parse(guardado) : null
      setValores(parsed ? { ...VACIO, ...parsed.valores } : VACIO)
      setGuardadoEn(parsed?.guardadoEn ?? null)
    } catch {
      setValores(VACIO)
      setGuardadoEn(null)
    }
  }, [solicitudId])

  const cambiarValor = useCallback((campo, valor) => {
    setValores((prev) => ({ ...prev, [campo]: valor }))
  }, [])

  // `precargar` solo llena los campos todavía vacíos — no pisa lo que ya se
  // guardó antes si se reabre el formulario (ver FormularioAutorizarEnvio.jsx,
  // se usa para completar "Análisis solicitados" con los ensayos reales de
  // la solicitud la primera vez que se abre).
  const precargar = useCallback((parciales) => {
    setValores((prev) => {
      const siguiente = { ...prev }
      for (const [campo, valor] of Object.entries(parciales)) {
        if (!siguiente[campo]) siguiente[campo] = valor
      }
      return siguiente
    })
  }, [])

  const guardar = useCallback(() => {
    const ahora = new Date().toISOString()
    setValores((actuales) => {
      try {
        localStorage.setItem(claveStorage(solicitudId), JSON.stringify({ valores: actuales, guardadoEn: ahora }))
      } catch {
        // localStorage puede fallar (modo privado, cuota llena) — el mock
        // sigue funcionando en memoria para esta sesión.
      }
      return actuales
    })
    setGuardadoEn(ahora)
  }, [solicitudId])

  return { valores, cambiarValor, precargar, guardar, guardadoEn }
}
