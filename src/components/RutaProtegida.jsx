import { Navigate } from 'react-router-dom'
import { authService } from '../services/authService'

export default function RutaProtegida({ children }) {
  const haySesion = Boolean(authService.getSesionActual())
  return haySesion ? children : <Navigate to="/" replace />
}
