import { useEffect, useState } from 'react'
import { iamService } from '../../services/iamService'
import Skeleton from '../Skeleton.jsx'

// Fila expandida de un rol en GestionRoles.jsx: carga el detalle de permisos
// del rol recién al expandirse (mismo criterio que UsuarioRoles.jsx con las
// asignaciones de un usuario). Solo lectura — badges con la DESCRIPCIÓN de
// cada permiso (nunca "modulo:accion", eso es un detalle de implementación,
// no algo que alguien de negocio tenga que leer). Editar permisos/
// descripción del rol es tarea del lápiz de la tarjeta → EditarRolModal.jsx,
// no de acá — un solo camino para editar, no dos.
export default function RolPermisos({ rol, catalogoPorModulo }) {
  const [detalle, setDetalle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    iamService
      .getRol(rol.id)
      .then((data) => {
        if (!cancelado) setDetalle(data)
      })
      .catch((err) => {
        if (!cancelado) setError(err.body?.message ?? err.message)
      })
    return () => {
      cancelado = true
    }
  }, [rol.id])

  if (detalle === null) {
    if (error) {
      return <p className="px-1 py-2 text-xs font-medium text-rojo-pasankalla">{error}</p>
    }
    return (
      <div className="flex gap-1.5 px-1 py-2">
        <Skeleton className="h-5 w-24 rounded-md" />
        <Skeleton className="h-5 w-32 rounded-md" />
      </div>
    )
  }

  const idsAsignados = new Set(detalle.permissionIds)
  const permisosAsignados = Object.values(catalogoPorModulo)
    .flatMap((grupo) => grupo.permisos)
    .filter((p) => idsAsignados.has(p.id))

  return (
    <div className="flex flex-wrap gap-1.5 px-1 py-2">
      {permisosAsignados.length === 0 ? (
        <span className="text-xs text-marron-cafe/40">Sin permisos asignados.</span>
      ) : (
        permisosAsignados.map((p) => (
          <span
            key={p.id}
            title={`${p.module}:${p.action}`}
            className="rounded-md bg-azul-andino/10 px-2 py-0.5 text-[11px] font-semibold text-azul-andino"
          >
            {p.description}
          </span>
        ))
      )}
    </div>
  )
}
