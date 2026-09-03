import { useEffect, useState } from 'react'
import { iamService } from '../../services/iamService'

// snake_case, empieza con letra, 3-50 caracteres — mismo regex que
// erp-backend/src/iam/dtos/role.dto.ts (roleCodeSchema). Se valida acá
// también para el error inline instantáneo, no solo el del backend.
const CODE_REGEX = /^[a-z][a-z0-9_]{2,49}$/

// Modal de alta de rol — botón "+ Nuevo rol" de GestionRoles.jsx. Código +
// nombre + área (opcional) + permisos, todo en un solo paso: crear el rol
// primero y recién después ir a buscarlo para asignarle permisos sería dos
// viajes por algo que se hace junto casi siempre. La sección de permisos
// solo se ofrece con `puedeAsignarPermisos` ("iam:update", permiso propio de
// PUT /iam/roles/:id/permissions, distinto de "iam:create" que gatea el
// resto) — sin ese permiso el rol igual se crea, sin permisos, para
// asignárselos después desde el lápiz de su tarjeta.
export default function CrearRolModal({ areas, catalogoPorModulo, puedeAsignarPermisos, onCerrar, onCreado }) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [areaId, setAreaId] = useState('')
  const [seleccion, setSeleccion] = useState(new Set())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const alTeclado = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [onCerrar])

  const codeInvalido = code.length > 0 && !CODE_REGEX.test(code)
  const puedeEnviar = CODE_REGEX.test(code) && name.trim() && !guardando

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

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar) return
    setError(null)
    setGuardando(true)
    try {
      const rol = await iamService.crearRol({
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        areaId: areaId || null,
      })
      if (puedeAsignarPermisos && seleccion.size > 0) {
        await iamService.actualizarPermisosDeRol(rol.id, [...seleccion])
      }
      onCreado()
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
        aria-labelledby="crear-rol-titulo"
        className="rise-in relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 rounded-3xl bg-white p-6"
      >
        <h2 id="crear-rol-titulo" className="text-lg font-extrabold text-marron-cafe">
          Nuevo rol
        </h2>

        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
            {error}
          </p>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-marron-cafe">Código</span>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                disabled={guardando}
                placeholder="ej. supervisor_planta"
                autoFocus
                required
                className={`rounded-xl border bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40 ${
                  codeInvalido ? 'border-rojo-pasankalla/50' : 'border-marron-tierra/20'
                }`}
              />
              {codeInvalido && (
                <span className="text-xs text-rojo-pasankalla">
                  snake_case, empieza con letra, sin espacios.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-marron-cafe">Nombre</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={guardando}
                placeholder="ej. Supervisor de Planta"
                required
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-marron-cafe">Descripción</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={guardando}
              rows={2}
              maxLength={500}
              placeholder="Para qué es este rol…"
              className="resize-none rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-marron-cafe">Área</span>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              disabled={guardando}
              className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
            >
              <option value="">Sin área (rol general)</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          {puedeAsignarPermisos && (
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
          )}
        </div>

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
            type="submit"
            disabled={!puedeEnviar}
            className="rounded-full bg-verde-lima px-4 py-2 text-sm font-medium text-marron-cafe transition-colors duration-150 hover:bg-verde-hoja disabled:opacity-40"
          >
            {guardando ? 'Creando…' : 'Crear rol'}
          </button>
        </div>
      </form>
    </div>
  )
}
