import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

// Botones de "continuar con Google/Facebook" — mock hasta que exista un
// Client ID/App ID real (los crea Facundo en Google Cloud Console/
// Facebook for Developers) y un backend que verifique el token. Por
// ahora simulan un login exitoso, igual que el switcher de usuarios de
// prueba, para que el botón tenga un destino real (regla: nunca un botón
// sin destino).
function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export default function SocialButtons() {
  const navigate = useNavigate()
  const [cargando, setCargando] = useState(null)

  const entrarCon = async (proveedor) => {
    setCargando(proveedor)
    try {
      await authService.loginConProveedor(proveedor)
      navigate('/panel')
    } catch (err) {
      // Todavía no hay Client ID de Google/Facebook ni backend que
      // verifique el token — ver authService.loginConProveedor.
      window.alert(err.message)
    } finally {
      setCargando(null)
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 text-xs text-crema-quinua/40">
        <span className="flex-1 h-px bg-crema-quinua/15" aria-hidden="true" />
        O continuá con
        <span className="flex-1 h-px bg-crema-quinua/15" aria-hidden="true" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={cargando !== null}
          onClick={() => entrarCon('Google')}
          className="flex items-center justify-center gap-2 rounded-xl border border-crema-quinua/20 bg-crema-quinua/5 py-2.5 text-sm text-crema-quinua/80 transition-colors duration-200 hover:bg-crema-quinua/10 disabled:opacity-60"
        >
          <GoogleIcon />
          {cargando === 'Google' ? 'Ingresando…' : 'Google'}
        </button>
        <button
          type="button"
          disabled={cargando !== null}
          onClick={() => entrarCon('Facebook')}
          className="flex items-center justify-center gap-2 rounded-xl border border-crema-quinua/20 bg-crema-quinua/5 py-2.5 text-sm text-crema-quinua/80 transition-colors duration-200 hover:bg-crema-quinua/10 disabled:opacity-60"
        >
          <FacebookIcon />
          {cargando === 'Facebook' ? 'Ingresando…' : 'Facebook'}
        </button>
      </div>
    </div>
  )
}
