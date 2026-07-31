import { Navigate, Route, Routes } from 'react-router-dom'
import { authService } from './services/authService'
import RutaProtegida from './components/RutaProtegida.jsx'
import Servicio from './pages/Servicio.jsx'
import Modulos from './pages/Modulos.jsx'
import Descargas from './pages/Descargas.jsx'
import Novedades from './pages/Novedades.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import RecuperarContrasena from './pages/RecuperarContrasena.jsx'
import Panel from './pages/Panel.jsx'
import PanelModulo from './pages/PanelModulo.jsx'
import DashboardLayout from './components/dashboard/DashboardLayout.jsx'

// "/" ES el login (no un redirect a /login) — la puerta de entrada del
// sistema es el login, no una ruta aparte. Con sesión activa, redirige
// directo al panel autenticado (no a /servicio, que es pública).
function Raiz() {
  const haySesion = Boolean(authService.getSesionActual())
  if (haySesion) return <Navigate to="/panel" replace />
  return <Login />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Raiz />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
      {/*
        Servicio/Modulos/Descargas/Novedades son informativas/de
        marketing (lista de módulos, links de descarga, novedades) — no
        datos operativos reales todavía, así que son públicas a
        propósito. Alguien sin cuenta tiene que poder ver "qué es esto" y
        bajar el software antes de registrarse.
      */}
      <Route path="/servicio" element={<Servicio />} />
      <Route path="/modulos" element={<Modulos />} />
      <Route path="/descargas" element={<Descargas />} />
      <Route path="/novedades" element={<Novedades />} />

      {/*
        Panel: primera zona realmente autenticada — acá sí va
        RutaProtegida, envolviendo el layout UNA sola vez. DashboardLayout
        arma sidebar + header (siempre igual, mismos datos) y cada ruta
        hija solo pone su propio contenido vía <Outlet />.
      */}
      <Route
        element={
          <RutaProtegida>
            <DashboardLayout />
          </RutaProtegida>
        }
      >
        <Route path="/panel" element={<Panel />} />
        <Route path="/panel/:moduloId" element={<PanelModulo />} />
      </Route>
    </Routes>
  )
}

export default App
