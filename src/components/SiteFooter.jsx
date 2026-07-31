import { Link } from 'react-router-dom'
import { NAV_LINKS } from '../config/nav'

// Footer "Experience liftoff" — mismo motivo que el resto del sitio
// (clonado de antigravity.google, ver CLAUDE.md). Todos los links son
// rutas reales de react-router, ninguno queda sin destino.
export default function SiteFooter({ plataforma }) {
  return (
    <footer className="bg-marron-cafe text-white px-6 sm:px-10 pt-12 pb-6 mt-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <div className="flex flex-wrap items-start justify-between gap-10">
          <div className="max-w-sm">
            <img src="/logos/marcablanco.webp" alt="COMRURAL XXI" className="h-7 mb-3" />
            <p className="text-sm text-white/60">
              Sistema de gestión interno de COMRURAL XXI SRL — Almacén, Calidad, Producción, Compras
              y el resto de la operación, en un solo lugar.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Sistema</p>
            <ul className="flex flex-col gap-1 text-sm text-white/80">
              <li>
                <Link to="/servicio" className="hover:text-white">Inicio</Link>
              </li>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-white">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p
          className="font-black text-[15vw] sm:text-[9rem] leading-none tracking-tight text-white/10 select-none"
          aria-hidden="true"
        >
          COMRURAL
        </p>
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>© {new Date().getFullYear()} COMRURAL XXI SRL</span>
          {plataforma && <span>v{plataforma.version}</span>}
        </div>
      </div>
    </footer>
  )
}
