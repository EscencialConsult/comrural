import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, SlidersHorizontal } from 'lucide-react'
import { servicioService } from '../../services/servicioService'
import { MODULO_ICON } from '../../config/moduloIcons'
import AiAdvisorTeaser from './AiAdvisorTeaser'

const CLAVE_COLAPSADO = 'comrural_sidebar_colapsado'

// Nav del panel: Resumen + los 8 módulos reales relevados (mismos que
// /modulos, ver modulos.json) + Configuración. Hoy TODOS habilitados por
// igual para los 8 roles de prueba (sin distinción) — el día que se
// definan permisos reales por rol, esto es lo único que cambia por rol:
// qué ítems de esta lista se muestran/habilitan, no el resto del diseño.
export default function DashboardSidebar() {
  const [modulos, setModulos] = useState([])
  const [colapsado, setColapsado] = useState(
    () => localStorage.getItem(CLAVE_COLAPSADO) === 'true'
  )

  useEffect(() => {
    let cancelado = false
    servicioService.getModulos().then((data) => {
      if (!cancelado) setModulos(data)
    })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CLAVE_COLAPSADO, String(colapsado))
  }, [colapsado])

  const linkClass = ({ isActive }) =>
    `sidebar-navitem flex items-center rounded-xl py-2.5 text-sm font-medium ${
      colapsado ? 'is-colapsado' : ''
    } ${
      isActive
        ? 'bg-verde-lima/15 text-verde-lima'
        : 'text-crema-quinua/70 hover:bg-crema-quinua/5 hover:text-crema-quinua'
    }`

  return (
    // Contenedor relativo propio: el handle de colapsar se ancla a este
    // borde, no al <aside> — el <aside> tiene overflow-y-auto, y fijar el
    // handle ahí adentro lo recortaría en el eje X (overflow-y en un solo
    // eje fuerza el otro a auto/clip también).
    <div className="relative flex shrink-0">
      <aside
        className={`sidebar-collapse flex h-svh flex-col overflow-y-auto bg-marron-cafe py-6 ${
          colapsado ? 'w-20 px-2' : 'w-64 px-4'
        }`}
      >
        {/* Altura fija (h-20) en los dos estados — si dependiera del
            padding/tamaño de cada logo, el bloque mide distinto colapsado
            vs. expandido y todo el nav de abajo se corre al alternar. Los
            dos logos quedan montados siempre y se cruzan por opacidad
            (no por swap de `src`) — cambiar el `src` de golpe entre dos
            imágenes tan distintas se veía como un parpadeo. */}
        {/* El logo también funciona como toggle de colapsar/expandir
            (redundante con la barrita del borde, a propósito — Facundo lo
            pidió "por las dudas"), por eso es <button>, no <Link>: la
            navegación a /panel ya la cubre el ítem "Resumen" de abajo. */}
        <button
          type="button"
          onClick={() => setColapsado((valor) => !valor)}
          title={colapsado ? 'Expandir menú' : 'Minimizar menú'}
          className={`mb-8 block ${colapsado ? '' : 'px-1'}`}
        >
          <div className="relative flex h-20 w-full items-center justify-center rounded-xl bg-crema-quinua">
            <img
              src="/logos/logorealcolor.webp"
              alt="COMRURAL XXI"
              aria-hidden={colapsado}
              className={`sidebar-logo-fade absolute h-16 w-auto max-w-[92%] ${colapsado ? 'opacity-0' : 'opacity-100'}`}
            />
            <img
              src="/logos/isotipo.webp"
              alt="COMRURAL XXI"
              aria-hidden={!colapsado}
              className={`sidebar-logo-fade absolute size-10 ${colapsado ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>
        </button>

        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/panel" end className={linkClass} title={colapsado ? 'Resumen' : undefined}>
            <LayoutDashboard className="size-5 shrink-0" strokeWidth={1.75} />
            <span className={`sidebar-label ${colapsado ? 'is-oculto' : ''}`}>Resumen</span>
          </NavLink>

          {modulos.map((modulo) => {
            const Icon = MODULO_ICON[modulo.id]
            return (
              <NavLink
                key={modulo.id}
                to={`/panel/${modulo.id}`}
                className={linkClass}
                title={colapsado ? modulo.nombre : undefined}
              >
                {Icon && <Icon className="size-5 shrink-0" strokeWidth={1.75} />}
                <span className={`sidebar-label ${colapsado ? 'is-oculto' : ''}`}>{modulo.nombre}</span>
              </NavLink>
            )
          })}

          <NavLink
            to="/panel/configuracion"
            className={linkClass}
            title={colapsado ? 'Configuración' : undefined}
          >
            <SlidersHorizontal className="size-5 shrink-0" strokeWidth={1.75} />
            <span className={`sidebar-label ${colapsado ? 'is-oculto' : ''}`}>Configuración</span>
          </NavLink>
        </nav>

        <div className={`sidebar-aicard ${colapsado ? 'is-oculto' : ''}`}>
          <div className="overflow-hidden">
            <AiAdvisorTeaser />
          </div>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setColapsado((valor) => !valor)}
        title={colapsado ? 'Expandir menú' : 'Minimizar menú'}
        className="absolute top-1/2 -right-1.5 z-10 h-10 w-3 -translate-y-1/2 rounded-full bg-crema-quinua/25 transition-colors duration-200 hover:bg-crema-quinua/60"
      />
    </div>
  )
}
