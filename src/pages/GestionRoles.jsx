import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Search, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { iamService } from '../services/iamService'
import { areasService } from '../services/areasService'
import RolPermisos from '../components/dashboard/RolPermisos.jsx'
import EditarRolModal from '../components/dashboard/EditarRolModal.jsx'
import CrearRolModal from '../components/dashboard/CrearRolModal.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Skeleton from '../components/Skeleton.jsx'

// Rótulo del grupo de roles que no pertenecen a ningún área (roles de
// sistema como superadmin/admin, y roles de módulo históricos a los que
// todavía no se les asignó área) — siempre AL FINAL: los roles ya ubicados
// en un área son los que alguien viene a buscar primero acá.
const AREA_SIN_ASIGNAR = { id: '__sin_area__', name: 'Roles generales' }

const normalizar = (texto) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Hermana de GestionUsuarios.jsx (Usuarios → Roles y permisos, ver
// DashboardSidebar.jsx/gruposMaestros.js): acá vive la asignación de
// permisos a cada rol, agrupados por área para que sea fácil encontrar
// "todos los roles de Calidad" sin tener que leer código por código.
// Gateada por "iam:read", igual que GestionUsuarios — mismo permiso, no
// uno nuevo, porque conceptualmente es la misma pantalla partida en dos.
export default function GestionRoles() {
  const { permisos } = useAuth()
  const puedeGestionar = permisos.has('iam:read')
  const puedeEditarPermisos = permisos.has('iam:update')
  const puedeCrear = permisos.has('iam:create')

  const [roles, setRoles] = useState(null)
  const [areas, setAreas] = useState(null)
  const [permisosCatalogo, setPermisosCatalogo] = useState(null)
  const [rolExpandidoId, setRolExpandidoId] = useState(null)
  const [filtroRoles, setFiltroRoles] = useState('')
  const [error, setError] = useState(null)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (!puedeGestionar) return
    let cancelado = false
    iamService.listarRoles().then((data) => {
      if (!cancelado) setRoles(data)
    })
    // areas y permisos son best-effort: si algo falla (ej. sin "areas:read"),
    // esta pantalla no debe quedarse cargando para siempre — se degrada a
    // "todo en Roles generales" / sin catálogo, y se avisa en vez de fallar
    // en silencio.
    areasService
      .listar()
      .then((resp) => {
        if (!cancelado) setAreas(resp.data)
      })
      .catch((err) => {
        if (cancelado) return
        setAreas([])
        setError(err.body?.message ?? err.message)
      })
    iamService
      .listarPermisos()
      .then((data) => {
        if (!cancelado) setPermisosCatalogo(data)
      })
      .catch((err) => {
        if (cancelado) return
        setPermisosCatalogo([])
        setError(err.body?.message ?? err.message)
      })
    return () => {
      cancelado = true
    }
  }, [puedeGestionar])

  // Universo completo de permisos, agrupado por módulo — insumo del
  // checklist de RolPermisos (evita recalcular el agrupado en cada fila
  // expandida, son los mismos ~90 permisos para todos los roles).
  const catalogoPorModulo = useMemo(() => {
    if (!permisosCatalogo) return null
    const grupos = {}
    for (const p of [...permisosCatalogo].sort((a, b) => a.module.localeCompare(b.module))) {
      grupos[p.module] ??= { permisos: [] }
      grupos[p.module].permisos.push(p)
    }
    for (const grupo of Object.values(grupos)) {
      grupo.permisos.sort((a, b) => a.action.localeCompare(b.action))
    }
    return grupos
  }, [permisosCatalogo])

  const alternarRol = (roleId) => {
    setRolExpandidoId((id) => (id === roleId ? null : roleId))
  }

  const [rolEditando, setRolEditando] = useState(null)

  const alGuardarEdicion = (actualizado) => {
    setRoles((prev) => prev.map((r) => (r.id === actualizado.id ? { ...r, ...actualizado } : r)))
    setRolEditando(null)
    // Si el panel "Ver permisos" de este rol estaba abierto, se cierra: si
    // se quedara abierto mostraría los permisos viejos hasta que alguien lo
    // vuelva a tocar — RolPermisos solo pide el detalle al montarse.
    setRolExpandidoId((id) => (id === actualizado.id ? null : id))
  }

  const rolesFiltrados = useMemo(() => {
    if (!roles) return null
    const q = normalizar(filtroRoles.trim())
    if (!q) return roles
    return roles.filter((r) => normalizar(r.name).includes(q) || normalizar(r.code).includes(q))
  }, [roles, filtroRoles])

  // Roles agrupados por área (cada área en orden alfabético, Roles
  // generales al final) — grupos vacíos tras el filtro de búsqueda no se
  // muestran.
  const rolesPorArea = useMemo(() => {
    if (!rolesFiltrados || !areas) return null
    const areasOrdenadas = [...areas].sort((a, b) => a.name.localeCompare(b.name))
    return [...areasOrdenadas, AREA_SIN_ASIGNAR]
      .map((area) => ({
        area,
        roles: rolesFiltrados.filter((r) =>
          area.id === AREA_SIN_ASIGNAR.id ? !r.areaId : r.areaId === area.id,
        ),
      }))
      .filter((grupo) => grupo.roles.length > 0)
  }, [rolesFiltrados, areas])

  if (!puedeGestionar) {
    return <AccesoDenegado mensaje="La gestión de roles y permisos es solo para superadmin." />
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ShieldCheck className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Roles y permisos</h1>
          <p className="text-sm text-marron-cafe/60">
            Qué puede hacer cada rol, organizado por área.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-marron-cafe">
            Roles{roles && <span className="ml-2 text-sm font-medium text-marron-cafe/40">{roles.length}</span>}
          </h2>
          {puedeCrear && (
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="flex items-center gap-1.5 rounded-full bg-verde-lima px-4 py-2 text-sm font-medium text-marron-cafe transition-colors duration-200 hover:bg-verde-hoja"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              Nuevo rol
            </button>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-marron-tierra/10 md:w-96">
          <Search className="size-4 shrink-0 text-marron-cafe/40" strokeWidth={1.75} />
          <input
            type="text"
            value={filtroRoles}
            onChange={(e) => setFiltroRoles(e.target.value)}
            placeholder="Buscar rol…"
            className="w-full bg-transparent text-sm text-marron-cafe placeholder:text-marron-cafe/40 focus:outline-none"
          />
        </div>

        {rolesPorArea === null || !catalogoPorModulo ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {rolesPorArea.map(({ area, roles: rolesDelArea }) => (
              <div key={area.id} className="flex flex-col gap-2">
                <p className="px-1 text-xs font-bold uppercase tracking-wide text-marron-cafe/40">
                  {area.name}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rolesDelArea.map((r) => (
                    <div key={r.id} className="rounded-2xl bg-marron-tierra/5 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-marron-cafe">{r.name}</p>
                          <p className="truncate text-xs text-marron-cafe/40">{r.code}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {r.isSystem && (
                            <span className="rounded-full bg-azul-andino/15 px-2 py-0.5 text-[11px] font-medium text-azul-andino">
                              Sistema
                            </span>
                          )}
                          {puedeEditarPermisos && !r.isSystem && (
                            <button
                              type="button"
                              onClick={() => setRolEditando(r)}
                              title={`Editar ${r.name}`}
                              className="rounded-full p-1 text-marron-cafe/40 hover:bg-marron-tierra/10 hover:text-marron-cafe"
                            >
                              <Pencil className="size-3.5" strokeWidth={1.75} />
                            </button>
                          )}
                        </div>
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
                        <RolPermisos rol={r} catalogoPorModulo={catalogoPorModulo} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {rolesPorArea.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-marron-cafe/50">Sin resultados.</p>
            )}
          </div>
        )}
      </div>

      {rolEditando && (
        <EditarRolModal
          rol={rolEditando}
          catalogoPorModulo={catalogoPorModulo}
          onCerrar={() => setRolEditando(null)}
          onGuardado={alGuardarEdicion}
        />
      )}

      {creando && areas && catalogoPorModulo && (
        <CrearRolModal
          areas={areas}
          catalogoPorModulo={catalogoPorModulo}
          puedeAsignarPermisos={puedeEditarPermisos}
          onCerrar={() => setCreando(false)}
          onCreado={() => {
            setCreando(false)
            iamService.listarRoles().then(setRoles)
          }}
        />
      )}
    </main>
  )
}
