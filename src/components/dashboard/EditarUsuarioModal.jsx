import { useEffect, useState } from 'react'
import { iamService } from '../../services/iamService'
import Skeleton from '../Skeleton.jsx'

// Modal de edición de usuario — el lápiz de cada fila en GestionUsuarios.jsx.
// Dos cosas editables: el nombre, y un selector de "rol" de un solo paso
// (agrega el nuevo + saca los demás — ver `guardarRol` más abajo; el modelo
// real permite varios roles a la vez, pero para el caso común de "una
// persona, un rol" un select alcanza y es más simple que UsuarioRoles.jsx).
// El email no es editable: lo gestiona Supabase Auth (el backend lo rechaza
// si se manda, ver updateUserSchema) y activar/desactivar ya tiene su propio
// Switch en la fila — no duplicarlo acá.
//
// `puedeCambiarRol` (permiso "iam:update", distinto de "users:update" que
// gatea el resto de este modal): asignar/revocar roles es un endpoint de IAM,
// no de usuarios — alguien con solo "users:update" ve el selector pero
// deshabilitado, en vez de un botón que le va a devolver 403.
export default function EditarUsuarioModal({ usuario, roles, puedeCambiarRol, onCerrar, onGuardado }) {
  const [fullName, setFullName] = useState(usuario.fullName)
  const [asignaciones, setAsignaciones] = useState(null)
  const [roleIdSeleccionado, setRoleIdSeleccionado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!puedeCambiarRol) return
    let cancelado = false
    iamService.getRolesDeUsuario(usuario.id).then((data) => {
      if (cancelado) return
      setAsignaciones(data)
      // Con un solo rol asignado, se preselecciona (es el caso común "cambiar
      // de X a Y"); con 0 o 2+ no se asume nada — queda en "Sin cambios" y
      // el admin elige a propósito qué dejar.
      if (data.length === 1) setRoleIdSeleccionado(data[0].roleId)
    })
    return () => {
      cancelado = true
    }
  }, [usuario.id, puedeCambiarRol])

  useEffect(() => {
    const alTeclado = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [onCerrar])

  const nombreCambio = fullName.trim() && fullName.trim() !== usuario.fullName
  const rolYaAsignado = asignaciones?.some((a) => a.roleId === roleIdSeleccionado)
  const rolCambio = roleIdSeleccionado && !rolYaAsignado
  const puedeEnviar = (nombreCambio || rolCambio) && !guardando

  // Deja a `roleIdSeleccionado` como el único rol asignado: agrega el que
  // falta (si no estaba ya) y saca cualquier otro — así "cambiar de rol" es
  // una sola elección en vez de ir a sacar el viejo y agregar el nuevo a
  // mano en UsuarioRoles.jsx.
  const guardarRol = async () => {
    if (!rolCambio) return
    const aQuitar = asignaciones.filter((a) => a.roleId !== roleIdSeleccionado)
    await Promise.all(aQuitar.map((a) => iamService.revocarRol(usuario.id, a.id)))
    if (!rolYaAsignado) {
      await iamService.asignarRol(usuario.id, roleIdSeleccionado)
    }
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar) return
    setError(null)
    setGuardando(true)
    try {
      const actualizado = nombreCambio
        ? await iamService.actualizarUsuario(usuario.id, { fullName: fullName.trim() })
        : usuario
      await guardarRol()
      onGuardado(actualizado)
    } catch (err) {
      setError(err.body?.message ?? err.message)
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-marron-cafe/50" onClick={guardando ? undefined : onCerrar} aria-hidden="true" />
      <form
        onSubmit={enviar}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-usuario-titulo"
        className="rise-in relative flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6"
      >
        <h2 id="editar-usuario-titulo" className="text-lg font-extrabold text-marron-cafe">
          Editar usuario
        </h2>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-marron-cafe">Nombre completo</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={guardando}
            autoFocus
            required
            className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-marron-cafe">Email</span>
          <input
            type="email"
            value={usuario.email}
            disabled
            title="El email no se puede cambiar acá."
            className="rounded-xl border border-marron-tierra/10 bg-marron-tierra/5 px-3 py-2 text-sm text-marron-cafe/50"
          />
        </label>

        {puedeCambiarRol && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-marron-cafe">Rol</span>
            {asignaciones === null ? (
              <Skeleton className="h-9" />
            ) : (
              <>
                <select
                  value={roleIdSeleccionado}
                  onChange={(e) => setRoleIdSeleccionado(e.target.value)}
                  disabled={guardando}
                  className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
                >
                  <option value="">Sin cambios…</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {asignaciones.length > 1 && (
                  <p className="text-xs text-marron-cafe/50">
                    Hoy tiene {asignaciones.length} roles ({asignaciones.map((a) => a.role.name).join(', ')}) — elegir
                    uno acá deja SOLO ese, saca los demás.
                  </p>
                )}
              </>
            )}
          </label>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-full px-4 py-2 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:bg-marron-tierra/10 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!puedeEnviar}
            className="rounded-full bg-verde-lima px-4 py-2 text-sm font-medium text-marron-cafe transition-colors duration-150 hover:bg-verde-hoja disabled:opacity-40"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
