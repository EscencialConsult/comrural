import { useEffect, useState } from 'react'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { iamService } from '../../services/iamService'

const PASSWORD_MIN = 8
const ALFABETO_PASSWORD = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'

// crypto.getRandomValues (no Math.random) — es una contraseña de verdad,
// aunque sea generada, no un placeholder.
function generarPassword(longitud = 14) {
  const valores = crypto.getRandomValues(new Uint32Array(longitud))
  return Array.from(valores, (v) => ALFABETO_PASSWORD[v % ALFABETO_PASSWORD.length]).join('')
}

// Modal de alta de usuario — botón "+ Nuevo usuario" de GestionUsuarios.jsx.
// El rol se pide en el mismo paso (el backend lo exige, no hay alta "sin
// rol"): la persona nueva ya entra con su acceso definido, en vez de quedar
// sin permisos hasta que alguien vuelva a esta pantalla a asignárselo.
//
// Contraseña: OPCIONAL, apagada por default. Con el checkbox apagado (el
// camino de siempre) le llega un correo de invitación y la define ella
// misma; si se prende, la cuenta queda lista para entrar YA con la
// contraseña que se ponga acá — pensado para altas presenciales/por
// teléfono donde no hay forma práctica de esperar un correo. Mismo molde
// visual que EditarRolModal.jsx.
export default function CrearUsuarioModal({ roles, onCerrar, onCreado }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [definirPassword, setDefinirPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const alTeclado = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [onCerrar])

  const passwordValida = !definirPassword || password.length >= PASSWORD_MIN
  const puedeEnviar = fullName.trim() && email.trim() && roleId && passwordValida && !guardando

  const enviar = async (e) => {
    e.preventDefault()
    if (!puedeEnviar) return
    setError(null)
    setGuardando(true)
    try {
      await iamService.crearUsuario({
        email: email.trim(),
        fullName: fullName.trim(),
        roleId,
        password: definirPassword ? password : undefined,
      })
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
        aria-labelledby="crear-usuario-titulo"
        className="rise-in relative flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6"
      >
        <div>
          <h2 id="crear-usuario-titulo" className="text-lg font-extrabold text-marron-cafe">
            Nuevo usuario
          </h2>
          <p className="text-xs text-marron-cafe/50">
            {definirPassword
              ? 'Queda listo para entrar ya con esta contraseña.'
              : 'Le llega un correo de invitación para definir su contraseña.'}
          </p>
        </div>

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
            required
            className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-marron-cafe">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={guardando}
            required
            className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-marron-cafe">Rol</span>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            disabled={guardando}
            required
            className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima disabled:opacity-40"
          >
            <option value="" disabled>
              Elegí un rol…
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-marron-cafe">
          <input
            type="checkbox"
            checked={definirPassword}
            onChange={(e) => {
              setDefinirPassword(e.target.checked)
              if (!e.target.checked) setPassword('')
            }}
            disabled={guardando}
            className="size-4 rounded border-marron-tierra/30 text-verde-bosque focus-visible:outline-verde-lima"
          />
          Definir contraseña ahora (en vez de invitar por correo)
        </label>

        {definirPassword && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-marron-cafe">Contraseña</span>
            <div className="flex items-center gap-1.5">
              <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={guardando}
                  autoComplete="new-password"
                  required
                  className="w-full text-sm text-marron-cafe outline-none disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((v) => !v)}
                  disabled={guardando}
                  title={mostrarPassword ? 'Ocultar' : 'Mostrar'}
                  className="shrink-0 text-marron-cafe/40 hover:text-marron-cafe disabled:opacity-40"
                >
                  {mostrarPassword ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPassword(generarPassword())
                  setMostrarPassword(true)
                }}
                disabled={guardando}
                title="Generar una contraseña"
                className="flex shrink-0 items-center gap-1 rounded-xl border border-marron-tierra/20 px-3 py-2 text-xs font-medium text-marron-cafe hover:bg-marron-tierra/10 disabled:opacity-40"
              >
                <RefreshCw className="size-3.5" strokeWidth={1.75} />
                Generar
              </button>
            </div>
            {password.length > 0 && password.length < PASSWORD_MIN && (
              <span className="text-xs text-rojo-pasankalla">Mínimo {PASSWORD_MIN} caracteres.</span>
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
            {guardando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </div>
  )
}
