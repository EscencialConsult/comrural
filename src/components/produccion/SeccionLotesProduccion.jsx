import { useEffect, useState } from 'react'
import { PackageCheck, PlayCircle } from 'lucide-react'
import { produccionService } from '../../services/produccionService'
import Button from '../Button.jsx'
import EmptyState from '../EmptyState.jsx'
import Skeleton from '../Skeleton.jsx'

// Pestaña "Lotes" de Producción — MOCK a propósito (ver produccionService.js).
// El backend real de `lots` todavía no tiene ningún flujo que lleve un lote
// a LIBERADO (ver docs/lots.md §3: EN_ANALISIS/PENDIENTE_LIBERACION/RETENIDO/
// LIBERADO "siguen sin ningún flujo operable"), así que hoy no existe dato
// real que mostrar acá — se usa el mismo `listarLotesMp()` mock que ya
// consumen los formularios de Producción (NotaEntregaMateriaPrima.jsx y
// hermanos), para que el lote que aparece acá sea el MISMO que se puede
// elegir ahí. El día que exista la liberación real, esto vuelve a pedir
// `lotsService`/`productsService`/`suppliersService` filtrando por
// `currentStatus === 'LIBERADO'` (implementación anterior, descartada
// porque hoy siempre da vacío).
//
// "Iniciar producción" no abre nada acá adentro: dispara `onIniciarProduccion`
// (implementado en PanelProduccion.jsx) para cambiar a la pestaña "Área A" y
// dejar el lote precargado en su primer paso real (Nota de Entrega MP, ver
// SeccionAreaA.jsx) — Lotes es solo el punto de entrada, el flujo en sí vive
// en el área.
export default function SeccionLotesProduccion({ onIniciarProduccion }) {
  const [lotes, setLotes] = useState(null)

  useEffect(() => {
    let cancelado = false
    produccionService.listarLotesMp().then((data) => !cancelado && setLotes(data))
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Lotes asignados</h2>
        <p className="text-xs text-marron-cafe/40">
          Materia prima que ya cumplió todo el proceso previo (recepción en Almacén y aprobación de Laboratorio) y
          está lista para arrancar producción.
        </p>
      </div>

      {lotes === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : lotes.length === 0 ? (
        <EmptyState Icon={PackageCheck} titulo="Todavía no hay lotes asignados" />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                <th className="px-4 py-3">Lote</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Disponible</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-marron-cafe/70">{l.code}</span>
                  </td>
                  <td className="px-4 py-3 text-marron-cafe">{l.product}</td>
                  <td className="px-4 py-3 text-marron-cafe">{l.pesoDisponibleKg.toLocaleString('es-BO')} kg</td>
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
