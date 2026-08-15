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
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-marron-tierra/10 bg-crema-quinua px-6 py-4">
      <button
        type="button"
        onClick={onAbrirMenu}
        title="Abrir menú"
        className="rounded-full p-2 text-marron-cafe/60 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.75} />
      </button>

      {clima && (
        <div className="hidden items-center gap-2 text-sm text-marron-cafe/70 sm:flex">
          <CloudSun className="size-5 text-azul-andino" strokeWidth={1.75} />
          <span className="font-semibold text-marron-cafe">{clima.temperaturaC}°C</span>
          <span>{clima.ubicacion}</span>
          <span className="text-marron-cafe/40">·</span>
          <span>{clima.condicion}</span>
        </div>
      )}
      {!clima && climaError && (
        <div className="hidden items-center gap-2 text-sm text-marron-cafe/40 sm:flex">
          <CloudOff className="size-5" strokeWidth={1.75} />
          <span>Clima no disponible por el momento</span>
        </div>
      )}

      <div className="relative mx-auto w-full max-w-md">
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

      <div className="relative">
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
                      <span
                        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.leida ? '' : 'bg-verde-lima'}`}
                      />
                      <div>
                        <p className="text-xs text-marron-cafe/80">{n.texto}</p>
                        <p className="mt-0.5 text-[10px] text-marron-cafe/40">{formatearFecha(n.fecha)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <span title="Mensajes — próximamente" className="text-marron-cafe/40">
        <MessagesSquare className="size-5" strokeWidth={1.75} />
      </span>

      <div className="flex items-center gap-2 pl-2">
        <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-verde-bosque/15">
          {usuario?.avatar_url ? (
            <img src={usuario.avatar_url} alt="" className="size-full object-cover" />
          ) : (
            <img src="/logos/isotipo.webp" alt="" className="size-6 object-contain" />
          )}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm leading-tight font-semibold text-marron-cafe">{usuario?.nombre ?? 'Usuario'}</p>
          <p className="text-xs leading-tight text-marron-cafe/50">{rol?.nombre ?? 'Usuario COMRURAL'}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={cerrarSesion}
        title="Cerrar sesión"
        className="rounded-full p-2 text-marron-cafe/50 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe"
      >
        <LogOut className="size-5" strokeWidth={1.75} />
      </button>
    </header>
  )
}
