import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { lotsService } from '../services/lotsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import FormInput from '../components/FormInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import Button from '../components/Button.jsx'
import Skeleton from '../components/Skeleton.jsx'

const nombreProveedor = (p) =>
  p.person ? `${p.person.firstNames} ${p.person.lastNames}` : p.organization?.tradeName || p.organization?.legalName || '—'

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

// Compras — SOLO el Programa de Descargüío de Materia Prima (decisión
// explícita: la tabla de rechazos y los avisos de esa parte del flujo
// pertenecen a Calidad, no a este módulo). "Emitir programa" llama al
// POST /lots real (nature: PM) — código de lote, estado inicial
// PROGRAMADO y el listado de abajo son datos reales del backend.
// Responsables/aprobaciones/notificación a Almacén-Calidad son mock
// todavía: el backend no tiene ninguna columna ni sistema para guardarlos
// (ver comrural_erp_backend/docs/lots.md §9) — se capturan en el
// formulario pero no se persisten, marcado explícitamente en la UI.
export default function PanelCompras() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('compras:read')
  // Emitir un programa ES crear un lote real — necesita el permiso de
  // lots, no (solo) el de compras. Un rol con compras:read pero sin
  // lots:create puede ver esta pantalla pero no emitir todavía.
  const puedeEmitir = permisos.has('lots:create')

  const [productos, setProductos] = useState(null)
  const [proveedores, setProveedores] = useState(null)
  const [lotes, setLotes] = useState(null)

  const [formAbierto, setFormAbierto] = useState(false)
  const [productId, setProductId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [fechaHora, setFechaHora] = useState('')
  const [responsableDescargue, setResponsableDescargue] = useState('')
  const [responsableCalidad, setResponsableCalidad] = useState('')
  const [responsableSupervision, setResponsableSupervision] = useState('')
  const [elaboradoPor, setElaboradoPor] = useState('')
  const [revisadoPor, setRevisadoPor] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const [ultimoEmitido, setUltimoEmitido] = useState(null)

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    // productsService/suppliersService.listar() ahora devuelven el sobre
    // paginado real { data, nextCursor, hasMore } (mismo criterio que
    // countries/people/organizations) — antes devolvían el array directo,
    // por eso acá hace falta .data explícito. Sin este fix, productos/
    // proveedores quedaban seteados al objeto entero y cualquier .map()/
    // .find() sobre ellos tiraba abajo la pantalla.
    //
    // Los tres .catch() son nuevos: antes, si cualquiera de estas cargas
    // fallaba, los selects del formulario quedaban vacíos para siempre sin
    // ningún aviso — ni error ni "cargando", solo un desplegable en blanco.
    productsService
      .listar()
      .then((resp) => !cancelado && setProductos(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    suppliersService
      .listar()
      .then((resp) => !cancelado && setProveedores(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    lotsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setLotes(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const lotesMateriaPrima = useMemo(
    () => (lotes ?? []).filter((l) => l.nature === 'PM').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [lotes],
  )

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  const limpiarFormulario = () => {
    setProductId('')
    setSupplierId('')
    setFechaHora('')
    setResponsableDescargue('')
    setResponsableCalidad('')
    setResponsableSupervision('')
    setElaboradoPor('')
    setRevisadoPor('')
  }

  const emitirPrograma = async (e) => {
    e.preventDefault()
    setError(null)
    if (!productId || !supplierId || !fechaHora) {
      setError('Completá producto, proveedor y fecha/hora de llegada.')
      return
    }

    setEnviando(true)
    try {
      const creado = await lotsService.crear({
        nature: 'PM',
        productId,
        supplierId,
        scheduledReceptionAt: new Date(fechaHora).toISOString(),
      })
      setUltimoEmitido(creado)
      setLotes((prev) => [creado, ...(prev ?? [])])
      limpiarFormulario()
      setFormAbierto(false)
    } catch (err) {
      setError(err.body?.message ?? err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Compras." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-verde-hoja/10 p-3">
            <ShoppingCart className="size-6 text-verde-bosque" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-marron-cafe">Compras</h1>
            <p className="text-sm text-marron-cafe/60">Programa de descargüío de materia prima.</p>
          </div>
        </div>
        {/* Desactivado a propósito (temporal): el Programa de Descargüío
            todavía tiene campos mock sin persistir (responsables,
            elaborado/revisado por — ver comentario de cabecera de este
            archivo) y el equipo está definiendo el flujo real de
            Compras/Almacén antes de habilitar el alta desde acá. Deshabilitado
            incondicionalmente, no solo por permiso — quitar este bloque
            cuando esa parte quede completa. */}
        <span title="Todavía no está habilitado — esta parte está incompleta.">
          <Button type="button" disabled>
            + Nuevo programa
          </Button>
        </span>
      </header>

      {errorCarga && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
          No se pudo cargar todo lo necesario para emitir un programa: {errorCarga}
        </p>
      )}

      <StatCard valor={lotesMateriaPrima.length} etiqueta="Lotes de materia prima emitidos" />

      {ultimoEmitido && (
        <div className="flex items-start gap-3 rounded-2xl bg-verde-hoja/10 p-4">
          <CheckCircle2 className="size-5 shrink-0 text-verde-bosque" strokeWidth={1.75} />
          <div className="text-sm text-verde-bosque">
            <p className="font-semibold">Programa emitido: {ultimoEmitido.code}</p>
            <p className="text-verde-bosque/80">
              Estado inicial <span className="font-mono">PROGRAMADO</span>. Se avisó a Almacén/Recepción y
              Calidad. <span className="italic">(simulado — no hay sistema de notificaciones real todavía)</span>
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
          {error}
        </p>
      )}

      {formAbierto && (
        <form onSubmit={emitirPrograma} noValidate className="flex flex-col gap-6 rounded-3xl bg-marron-tierra/5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              label="Materia prima"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              hint={productos?.length === 0 ? 'No hay productos cargados todavía — se crean vía la API de productos.' : undefined}
            >
              <option value="">Seleccioná un producto…</option>
              {productos?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </FormSelect>

            <FormSelect
              label="Proveedor"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              hint={proveedores?.length === 0 ? 'No hay proveedores cargados todavía — se crean vía la API de proveedores.' : undefined}
            >
              <option value="">Seleccioná un proveedor…</option>
              {proveedores?.map((p) => (
                <option key={p.id} value={p.id}>
                  {nombreProveedor(p)}
                </option>
              ))}
            </FormSelect>

            <FormInput label="Código interno de lote" disabled value="Se asigna automáticamente al emitir (LOT-N)" />

            <FormInput
              label="Fecha y hora de llegada programada"
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold text-marron-cafe">Responsables asignados</h2>
              <p className="text-xs text-marron-cafe/50 italic">
                Todavía no se guardan — el backend no tiene dónde persistirlos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormInput placeholder="Control de descargüío" value={responsableDescargue} onChange={(e) => setResponsableDescargue(e.target.value)} />
              <FormInput placeholder="Control de calidad" value={responsableCalidad} onChange={(e) => setResponsableCalidad(e.target.value)} />
              <FormInput placeholder="Supervisión" value={responsableSupervision} onChange={(e) => setResponsableSupervision(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold text-marron-cafe">Aprobaciones</h2>
              <p className="text-xs text-marron-cafe/50 italic">Tampoco se guardan todavía, mismo motivo.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormInput placeholder="Elaborado por (Compras)" value={elaboradoPor} onChange={(e) => setElaboradoPor(e.target.value)} />
              <FormInput placeholder="Revisado por (Analista de Calidad)" value={revisadoPor} onChange={(e) => setRevisadoPor(e.target.value)} />
            </div>
          </div>

          <Button type="submit" disabled={enviando || !puedeEmitir} className="self-start">
            {enviando ? 'Emitiendo…' : 'Emitir programa'}
          </Button>
        </form>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-marron-cafe">Programas emitidos</h2>
        {lotesMateriaPrima === null ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-marron-cafe/40">
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Llegada programada</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {lotesMateriaPrima.map((l) => (
                  <tr key={l.id} className="border-t border-marron-tierra/10">
                    <td className="px-4 py-3 font-mono text-xs text-marron-cafe">{l.code}</td>
                    <td className="px-4 py-3 text-marron-cafe">{productoNombre(l.productId)}</td>
                    <td className="px-4 py-3 text-marron-cafe/70">
                      {l.scheduledReceptionAt ? formatearFechaHora(l.scheduledReceptionAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-verde-hoja/15 px-2.5 py-0.5 text-xs font-medium text-verde-bosque">
                        {l.currentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {lotesMateriaPrima.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-marron-cafe/50">
                      Todavía no se emitió ningún programa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
