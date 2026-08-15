import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, SlidersHorizontal, Users, X } from 'lucide-react'
import { servicioService } from '../../services/servicioService'
import { MODULO_ICON } from '../../config/moduloIcons'
import { useAuth } from '../../context/AuthContext.jsx'
import { puedeVerModulo } from '../../utils/permisos'
import AiAdvisorTeaser from './AiAdvisorTeaser'

const CLAVE_COLAPSADO = 'comrural_sidebar_colapsado'
const MEDIA_ESCRITORIO = '(min-width: 768px)'

// Nav del panel: Resumen + los módulos que el rol del usuario habilita
// (permisos reales "<moduloId>:read" — ver src/utils/permisos.js) +
// Configuración, que es de acceso libre.
//
// `abierto`/`onCerrar`: en pantallas chicas el sidebar es un drawer que
// arranca oculto — DashboardLayout guarda ese estado (lo necesita también
// DashboardHeader para el botón que lo abre) y lo pasa para acá.
export default function DashboardSidebar({ abierto, onCerrar }) {
  const { permisos } = useAuth()
  const [todosLosModulos, setTodosLosModulos] = useState([])
  const modulos = useMemo(
    () => todosLosModulos.filter((m) => puedeVerModulo(m.id, permisos)),
    [todosLosModulos, permisos],
  )
  const [colapsado, setColapsado] = useState(
    () => localStorage.getItem(CLAVE_COLAPSADO) === 'true'
  )
  // El modo "colapsado a íconos" es una preferencia de escritorio — en el
  // drawer mobile no tiene sentido (se abre a propósito, tiene que
  // mostrarse completo). Sin este chequeo, un colapsado guardado desde
  // desktop dejaría el drawer angosto e ilegible en el celular.
  const [esEscritorio, setEsEscritorio] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MEDIA_ESCRITORIO).matches
  )
  const colapsadoEfectivo = esEscritorio && colapsado

  const navRef = useRef(null)
  const [sombraArriba, setSombraArriba] = useState(false)
  const [sombraAbajo, setSombraAbajo] = useState(false)

  useEffect(() => {
    let cancelado = false
    servicioService.getModulos().then((data) => {
      if (!cancelado) setTodosLosModulos(data)
    })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CLAVE_COLAPSADO, String(colapsado))
  }, [colapsado])

  useEffect(() => {
    const mq = window.matchMedia(MEDIA_ESCRITORIO)
    const alCambiar = (e) => setEsEscritorio(e.matches)
    mq.addEventListener('change', alCambiar)
    return () => mq.removeEventListener('change', alCambiar)
  }, [])

  // Sombras que avisan "hay más para scrollear" arriba/abajo de la lista
  // de módulos — sin esto, una lista larga se corta de golpe contra el
  // borde y no hay forma de notar que sigue si no se scrollea "a ciegas".
  useEffect(() => {
    const el = navRef.current
    if (!el) return

    const actualizar = () => {
      setSombraArriba(el.scrollTop > 4)
      setSombraAbajo(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
    }

    actualizar()
    el.addEventListener('scroll', actualizar)
    const resizeObserver = new ResizeObserver(actualizar)
    resizeObserver.observe(el)
    return () => {
      el.removeEventListener('scroll', actualizar)
      resizeObserver.disconnect()
    }
  }, [modulos, colapsadoEfectivo])

  const linkClass = ({ isActive }) =>
    `sidebar-navitem flex items-center rounded-xl py-2.5 text-sm font-medium ${
      colapsadoEfectivo ? 'is-colapsado' : ''
    } ${
      isActive
        ? 'bg-verde-lima/15 text-verde-lima'
        : 'text-crema-quinua/70 hover:bg-crema-quinua/5 hover:text-crema-quinua'
    }`

  return (
    <>
      {/* Fondo del drawer en mobile — clickear afuera cierra, igual que
          los dropdowns de DashboardHeader. md:hidden: en escritorio el
          sidebar nunca es un overlay, así que este fondo no aplica. */}
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-marron-cafe/60 md:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      {/* Contenedor relativo propio: el handle de colapsar se ancla a este
          borde, no al <aside> — el <aside> ya no tiene overflow-y-auto (el
          único scroll interno vive en el <nav> de más abajo), y fijar el
          handle ahí adentro lo recortaría en el eje X (overflow-y en un
          solo eje fuerza el otro a auto/clip también). */}
      <div className="relative flex shrink-0">
        <aside
          className={`sidebar-collapse fixed inset-y-0 left-0 z-40 flex h-svh flex-col bg-marron-cafe py-6 md:static ${
            colapsadoEfectivo ? 'w-20 px-2' : 'w-64 px-4'
          } ${abierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        >
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar menú"
            className="absolute top-4 right-4 rounded-full p-1.5 text-crema-quinua/50 hover:bg-crema-quinua/10 hover:text-crema-quinua md:hidden"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>

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
            title={colapsadoEfectivo ? 'Expandir menú' : 'Minimizar menú'}
            className={`mb-8 block ${colapsadoEfectivo ? '' : 'px-1'}`}
          >
            <div className="relative flex h-20 w-full items-center justify-center rounded-xl bg-crema-quinua">
              <img
                src="/logos/logorealcolor.webp"
                alt="COMRURAL XXI"
                aria-hidden={colapsadoEfectivo}
                className={`sidebar-logo-fade absolute h-16 w-auto max-w-[92%] ${colapsadoEfectivo ? 'opacity-0' : 'opacity-100'}`}
              />
              <img
                src="/logos/isotipo.webp"
                alt="COMRURAL XXI"
                aria-hidden={!colapsadoEfectivo}
                className={`sidebar-logo-fade absolute size-10 ${colapsadoEfectivo ? 'opacity-100' : 'opacity-0'}`}
              />
            </div>
          </button>

          {/* Único scroll interno del sidebar: logo (arriba) y tarjeta de IA
              (abajo) quedan siempre fijos, solo esta lista de módulos
              scrollea si no entra completa. min-h-0 es necesario porque un
              hijo flex nunca se encoge por debajo de la altura de su propio
              contenido por default — sin eso, overflow-y-auto no haría nada
              y volvería a ser el <aside> entero el que se estira. */}
          <div className="relative min-h-0 flex-1">
            <nav
              ref={navRef}
              className="sidebar-nav-scroll flex h-full flex-col gap-1 overflow-y-auto"
            >
              <NavLink to="/panel" end className={linkClass} title={colapsadoEfectivo ? 'Resumen' : undefined}>
                <LayoutDashboard className="size-5 shrink-0" strokeWidth={1.75} />
                <span className={`sidebar-label ${colapsadoEfectivo ? 'is-oculto' : ''}`}>Resumen</span>
              </NavLink>

              {modulos.map((modulo) => {
                const Icon = MODULO_ICON[modulo.id]
                return (
                  <NavLink
                    key={modulo.id}
                    to={`/panel/${modulo.id}`}
                    className={linkClass}
                    title={colapsadoEfectivo ? modulo.nombre : undefined}
                  >
                    {Icon && <Icon className="size-5 shrink-0" strokeWidth={1.75} />}
                    <span className={`sidebar-label ${colapsadoEfectivo ? 'is-oculto' : ''}`}>{modulo.nombre}</span>
                  </NavLink>
                )
              })}

              {/* Gestión de usuarios/roles — solo superadmin hoy (permiso
                  real "iam:read", no un código de rol hardcodeado). */}
              {permisos.has('iam:read') && (
                <NavLink
                  to="/panel/usuarios"
                  className={linkClass}
                  title={colapsadoEfectivo ? 'Usuarios' : undefined}
                >
                  <Users className="size-5 shrink-0" strokeWidth={1.75} />
                  <span className={`sidebar-label ${colapsadoEfectivo ? 'is-oculto' : ''}`}>Usuarios</span>
                </NavLink>
              )}

              <NavLink
                to="/panel/configuracion"
                className={linkClass}
                title={colapsadoEfectivo ? 'Configuración' : undefined}
              >
                <SlidersHorizontal className="size-5 shrink-0" strokeWidth={1.75} />
                <span className={`sidebar-label ${colapsadoEfectivo ? 'is-oculto' : ''}`}>Configuración</span>
              </NavLink>
            </nav>

            {/* Sombras de "hay más" — se apagan solas apenas no queda nada
                para scrollear de ese lado, no son decorativas fijas. */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 h-6 bg-linear-to-b from-marron-cafe to-transparent transition-opacity duration-200 ${sombraArriba ? 'opacity-100' : 'opacity-0'}`}
            />
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-marron-cafe to-transparent transition-opacity duration-200 ${sombraAbajo ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>

          <div className={`sidebar-aicard ${colapsadoEfectivo ? 'is-oculto' : ''}`}>
            <div className="overflow-hidden">
              <AiAdvisorTeaser />
            </div>
          </div>
        </aside>

        {/* Handle de colapsar/expandir — funcionalidad de escritorio
            únicamente (ver colapsadoEfectivo), no tiene sentido en el
            drawer mobile. */}
        <button
          type="button"
          onClick={() => setColapsado((valor) => !valor)}
          title={colapsado ? 'Expandir menú' : 'Minimizar menú'}
          className="absolute top-1/2 -right-1.5 z-10 hidden h-10 w-3 -translate-y-1/2 rounded-full bg-crema-quinua/25 transition-colors duration-200 hover:bg-crema-quinua/60 md:block"
        />
      </div>
    </>
  )
}
