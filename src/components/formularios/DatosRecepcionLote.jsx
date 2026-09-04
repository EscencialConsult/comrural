import SelectorDeBase from './SelectorDeBase.jsx'
import CampoFechaHora from './CampoFechaHora.jsx'

// Sección 1 del papel P-ADM-03/R-02: DATOS DE RECEPCIÓN.
//
// Mismo control y el mismo criterio que la sección equivalente del
// formulario de Calidad (ver DatosGeneralesLote.jsx): producto y lote son
// atributos DEL LOTE, no algo que Almacén elige acá — por eso van siempre
// deshabilitados, sin importar `soloLectura`. Antes "Lote" permitía
// navegar a la recepción de otro lote; pedido explícito: el lote
// designado queda fijo, no editable desde acá.
//
// Fecha/hora de inicio SÍ son editables ahora (pedido explícito). El botón
// "Iniciar" de la lista de Almacén no crea nada — solo ABRE este
// formulario (recién "Finalizar recepción" al final del asistente hace el
// POST real). Por eso `FormularioIngresoMateriaPrima.jsx` captura el
// momento actual del lado del cliente apenas se abre (mismo instante que
// "Iniciar"), lo deja editable acá, y al "Finalizar recepción" lo manda por
// PATCH justo después del POST — así lo que se ve en pantalla es lo mismo
// que termina guardado, sin depender de que el POST y el click de "Iniciar"
// coincidan en el tiempo. Hora final sigue fija: la sella el backend al
// cerrar (`complete: true`) y no hay pedido de editarla.
export default function DatosRecepcionLote({ valores, soloLectura, onCambiarFecha, onCambiarHoraInicio }) {
  const inicioEditable = !soloLectura && Boolean(valores.fecha)
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
        <CampoFechaHora
          id="fecha-recepcion"
          tipo="date"
          label="Fecha de recepción"
          valor={valores.fecha}
          onChange={inicioEditable ? onCambiarFecha : () => {}}
          disabled={!inicioEditable}
          hint={valores.fecha ? undefined : 'Se guarda al presionar "Finalizar recepción" — se puede ajustar antes'}
        />
      </div>

      <SelectorDeBase
        label="Lote designado"
        valor={valores.lote}
        opciones={valores.lote ? [valores.lote] : []}
        onSeleccionar={() => {}}
        disabled
        placeholder="—"
        className="sm:col-span-2"
      />

      <div className="sm:col-span-2">
        <CampoFechaHora
          id="hora-inicio-recepcion"
          tipo="time"
          label="Hora inicio"
          valor={valores.horaInicio}
          onChange={inicioEditable ? onCambiarHoraInicio : () => {}}
          disabled={!inicioEditable}
          hint={valores.horaInicio ? undefined : 'Se guarda al presionar "Finalizar recepción" — se puede ajustar antes'}
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
