import { useCallback, useEffect, useState } from 'react'

const claveStorage = (solicitudId) => `comrural:lab-analisis-mock:${solicitudId}`

const estadoInicialCategoria = () => ({ estado: 'SIN_INICIAR', valores: {}, actualizadoEn: null })

// Mock de progreso de "Iniciar análisis" (Laboratorio, FormularioIniciarAnalisis.jsx
// y las pantallas que abre por categoría: InformeAnalisisFisicoquimico.jsx,
// FormularioResultadosCategoria.jsx). El backend no tiene endpoint para
// guardar resultados de ensayos todavía (fuera de alcance del módulo
// laboratory actual, ver docs/laboratory.md §1) — "Guardar cambios"/
// "Finalizar" por categoría solo persisten acá, en localStorage del
// navegador, para poder cerrar la vista y reanudar después sin perder lo
// tipeado (a pedido explícito). Se pierde si se cambia de navegador/
// dispositivo o se borra el storage — limitación conocida y aceptada de un
// mock sin backend real.
//
// `valores` es un diccionario PLANO clave -> valor por categoría (no
// anidado por ensayo): cada pantalla decide sus propias claves — el
// informe fisicoquímico usa los ids fijos del papel ('q-humedad', 'f-0'…,
// ver informeFisicoquimicoParametros.js), el formulario genérico de las
// demás categorías arma la clave como `${itemId}:${campoKey}`. Al hook no
// le importa: solo guarda y devuelve lo que le piden.
//
// `actualizadoEn` (ISO, null hasta el primer guardado) — se usa para armar
// la pestaña Trazabilidad de ModalDetalleMuestra.jsx (Calidad): un evento
// "Categoría X guardada/finalizada" con fecha real de ESTE navegador,
// mezclado con los eventos reales de la solicitud (toma, recepción...).
export function useAnalisisDraft(solicitudId) {
  const [draft, setDraft] = useState({})

  useEffect(() => {
    if (!solicitudId) return
    try {
      const guardado = localStorage.getItem(claveStorage(solicitudId))
      setDraft(guardado ? JSON.parse(guardado) : {})
    } catch {
      setDraft({})
    }
  }, [solicitudId])

  const persistir = useCallback(
    (siguiente) => {
      setDraft(siguiente)
      try {
        localStorage.setItem(claveStorage(solicitudId), JSON.stringify(siguiente))
      } catch {
        // localStorage puede fallar (modo privado, cuota llena) — el mock
        // sigue funcionando en memoria para esta sesión, solo no sobrevive
        // a un refresh.
      }
    },
    [solicitudId],
  )

  const categoria = useCallback((cat) => draft[cat] ?? estadoInicialCategoria(), [draft])

  // Tipear no persiste en cada tecla (mismo criterio que FormularioInspeccion.jsx:
  // guardado explícito por botón, no autosave) — solo actualiza el estado en
  // memoria hasta que se clica "Guardar cambios".
  const cambiarValor = useCallback((cat, clave, valor) => {
    setDraft((prev) => {
      const actual = prev[cat] ?? estadoInicialCategoria()
      return { ...prev, [cat]: { ...actual, valores: { ...actual.valores, [clave]: valor } } }
    })
  }, [])

  const guardarCategoria = useCallback(
    (cat) => {
      const actual = draft[cat] ?? estadoInicialCategoria()
      persistir({
        ...draft,
        [cat]: { ...actual, estado: actual.estado === 'FINALIZADO' ? 'FINALIZADO' : 'GUARDADO', actualizadoEn: new Date().toISOString() },
      })
    },
    [draft, persistir],
  )

  const finalizarCategoria = useCallback(
    (cat) => {
      const actual = draft[cat] ?? estadoInicialCategoria()
      persistir({ ...draft, [cat]: { ...actual, estado: 'FINALIZADO', actualizadoEn: new Date().toISOString() } })
    },
    [draft, persistir],
  )

  return { categoria, cambiarValor, guardarCategoria, finalizarCategoria }
}
