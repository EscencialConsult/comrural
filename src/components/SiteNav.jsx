import { Link, NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../config/nav'

export default function SiteNav({ usuario }) {
  return (
    <nav className="sticky top-0 z-20 flex items-center justify-between border-b border-marron-tierra/10 bg-crema-quinua px-6 sm:px-10 py-5">
      <div className="flex items-center gap-10">
        <Link to="/">
          <img src="/logos/marcacolor.webp" alt="COMRURAL XXI" className="h-11" />
        </Link>
        <div className="hidden sm:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors duration-300 ${
                  isActive ? 'text-marron-cafe' : 'text-marron-cafe/70 hover:text-marron-cafe'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
      {usuario && (
        <span className="text-sm font-medium text-marron-cafe/70">Hola, {usuario.nombre}</span>
      )}
    </nav>
  )
}
