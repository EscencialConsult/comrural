import { Loader2 } from 'lucide-react'

// Se muestra mientras AuthContext restaura la sesión de Supabase de forma
// asíncrona (App.jsx/RutaProtegida.jsx) — antes ese instante mostraba una
// pantalla en blanco. Paleta clara (crema-quinua) porque cubre tanto la
// entrada pública como la zona autenticada, no solo el panel de auth
// oscuro. El giro es la única animación funcional del sitio que corre en
// loop (ver CLAUDE.md: motion decorativo vs. feedback funcional).
export default function LoadingScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-crema-quinua">
      <img src="/logos/marcacolor.webp" alt="COMRURAL XXI" className="h-10 w-auto" />
      <Loader2 className="size-6 animate-spin text-verde-lima" strokeWidth={2} aria-hidden="true" />
      <p className="text-sm text-marron-cafe/60">Cargando…</p>
    </div>
  )
}
