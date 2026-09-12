import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { iamService } from '../services/iamService'
import CrearUsuarioModal from '../components/dashboard/CrearUsuarioModal.jsx'
import EditarUsuarioModal from '../components/dashboard/EditarUsuarioModal.jsx'
import Switch from '../components/Switch.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Skeleton from '../components/Skeleton.jsx'

const normalizar = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Pantalla de administración: lista de usuarios, activar/desactivar y
// editar (nombre + un rol, ver EditarUsuarioModal.jsx). Qué hace cada rol y
// la asignación de PERMISOS a un rol vive aparte, en GestionRoles.jsx
// ("Roles y permisos", hermana de esta en el sidebar — ver
// DashboardSidebar.jsx/config/gruposMaestros.js): son tareas distintas
// (quién tiene qué rol vs. qué puede hacer cada rol) y separarlas evita una
// sola pantalla gigante. Gateada por el permiso "iam:read" — hoy solo lo
// tiene superadmin (ver comrural_erp_backend/src/database/migrations/
// 0002_iam_seed.sql), pero el chequeo es por permiso real, no por código de
// rol hardcodeado.
export default function GestionUsuarios() {
  const { usuario: propio, permisos } = useAuth()
  const puedeGestionar = permisos.has('iam:read')
  const puedeEditarUsuarios = permisos.has('users:update')
  // El backend además exige que quien crea sea superadmin global activo
  // (ver UsersManagementService.create) — el permiso es la primera barrera,
  // no la única; si a alguien con "users:create" pero sin ser superadmin le
  // rechaza el alta, el error real del backend se muestra igual.
  const puedeCrear = permisos.has('users:create')
  // Asignar/revocar roles es un endpoint de IAM, no de usuarios — permiso
  // propio, no el mismo que gatea el resto del modal de edición.
  const puedeCambiarRol = permisos.has('iam:update')

  const [usuarios, setUsuarios] = useState(null)
  const [roles, setRoles] = useState(null)
  // Roles asignados, por usuario — GET /iam/users NO los trae (fila cruda
  // de la tabla users, sin joins, ver UsersManagementService.list): hay que
  // pedirlos aparte, uno por usuario (GET /iam/users/:id/roles), acotado a
  // los que ya se cargaron. Mismo criterio que el resto de la app para
  // vistas sin endpoint de agregados (ver rawMaterialReceptionsService en
  // PanelAlmacen.jsx).
  const [rolesPorUsuario, setRolesPorUsuario] = useState({})
  const [filtroUsuarios, setFiltroUsuarios] = useState('')
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null)
  const [porDesactivar, setPorDesactivar] = useState(null)
  const [errorEstado, setErrorEstado] = useState(null)
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState(null)

  useEffect(() => {
    if (!puedeGestionar) return
    let cancelado = false
    iamService.listarUsuarios().then((data) => {
      if (!cancelado) setUsuarios(data)
    })
    // Se necesita el listado completo de roles acá para los selects de
    // CrearUsuarioModal/EditarUsuarioModal — el detalle de qué hace cada uno
    // vive en GestionRoles.jsx.
    iamService.listarRoles().then((data) => {
      if (!cancelado) setRoles(data)
    })
    return () => {
      cancelado = true
    }
  }, [puedeGestionar])

  // Roles por usuario — un pedido por cada uno recién cargado, en paralelo.
  const refrescarRolesDeUsuario = (userId) =>
    iamService
      .getRolesDeUsuario(userId)
      .then((data) => setRolesPorUsuario((prev) => ({ ...prev, [userId]: data })))
      .catch(() => {}) // se queda "Sin rol" (fallback de abajo) si falla puntualmente

  useEffect(() => {
    if (!usuarios) return
    const aPedir = usuarios.filter((u) => !(u.id in rolesPorUsuario))
    if (aPedir.length === 0) return
    let cancelado = false
    Promise.allSettled(aPedir.map((u) => iamService.getRolesDeUsuario(u.id))).then((resultados) => {
      if (cancelado) return
      setRolesPorUsuario((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[aPedir[i].id] = r.status === 'fulfilled' ? r.value : []
        })
        return siguiente
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo re-corre
    // cuando cambia `usuarios` (alta/baja de personas) — no en cada
    // actualización de `rolesPorUsuario`, que es lo que este efecto escribe.
  }, [usuarios])

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

  if (!puedeGestionar) {
    return <AccesoDenegado mensaje="La gestión de usuarios y roles es solo para superadmin." />
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <UsersIcon className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Usuarios</h1>
          <p className="text-sm text-marron-cafe/60">Asigná qué rol tiene cada persona.</p>
        </div>
      </header>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-marron-cafe">
            Usuarios{usuarios && <span className="ml-2 text-sm font-medium text-marron-cafe/40">{usuarios.length}</span>}
          </h2>
          {puedeCrear && (
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="flex items-center gap-1.5 rounded-full bg-verde-lima px-4 py-2 text-sm font-medium text-marron-cafe transition-colors duration-200 hover:bg-verde-hoja"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Nuevo usuario
            </button>
          )}
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
          <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
            {usuariosFiltrados.map((u) => {
              // undefined mientras se está pidiendo (ver el efecto de
              // arriba) — se trata igual que "sin rol" en vez de esperar,
              // el badge se corrige solo apenas llega la respuesta.
              const rolesDe = (rolesPorUsuario[u.id] ?? []).filter((a) => a.effective)
              return (
              <div key={u.id} className="flex items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="truncate font-semibold text-marron-cafe">{u.fullName}</p>
                    {rolesDe.length === 0 ? (
                      <span className="text-[11px] text-marron-cafe/35">Sin rol</span>
                    ) : (
                      rolesDe.map((a) => (
                        <span
                          key={a.id}
                          className="shrink-0 rounded-full bg-verde-hoja/15 px-2 py-0.5 text-[11px] font-semibold text-verde-bosque"
                        >
                          {a.role.name}
                        </span>
                      ))
                    )}
                  </div>
                  <p className="truncate text-xs text-marron-cafe/50">{u.email}</p>
                </div>
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
                      disabled={!puedeEditarUsuarios || u.id === propio?.id || cambiandoEstadoId === u.id}
                      label={u.isActive ? `Desactivar a ${u.fullName}` : `Reactivar a ${u.fullName}`}
                    />
                  </span>
                  {puedeEditarUsuarios && (
                    <button
                      type="button"
                      onClick={() => setEditando(u)}
                      title={`Editar ${u.fullName}`}
                      className="rounded-full p-1 text-marron-cafe/40 hover:bg-marron-tierra/10 hover:text-marron-cafe"
                    >
                      <Pencil className="size-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
              )
            })}
            {usuariosFiltrados.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                {usuarios.length === 0 ? 'No hay usuarios todavía.' : 'Sin resultados para esa búsqueda.'}
              </p>
            )}
          </div>
        )}
      </section>

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

      {creando && roles && (
        <CrearUsuarioModal
          roles={roles}
          onCerrar={() => setCreando(false)}
          onCreado={() => {
            setCreando(false)
            iamService.listarUsuarios().then(setUsuarios)
          }}
        />
      )}

      {editando && roles && (
        <EditarUsuarioModal
          usuario={editando}
          roles={roles}
          puedeCambiarRol={puedeCambiarRol}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            // El usuario ya estaba en `rolesPorUsuario` desde antes de
            // editar, así que el efecto de arriba no lo vuelve a pedir solo
            // porque `usuarios` cambió — se refresca a mano acá, es el
            // único caso en que el rol de alguien cambia sin que cambie la
            // lista de usuarios en sí.
            refrescarRolesDeUsuario(editando.id)
            setEditando(null)
            // Refetch en vez de mergear a mano: entre el nombre y el rol
            // (que puede tocar 2+ asignaciones) es más simple pedir el
            // estado real que reconstruirlo acá.
            iamService.listarUsuarios().then(setUsuarios)
          }}
        />
      )}
    </main>
  )
}
