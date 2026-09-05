import CampoFechaHora from './CampoFechaHora.jsx'

function DatoPrecargado({ label, valor, className = '', esCodigo = false }) {
  const texto = typeof valor === 'object' ? (valor?.nombre || valor?.code || valor?.name || '—') : (valor || '—')
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-marron-cafe/70">
        {label}
      </span>
      <div className="flex h-11 items-center rounded-2xl bg-marron-tierra/10 border border-marron-tierra/20 px-3.5 text-sm text-marron-cafe select-none">
        <span className={`truncate ${esCodigo ? 'font-mono text-marron-cafe/90' : ''}`}>
          {texto}
        </span>
      </div>
    </div>
  )
}

// Sección 1 del papel: DATOS GENERALES.
export default function DatosGeneralesLote({ valores, opciones = {}, soloLectura, onCambiarFecha, onCambiarHoraInicio }) {
  const inicioEditable = !soloLectura && Boolean(valores.fecha)
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-6">
      <DatoPrecargado
        label="Lote designado"
        valor={valores.lote}
        esCodigo
        className="sm:col-span-2"
      />
      <DatoPrecargado
        label="Producto"
        valor={valores.producto}
        className="sm:col-span-2"
      />
      <DatoPrecargado
        label="Proveedor"
        valor={valores.proveedor}
        className="sm:col-span-2"
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

      <div className="sm:col-span-2">
        <CampoFechaHora
          id="hora-inicio-inspeccion"
          tipo="time"
          label="Hora de inicio"
          valor={valores.horaInicio}
          onChange={inicioEditable ? onCambiarHoraInicio : () => {}}
          disabled={!inicioEditable}
        />
      </div>

      <div className="sm:col-span-2">
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

