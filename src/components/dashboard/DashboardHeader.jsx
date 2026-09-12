import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  CloudSun,
  CloudOff,
  LogOut,
  CheckCheck,
  LayoutDashboard,
  SlidersHorizontal,
  Menu,
  Users,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { puedeVerModulo } from '../../utils/permisos'
import { rolesService } from '../../services/rolesService'
import { notificacionesService } from '../../services/notificacionesService'
import { siguienteCursor } from '../../services/paginacion'
import { servicioService } from '../../services/servicioService'
import { MODULO_ICON } from '../../config/moduloIcons'
import { resolverRutaNotificacion } from '../../utils/resolverRutaNotificacion'
import { useNotificacionesTiempoReal } from '../../hooks/useNotificacionesTiempoReal'

const LIMITE_NOTIFICACIONES = 10

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

// Campana: conectada al backend real (GET /notifications, POST
// /notifications/:id/read — ver comrural_erp_backend/docs/notifications.md).
// Se refresca al montar, cada vez que se abre el dropdown, y en vivo vía
// Supabase Realtime (useNotificacionesTiempoReal, canal privado por
// usuario) — al llegar un evento se recarga la bandeja y el contador de no
// leídas, y la campana hace un solo "ring" (.bell-ring en index.css) como
// aviso de que llegó algo nuevo. El contador (notifNoLeidasTotal) es un
// número real, no un simple punto — pide status=unread aparte porque la
// lista visible (`notificaciones`) trae "todas", paginada de a
// LIMITE_NOTIFICACIONES, y no alcanza para saber el total de no leídas.
// El buscador SÍ funciona: busca por nombre
// entre Resumen, los 8 módulos y Configuración (los mismos ítems del
// sidebar) y navega al elegido — no hay todavía un índice de contenido real
// para buscar dentro de cada módulo. Cerrar sesión sí es real.
export default function DashboardHeader({ clima, climaError, usuario, onAbrirMenu }) {
  const navigate = useNavigate()
  const { cerrarSesion: cerrarSesionAuth, permisos } = useAuth()
  const [rol, setRol] = useState(null)
  const [notificaciones, setNotificaciones] = useState([])
  const [notifCursor, setNotifCursor] = useState(null)
  const [notifCargandoMas, setNotifCargandoMas] = useState(false)
  const [notifAbierto, setNotifAbierto] = useState(false)
  const [notifNoLeidasTotal, setNotifNoLeidasTotal] = useState(0)
  const [campanaAnimando, setCampanaAnimando] = useState(false)
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

  const cargarNotificaciones = () =>
    notificacionesService.listar({ limit: LIMITE_NOTIFICACIONES }).then((respuesta) => {
      setNotificaciones(respuesta.data)
      setNotifCursor(siguienteCursor(respuesta))
    })

  // Total real de no leídas para el badge de la campana — status=unread
  // aparte de `cargarNotificaciones` porque esa trae "todas" (paginada de a
  // LIMITE_NOTIFICACIONES) y no alcanza para un conteo correcto. limit=100
  // es el máximo que acepta el backend (ver ListNotificationsQueryDto); si
  // hasMore sigue en true después de eso, se muestra "99+".
  const refrescarConteoNoLeidas = () =>
    notificacionesService.listar({ status: 'unread', limit: 100 }).then((respuesta) => {
      setNotifNoLeidasTotal(respuesta.hasMore ? 100 : respuesta.data.length)
    })

  useEffect(() => {
    Promise.all([cargarNotificaciones(), refrescarConteoNoLeidas()]).catch(() => {
      // Silencioso — la campana simplemente queda en 0 hasta el próximo
      // trigger (abrir el dropdown, o el próximo evento de Realtime).
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refresca al abrir el dropdown — respaldo si Realtime no llegó a
  // conectar todavía o se perdió algún evento mientras la pestaña estaba en
  // segundo plano.
  useEffect(() => {
    if (!notifAbierto) return
    cargarNotificaciones().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifAbierto])

  // Push en vivo — canal privado del usuario (ver
  // useNotificacionesTiempoReal.js y el comentario de arriba del todo). El
  // evento de Supabase solo avisa "pasó algo", no trae el contenido — por
  // eso se recarga la bandeja real contra el backend. campanaAnimando
  // dispara las tres animaciones a la vez (bell-ring, bell-ping, bell-label
  // — ver index.css), todas sincronizadas al mismo evento.
  useNotificacionesTiempoReal(usuario?.id, () => {
    cargarNotificaciones().catch(() => {})
    refrescarConteoNoLeidas().catch(() => {})
    setCampanaAnimando(true)
    setTimeout(() => setCampanaAnimando(false), 900)
  })

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

  // Marca leída una notificación puntual (click en el ítem, o parte del
  // loop de "marcar todas" de abajo) — actualiza el estado local con la
  // respuesta real del backend en vez de asumir que salió bien.
  const marcarUnaLeida = async (notificationId) => {
    const { readAt } = await notificacionesService.marcarLeida(notificationId)
    setNotificaciones((actual) => actual.map((n) => (n.id === notificationId ? { ...n, readAt } : n)))
    refrescarConteoNoLeidas().catch(() => {})
  }

  // El backend no tiene un endpoint de "marcar todas" — es una por una (ver
  // notificacionesService.js). Se resuelve en paralelo porque son
  // independientes entre sí (cada una es su propia fila de
  // notification_recipients). Solo marca las que están cargadas en
  // `notificaciones` — si hay más no leídas sin traer todavía (más de
  // LIMITE_NOTIFICACIONES), el refresco del contador de abajo las sigue
  // reflejando, a propósito: no se pueden marcar leídas sin haberlas traído.
  const marcarTodasLeidas = async () => {
    const pendientes = notificaciones.filter((n) => !n.readAt)
    await Promise.all(pendientes.map((n) => notificacionesService.marcarLeida(n.id)))
    setNotificaciones((actual) => actual.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })))
    refrescarConteoNoLeidas().catch(() => {})
  }

  const cargarMasNotificaciones = async () => {
    if (!notifCursor || notifCargandoMas) return
    setNotifCargandoMas(true)
    try {
      const respuesta = await notificacionesService.listar({ limit: LIMITE_NOTIFICACIONES, cursor: notifCursor })
      setNotificaciones((actual) => [...actual, ...respuesta.data])
      setNotifCursor(siguienteCursor(respuesta))
    } finally {
      setNotifCargandoMas(false)
    }
  }

  const cerrarNotificaciones = () => {
    setNotifAbierto(false)
  }

  // Click en un ítem del dropdown: marca leída (si hacía falta) y navega al
  // módulo correspondiente — ver src/config/notificacionesRutas.js. Un type
  // sin ruta mapeada, o sin ningún candidato válido para los permisos del
  // usuario, simplemente no navega (resolverRutaNotificacion devuelve null).
  const abrirNotificacion = (n) => {
    if (!n.readAt) marcarUnaLeida(n.id)
    cerrarNotificaciones()
    setMenuCuentaAbierto(false)
    const destino = resolverRutaNotificacion(n, permisos)
    if (destino) navigate(destino)
  }

  const sinLeer = notifNoLeidasTotal > 0
  const conteoBadge = notifNoLeidasTotal > 99 ? '99+' : notifNoLeidasTotal

  return (
    <header className="flex items-center gap-2 border-b border-marron-tierra/10 bg-crema-quinua px-3 py-4 sm:gap-4 sm:px-6">
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
          className={`relative rounded-full p-2 transition-colors duration-200 ${
            sinLeer
              ? 'bg-rojo-pasankalla/10 text-rojo-pasankalla hover:bg-rojo-pasankalla/15'
              : 'text-marron-cafe/40 hover:bg-marron-tierra/10 hover:text-marron-cafe'
          }`}
        >
          {campanaAnimando && (
            <>
              <span aria-hidden="true" className="bell-ping absolute inset-0 rounded-full bg-rojo-pasankalla/50" />
              {/* Etiqueta que aparece y se oculta sola — mismo trigger que
                  bell-ring/bell-ping, sin click ni botón de cerrar. */}
              <span
                role="status"
                className="bell-label absolute top-1/2 right-full z-50 mr-2 max-w-[calc(100vw-2rem)] truncate rounded-full bg-rojo-pasankalla px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-crema-quinua"
              >
                Nueva notificación
              </span>
            </>
          )}
          <Bell className={`size-5 ${campanaAnimando ? 'bell-ring' : ''}`} strokeWidth={1.75} />
          {sinLeer && (
            <span className="badge-in absolute -top-0.5 -right-0.5 text-[9px] leading-none font-bold text-rojo-pasankalla">
              {conteoBadge}
            </span>
          )}
        </button>

        {notifAbierto && (
          <>
            <div className="fixed inset-0 z-40" onClick={cerrarNotificaciones} />
            <div className="notif-panel absolute top-full right-0 z-50 mt-2 w-80 origin-top-right rounded-2xl bg-white p-2 ring-1 ring-marron-tierra/10">
              <NotificacionesLista
                notificaciones={notificaciones}
                marcarTodasLeidas={marcarTodasLeidas}
                alClickear={abrirNotificacion}
                cargarMas={notifCursor ? cargarMasNotificaciones : null}
                cargandoMas={notifCargandoMas}
              />
            </div>
          </>
        )}
      </div>

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

      {/* Mobile: el avatar solo agrupa notificaciones/cerrar
          sesión detrás de un único botón — libera el ancho que antes se
          repartía entre elementos sueltos, así el clima tiene lugar para
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
          <span className="badge-in absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-rojo-pasankalla text-[8px] leading-none font-bold text-crema-quinua ring-2 ring-crema-quinua">
            {notifNoLeidasTotal > 9 ? '9+' : notifNoLeidasTotal}
          </span>
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
                <span
                  className={`relative flex size-6 shrink-0 items-center justify-center rounded-full ${
                    sinLeer ? 'bg-rojo-pasankalla/10 text-rojo-pasankalla' : 'text-marron-cafe/40'
                  }`}
                >
                  {campanaAnimando && (
                    <span aria-hidden="true" className="bell-ping absolute inset-0 rounded-full bg-rojo-pasankalla/50" />
                  )}
                  <Bell className={`size-4 ${campanaAnimando ? 'bell-ring' : ''}`} strokeWidth={1.75} />
                </span>
                Notificaciones
                {sinLeer && (
                  <span className="badge-in ml-auto text-[10px] leading-none font-bold text-rojo-pasankalla">
                    {conteoBadge}
                  </span>
                )}
              </button>

              {notifAbierto && (
                <div className="mt-1 rounded-xl bg-marron-tierra/5 p-1">
                  <NotificacionesLista
                    notificaciones={notificaciones}
                    marcarTodasLeidas={marcarTodasLeidas}
                    alClickear={abrirNotificacion}
                    cargarMas={notifCursor ? cargarMasNotificaciones : null}
                    cargandoMas={notifCargandoMas}
                  />
                </div>
              )}

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
//
// Sin "borrar" — el backend es append-only, no existe ese endpoint (ver
// docs/notifications.md del backend). Click en un ítem lo marca leído (si
// hacía falta, además del botón "marcar todas") y navega al módulo
// correspondiente — ver abrirNotificacion() y
// src/config/notificacionesRutas.js. Un type sin ruta mapeada, o sin ningún
// candidato válido para los permisos del usuario, no navega a ningún lado
// (solo se marca leída).
function NotificacionesLista({ notificaciones, marcarTodasLeidas, alClickear, cargarMas, cargandoMas }) {
  return (
    <>
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="text-sm font-semibold text-marron-cafe">Notificaciones</p>
        <button
          type="button"
          onClick={marcarTodasLeidas}
          title="Marcar todas como leídas"
          className="rounded-full p-1.5 text-marron-cafe/30 transition-colors duration-200 hover:bg-marron-tierra/10 hover:text-marron-cafe/70"
        >
          <CheckCheck className="size-4" strokeWidth={1.75} />
        </button>
      </div>

      {notificaciones.length === 0 ? (
        <p className="px-2 py-6 text-center text-xs text-marron-cafe/40">No hay notificaciones.</p>
      ) : (
        <ul className="flex max-h-96 flex-col overflow-y-auto">
          {notificaciones.map((n) => {
            const noLeida = !n.readAt
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => alClickear(n)}
                  className="flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-marron-tierra/5"
                >
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${noLeida ? 'bg-verde-lima' : ''}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-marron-cafe/90">{n.title}</p>
                    <p className="mt-0.5 text-xs text-marron-cafe/70">{n.message}</p>
                    <p className="mt-0.5 text-[10px] text-marron-cafe/40">{formatearFecha(n.createdAt)}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {cargarMas && (
        <button
          type="button"
          onClick={cargarMas}
          disabled={cargandoMas}
          className="w-full rounded-xl px-2 py-2 text-center text-xs font-medium text-marron-cafe/50 transition-colors duration-150 hover:bg-marron-tierra/5 hover:text-marron-cafe disabled:opacity-50"
        >
          {cargandoMas ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </>
  )
}
