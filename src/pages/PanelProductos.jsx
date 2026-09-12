import { useState } from 'react'
import { Boxes, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { useCatalogoMaestro } from '../hooks/useCatalogoMaestro'
import { productsService } from '../services/productsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormInput from '../components/FormInput.jsx'
import Button from '../components/Button.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Skeleton from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'

// FE·M5 · Gestionar Producto (ver comrural_erp_backend/docs/products.md +
// product.dto.ts/products.service.ts, leídos completos). El módulo más
// simple de los 6: solo `code` (autogenerado "PROD-N" por el servidor,
// nunca lo manda el cliente) + `name` + `isActive`. Misma arquitectura ya
// probada y auditada en M2-M4 (listado paginado, detalle con fetch propio +
// guarda contra condición de carrera, refetch tras alta, useSolicitud).
export default function PanelProductos() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('products:read')
  const puedeCrear = permisos.has('products:create')
  const puedeEditar = permisos.has('products:update')

  const [vista, setVista] = useState({ modo: 'lista', productId: null })
  const {
    items: productos,
    setItems: setProductos,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle: productoDetalle,
    setDetalle: setProductoDetalle,
    errorDetalle,
    abrirDetalle: abrirDetalleHook,
    setConfirmacion,
  } = useCatalogoMaestro(productsService, { puedeVer })

  const abrirDetalle = (productId) => {
    setVista({ modo: 'detalle', productId })
    abrirDetalleHook(productId)
  }

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al catálogo de productos." />
  }

  // El listado real pagina por id (UUID aleatorio, ver products.service.ts)
  // — mismo criterio que países/personas/organizaciones/proveedores. Ahí no
  // importaba mucho el orden visual, pero acá `code` es correlativo y
  // legible por una persona (PROD-1, PROD-2…): mostrarlo en orden de id
  // dejaría PROD-4 arriba de PROD-2 sin ninguna razón visible. Se reordena
  // solo para mostrar, nunca afecta la paginación real (que sigue siendo
  // por id contra el servidor). Numérico, no lexicográfico: "PROD-10" no
  // puede quedar antes que "PROD-2".
  const numeroDeCode = (code) => parseInt(code.replace(/^PROD-/, ''), 10) || 0
  const productosOrdenados = productos ? [...productos].sort((a, b) => numeroDeCode(a.code) - numeroDeCode(b.code)) : productos

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Boxes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Productos</h1>
          <p className="text-sm text-marron-cafe/60">Catálogo base para lotes.</p>
        </div>
      </header>

      {vista.modo === 'lista' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Listado{' '}
              {productos && <span className="text-sm font-medium text-marron-cafe/40">{productos.length}</span>}
            </h2>
            {puedeCrear && (
              <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', productId: null })}>
                + Agregar producto
              </Button>
            )}
          </div>

          {errorCarga ? (
            <ErrorBanner
              mensaje={`No se pudo cargar el listado: ${errorCarga}`}
              onReintentar={cargarPrimeraPagina}
            />
          ) : productos === null ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-2xl bg-marron-tierra/5 p-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ))}
            </div>
          ) : productos.length === 0 ? (
            <EmptyState
              Icon={Boxes}
              titulo="Todavía no hay productos cargados"
              descripcion={puedeCrear ? 'Agregá el primero para empezar.' : undefined}
              accion={
                puedeCrear && (
                  <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', productId: null })}>
                    + Agregar producto
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {productosOrdenados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => abrirDetalle(p.id)}
                    className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4 text-left transition-colors duration-150 hover:bg-marron-tierra/10"
                  >
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-full bg-marron-tierra/10 px-2.5 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                        {p.code}
                      </span>
                      {!p.isActive && (
                        <span className="ml-auto shrink-0 rounded-full bg-marron-tierra/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-marron-cafe/40 uppercase">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="truncate font-semibold text-marron-cafe">{p.name}</p>
                  </button>
                ))}
              </div>

              {errorCargarMas && (
                <p className="text-center text-xs font-medium text-rojo-pasankalla">
                  No se pudo cargar más: {errorCargarMas}
                </p>
              )}

              {cursor && (
                <Button
                  variant="secondary"
                  className="self-center px-4 py-2 text-sm"
                  disabled={cargandoMas}
                  onClick={cargarMas}
                >
                  {cargandoMas ? 'Cargando…' : errorCargarMas ? 'Reintentar' : 'Cargar más'}
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'detalle' && (
        <section className="flex flex-col gap-5 rounded-3xl bg-marron-tierra/5 p-6">
          <button
            type="button"
            onClick={() => setVista({ modo: 'lista', productId: null })}
            className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            Volver al listado
          </button>

          {errorDetalle ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {errorDetalle}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => abrirDetalle(vista.productId)}>
                Reintentar
              </Button>
            </div>
          ) : productoDetalle === null ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-7 w-52" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-marron-tierra/10 px-3 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                  {productoDetalle.code}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    productoDetalle.isActive ? 'bg-verde-lima/15 text-verde-bosque' : 'bg-marron-tierra/10 text-marron-cafe/50'
                  }`}
                >
                  {productoDetalle.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <h2 className="text-xl font-bold text-marron-cafe">{productoDetalle.name}</h2>

              {puedeEditar && (
                <Button
                  className="self-start px-4 py-2 text-sm"
                  onClick={() => setVista({ modo: 'editar', productId: productoDetalle.id })}
                >
                  Editar
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioCreacionProducto
          onCancelar={() => setVista({ modo: 'lista', productId: null })}
          onGuardado={(prod) => {
            // Mismo criterio que Personas/Organizaciones/Proveedores:
            // refresca desde el servidor en vez de insertar a mano — el id
            // es un UUID aleatorio, no hay una posición "correcta" para
            // pegarlo en el array ya cargado. El code SÍ es correlativo acá
            // (PROD-N), pero el orden de paginación real sigue siendo por
            // id, no por code — mantener el mismo criterio evita que este
            // módulo se comporte distinto de los demás sin necesidad real.
            cargarPrimeraPagina()
            setVista({ modo: 'lista', productId: null })
            setConfirmacion(`"${prod.name}" (${prod.code}) se agregó al catálogo.`)
          }}
        />
      )}

      {vista.modo === 'editar' && productoDetalle && (
        <FormularioEdicionProducto
          producto={productoDetalle}
          onCancelar={() => setVista({ modo: 'detalle', productId: productoDetalle.id })}
          onGuardado={(prod) => {
            setProductoDetalle(prod)
            setProductos((prev) => prev?.map((p) => (p.id === prod.id ? prod : p)) ?? prev)
            setVista({ modo: 'detalle', productId: prod.id })
            setConfirmacion(`"${prod.name}" se actualizó.`)
          }}
        />
      )}
    </main>
  )
}

// Alta: SOLO name (subtarea "no enviar id, code ni isActive en POST") — el
// servidor asigna code e isActive:true, createProductSchema ni siquiera
// acepta esos campos (.strict()). No hay más estado que el de este único
// input, así que no hace falta useSolicitud con múltiples campos ni
// validaciones de formato — solo "no vacío".
function FormularioCreacionProducto({ onCancelar, onGuardado }) {
  const [name, setName] = useState('')
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const nombreValido = name.trim().length > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!nombreValido) return
    try {
      const guardado = await ejecutar(() => productsService.crear({ name: name.trim() }))
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error`.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">Nuevo producto</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div>
        <FormInput
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Quinua real"
          maxLength={150}
          required
        />
        <p className="mt-1 text-xs text-marron-cafe/50">El código (PROD-N) lo asigna el sistema automáticamente.</p>
        {name.length > 0 && !nombreValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">El nombre no puede quedar vacío.</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !nombreValido}>
          {guardando ? 'Guardando…' : 'Crear producto'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// Edición: name (editable) + isActive (editable) — code en solo lectura,
// nunca sale del input disabled. updateProductSchema ni acepta `code` en el
// body, así que aunque el input estuviera habilitado por error, el backend
// lo rechazaría igual — pero acá directamente no se manda (subtarea "no
// enviar code en PATCH").
function FormularioEdicionProducto({ producto, onCancelar, onGuardado }) {
  const [name, setName] = useState(producto.name)
  const [isActive, setIsActive] = useState(producto.isActive)
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const nombreValido = name.trim().length > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!nombreValido) return
    try {
      const guardado = await ejecutar(() =>
        productsService.actualizar(producto.id, { name: name.trim(), isActive }),
      )
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error`.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">Editar {producto.code}</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <FormInput label="Código" value={producto.code} disabled hint="No se puede modificar — lo asigna el sistema." />

      <div>
        <FormInput
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Quinua real"
          maxLength={150}
          required
        />
        {name.length > 0 && !nombreValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">El nombre no puede quedar vacío.</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-marron-cafe">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 accent-verde-lima"
        />
        Producto activo
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !nombreValido}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
