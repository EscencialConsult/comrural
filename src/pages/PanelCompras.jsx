import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ShieldOff, ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { productsService } from '../services/productsService'
import { suppliersService } from '../services/suppliersService'
import { lotsService } from '../services/lotsService'

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
  const [ultimoEmitido, setUltimoEmitido] = useState(null)

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    productsService.listar().then((data) => !cancelado && setProductos(data))
    suppliersService.listar().then((data) => !cancelado && setProveedores(data))
    lotsService.listar().then((data) => !cancelado && setLotes(data))
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
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="rounded-full bg-rojo-pasankalla/10 p-4">
          <ShieldOff className="size-8 text-rojo-pasankalla" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-extrabold text-marron-cafe">No tenés acceso a este módulo</h1>
        <p className="max-w-md text-marron-cafe/70">Tu rol actual no incluye Compras.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
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
        <span
          title={puedeEmitir ? undefined : 'Tu rol no tiene permiso para crear lotes (lots:create) — hablá con un administrador'}
        >
          <button
            type="button"
            onClick={() => setFormAbierto((v) => !v)}
            disabled={!puedeEmitir}
            className="rounded-full bg-verde-lima px-5 py-2.5 text-sm font-medium text-marron-cafe transition-colors duration-200 hover:bg-verde-hoja disabled:cursor-not-allowed disabled:opacity-40"
          >
            {formAbierto ? 'Cancelar' : '+ Nuevo programa'}
          </button>
        </span>
      </header>

      <div className="rounded-3xl bg-marron-tierra/5 p-5">
        <p className="text-2xl font-extrabold text-marron-cafe">{lotesMateriaPrima.length}</p>
        <p className="text-sm text-marron-cafe/60">Lotes de materia prima emitidos</p>
      </div>

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
            <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
              Materia prima
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              >
                <option value="">Seleccioná un producto…</option>
                {productos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              {productos?.length === 0 && (
                <span className="text-xs text-marron-cafe/50">
                  No hay productos cargados todavía — se crean vía la API de productos.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
              Proveedor
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              >
                <option value="">Seleccioná un proveedor…</option>
                {proveedores?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {nombreProveedor(p)}
                  </option>
                ))}
              </select>
              {proveedores?.length === 0 && (
                <span className="text-xs text-marron-cafe/50">
                  No hay proveedores cargados todavía — se crean vía la API de proveedores.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
              Código interno de lote
              <input
                disabled
                value="Se asigna automáticamente al emitir (LOT-N)"
                className="rounded-xl border border-marron-tierra/20 bg-marron-tierra/5 px-3 py-2 text-sm text-marron-cafe/50"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
              Fecha y hora de llegada programada
              <input
                type="datetime-local"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold text-marron-cafe">Responsables asignados</h2>
              <p className="text-xs text-marron-cafe/50 italic">
                Todavía no se guardan — el backend no tiene dónde persistirlos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                placeholder="Control de descargüío"
                value={responsableDescargue}
                onChange={(e) => setResponsableDescargue(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              />
              <input
                placeholder="Control de calidad"
                value={responsableCalidad}
                onChange={(e) => setResponsableCalidad(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              />
              <input
                placeholder="Supervisión"
                value={responsableSupervision}
                onChange={(e) => setResponsableSupervision(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-bold text-marron-cafe">Aprobaciones</h2>
              <p className="text-xs text-marron-cafe/50 italic">Tampoco se guardan todavía, mismo motivo.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Elaborado por (Compras)"
                value={elaboradoPor}
                onChange={(e) => setElaboradoPor(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              />
              <input
                placeholder="Revisado por (Analista de Calidad)"
                value={revisadoPor}
                onChange={(e) => setRevisadoPor(e.target.value)}
                className="rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando || !puedeEmitir}
            className="self-start rounded-full bg-verde-lima px-6 py-2.5 text-sm font-medium text-marron-cafe transition-colors duration-200 hover:bg-verde-hoja disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? 'Emitiendo…' : 'Emitir programa'}
          </button>
        </form>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-marron-cafe">Programas emitidos</h2>
        {lotesMateriaPrima === null ? (
          <p className="text-sm text-marron-cafe/50">Cargando…</p>
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
