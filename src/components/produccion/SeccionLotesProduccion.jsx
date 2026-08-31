import { useEffect, useState } from 'react'
import { PackageCheck, PlayCircle } from 'lucide-react'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import Button from '../Button.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'

// Pestaña "Lotes" de Producción — servicio real (production-area-a, ver
// comrural_erp_backend/docs/production-area-a.md §3). El punto de entrada
// real de Producción es `ACEPTADO_RECEPCION` (recepción + decisión de
// Calidad ya resueltas en Almacén) — no `LIBERADO` como asumía la versión
// mock anterior de este archivo: `LIBERADO` es el final del pipeline de
// Laboratorio, que ocurre DESPUÉS de que Producción ya lavó el lote
// (LAVADO se intercala entre ACEPTADO_RECEPCION y EN_ANALISIS), no antes.
//
// "Iniciar producción" no abre nada acá adentro: dispara `onIniciarProduccion`
// (implementado en PanelProduccion.jsx) para cambiar a la pestaña "Volumen A"
// con el lote precargado — Lotes es solo el punto de entrada, el flujo en sí
// vive en el área.
export default function SeccionLotesProduccion({ onIniciarProduccion }) {
  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([lotsService.listar({ limit: 100 }), productsService.listar({ limit: 100 })])
      .then(([lotesResp, productosResp]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM' && l.currentStatus === 'ACEPTADO_RECEPCION'))
        setProductos(productosResp.data)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Lotes asignados</h2>
        <p className="text-xs text-marron-cafe/40">
          Materia prima ya recibida en Almacén y aceptada por Calidad (ACEPTADO_RECEPCION) — lista para arrancar el
          lavado de Área A.
        </p>
      </div>

      {lotes === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : lotes.length === 0 ? (
        <EmptyState Icon={PackageCheck} titulo="Todavía no hay lotes listos para lavar" />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                  </td>
                  <td className="px-4 py-3 text-marron-cafe">{productoNombre(l.productId)}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="secondary"
                      className="gap-1.5 px-3 py-1.5 text-xs"
                      onClick={() => onIniciarProduccion(l.id)}
                    >
                      <PlayCircle className="size-3.5" strokeWidth={2} />
                      Iniciar producción
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
