import SelectorDeBase from './SelectorDeBase.jsx'
import CampoFechaHora from './CampoFechaHora.jsx'

// Sección 1 del papel P-ADM-03/R-02: DATOS DE RECEPCIÓN.
//
// Mismo control y el mismo criterio que la sección equivalente del
// formulario de Calidad (ver DatosGeneralesLote.jsx): producto y proveedor
// son atributos DEL LOTE, no algo que Almacén elige acá — por eso van
// siempre deshabilitados, sin importar `soloLectura`. El único que de
// verdad navega es "Lote": elegir otro lote lleva a SU recepción, porque
// cada lote tiene la suya.
//
// Fecha y horas son del acto de recepción (`startedAt` / `completedAt` de
// warehouse_receipts) — el backend las sella, acá solo se muestran.
export default function DatosRecepcionLote({ valores, onCambiarLote, opcionesLotes = [], cargandoLotes = false }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-6">
      <SelectorDeBase
        label="Producto"
        valor={valores.producto}
        opciones={valores.producto ? [valores.producto] : []}
        onSeleccionar={() => {}}
        disabled
        placeholder="—"
        className="sm:col-span-3"
      />

      <div className="sm:col-span-3">
        <CampoFechaHora id="fecha-recepcion" tipo="date" label="Fecha de recepción" valor={valores.fecha} onChange={() => {}} disabled />
      </div>

      <SelectorDeBase
        label="Lote designado"
        valor={valores.lote}
        opciones={opcionesLotes}
        onSeleccionar={onCambiarLote}
        cargando={cargandoLotes}
        placeholder="Buscá el lote…"
        className="sm:col-span-2"
      />

      <div className="sm:col-span-2">
        <CampoFechaHora
          id="hora-inicio-recepcion"
          tipo="time"
          label="Hora inicio"
          valor={valores.horaInicio}
          onChange={() => {}}
          disabled
        />
      </div>
      <div className="sm:col-span-2">
        <CampoFechaHora
          id="hora-final-recepcion"
          tipo="time"
          label="Hora final"
          valor={valores.horaFin}
          onChange={() => {}}
          disabled
          hint={valores.horaFin ? undefined : 'Se completa al cerrar la recepción'}
        />
      </div>
    </div>
  )
}
