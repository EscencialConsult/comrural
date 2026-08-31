import SelectorDeBase from './SelectorDeBase.jsx'
import CampoFechaHora from './CampoFechaHora.jsx'

// Sección 1 del papel: DATOS GENERALES.
//
// Producto, proveedor y lote son atributos DEL LOTE — decisión de Compras,
// no algo que el inspector elige acá (mismo criterio que ya usa
// DatosRecepcionLote.jsx en el Formulario 2, sección 2). Corrección
// post-revisión: hasta esta pasada, `SelectorDeBase` quedaba buscable/
// editable con `disabled={soloLectura}`, como si el inspector pudiera
// "cambiar" el producto de una inspección ya abierta — nunca tuvo sentido:
// el lote llega fijo desde `recepcion.lot`, y esos campos nunca se mandan al
// backend en `guardar()`. Los tres quedan `disabled` siempre — pedido
// explícito: "Lote" dejó de permitir navegar a otra inspección, el lote
// designado queda fijo también acá.
//
// Fecha y hora de inicio (`startedAt`) son editables ahora (pedido
// explícito): se completan solas al abrir el formulario — esta inspección
// SÍ se autocrea apenas se detecta que no existe (ver
// FormularioInspeccionMateriaPrima.jsx, `intentarIniciar`), así que acá no
// hay el mismo desfasaje que tenía Almacén entre "abrir" y "crear" — pero
// igual se puede corregir después mientras siga INICIADA
// (`inspections.dto.ts` ahora acepta `startedAt` en `PATCH
// /inspections/:id`). Hora de fin sigue fija: la sella el backend al
// finalizar y no hay pedido de editarla.
export default function DatosGeneralesLote({ valores, opciones = {}, soloLectura, onCambiarFecha, onCambiarHoraInicio }) {
  const inicioEditable = !soloLectura && Boolean(valores.fecha)
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-6">
      <SelectorDeBase
        label="Producto"
        valor={valores.producto}
        opciones={opciones.productos ?? []}
        onSeleccionar={() => {}}
        disabled
        placeholder="—"
        className="sm:col-span-4"
      />

      <div className="sm:col-span-2">
        <CampoFechaHora
          id="fecha-inspeccion"
          tipo="date"
          label="Fecha"
          valor={valores.fecha}
          onChange={inicioEditable ? onCambiarFecha : () => {}}
          disabled={!inicioEditable}
        />
      </div>

      <SelectorDeBase
        label="Proveedor"
        valor={valores.proveedor}
        opciones={opciones.proveedores ?? []}
        onSeleccionar={() => {}}
        disabled
        placeholder="—"
        className="sm:col-span-4"
      />

      <SelectorDeBase
        label="Lote"
        valor={valores.lote}
        opciones={valores.lote ? [valores.lote] : []}
        onSeleccionar={() => {}}
        disabled
        placeholder="—"
        className="sm:col-span-2"
      />

      <div className="sm:col-span-3">
        <CampoFechaHora
          id="hora-inicio-inspeccion"
          tipo="time"
          label="Hora de inicio"
          valor={valores.horaInicio}
          onChange={inicioEditable ? onCambiarHoraInicio : () => {}}
          disabled={!inicioEditable}
        />
      </div>
      <div className="sm:col-span-3">
        <CampoFechaHora
          id="hora-fin-inspeccion"
          tipo="time"
          label="Hora de fin"
          valor={valores.horaFin}
          onChange={() => {}}
          disabled
          hint={valores.horaFin ? undefined : 'Se completa al cerrar la inspección'}
        />
      </div>
    </div>
  )
}
