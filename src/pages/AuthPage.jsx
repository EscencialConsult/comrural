import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Loader2 } from 'lucide-react'
import { useAuth, ErrorPostLogin } from '../context/AuthContext.jsx'
import { authService } from '../services/authService'
import Button from '../components/Button'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'
import SocialButtons from '../components/SocialButtons'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Login y Registro viven en la MISMA interfaz — decisión explícita de
// Facundo: al tocar el link de abajo no se navega a otra ruta, no cambia
// el fondo, no cambia la URL, solo cambia el contenido del formulario.
// "/registro" sigue existiendo como URL de entrada directa (arranca ya en
// modo registro), pero el toggle interno de acá adentro nunca navega.
//
// Validación propia (noValidate en el <form>): los globos nativos del
// navegador no siguen el diseño del sitio y varían por navegador/idioma.
// Cada mensaje aparece debajo del input exacto que lo provocó (ver
// AuthInput), no como banner genérico.
export default function AuthPage({ modoInicial = 'login' }) {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [modo, setModo] = useState(modoInicial)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [recordarme, setRecordarme] = useState(true)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState(null)
  const [erroresCampos, setErroresCampos] = useState({})
  const [enviando, setEnviando] = useState(false)

  const esLogin = modo === 'login'

  const alternarModo = () => {
    setError(null)
    setErroresCampos({})
    setModo(esLogin ? 'registro' : 'login')
  }

  // Limpia el error de un campo apenas el usuario lo corrige — no lo deja
  // pegado en pantalla hasta el próximo submit.
  const limpiarError = (campo) => {
    setErroresCampos((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev))
  }

  const validar = () => {
    const nuevosErrores = {}

    if (!esLogin && !nombre.trim()) {
      nuevosErrores.nombre = 'Ingresá tu nombre completo.'
    }

    if (!email.trim()) {
      nuevosErrores.email = 'Ingresá tu email.'
    } else if (!EMAIL_RE.test(email)) {
      nuevosErrores.email = 'Ingresá un email válido.'
    }

    if (!contrasena) {
      nuevosErrores.contrasena = esLogin ? 'Ingresá tu contraseña.' : 'Creá una contraseña.'
    } else if (!esLogin && contrasena.length < 8) {
      nuevosErrores.contrasena = 'Tiene que tener al menos 8 caracteres.'
    }

    if (!esLogin && !aceptaTerminos) {
      nuevosErrores.aceptaTerminos = 'Tenés que aceptar los términos para continuar.'
    }

    setErroresCampos(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!validar()) return

    setEnviando(true)
    try {
      if (esLogin) {
        await login({ email, contrasena, recordarme })
      } else {
        await authService.registrar({ nombre, email, contrasena, aceptaTerminos })
      }
      navigate('/panel')
    } catch (err) {
      // Login: mensaje genérico por seguridad (no revela si el usuario
      // existe o no) — decisión confirmada en wiki/comrural-shell-frontend.md.
      // Excepción: ErrorPostLogin pasa DESPUÉS de que Supabase ya confirmó
      // la contraseña (ej. cuenta inactiva) — a esa altura mostrar el
      // motivo real no filtra nada, y es más útil que el genérico.
      if (esLogin) {
        setError(err instanceof ErrorPostLogin ? err.message : 'Usuario o contraseña incorrectos.')
      } else {
        setError(err.message)
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
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
        {esLogin ? 'Ingresá con tu email de COMRURAL.' : 'Sistema de Gestión COMRURAL XXI.'}
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {error && (
          <p className="text-sm text-crema-quinua bg-rojo-pasankalla/20 border border-rojo-pasankalla/40 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {esLogin ? (
          <AuthInput
            icon={Mail}
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              limpiarError('email')
            }}
            autoComplete="email"
            error={erroresCampos.email}
          />
        ) : (
          <>
            <AuthInput
              icon={User}
              name="nombre"
              label="Nombre completo"
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value)
                limpiarError('nombre')
              }}
              autoComplete="name"
              error={erroresCampos.nombre}
            />
            <AuthInput
              icon={Mail}
              name="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                limpiarError('email')
              }}
              autoComplete="email"
              error={erroresCampos.email}
            />
          </>
        )}

        <AuthInput
          icon={Lock}
          name="contrasena"
          label="Contraseña"
          type="password"
          value={contrasena}
          onChange={(e) => {
            setContrasena(e.target.value)
            limpiarError('contrasena')
          }}
          autoComplete={esLogin ? 'current-password' : 'new-password'}
          error={erroresCampos.contrasena}
        />

        {esLogin ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
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
          <div>
            <label className="flex items-start gap-2 text-sm text-crema-quinua/70">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => {
                  setAceptaTerminos(e.target.checked)
                  limpiarError('aceptaTerminos')
                }}
                className="mt-0.5 rounded accent-verde-lima"
              />
              Acepto los términos y condiciones de uso.
            </label>
            {erroresCampos.aceptaTerminos && (
              <p className="mt-1.5 text-xs font-medium text-rojo-pasankalla">
                {erroresCampos.aceptaTerminos}
              </p>
            )}
          </div>
        )}

        <Button type="submit" disabled={enviando} variant="primary" className="w-full mt-2 gap-2">
          {enviando && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
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
  )
}
