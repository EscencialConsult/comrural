import SelectorDeBase from './SelectorDeBase.jsx'
import CampoFechaHora from './CampoFechaHora.jsx'

// Sección 1 del papel: DATOS GENERALES.
//
// Producto, proveedor y lote se ELIGEN de los maestros que ya tiene el
// sistema — se escribe para filtrar, no para inventar (ver SelectorDeBase).
// Si lo buscado no está cargado, la salida es el aviso único de arriba a la
// derecha de la pantalla (ver AvisoFaltante.jsx), no un link por campo.
//
// Fecha y horas son del acto de inspeccionar (`startedAt` / `completedAt`).
// Los tres comparten el mismo control: se hace clic en cualquier parte del
// campo para abrir el selector nativo, y hay una pastilla "Hoy" / "Ahora"
// para completarlo con el momento actual sin abrir nada. La hora va en 24 h,
// como en el formulario en papel.
export default function DatosGeneralesLote({
  valores,
  onCambiar,
  opciones = {},
  cargandoOpciones = false,
  soloLectura = false,
}) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-6">
      <SelectorDeBase
        label="Producto"
        valor={valores.producto}
        opciones={opciones.productos ?? []}
        onSeleccionar={(op) => onCambiar('producto', op)}
        disabled={soloLectura}
        cargando={cargandoOpciones}
        placeholder="Buscá el producto…"
        className="sm:col-span-4"
      />

      <div className="sm:col-span-2">
        <CampoFechaHora
          id="fecha-inspeccion"
          tipo="date"
          label="Fecha"
          valor={valores.fecha}
          onChange={(v) => onCambiar('fecha', v)}
          disabled={soloLectura}
        />
      </div>

      <SelectorDeBase
        label="Proveedor"
        valor={valores.proveedor}
        opciones={opciones.proveedores ?? []}
        onSeleccionar={(op) => onCambiar('proveedor', op)}
        disabled={soloLectura}
        cargando={cargandoOpciones}
        placeholder="Buscá el proveedor…"
        className="sm:col-span-4"
      />

      <SelectorDeBase
        label="Lote"
        valor={valores.lote}
        opciones={opciones.lotes ?? []}
        onSeleccionar={(op) => onCambiar('lote', op)}
        disabled={soloLectura}
        cargando={cargandoOpciones}
        placeholder="Buscá el lote…"
        className="sm:col-span-2"
      />

      <div className="sm:col-span-3">
        <CampoFechaHora
          id="hora-inicio-inspeccion"
          tipo="time"
          label="Hora de inicio"
          valor={valores.horaInicio}
          onChange={(v) => onCambiar('horaInicio', v)}
          disabled={soloLectura}
        />
      </div>
      <div className="sm:col-span-3">
        <CampoFechaHora
          id="hora-fin-inspeccion"
          tipo="time"
          label="Hora de fin"
          valor={valores.horaFin}
          onChange={(v) => onCambiar('horaFin', v)}
          disabled={soloLectura}
          hint={valores.horaFin ? undefined : 'Se completa al cerrar la inspección'}
        />
      </div>
    </div>
  )
}
