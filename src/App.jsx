import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import Servicio from './pages/Servicio.jsx'
import Modulos from './pages/Modulos.jsx'
import Descargas from './pages/Descargas.jsx'
import Novedades from './pages/Novedades.jsx'
import Login from './pages/Login.jsx'
import Registro from './pages/Registro.jsx'
import RecuperarContrasena from './pages/RecuperarContrasena.jsx'
import Panel from './pages/Panel.jsx'
import PanelModulo from './pages/PanelModulo.jsx'
import PanelCompras from './pages/PanelCompras.jsx'
import PanelAlmacen from './pages/PanelAlmacen.jsx'
import PanelCalidad from './pages/PanelCalidad.jsx'
import PanelRecepcionLote from './pages/PanelRecepcionLote.jsx'
import PanelAprobacionResolucion from './pages/PanelAprobacionResolucion.jsx'
import GestionUsuarios from './pages/GestionUsuarios.jsx'
import PanelPaises from './pages/PanelPaises.jsx'
import PanelFormularios from './pages/PanelFormularios.jsx'
import PanelPersonas from './pages/PanelPersonas.jsx'
import PanelOrganizaciones from './pages/PanelOrganizaciones.jsx'
import PanelProveedores from './pages/PanelProveedores.jsx'
import PanelProductos from './pages/PanelProductos.jsx'
import PanelLotes from './pages/PanelLotes.jsx'
import NotFound from './pages/NotFound.jsx'
import DashboardLayout from './components/dashboard/DashboardLayout.jsx'

// "/" ES el login (no un redirect a /login) — la puerta de entrada del
// sistema es el login, no una ruta aparte. Con sesión activa, redirige
// directo al panel autenticado (no a /servicio, que es pública).
function Raiz() {
  const { haySesion, cargando } = useAuth()
  // La sesión de Supabase se restaura de forma asíncrona al cargar la
  // página — sin este chequeo se mostraría el login por un instante aunque
  // ya haya sesión.
  if (cargando) return <LoadingScreen />
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
        <Route path="/panel/usuarios" element={<GestionUsuarios />} />
        <Route path="/panel/paises" element={<PanelPaises />} />
        <Route path="/panel/formularios" element={<PanelFormularios />} />
        <Route path="/panel/personas" element={<PanelPersonas />} />
        <Route path="/panel/organizaciones" element={<PanelOrganizaciones />} />
        <Route path="/panel/proveedores" element={<PanelProveedores />} />
        <Route path="/panel/productos" element={<PanelProductos />} />
        <Route path="/panel/lotes" element={<PanelLotes />} />
        <Route path="/panel/compras" element={<PanelCompras />} />
        <Route path="/panel/almacen" element={<PanelAlmacen />} />
        <Route path="/panel/calidad" element={<PanelCalidad />} />
        <Route path="/panel/calidad/lotes/:lotId" element={<PanelRecepcionLote />} />
        <Route path="/panel/calidad/lotes/:lotId/aprobacion" element={<PanelAprobacionResolucion />} />
        <Route path="/panel/:moduloId" element={<PanelModulo />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
