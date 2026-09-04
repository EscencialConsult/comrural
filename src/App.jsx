import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import DashboardLayout from './components/dashboard/DashboardLayout.jsx'

// Una página por chunk (React.lazy + Suspense, fallback = LoadingScreen ya
// existente para el restore de sesión) en vez de las ~35 páginas importadas
// estáticas de una — antes CUALQUIER pantalla descargaba el bundle entero,
// three.js/@paper-design/shaders de Servicio.jsx (efecto decorativo de la
// landing pública) incluidos, aunque nadie fuera a visitar /servicio. Cada
// chunk se pide recién al navegar a esa ruta y el propio navegador lo
// cachea solo (nombre de archivo con hash de Vite) — no hace falta nada
// más para que no se vuelva a pedir en la sesión.
const Servicio = lazy(() => import('./pages/Servicio.jsx'))
const Modulos = lazy(() => import('./pages/Modulos.jsx'))
const Descargas = lazy(() => import('./pages/Descargas.jsx'))
const Novedades = lazy(() => import('./pages/Novedades.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Registro = lazy(() => import('./pages/Registro.jsx'))
const RecuperarContrasena = lazy(() => import('./pages/RecuperarContrasena.jsx'))
const Panel = lazy(() => import('./pages/Panel.jsx'))
const PanelModulo = lazy(() => import('./pages/PanelModulo.jsx'))
const PanelConfiguracion = lazy(() => import('./pages/PanelConfiguracion.jsx'))
const PanelCompras = lazy(() => import('./pages/PanelCompras.jsx'))
const PanelAlmacen = lazy(() => import('./pages/PanelAlmacen.jsx'))
const PanelAlmacenRecepcion = lazy(() => import('./pages/PanelAlmacenRecepcion.jsx'))
const PanelCalidad = lazy(() => import('./pages/PanelCalidad.jsx'))
const PanelProduccion = lazy(() => import('./pages/PanelProduccion.jsx'))
const PanelProduccionAreaA = lazy(() => import('./pages/PanelProduccionAreaA.jsx'))
const PanelGerencia = lazy(() => import('./pages/PanelGerencia.jsx'))
const PanelLaboratorio = lazy(() => import('./pages/PanelLaboratorio.jsx'))
const PanelCalidadRecepcion = lazy(() => import('./pages/PanelCalidadRecepcion.jsx'))
const PanelCalidadRemito = lazy(() => import('./pages/PanelCalidadRemito.jsx'))
const PanelCalidadMuestras = lazy(() => import('./pages/PanelCalidadMuestras.jsx'))
const PanelCalidadControlProceso = lazy(() => import('./pages/PanelCalidadControlProceso.jsx'))
const PanelRecepcionLote = lazy(() => import('./pages/PanelRecepcionLote.jsx'))
const PanelInspeccionMateriaPrima = lazy(() => import('./pages/PanelInspeccionMateriaPrima.jsx'))
const PanelIngresoMateriaPrima = lazy(() => import('./pages/PanelIngresoMateriaPrima.jsx'))
const GestionUsuarios = lazy(() => import('./pages/GestionUsuarios.jsx'))
const GestionRoles = lazy(() => import('./pages/GestionRoles.jsx'))
const PanelPaises = lazy(() => import('./pages/PanelPaises.jsx'))
const PanelFormularios = lazy(() => import('./pages/PanelFormularios.jsx'))
const PanelAreas = lazy(() => import('./pages/PanelAreas.jsx'))
const PanelPersonas = lazy(() => import('./pages/PanelPersonas.jsx'))
const PanelOrganizaciones = lazy(() => import('./pages/PanelOrganizaciones.jsx'))
const PanelProveedores = lazy(() => import('./pages/PanelProveedores.jsx'))
const PanelProductos = lazy(() => import('./pages/PanelProductos.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

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
    <Suspense fallback={<LoadingScreen />}>
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
          <Route path="/panel/usuarios/roles" element={<GestionRoles />} />
          <Route path="/panel/paises" element={<PanelPaises />} />
          <Route path="/panel/formularios" element={<PanelFormularios />} />
          <Route path="/panel/areas" element={<PanelAreas />} />
          <Route path="/panel/personas" element={<PanelPersonas />} />
          <Route path="/panel/organizaciones" element={<PanelOrganizaciones />} />
          <Route path="/panel/proveedores" element={<PanelProveedores />} />
          <Route path="/panel/productos" element={<PanelProductos />} />
          <Route path="/panel/compras" element={<PanelCompras />} />
          <Route path="/panel/almacen" element={<PanelAlmacen />} />
          <Route path="/panel/almacen/recepcion" element={<PanelAlmacenRecepcion />} />
          <Route path="/panel/calidad" element={<PanelCalidad />} />
          <Route path="/panel/produccion" element={<PanelProduccion />} />
          <Route path="/panel/produccion/area-a" element={<PanelProduccionAreaA />} />
          <Route path="/panel/gerencia" element={<PanelGerencia />} />
          <Route path="/panel/laboratorio" element={<PanelLaboratorio />} />
          <Route path="/panel/calidad/inspeccion" element={<PanelCalidadRecepcion />} />
          <Route path="/panel/calidad/remito" element={<PanelCalidadRemito />} />
          <Route path="/panel/calidad/muestras" element={<PanelCalidadMuestras />} />
          <Route path="/panel/calidad/control-proceso" element={<PanelCalidadControlProceso />} />
          <Route path="/panel/calidad/lotes/:lotId" element={<PanelRecepcionLote />} />
          <Route path="/panel/calidad/lotes/:lotId/inspeccion" element={<PanelInspeccionMateriaPrima />} />
          <Route path="/panel/calidad/lotes/:lotId/ingreso" element={<PanelIngresoMateriaPrima />} />
          <Route path="/panel/configuracion" element={<PanelConfiguracion />} />
          <Route path="/panel/:moduloId" element={<PanelModulo />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default App
