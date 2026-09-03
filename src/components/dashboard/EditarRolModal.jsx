import { useEffect, useState } from 'react'
import { iamService } from '../../services/iamService'
import Skeleton from '../Skeleton.jsx'

// Modal de edición de un rol — el lápiz de cada tarjeta en GestionRoles.jsx.
// Un solo lugar para las dos cosas que se editan de un rol: la descripción
// (texto libre) y el checklist de permisos (contra el catálogo completo,
// agrupado por módulo). No se ofrece para roles de sistema — el backend los
// rechaza igual (RolesService.update/replacePermissions), así que
// GestionRoles.jsx ni muestra el lápiz en esos casos.
export default function EditarRolModal({ rol, catalogoPorModulo, onCerrar, onGuardado }) {
  const [descripcion, setDescripcion] = useState('')
  const [seleccion, setSeleccion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    iamService
      .getRol(rol.id)
      .then((detalle) => {
        if (cancelado) return
        setDescripcion(detalle.description ?? '')
        setSeleccion(new Set(detalle.permissionIds))
        setCargando(false)
      })
      .catch((err) => {
        if (cancelado) return
        setError(err.body?.message ?? err.message)
        setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [rol.id])

  useEffect(() => {
    const alTeclado = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [onCerrar])

  const alternarPermiso = (permissionId) => {
    setSeleccion((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(permissionId)) {
        siguiente.delete(permissionId)
      } else {
        siguiente.add(permissionId)
      }
      return siguiente
    })
  }

  const guardar = async () => {
    setError(null)
    setGuardando(true)
    try {
      // Secuencial, no Promise.all — las dos escrituras tocan la misma fila
      // de roles; mejor no mandarlas en paralelo.
      const conDescripcion = await iamService.actualizarRol(rol.id, {
        description: descripcion.trim() || null,
      })
      const conPermisos = await iamService.actualizarPermisosDeRol(rol.id, [...seleccion])
      onGuardado({ ...conPermisos, description: conDescripcion.description })
    } catch (err) {
      setError(err.body?.message ?? err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-marron-cafe/50" onClick={onCerrar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-rol-titulo"
        className="rise-in relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 rounded-3xl bg-white p-6"
      >
        <div>
          <h2 id="editar-rol-titulo" className="text-lg font-extrabold text-marron-cafe">
            Editar {rol.name}
          </h2>
          <p className="text-xs text-marron-cafe/40">{rol.code}</p>
        </div>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
            {error}
          </p>
        )}

        {cargando ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-marron-cafe">Descripción</span>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={guardando}
                rows={2}
                maxLength={500}
                placeholder="Para qué es este rol…"
                className="resize-none rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-marron-cafe">Permisos</span>
              <div className="flex flex-col gap-3 rounded-xl bg-marron-tierra/5 p-3">
                {Object.entries(catalogoPorModulo).map(([modulo, grupo]) => (
                  <div key={modulo} className="flex flex-col gap-1">
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-wide text-marron-cafe/40">
                      {modulo}
                    </p>
                    {grupo.permisos.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-marron-cafe">
                        <input
                          type="checkbox"
                          checked={seleccion.has(p.id)}
                          onChange={() => alternarPermiso(p.id)}
                          disabled={guardando}
                          className="size-4 rounded border-marron-tierra/30 text-verde-bosque focus-visible:outline-verde-lima"
                        />
                        {p.description}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-full px-4 py-2 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:bg-marron-tierra/10 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={cargando || guardando}
            className="rounded-full bg-verde-lima px-4 py-2 text-sm font-medium text-marron-cafe transition-colors duration-150 hover:bg-verde-hoja disabled:opacity-40"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
