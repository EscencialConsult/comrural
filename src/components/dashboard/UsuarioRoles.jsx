import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { iamService } from '../../services/iamService'

// Fila expandida de un usuario en GestionUsuarios.jsx: carga sus
// asignaciones de rol recién al expandirse (no de entrada para los N
// usuarios de la lista) y permite agregar/sacar roles ahí mismo.
export default function UsuarioRoles({ usuario, roles }) {
  const [asignaciones, setAsignaciones] = useState(null)
  const [rolAAgregar, setRolAAgregar] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    iamService.getRolesDeUsuario(usuario.id).then((data) => {
      if (!cancelado) setAsignaciones(data)
    })
    return () => {
      cancelado = true
    }
  }, [usuario.id])

  const rolesDisponibles = roles.filter(
    (r) => !asignaciones?.some((a) => a.roleId === r.id),
  )

  const agregarRol = async () => {
    if (!rolAAgregar) return
    setError(null)
    setProcesando(true)
    try {
      const nueva = await iamService.asignarRol(usuario.id, rolAAgregar)
      setAsignaciones((prev) => [...(prev ?? []), nueva])
      setRolAAgregar('')
    } catch (err) {
      setError(err.body?.message ?? err.message)
    } finally {
      setProcesando(false)
    }
  }

  const quitarRol = async (asignacion) => {
    setError(null)
    setProcesando(true)
    try {
      await iamService.revocarRol(usuario.id, asignacion.id)
      setAsignaciones((prev) => prev.filter((a) => a.id !== asignacion.id))
    } catch (err) {
      setError(err.body?.message ?? err.message)
    } finally {
      setProcesando(false)
    }
  }

  if (asignaciones === null) {
    return <p className="px-4 py-3 text-sm text-marron-cafe/50">Cargando roles…</p>
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-xs font-medium text-rojo-pasankalla">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {asignaciones.length === 0 && (
          <span className="text-sm text-marron-cafe/50">Sin roles asignados todavía.</span>
        )}
        {asignaciones.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-1.5 rounded-full bg-verde-hoja/15 py-1 pl-3 pr-1.5 text-xs font-semibold text-verde-bosque"
          >
            {a.role.name}
            <button
              type="button"
              onClick={() => quitarRol(a)}
              disabled={procesando}
              title={`Quitar ${a.role.name}`}
              className="rounded-full p-0.5 hover:bg-verde-bosque/15 disabled:opacity-40"
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          </span>
        ))}
      </div>

      {rolesDisponibles.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={rolAAgregar}
            onChange={(e) => setRolAAgregar(e.target.value)}
            disabled={procesando}
            className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-1.5 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
          >
            <option value="">Agregar rol…</option>
            {rolesDisponibles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={agregarRol}
            disabled={!rolAAgregar || procesando}
            className="rounded-full bg-verde-lima px-4 py-1.5 text-sm font-medium text-marron-cafe transition-colors duration-200 hover:bg-verde-hoja disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      )}
    </div>
  )
}
