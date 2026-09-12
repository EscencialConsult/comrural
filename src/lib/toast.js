// Store de toasts, sin librería externa (decisión explícita: nada de
// sonner/react-hot-toast — ver Toaster.jsx). Pub-sub a nivel de módulo, NO
// React Context: `toast.success(...)` tiene que poder llamarse desde
// cualquier lado — hooks (useCatalogoMaestro.js), services, handlers — sin
// que quien lo llama esté necesariamente "dentro" de un provider en ese
// instante. `Toaster.jsx` es el único suscriptor real (se monta una vez en
// DashboardLayout.jsx) y es quien pinta la lista.
let toasts = []
let listeners = []
let siguienteId = 0

function notificar() {
  for (const listener of listeners) listener(toasts)
}

// No exportado — solo Toaster.jsx se suscribe. Cualquier otro consumidor
// debe usar la API `toast.*` de abajo, nunca leer `toasts` directo.
function suscribir(listener) {
  listeners.push(listener)
  listener(toasts)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

const DURACION_MS = 4000

function agregar(tipo, mensaje) {
  if (!mensaje) return
  const id = siguienteId++
  toasts = [...toasts, { id, tipo, mensaje }]
  notificar()
  setTimeout(() => quitar(id), DURACION_MS)
  return id
}

function quitar(id) {
  toasts = toasts.filter((t) => t.id !== id)
  notificar()
}

export const toast = {
  success: (mensaje) => agregar('positivo', mensaje),
  error: (mensaje) => agregar('negativo', mensaje),
  info: (mensaje) => agregar('neutro', mensaje),
}

// Uso interno de Toaster.jsx únicamente.
export const toastStore = { suscribir, quitar }
