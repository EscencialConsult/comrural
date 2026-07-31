import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock } from 'lucide-react'
import { authService } from '../services/authService'
import Button from '../components/Button'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'
import SocialButtons from '../components/SocialButtons'
import DevRoleSwitcher from '../components/DevRoleSwitcher'

// Login y Registro viven en la MISMA interfaz — decisión explícita de
// Facundo: al tocar el link de abajo no se navega a otra ruta, no cambia
// el fondo, no cambia la URL, solo cambia el contenido del formulario.
// "/registro" sigue existiendo como URL de entrada directa (arranca ya en
// modo registro), pero el toggle interno de acá adentro nunca navega.
export default function AuthPage({ modoInicial = 'login' }) {
  const navigate = useNavigate()
  const [modo, setModo] = useState(modoInicial)

  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [recordarme, setRecordarme] = useState(true)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const esLogin = modo === 'login'

  const alternarModo = () => {
    setError(null)
    setModo(esLogin ? 'registro' : 'login')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      if (esLogin) {
        await authService.login({ usuario, contrasena })
      } else {
        await authService.registrar({ nombre, email, contrasena, aceptaTerminos })
      }
      navigate('/panel')
    } catch (err) {
      // Login: mensaje genérico por seguridad (no revela si el usuario
      // existe o no) — decisión confirmada en wiki/comrural-shell-frontend.md.
      setError(esLogin ? 'Usuario o contraseña incorrectos.' : err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <AuthLayout
        pageKey="acceso"
        tagline="Iniciá sesión para acceder a tu área."
        promptText={esLogin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}
        linkLabel={esLogin ? 'Creá una aquí' : 'Iniciá sesión'}
        onLinkClick={alternarModo}
      >
        <h1 className="text-4xl md:text-5xl font-black text-crema-quinua leading-none tracking-tight whitespace-nowrap">
          {esLogin ? 'Iniciar sesión' : 'Crear cuenta'}
        </h1>
        <p className="mt-4 text-sm font-semibold text-crema-quinua/70">
          {esLogin ? 'Ingresá con tu usuario de COMRURAL.' : 'Sistema de Gestión COMRURAL XXI.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {error && (
            <p className="text-sm text-crema-quinua bg-rojo-pasankalla/20 border border-rojo-pasankalla/40 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {esLogin ? (
            <AuthInput
              icon={Mail}
              label="Usuario o email"
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              required
            />
          ) : (
            <>
              <AuthInput
                icon={User}
                label="Nombre completo"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="name"
                required
              />
              <AuthInput
                icon={Mail}
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </>
          )}

          <AuthInput
            icon={Lock}
            label="Contraseña"
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete={esLogin ? 'current-password' : 'new-password'}
            minLength={esLogin ? undefined : 8}
            required
          />

          {esLogin ? (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-crema-quinua/70">
                <input
                  type="checkbox"
                  checked={recordarme}
                  onChange={(e) => setRecordarme(e.target.checked)}
                  className="rounded accent-verde-lima"
                />
                Recordarme
              </label>
              <Link
                to="/recuperar-contrasena"
                className="text-verde-lima hover:text-verde-pistacho transition-colors duration-200"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          ) : (
            <label className="flex items-start gap-2 text-sm text-crema-quinua/70">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                className="mt-0.5 rounded accent-verde-lima"
                required
              />
              Acepto los términos y condiciones de uso.
            </label>
          )}

          <Button type="submit" disabled={enviando} variant="primary" className="w-full mt-2">
            {esLogin
              ? enviando
                ? 'Ingresando…'
                : 'Ingresar'
              : enviando
                ? 'Creando cuenta…'
                : 'Crear cuenta'}
          </Button>
        </form>

        <SocialButtons />

        <Link
          to="/descargas"
          className="mt-4 block text-center text-xs text-crema-quinua/35 transition-colors duration-200 hover:text-crema-quinua/60"
        >
          Descargar software
        </Link>
      </AuthLayout>

      {esLogin && <DevRoleSwitcher />}
    </>
  )
}
