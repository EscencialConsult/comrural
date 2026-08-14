import { useSitioBase } from '../hooks/useSitioBase'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'
import Button from '../components/Button'

// Catch-all de App.jsx ("*") — mismo cascarón público que Servicio/Modulos/
// Novedades (SiteNav + hero-dots + SiteFooter), así una URL rota no
// aterriza en una pantalla en blanco sin marca ni salida.
export default function NotFound() {
  const { usuario, plataforma } = useSitioBase()

  return (
    <div className="min-h-svh flex flex-col bg-crema-quinua">
      <SiteNav usuario={usuario} />

      <main className="relative flex-1 overflow-hidden px-6 py-16 flex items-center justify-center text-center">
        <div className="hero-dots absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-md rise-in">
          <p className="text-7xl sm:text-8xl font-black text-marron-tierra leading-none">404</p>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black text-marron-cafe leading-tight">
            No encontramos esta página
          </h1>
          <p className="mt-3 text-marron-cafe/70">
            El enlace puede estar roto o la página se movió de lugar.
          </p>
          <Button to="/" variant="primary" className="mt-8">
            Volver al inicio
          </Button>
        </div>
      </main>

      <SiteFooter plataforma={plataforma} />
    </div>
  )
}
