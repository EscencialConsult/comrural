import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import LoadingScreen from './LoadingScreen.jsx'

export default function RutaProtegida({ children }) {
  const { haySesion, cargando } = useAuth()
  // Mientras se restaura la sesión de Supabase no se puede saber todavía
  // si hay que redirigir a "/" — mostrar la pantalla de carga es mejor que
  // expulsar de golpe a un usuario que en realidad sí tenía sesión activa.
  if (cargando) return <LoadingScreen />
  return haySesion ? children : <Navigate to="/" replace />
}
