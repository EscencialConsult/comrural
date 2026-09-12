import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, Printer, CircleAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { rawMaterialReceptionsService } from '../../services/rawMaterialReceptionsService'
import { useGenerarPdf } from '../../hooks/useGenerarPdf'
import AccesoDenegado from '../dashboard/AccesoDenegado.jsx'
import Button from '../Button.jsx'
import Skeleton from '../Skeleton.jsx'
import CabeceraFormulario from './CabeceraFormulario.jsx'
import FirmasResponsables from './FirmasResponsables.jsx'

// Registro P-ADM-03/R-11 — "Nota de Recepción Materia Prima", tercer
// formulario de la maqueta. A diferencia de los dos anteriores, este NO es
// un formulario de carga: la propia reunión con Milenka lo definió como
// "solo-imprimible, generado con los datos que ya cargan los formularios
// 1 y 2" (Inspección + Ingreso de Materia Prima) — confirmado en
// docs/formulario-ingreso-materia-prima.md §6. No hay ningún campo
// editable acá, ni un botón de "Guardar"/"Iniciar": es una síntesis de
// solo lectura de datos que YA existen en `raw-material-receptions`, con
// su propio botón de Imprimir (PDF real, mismo mecanismo que los otros
// dos — ver FormularioInspeccionMateriaPrima.jsx).
//
// Vive en Calidad y Laboratorio, no en Almacén — corrección directa de
// Facundo tras la entrega del Formulario 2 (ver la doc citada arriba):
// aunque combina datos de los dos formularios, el destino elegido fue acá.
//
// `storedPackageCount` (no `receivedPackageCount`) para "Cantidad" — es el
// número YA descontado el rechazo de Calidad (`receivedPackageCount -
// rejectedPackageCount`, congelado al FINALIZAR); mismo campo real que
// "Total N. de bolsas" de ResumenRecepcion.jsx en el Formulario 2 — bug
// real que hubo ahí, corregido de paso.
const KG_POR_QUINTAL = 46

const formatearFechaLarga = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

export default function NotaRecepcionMateriaPrima({ lotId, onVolver, tituloVolver = 'Volver' }) {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('raw-material-receptions:read')

  const [recepcion, setRecepcion] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const recargar = useCallback(() => {
    if (!puedeVer) return
    setErrorCarga(null)
    rawMaterialReceptionsService.obtener(lotId).then(setRecepcion).catch((err) => setErrorCarga(err.message))
  }, [lotId, puedeVer])

  useEffect(() => {
    recargar()
  }, [recargar])

  // Mismo mecanismo de PDF real que los otros dos formularios — ver
  // useGenerarPdf.js para el porqué completo (no window.print(), captura
  // el bloque aislado a un canvas y arma un PDF paginado a A4 con jsPDF,
  // cortando hoja solo entre secciones, nunca en medio de una).
  const { areaImprimibleRef, generandoPdf, errorPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#faf4e8' })

  if (!puedeVer) return <AccesoDenegado mensaje="No tenés acceso a la nota de recepción." />

  if (errorCarga) {
    const idInvalido = /uuid/i.test(errorCarga)
    return (
      <div className="flex w-full flex-col items-start gap-3">
        <p className="text-sm font-medium text-rojo-pasankalla">
          {idInvalido ? 'La dirección no apunta a ningún lote real.' : `No se pudo cargar: ${errorCarga}`}
        </p>
        <div className="flex flex-wrap gap-2">
          {onVolver && (
            <Button className="px-3 py-1.5 text-xs" onClick={onVolver}>
              {tituloVolver}
            </Button>
          )}
          {!idInvalido && (
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={recargar}>
              Reintentar
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!recepcion) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  const { lot, warehouseReceipt } = recepcion
  const qq = warehouseReceipt?.acceptedNetWeightKg != null ? (warehouseReceipt.acceptedNetWeightKg / KG_POR_QUINTAL).toFixed(2) : null

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        {onVolver ? (
          <button
            type="button"
            onClick={onVolver}
            className="flex w-fit items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            {tituloVolver}
          </button>
        ) : (
          <span />
        )}
        {errorPdf && <span className="text-xs font-medium text-rojo-pasankalla">{errorPdf}</span>}
        <button
          type="button"
          onClick={generarPdf}
          disabled={generandoPdf}
          className="flex items-center gap-1.5 rounded-full bg-marron-tierra/10 px-3 py-1.5 text-xs font-semibold text-marron-cafe transition-colors duration-150 hover:bg-marron-tierra/20 disabled:opacity-50"
        >
          <Printer className="size-3.5" strokeWidth={2} />
          {generandoPdf ? 'Generando PDF…' : 'Imprimir'}
        </button>
      </div>

      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario antetitulo="Registro" titulo="Nota de Recepción Materia Prima" codigo="P-ADM-03/R-11" version="03" />

        <section className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/25 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">
            Datos generales proveedor de materia prima
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="Lote designado" valor={lot?.code} grande />
            <Dato etiqueta="Fecha de llegada" valor={formatearFechaLarga(warehouseReceipt?.startedAt)} />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/25 p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">Materia prima recepcionada</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Dato etiqueta="Producto" valor={lot?.productName} />
            <Dato etiqueta="Tipo de envase" valor={warehouseReceipt?.packagingType} />
            <Dato etiqueta="Cantidad (bolsas)" valor={warehouseReceipt?.storedPackageCount} />
            <Dato etiqueta="Peso neto total" valor={warehouseReceipt?.acceptedNetWeightKg != null ? `${qq} qq / ${warehouseReceipt.acceptedNetWeightKg} kg` : null} />
          </div>

          <div className="rounded-2xl bg-white/60 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-verde-bosque">
              Cantidad y descripción de rechazos
            </p>
            <Dato etiqueta="N. de bolsas rechazadas" valor={warehouseReceipt?.rejectedPackageCount} />
            <p className="mt-3 flex items-start gap-1.5 text-xs text-marron-cafe/70">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-marron-arcilla" strokeWidth={2.5} />
              El sistema todavía no guarda el detalle de rechazo por causa (el que ves en el papel) — solo el total de
              bolsas. El motivo, si hace falta dejarlo por escrito, queda en Observaciones de la Inspección.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">Conformidades</h2>
          {/* Mismos dos firmantes reales del papel: Almacén (quien recibió)
              y el Proveedor — acá representado por el conductor, único dato
              de "quien entregó" que el sistema tiene (mismo criterio que
              "Firma Conductor" en Datos del transporte del Formulario 2). */}
          <FirmasResponsables
            responsables={[
              { rol: 'Firma COMRURAL XXI SRL', usuario: null, puesto: 'Asistente de Almacenes', firmadoEn: warehouseReceipt?.startedAt },
              {
                rol: 'Firma Proveedor',
                usuario: warehouseReceipt?.transportInfo?.driver?.fullName ?? null,
                puesto: warehouseReceipt?.transportInfo?.vehicle?.plate
                  ? `Licencia ${warehouseReceipt?.transportInfo?.driver?.licenseNumber ?? '—'} · Placa ${warehouseReceipt.transportInfo.vehicle.plate}`
                  : 'Transportista',
                firmadoEn: null,
              },
            ]}
            claseGrilla="sm:grid-cols-2"
          />
        </section>
      </div>
    </div>
  )
}

function Dato({ etiqueta, valor, grande = false }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className={grande ? 'text-lg font-bold text-marron-cafe' : 'text-sm font-medium text-marron-cafe'}>{valor ?? '—'}</dd>
    </div>
  )
}
