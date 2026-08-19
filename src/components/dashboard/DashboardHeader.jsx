import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  MessagesSquare,
  CloudSun,
  CloudOff,
  LogOut,
  CheckCheck,
  Trash2,
  LayoutDashboard,
  SlidersHorizontal,
  Menu,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { puedeVerModulo } from '../../utils/permisos'
import { rolesService } from '../../services/rolesService'
import { notificacionesService } from '../../services/notificacionesService'
import { servicioService } from '../../services/servicioService'
import { MODULO_ICON } from '../../config/moduloIcons'

function formatearFecha(iso) {
  const diffHoras = Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (diffHoras < 1) return 'Hace un momento'
  if (diffHoras < 24) return `Hace ${diffHoras} h`
  return `Hace ${Math.round(diffHoras / 24)} d`
}

// Sin tildes/mayúsculas para que "produccion" encuentre "Producción".
function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Campana/mensajes son solo indicadores (no <button>) — todavía no hay
// sistema de notificaciones real conectado, así que no fingen ser
// clickeables. El buscador SÍ funciona: busca por nombre entre Resumen,
// los 8 módulos y Configuración (los mismos ítems del sidebar) y navega
// al elegido — no hay todavía un índice de contenido real para buscar
// dentro de cada módulo. Cerrar sesión sí es real.
export default function DashboardHeader({ clima, climaError, usuario, onAbrirMenu }) {
  const navigate = useNavigate()
  const { cerrarSesion: cerrarSesionAuth, permisos } = useAuth()
  const [rol, setRol] = useState(null)
  const [notificaciones, setNotificaciones] = useState([])
  const [notifAbierto, setNotifAbierto] = useState(false)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [menuCuentaAbierto, setMenuCuentaAbierto] = useState(false)
  const [modulos, setModulos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaEnfocada, setBusquedaEnfocada] = useState(false)

  useEffect(() => {
    if (!usuario?.rol) return
    let cancelado = false
    rolesService.getRolPorId(usuario.rol).then((data) => {
      if (!cancelado) setRol(data)
    })
    return () => {
      cancelado = true
    }
  }, [usuario?.rol])

  useEffect(() => {
    let cancelado = false
    notificacionesService.getNotificaciones().then((data) => {
      if (!cancelado) setNotificaciones(data)
    })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    servicioService.getModulos().then((data) => {
      if (!cancelado) setModulos(data)
    })
    return () => {
      cancelado = true
    }
  }, [])

  const cerrarSesion = async () => {
    await cerrarSesionAuth()
    navigate('/')
  }

  const itemsBuscables = [
    { id: 'panel', nombre: 'Resumen', ruta: '/panel', Icon: LayoutDashboard },
    ...modulos
      .filter((m) => puedeVerModulo(m.id, permisos))
      .map((m) => ({ id: m.id, nombre: m.nombre, ruta: `/panel/${m.id}`, Icon: MODULO_ICON[m.id] })),
    ...(permisos.has('iam:read')
      ? [{ id: 'usuarios', nombre: 'Usuarios', ruta: '/panel/usuarios', Icon: Users }]
      : []),
    { id: 'configuracion', nombre: 'Configuración', ruta: '/panel/configuracion', Icon: SlidersHorizontal },
  ]

  const resultadosBusqueda = busqueda.trim()
    ? itemsBuscables.filter((item) => normalizar(item.nombre).includes(normalizar(busqueda)))
    : []

  const busquedaAbierta = busquedaEnfocada && busqueda.trim().length > 0

  const irAResultado = (item) => {
    navigate(item.ruta)
    setBusqueda('')
    setBusquedaEnfocada(false)
  }

  const marcarTodasLeidas = async () => {
    setNotificaciones(await notificacionesService.marcarTodasLeidas())
  }

  const eliminarTodas = async () => {
    setNotificaciones(await notificacionesService.eliminarTodas())
    setConfirmarBorrado(false)
  }

  const cerrarNotificaciones = () => {
    setNotifAbierto(false)
    setConfirmarBorrado(false)
  }

  const sinLeer = notificaciones.some((n) => !n.leida)

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-marron-tierra/10 bg-crema-quinua px-3 py-4 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onAbrirMenu}
        title="Abrir menú"
        className="shrink-0 rounded-full p-2 text-marron-cafe/60 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>

      {/* El clima se revela de a poco según el ancho disponible: ícono +
          temperatura siempre (el espacio que liberó agrupar campana/
          mensajes/logout detrás del avatar en mobile alcanza para esto),
          ciudad desde "sm" y condición desde "md" — nunca todo junto de
          entrada, que era lo que empujaba al buscador y amontonaba todo en
          pantallas chicas. */}
      {clima && (
        <div className="flex shrink-0 items-center gap-1.5 text-sm text-marron-cafe/70">
          <CloudSun className="size-5 shrink-0 text-azul-andino" strokeWidth={1.75} />
          <span className="font-semibold whitespace-nowrap text-marron-cafe">{clima.temperaturaC}°C</span>
          <span className="hidden whitespace-nowrap sm:inline">{clima.ubicacion}</span>
          <span className="hidden text-marron-cafe/40 md:inline">·</span>
          <span className="hidden whitespace-nowrap md:inline">{clima.condicion}</span>
        </div>
      )}
      {!clima && climaError && (
        <div className="flex shrink-0 items-center gap-1.5 text-sm text-marron-cafe/40">
          <CloudOff className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="hidden whitespace-nowrap sm:inline">Clima no disponible por el momento</span>
        </div>
      )}

      {/* mx-auto: en mobile no hace nada (sin max-width, flex-1 ocupa todo
          el espacio libre igual) — pero desde "sm", en cuanto el
          max-width empieza a topar, centra el buscador en el espacio
          libre entre el clima y los íconos de la derecha, en vez de
          quedar pegado a la izquierda con un hueco vacío del lado
          derecho. Así en pantallas grandes vuelve a repartir el ancho
          completo del header, como antes. */}
      <div className="relative mx-auto min-w-0 flex-1 sm:max-w-xs md:max-w-md">
        <div className="flex items-center gap-2 rounded-full bg-marron-tierra/5 px-4 py-2 text-sm text-marron-cafe/70 transition-colors duration-200 focus-within:bg-marron-tierra/10">
          <Search className="size-4 shrink-0 text-marron-cafe/40" strokeWidth={1.75} />
          <input
            type="text"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onFocus={() => setBusquedaEnfocada(true)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' && resultadosBusqueda[0]) {
                evento.preventDefault()
                irAResultado(resultadosBusqueda[0])
              } else if (evento.key === 'Escape') {
                setBusquedaEnfocada(false)
                evento.currentTarget.blur()
              }
            }}
            placeholder="Buscar módulos…"
            className="w-full bg-transparent placeholder:text-marron-cafe/40 focus:outline-none"
          />
        </div>

        {busquedaAbierta && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setBusquedaEnfocada(false)} />
            <div className="search-panel absolute top-full left-0 z-50 mt-2 w-full rounded-2xl bg-white p-2 ring-1 ring-marron-tierra/10">
              {resultadosBusqueda.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-marron-cafe/40">
                  Sin resultados para "{busqueda}".
                </p>
              ) : (
                <ul className="flex flex-col">
                  {resultadosBusqueda.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => irAResultado(item)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-marron-cafe/80 transition-colors duration-150 hover:bg-marron-tierra/5"
                      >
                        {item.Icon && <item.Icon className="size-4 text-marron-cafe/40" strokeWidth={1.75} />}
                        {item.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {/* Notificaciones — solo desde md. En mobile, notifAbierto se sigue
          usando (el ícono de acá está oculto, pero el estado es el mismo
          que abre/cierra la sub-sección de notificaciones dentro del menú
          de cuenta de más abajo), así que no hace falta duplicar estado. */}
      <div className="relative hidden shrink-0 md:block">
        <button
          type="button"
          onClick={() => (notifAbierto ? cerrarNotificaciones() : setNotifAbierto(true))}
          title="Notificaciones"
          className="relative rounded-full p-2 text-marron-cafe/40 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe"
        >
          <Bell className="size-5" strokeWidth={1.75} />
          {sinLeer && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-rojo-pasankalla" />}
        </button>

        {notifAbierto && (
          <>
            <div className="fixed inset-0 z-40" onClick={cerrarNotificaciones} />
            <div className="notif-panel absolute top-full right-0 z-50 mt-2 w-80 origin-top-right rounded-2xl bg-white p-2 ring-1 ring-marron-tierra/10">
              <NotificacionesLista
                notificaciones={notificaciones}
                confirmarBorrado={confirmarBorrado}
                setConfirmarBorrado={setConfirmarBorrado}
                marcarTodasLeidas={marcarTodasLeidas}
                eliminarTodas={eliminarTodas}
              />
            </div>
          </>
        )}
      </div>

      <span title="Mensajes — próximamente" className="hidden shrink-0 text-marron-cafe/40 md:inline-block">
        <MessagesSquare className="size-5" strokeWidth={1.75} />
      </span>

      <div className="hidden shrink-0 items-center gap-2 md:flex md:pl-2">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-verde-bosque/15">
          {usuario?.avatar_url ? (
            <img src={usuario.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <img src="/logos/isotipo.webp" alt="" className="size-6 object-contain" />
          )}
        </div>
        <div className="hidden text-left lg:block">
          <p className="text-sm leading-tight font-semibold text-marron-cafe">{usuario?.nombre ?? 'Usuario'}</p>
          <p className="text-xs leading-tight text-marron-cafe/50">{rol?.nombre ?? 'Usuario COMRURAL'}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={cerrarSesion}
        title="Cerrar sesión"
        className="hidden shrink-0 rounded-full p-2 text-marron-cafe/50 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe md:inline-flex"
      >
        <LogOut className="size-5" strokeWidth={1.75} />
      </button>

      {/* Mobile: el avatar solo agrupa notificaciones/mensajes/cerrar
          sesión detrás de un único botón — libera el ancho que antes se
          repartía entre 4 elementos sueltos, así el clima tiene lugar para
          seguir mostrándose en pantallas chicas. */}
      <div className="relative shrink-0 md:hidden">
        <button
          type="button"
          onClick={() => setMenuCuentaAbierto((v) => !v)}
          title="Cuenta"
          className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-verde-bosque/15"
        >
          {usuario?.avatar_url ? (
            <img src={usuario.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <img src="/logos/isotipo.webp" alt="" className="size-6 object-contain" />
          )}
        </button>
        {/* Fuera del botón a propósito: el botón necesita overflow-hidden
            para recortar el avatar en círculo, y eso mismo le cortaba la
            mitad al puntito. Acá, como hermano posicionado respecto al
            wrapper de afuera (no al botón), puede sobresalir del círculo
            sin que nada se lo recorte. */}
        {sinLeer && (
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-rojo-pasankalla ring-2 ring-crema-quinua" />
        )}

        {menuCuentaAbierto && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setMenuCuentaAbierto(false)
                cerrarNotificaciones()
              }}
            />
            <div className="absolute top-full right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl bg-white p-2 ring-1 ring-marron-tierra/10">
              <button
                type="button"
                onClick={() => (notifAbierto ? cerrarNotificaciones() : setNotifAbierto(true))}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-marron-cafe/80 transition-colors duration-150 hover:bg-marron-tierra/5"
              >
                <Bell className="size-4 shrink-0 text-marron-cafe/40" strokeWidth={1.75} />
                Notificaciones
                {sinLeer && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-rojo-pasankalla" />}
              </button>

              {notifAbierto && (
                <div className="mt-1 rounded-xl bg-marron-tierra/5 p-1">
                  <NotificacionesLista
                    notificaciones={notificaciones}
                    confirmarBorrado={confirmarBorrado}
                    setConfirmarBorrado={setConfirmarBorrado}
                    marcarTodasLeidas={marcarTodasLeidas}
                    eliminarTodas={eliminarTodas}
                  />
                </div>
              )}

              <span className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-marron-cafe/40">
                <MessagesSquare className="size-4 shrink-0" strokeWidth={1.75} />
                Mensajes — próximamente
              </span>

              <div className="my-1 border-t border-marron-tierra/10" />

              <button
                type="button"
                onClick={cerrarSesion}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-rojo-pasankalla transition-colors duration-150 hover:bg-rojo-pasankalla/5"
              >
                <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

// Contenido de la lista de notificaciones — se usa dos veces (dropdown de
// escritorio anclado a la campana, y sub-sección dentro del menú de cuenta
// en mobile), extraído para que un fix acá no dependa de acordarse de
// repetirlo en el otro lugar.
function NotificacionesLista({ notificaciones, confirmarBorrado, setConfirmarBorrado, marcarTodasLeidas, eliminarTodas }) {
  return (
    <>
      {confirmarBorrado ? (
        <div className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5">
          <p className="text-xs text-marron-cafe/70">¿Borrar todas las notificaciones?</p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setConfirmarBorrado(false)}
              className="rounded-full px-2 py-1 text-xs font-medium text-marron-cafe/50 transition-colors duration-150 hover:bg-marron-tierra/10 hover:text-marron-cafe"
            >
              No
            </button>
            <button
              type="button"
              onClick={eliminarTodas}
              className="rounded-full bg-rojo-pasankalla/90 px-2 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-rojo-pasankalla"
            >
              Sí, borrar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-sm font-semibold text-marron-cafe">Notificaciones</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={marcarTodasLeidas}
              title="Marcar todas como leídas"
              className="rounded-full p-1.5 text-marron-cafe/30 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe/70"
            >
              <CheckCheck className="size-4" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              title="Borrar todas"
              className="rounded-full p-1.5 text-marron-cafe/30 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe/70"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      {notificaciones.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-marron-cafe/40">No hay notificaciones.</p>
      ) : (
        <ul className="flex flex-col">
          {notificaciones.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-xl px-2 py-2">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.leida ? '' : 'bg-verde-lima'}`} />
              <div>
                <p className="text-xs text-marron-cafe/80">{n.texto}</p>
                <p className="mt-0.5 text-[10px] text-marron-cafe/40">{formatearFecha(n.fecha)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
