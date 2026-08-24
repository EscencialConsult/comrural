import { useEffect, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { areasService } from '../services/areasService'
import { toast } from '../lib/toast'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormInput from '../components/FormInput.jsx'
import Button from '../components/Button.jsx'
import Skeleton from '../components/Skeleton.jsx'

// FE·Configuración · Gestionar Área (ver comrural_erp_backend/docs/areas.md,
// leído completo). Catálogo mínimo y chico, mismo criterio que Países:
// sin paginación, sin DELETE — a diferencia de Países, tampoco hay
// desactivación (`isActive`): un área creada nunca se borra ni se apaga,
// solo se puede renombrar (docs §9, "No hay borrado ni desactivación de un
// área"). Hoy se usa como referencia obligatoria de forms.areaId.
export default function PanelAreas() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('areas:read')
  const puedeCrear = permisos.has('areas:create')
  const puedeEditar = permisos.has('areas:update')

  const [areas, setAreas] = useState(null)
  const [vista, setVista] = useState({ modo: 'lista', areaId: null })
  const [errorCarga, setErrorCarga] = useState(null)

  const cargar = () => {
    setErrorCarga(null)
    areasService
      .listar()
      .then((resp) => setAreas(resp.data))
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    areasService
      .listar()
      .then((resp) => {
        if (!cancelado) setAreas(resp.data)
      })
      .catch((err) => {
        if (!cancelado) setErrorCarga(err.message)
      })
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al catálogo de áreas." />
  }

  const areaEnEdicion = areas?.find((a) => a.id === vista.areaId)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <LayoutGrid className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Áreas</h1>
          <p className="text-sm text-marron-cafe/60">Catálogo de áreas organizativas — referencia de Formularios.</p>
        </div>
      </header>

      {vista.modo === 'lista' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Listado{' '}
              {areas && <span className="text-sm font-medium text-marron-cafe/40">{areas.length}</span>}
            </h2>
            {puedeCrear && (
              <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', areaId: null })}>
                + Agregar área
              </Button>
            )}
          </div>

          {errorCarga ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl bg-rojo-pasankalla/10 px-4 py-3.5 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar el catálogo: {errorCarga}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={cargar}>
                Reintentar
              </Button>
            </div>
          ) : areas === null ? (
            <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
              {areas.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
                >
                  <p className="font-semibold text-marron-cafe">{a.name}</p>
                  {puedeEditar && (
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setVista({ modo: 'editar', areaId: a.id })}
                    >
                      Editar
                    </Button>
                  )}
                </div>
              ))}
              {areas.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">No hay áreas cargadas todavía.</p>
              )}
            </div>
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioArea
          onCancelar={() => setVista({ modo: 'lista', areaId: null })}
          onGuardado={(nombre) => {
            cargar()
            setVista({ modo: 'lista', areaId: null })
            toast.success(`"${nombre}" se agregó al catálogo.`)
          }}
        />
      )}

      {vista.modo === 'editar' && areaEnEdicion && (
        <FormularioArea
          area={areaEnEdicion}
          onCancelar={() => setVista({ modo: 'lista', areaId: null })}
          onGuardado={(nombre) => {
            cargar()
            setVista({ modo: 'lista', areaId: null })
            toast.success(`"${nombre}" se actualizó.`)
          }}
        />
      )}
    </main>
  )
}

// Un solo formulario para alta y edición — a diferencia de Países, acá no
// hay ningún campo inmutable: `name` es el único dato real (docs/areas.md
// §3, "name es el único dato real y debe ser único") y se puede editar
// siempre.
function FormularioArea({ area, onCancelar, onGuardado }) {
  const editando = Boolean(area)
  const [nombre, setNombre] = useState(area?.name ?? '')
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const nombreValido = nombre.trim().length > 0
  const puedeGuardar = nombreValido

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    try {
      await ejecutar(() =>
        editando ? areasService.actualizar(area.id, { name: nombre.trim() }) : areasService.crear({ name: nombre.trim() }),
      )
      onGuardado(nombre.trim())
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` (incluye 409 si
      // el nombre ya existe).
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">{editando ? `Editar ${area.name}` : 'Nueva área'}</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div>
        <FormInput
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Control de Calidad"
          maxLength={100}
          required
        />
        {nombre.length > 0 && !nombreValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">El nombre no puede quedar vacío.</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear área'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
