import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search, ShieldOff, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { iamService } from '../services/iamService'
import { MODULO_ICON } from '../config/moduloIcons'
import UsuarioRoles from '../components/dashboard/UsuarioRoles.jsx'
import Switch from '../components/Switch.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

const MODULOS_NEGOCIO = Object.keys(MODULO_ICON)

const normalizar = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Pantalla de administración: usuarios a la izquierda (lo que se opera de
// verdad) + referencia de roles a la derecha, fija mientras se scrollea la
// lista de usuarios — así no hay que ir y volver para recordar qué hace un
// rol antes de asignarlo. En mobile/tablet (< lg) se apila, roles después
// de usuarios. Gateada por el permiso "iam:read" — hoy solo lo tiene
// superadmin (ver comrural_erp_backend/src/database/migrations/0002_iam_seed.sql),
// pero el chequeo es por permiso real, no por código de rol hardcodeado.
export default function GestionUsuarios() {
  const { usuario: propio, permisos } = useAuth()
  const puedeGestionar = permisos.has('iam:read')
  const puedeActivarDesactivar = permisos.has('users:update')

  const [usuarios, setUsuarios] = useState(null)
  const [roles, setRoles] = useState(null)
  const [expandidoId, setExpandidoId] = useState(null)
  const [rolExpandidoId, setRolExpandidoId] = useState(null)
  const [permisosPorRol, setPermisosPorRol] = useState({})
  const [filtroUsuarios, setFiltroUsuarios] = useState('')
  const [filtroRoles, setFiltroRoles] = useState('')
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null)
  const [porDesactivar, setPorDesactivar] = useState(null)
  const [errorEstado, setErrorEstado] = useState(null)

  useEffect(() => {
    if (!puedeGestionar) return
    let cancelado = false
    iamService.listarUsuarios().then((data) => {
      if (!cancelado) setUsuarios(data)
    })
    iamService.listarRoles().then((data) => {
      if (!cancelado) setRoles(data)
    })
    return () => {
      cancelado = true
    }
  }, [puedeGestionar])

  const alternarRol = async (roleId) => {
    if (rolExpandidoId === roleId) {
      setRolExpandidoId(null)
      return
    }
    setRolExpandidoId(roleId)
    if (!permisosPorRol[roleId]) {
      const detalle = await iamService.getRol(roleId)
      setPermisosPorRol((prev) => ({ ...prev, [roleId]: detalle.permissions }))
    }
  }

  const aplicarCambioEstado = async (u, isActive) => {
    setErrorEstado(null)
    setCambiandoEstadoId(u.id)
    try {
      const actualizado = await iamService.actualizarUsuario(u.id, { isActive })
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: actualizado.isActive } : x)))
    } catch (err) {
      setErrorEstado(err.body?.message ?? err.message)
    } finally {
      setCambiandoEstadoId(null)
    }
  }

  // Desactivar pide confirmación (modal, no window.confirm) porque le
  // corta el acceso a alguien de inmediato; reactivar no es destructivo,
  // se aplica directo.
  const alternarActivo = (u) => {
    if (u.isActive) {
      setPorDesactivar(u)
    } else {
      aplicarCambioEstado(u, true)
    }
  }

  const usuariosFiltrados = useMemo(() => {
    if (!usuarios) return null
    const q = normalizar(filtroUsuarios.trim())
    if (!q) return usuarios
    return usuarios.filter(
      (u) => normalizar(u.fullName).includes(q) || normalizar(u.email).includes(q),
    )
  }, [usuarios, filtroUsuarios])

  const rolesFiltrados = useMemo(() => {
    if (!roles) return null
    const q = normalizar(filtroRoles.trim())
    if (!q) return roles
    return roles.filter(
      (r) => normalizar(r.name).includes(q) || normalizar(r.code).includes(q),
    )
  }, [roles, filtroRoles])

  if (!puedeGestionar) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="rounded-full bg-rojo-pasankalla/10 p-4">
          <ShieldOff className="size-8 text-rojo-pasankalla" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-extrabold text-marron-cafe">No tenés acceso a esta sección</h1>
        <p className="max-w-md text-marron-cafe/70">
          La gestión de usuarios y roles es solo para superadmin.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <UsersIcon className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Usuarios y roles</h1>
          <p className="text-sm text-marron-cafe/60">Asigná qué puede ver y hacer cada persona.</p>
        </div>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Usuarios — columna principal, la que realmente se opera. */}
        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Usuarios{usuarios && <span className="ml-2 text-sm font-medium text-marron-cafe/40">{usuarios.length}</span>}
            </h2>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-marron-tierra/10">
            <Search className="size-4 shrink-0 text-marron-cafe/40" strokeWidth={1.75} />
            <input
              type="text"
              value={filtroUsuarios}
              onChange={(e) => setFiltroUsuarios(e.target.value)}
              placeholder="Buscar por nombre o email…"
              className="w-full bg-transparent text-sm text-marron-cafe placeholder:text-marron-cafe/40 focus:outline-none"
            />
          </div>

          {errorEstado && (
            <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
              {errorEstado}
            </p>
          )}

          {usuariosFiltrados === null ? (
            <p className="text-sm text-marron-cafe/50">Cargando usuarios…</p>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
              {usuariosFiltrados.map((u) => (
                <div key={u.id} className="border-b border-marron-tierra/10 last:border-b-0">
                  <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                    <button
                      type="button"
                      onClick={() => setExpandidoId((id) => (id === u.id ? null : u.id))}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-marron-cafe">{u.fullName}</p>
                        <p className="truncate text-xs text-marron-cafe/50">{u.email}</p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span
                        className={`text-xs font-medium ${u.isActive ? 'text-verde-bosque' : 'text-marron-cafe/40'}`}
                      >
                        {cambiandoEstadoId === u.id ? 'Guardando…' : u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      <span title={u.id === propio?.id ? 'No podés desactivarte a vos mismo' : undefined}>
                        <Switch
                          checked={u.isActive}
                          onChange={() => alternarActivo(u)}
                          disabled={!puedeActivarDesactivar || u.id === propio?.id || cambiandoEstadoId === u.id}
                          label={u.isActive ? `Desactivar a ${u.fullName}` : `Reactivar a ${u.fullName}`}
                        />
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandidoId((id) => (id === u.id ? null : u.id))}
                        className="p-0.5"
                      >
                        {expandidoId === u.id ? (
                          <ChevronUp className="size-4 text-marron-cafe/40" strokeWidth={2} />
                        ) : (
                          <ChevronDown className="size-4 text-marron-cafe/40" strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  </div>
                  {expandidoId === u.id && roles && (
                    <div className="bg-white/60">
                      <UsuarioRoles usuario={u} roles={roles} />
                    </div>
                  )}
                </div>
              ))}
              {usuariosFiltrados.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                  {usuarios.length === 0 ? 'No hay usuarios todavía.' : 'Sin resultados para esa búsqueda.'}
                </p>
              )}
            </div>
          )}
        </section>

        {/* Roles — panel de referencia, angosto y fijo en desktop para
            consultar qué otorga un rol sin perder de vista la lista de
            usuarios. top-6 deja el mismo aire que el padding del <main>. */}
        <section className="flex w-full flex-col gap-3 lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
          <h2 className="text-lg font-bold text-marron-cafe">
            Qué hace cada rol{roles && <span className="ml-2 text-sm font-medium text-marron-cafe/40">{roles.length}</span>}
          </h2>

          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-marron-tierra/10">
            <Search className="size-4 shrink-0 text-marron-cafe/40" strokeWidth={1.75} />
            <input
              type="text"
              value={filtroRoles}
              onChange={(e) => setFiltroRoles(e.target.value)}
              placeholder="Buscar rol…"
              className="w-full bg-transparent text-sm text-marron-cafe placeholder:text-marron-cafe/40 focus:outline-none"
            />
          </div>

          {rolesFiltrados === null ? (
            <p className="text-sm text-marron-cafe/50">Cargando roles…</p>
          ) : (
            <div className="flex flex-col gap-2 lg:max-h-[calc(100svh-14rem)] lg:overflow-y-auto lg:pr-1">
              {rolesFiltrados.map((r) => (
                <div key={r.id} className="rounded-2xl bg-marron-tierra/5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-marron-cafe">{r.name}</p>
                      <p className="truncate text-xs text-marron-cafe/40">{r.code}</p>
                    </div>
                    {r.isSystem && (
                      <span className="shrink-0 rounded-full bg-azul-andino/15 px-2 py-0.5 text-[11px] font-medium text-azul-andino">
                        Sistema
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-marron-cafe/60 italic">
                    {r.description || 'Sin descripción todavía.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => alternarRol(r.id)}
                    className="mt-2 text-xs font-semibold text-verde-bosque hover:text-verde-hoja"
                  >
                    {rolExpandidoId === r.id ? 'Ocultar permisos' : 'Ver permisos'}
                  </button>
                  {rolExpandidoId === r.id && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {!permisosPorRol[r.id] ? (
                        <span className="text-xs text-marron-cafe/40">Cargando…</span>
                      ) : permisosPorRol[r.id].length === 0 ? (
                        <span className="text-xs text-marron-cafe/40">Sin permisos asignados.</span>
                      ) : (
                        permisosPorRol[r.id].map((p) => {
                          const esNegocio = MODULOS_NEGOCIO.includes(p.split(':')[0])
                          return (
                            <span
                              key={p}
                              className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                esNegocio ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-azul-andino/10 text-azul-andino'
                              }`}
                            >
                              {p}
                            </span>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}
              {rolesFiltrados.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-marron-cafe/50">Sin resultados.</p>
              )}
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        abierto={Boolean(porDesactivar)}
        titulo="¿Desactivar usuario?"
        mensaje={
          porDesactivar
            ? `${porDesactivar.fullName} no va a poder ingresar hasta que lo reactives.`
            : ''
        }
        textoConfirmar="Desactivar"
        variante="peligro"
        onConfirmar={() => {
          aplicarCambioEstado(porDesactivar, false)
          setPorDesactivar(null)
        }}
        onCancelar={() => setPorDesactivar(null)}
      />
    </main>
  )
}
