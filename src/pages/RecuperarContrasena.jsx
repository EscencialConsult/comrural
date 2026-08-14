import { useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { authService } from '../services/authService'
import Button from '../components/Button'
import AuthLayout from '../components/AuthLayout'
import AuthInput from '../components/AuthInput'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Recuperación self-service, sin intervención de un admin (decisión
// confirmada en wiki/comrural-shell-frontend.md). Mock: no envía email
// real, solo simula la confirmación.
export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [errorCampo, setErrorCampo] = useState(null)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setErrorCampo('Ingresá tu email.')
      return
    }
    if (!EMAIL_RE.test(email)) {
      setErrorCampo('Ingresá un email válido.')
      return
    }
    setErrorCampo(null)

    setEnviando(true)
    try {
      await authService.solicitarRecuperacion(email)
      setEnviado(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout
      pageKey="recuperar"
      tagline="Recuperá el acceso a tu cuenta."
      promptText="¿Ya tenés cuenta?"
      linkLabel="Iniciá sesión"
      linkTo="/login"
      hidePrompt={enviado}
    >
      {enviado ? (
        <>
          <h1 className="text-4xl md:text-5xl font-black text-crema-quinua leading-none tracking-tight whitespace-nowrap">
            Revisá tu email
          </h1>
          <p className="mt-3 text-sm text-crema-quinua/70">
            Si <span className="font-medium text-crema-quinua">{email}</span> tiene una cuenta, te
            enviamos un enlace para restablecer tu contraseña.
          </p>
          <Button to="/login" variant="ghost" className="w-full mt-6">
            Volver a iniciar sesión
          </Button>
        </>
      ) : (
        <>
          <h1 className="text-4xl md:text-5xl font-black text-crema-quinua leading-none tracking-tight whitespace-nowrap">
            Recuperar contraseña
          </h1>
          <p className="mt-4 text-sm font-semibold text-crema-quinua/70">
            Te enviaremos un enlace a tu email para crear una nueva.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
            {error && (
              <p className="text-sm text-crema-quinua bg-rojo-pasankalla/20 border border-rojo-pasankalla/40 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <AuthInput
              icon={Mail}
              name="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (errorCampo) setErrorCampo(null)
              }}
              autoComplete="email"
              error={errorCampo}
            />

            <Button type="submit" disabled={enviando} variant="primary" className="w-full mt-2 gap-2">
              {enviando && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden="true" />}
              {enviando ? 'Enviando…' : 'Enviar enlace'}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
