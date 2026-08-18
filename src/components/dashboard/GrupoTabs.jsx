import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { GRUPOS_MAESTROS } from '../../config/gruposMaestros'

// Pastillas arriba de cada pantalla que pertenece a un grupo con más de una
// hermana (Compras: Personas/Organizaciones/Proveedores/Productos/Lotes;
// Configuración: Países) — para saltar entre ellas sin volver al menú
// lateral. Lee de config/gruposMaestros.js, la MISMA fuente que arma el
// sidebar (DashboardSidebar.jsx): sumar una pantalla nueva ahí actualiza
// las pastillas solo, este archivo no vuelve a tocarse.
//
// Vive en DashboardLayout.jsx (arriba del <Outlet/>), no en cada página —
// mismo motivo que useCatalogoMaestro: un solo lugar en vez de copiarlo a
// mano en cada pantalla del grupo.
export default function GrupoTabs() {
  const location = useLocation()
  const { permisos } = useAuth()

  const grupo = GRUPOS_MAESTROS.find(
    (g) => g.padre.ruta === location.pathname || g.items.some((item) => item.ruta === location.pathname),
  )

  if (!grupo) return null

  // El padre solo entra si es de acceso libre (sin `permiso`, como
  // Configuración) o si el usuario tiene el permiso real del módulo (como
  // Compras) — nunca se muestra una pestaña que lleve a una pantalla de
  // "sin acceso".
  const puedeVerPadre = !grupo.padre.permiso || permisos.has(grupo.padre.permiso)
  const hijos = grupo.items.filter((item) => permisos.has(item.permiso))

  // Si tras filtrar por permiso queda una sola pestaña (o el usuario entró
  // directo por URL sin permiso para ninguna hermana), no tiene sentido un
  // selector de "entre cuáles" — se oculta en vez de mostrar una fila con
  // un solo botón que no lleva a ningún lado nuevo.
  if ((puedeVerPadre ? 1 : 0) + hijos.length <= 1) return null

  return (
    <nav
      aria-label="Pantallas de esta sección"
      className="flex flex-wrap items-center gap-0.5 border-b border-marron-tierra/10 bg-crema-quinua px-6 pt-4 pb-3 md:px-10"
    >
      {puedeVerPadre && (
        <>
          <Pestaña item={grupo.padre} esRaiz />
          {/* Separador entre la pestaña "de inicio" del área y sus
              hermanas — sin esto, Compras se veía como una hermana más en
              la fila en vez de la entrada principal de toda la sección. */}
          {hijos.length > 0 && <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-marron-tierra/15" />}
        </>
      )}
      {hijos.map((item) => (
        <Pestaña key={item.ruta} item={item} />
      ))}
    </nav>
  )
}

function Pestaña({ item, esRaiz = false }) {
  return (
    <NavLink
      to={item.ruta}
      end={esRaiz}
      className={({ isActive }) =>
        `flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium transition-all duration-200 ease-out ${
          isActive
            ? 'bg-verde-lima text-marron-cafe'
            : 'text-marron-cafe/50 hover:-translate-y-0.5 hover:bg-marron-tierra/5 hover:text-marron-cafe/80'
        }`
      }
    >
      {item.Icon && <item.Icon className="size-3.5 shrink-0" strokeWidth={2.25} />}
      {item.nombre}
    </NavLink>
  )
}
