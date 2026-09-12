import { Link } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { GRUPOS_MAESTROS } from '../config/gruposMaestros'
import EmptyState from '../components/EmptyState.jsx'

const ITEMS_CONFIGURACION = GRUPOS_MAESTROS.find((g) => g.id === 'configuracion').items

// Inicio de Configuración — antes caía en el placeholder genérico de
// PanelModulo.jsx ("todavía en construcción"), aunque sus 3 sub-ítems
// (Países/Formularios/Áreas) son pantallas reales hace tiempo. Mismo
// criterio que PanelCalidad.jsx/PanelAlmacen.jsx: el padre del grupo es un
// hub liviano, no un dashboard — acá simplemente linkea a sus hermanas, que
// ya tienen su propio submenú en el sidebar (ver gruposMaestros.js).
//
// Fuente única de los 3 ítems: gruposMaestros.js, la misma que arma el
// sidebar y las pastillas de arriba — sumar un ítem nuevo a Configuración
// alcanza con una línea ahí, esta pantalla no vuelve a tocarse.
export default function PanelConfiguracion() {
  const { permisos } = useAuth()
  const items = ITEMS_CONFIGURACION.filter((i) => permisos.has(i.permiso))

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <SlidersHorizontal className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Configuración</h1>
          <p className="text-sm text-marron-cafe/60">Datos maestros y catálogos del sistema.</p>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState Icon={SlidersHorizontal} titulo="No tenés acceso a ninguna sección de Configuración todavía" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={item.ruta}
              className="flex flex-col gap-3 rounded-3xl bg-marron-tierra/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-marron-tierra/10"
            >
              <div className="w-fit rounded-full bg-marron-tierra/10 p-2">
                <item.Icon className="size-5 text-marron-tierra" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-extrabold text-marron-cafe">{item.nombre}</h3>
                {item.descripcion && <p className="mt-1 text-sm text-marron-cafe/70">{item.descripcion}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
