import { useEffect, useState } from 'react'
import { produccionService } from '../../../services/produccionService'
import Badge from '../../Badge.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import Skeleton from '../../Skeleton.jsx'

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  EN_TRANSITO: 'En tránsito',
}

const ESTADO_TONO = {
  PENDIENTE: 'neutro',
  CONFIRMADA: 'alerta',
  EN_TRANSITO: 'info',
}

const formatearFecha = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-BO', { dateStyle: 'medium' })

// "Consulta externa" del relevamiento — Producción solo MIRA la planilla de
// pedidos que arma Logística/Compras, para planificar según qué materia
// prima está en camino. Sin formulario propio: no hay nada que registrar
// acá, por eso no tiene botón de guardar ni firmas — es de solo lectura.
// MOCK (ver produccionService.js): todavía no existe módulo de órdenes de
// compra en el sistema.
export default function PlanillaOrdenesCompra() {
  const [ordenes, setOrdenes] = useState(null)

  useEffect(() => {
    let cancelado = false
    produccionService.listarOrdenesCompra().then((data) => !cancelado && setOrdenes(data))
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <CabeceraFormulario antetitulo="Consulta" titulo="Planilla de Pedidos — Logística" />

      <p className="text-xs text-marron-cafe/50">
        Solo consulta: la arma Compras/Logística, acá se ve para planificar según lo que está en camino.
      </p>

      {ordenes === null ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-marron-tierra/10 text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Llegada estimada</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((o) => (
                <tr key={o.id} className="border-b border-marron-tierra/10 last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-marron-cafe/70">{o.codigo}</td>
                  <td className="px-4 py-3 text-marron-cafe">{o.proveedor}</td>
                  <td className="px-4 py-3 text-marron-cafe">{o.producto}</td>
                  <td className="px-4 py-3 text-marron-cafe">{o.cantidadQq.toLocaleString('es-BO')} qq</td>
                  <td className="px-4 py-3 text-marron-cafe">{formatearFecha(o.fechaEstimada)}</td>
                  <td className="px-4 py-3">
                    <Badge tono={ESTADO_TONO[o.estado] ?? 'neutro'}>{ESTADO_LABEL[o.estado] ?? o.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
