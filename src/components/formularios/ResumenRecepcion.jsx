import { CircleAlert } from 'lucide-react'

// Secciones "RESUMEN DE RECEPCIÓN" + "DETALLE DE RECHAZOS" del papel
// P-ADM-03/R-02. Las dos son de solo lectura acá: son números que el
// sistema ya calculó en otro paso, no algo que Almacén tipea en este
// formulario.
//
// - Total de bolsas es `storedPackageCount` (`receivedPackageCount -
//   rejectedPackageCount`, congelado al FINALIZAR), NO `receivedPackageCount`
//   — ese es el total ORIGINAL recibido (450 en el papel de ejemplo), antes
//   del rechazo de Calidad; acá va el final después del rechazo (375). Bug
//   real que hubo acá: los dos números se mostraban iguales porque este
//   componente recibía `receivedPackageCount` para las dos cosas. Peso
//   promedio neto es `averageAcceptedNetWeightKg` — igual que
//   `storedPackageCount`, el backend lo calcula y solo existe una vez
//   FINALIZADA.
// - El N° de sacos rechazados sale de la INSPECCIÓN de Calidad
//   (`rejectedBagCount`), no de acá — confirmado leyendo warehouse-receipt
//   completo: el backend no tiene ningún campo de detalle de rechazo
//   (sacos + motivo) en ningún lado, ni en warehouse-receipts ni en
//   quality-resolutions. El papel pide una "Descripción" línea por línea
//   que hoy no es capturable contra el sistema — se avisa en vez de
//   inventar un campo que no persiste a ningún lado.
export default function ResumenRecepcion({ totalBolsas, pesoPromedioNetoKg, sacosRechazados }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Dato etiqueta="Total N. de bolsas" valor={totalBolsas ?? '—'} />
        <Dato
          etiqueta="Peso promedio neto"
          valor={pesoPromedioNetoKg != null ? `${pesoPromedioNetoKg} kg` : '—'}
          hint={pesoPromedioNetoKg == null ? 'Se calcula al cerrar la recepción' : undefined}
        />
      </div>

      <div className="rounded-2xl bg-white/60 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-verde-bosque">Detalle de rechazos</p>
        <Dato etiqueta="N. de sacos" valor={sacosRechazados ?? '—'} hint={sacosRechazados == null ? 'Se completa cuando Calidad finaliza su inspección' : undefined} />
        <p className="mt-3 flex items-start gap-1.5 text-xs text-marron-cafe/70">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-marron-arcilla" strokeWidth={2.5} />
          El sistema todavía no guarda el detalle de rechazo por causa (el que ves en el papel) — solo el total de
          sacos. El motivo, si hace falta dejarlo por escrito, va en Observaciones al pie.
        </p>
      </div>
    </div>
  )
}

function Dato({ etiqueta, valor, hint }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className="text-sm font-medium text-marron-cafe">{valor}</dd>
      {hint && <p className="mt-0.5 text-xs text-marron-cafe/50">{hint}</p>}
    </div>
  )
}
