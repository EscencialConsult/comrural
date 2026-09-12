import { FlaskConical } from 'lucide-react'

// Aviso visible de "esto es mockup" — a diferencia de los formularios de
// Área B (Producción, ver ModalRegistrarSalidaAreaB.jsx y hermanos), acá SÍ se pide
// explícito que se note a simple vista: esta pantalla vive dentro de un
// módulo con backend real (Calidad/Laboratorio/Almacén), así que hay que
// dejar clarísimo qué parte NO lo es, para no hacer pasar un dato inventado
// por uno real dentro de una pantalla que en todo lo demás sí lo es.
export default function MockupBanner({ mensaje = 'Mockup — pantalla sin backend propio todavía, no persiste datos.' }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl border-2 border-dashed border-oro-quinua/50 bg-oro-quinua/15 px-4 py-3 text-xs font-semibold text-marron-cafe">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-oro-quinua" strokeWidth={2} />
      {mensaje}
    </p>
  )
}
