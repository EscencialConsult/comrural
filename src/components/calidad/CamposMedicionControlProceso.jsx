import { Droplets, Beaker, Ruler, Boxes } from 'lucide-react'
import FormInput from '../FormInput.jsx'
import { CAMPOS_IMPUREZAS, CAMPOS_TAMANO_GRANO, sumaTamanoGrano, tamanoGranoValido } from './controlProcesoAConstantes'

function TituloSeccion({ Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-verde-bosque" strokeWidth={1.75} />
      <h3 className="text-sm font-bold text-marron-cafe">{children}</h3>
    </div>
  )
}

// Los 4 bloques de medición de control-proceso-a — idénticos en creación y
// en edición (ModalCrearControlProceso.jsx / ModalDetalleControlProceso.jsx),
// extraídos acá para no duplicar ~250 líneas entre los dos. Todo controlado
// desde el padre: este componente no tiene estado propio.
export default function CamposMedicionControlProceso({
  saponinaEscarificadoMm,
  onCambiarSaponinaEscarificadoMm,
  washHumidityPct,
  onCambiarWashHumidityPct,
  saponinaSecadoMm,
  onCambiarSaponinaSecadoMm,
  impurezas,
  onCambiarImpurezas,
  pesoImpurezaG,
  onCambiarPesoImpurezaG,
  tamanoGrano,
  onCambiarTamanoGrano,
  contrastante,
  onCambiarContrastante,
  otrosControles,
  onCambiarOtrosControles,
  descripcionClasificacion,
  onCambiarDescripcionClasificacion,
  cantidadPallets,
  onCambiarCantidadPallets,
  cantidadSacos,
  onCambiarCantidadSacos,
  palletsNoConformes,
  onCambiarPalletsNoConformes,
  sacosNoConformes,
  onCambiarSacosNoConformes,
  soloLectura = false,
}) {
  const suma = sumaTamanoGrano(tamanoGrano)
  const sumaValida = tamanoGranoValido(tamanoGrano)

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
        <TituloSeccion Icon={Droplets}>Saponina y humedad</TituloSeccion>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormInput
            label="Saponina escarificado (mm)"
            type="number"
            step="0.01"
            min="0"
            value={saponinaEscarificadoMm}
            onChange={(e) => onCambiarSaponinaEscarificadoMm(e.target.value)}
            disabled={soloLectura}
          />
          <FormInput
            label="Humedad de lavado (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={washHumidityPct}
            onChange={(e) => onCambiarWashHumidityPct(e.target.value)}
            disabled={soloLectura}
          />
          <FormInput
            label="Saponina secado (mm)"
            type="number"
            step="0.01"
            min="0"
            value={saponinaSecadoMm}
            onChange={(e) => onCambiarSaponinaSecadoMm(e.target.value)}
            disabled={soloLectura}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
        <TituloSeccion Icon={Beaker}>Impurezas (conteo de piezas) y pureza</TituloSeccion>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CAMPOS_IMPUREZAS.map(({ key, label }) => (
            <FormInput
              key={key}
              label={label}
              type="number"
              min="0"
              value={impurezas[key] ?? ''}
              onChange={(e) => onCambiarImpurezas({ ...impurezas, [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
              disabled={soloLectura}
            />
          ))}
        </div>
        <FormInput
          label="Descripción de 'otros' (opcional)"
          value={impurezas.otros_descripcion ?? ''}
          onChange={(e) => onCambiarImpurezas({ ...impurezas, otros_descripcion: e.target.value })}
          disabled={soloLectura}
        />
        <FormInput
          label="Peso total de impurezas (g)"
          type="number"
          step="0.0001"
          min="0"
          value={pesoImpurezaG}
          onChange={(e) => onCambiarPesoImpurezaG(e.target.value)}
          disabled={soloLectura}
          hint={
            pesoImpurezaG !== ''
              ? `Pureza calculada: ${(100 - (100 * Number(pesoImpurezaG)) / 1000).toFixed(2)}%`
              : 'Sobre una referencia de 1000 g de muestra.'
          }
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
        <TituloSeccion Icon={Ruler}>Tamaño y clasificación de grano</TituloSeccion>
        <div className="grid gap-3 sm:grid-cols-4">
          {CAMPOS_TAMANO_GRANO.map(({ key, label }) => (
            <FormInput
              key={key}
              label={label}
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={tamanoGrano[key] ?? ''}
              onChange={(e) => onCambiarTamanoGrano({ ...tamanoGrano, [key]: e.target.value === '' ? null : Number(e.target.value) })}
              disabled={soloLectura}
            />
          ))}
        </div>
        <p className={`text-xs font-medium ${sumaValida ? 'text-verde-bosque' : 'text-rojo-pasankalla'}`}>
          Suma: {suma.toFixed(2)}% (debe estar entre 99.5% y 100.5%)
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormInput
            label="Contrastante"
            type="number"
            min="0"
            value={contrastante}
            onChange={(e) => onCambiarContrastante(e.target.value)}
            disabled={soloLectura}
          />
          <FormInput
            label="Otros controles"
            value={otrosControles}
            onChange={(e) => onCambiarOtrosControles(e.target.value)}
            disabled={soloLectura}
            className="sm:col-span-2"
          />
          <FormInput
            label="Descripción (opcional)"
            value={descripcionClasificacion ?? ''}
            onChange={(e) => onCambiarDescripcionClasificacion(e.target.value)}
            disabled={soloLectura}
            className="sm:col-span-3"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
        <TituloSeccion Icon={Boxes}>Conformidad de volumen</TituloSeccion>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FormInput
            label="Cantidad de pallets"
            type="number"
            min="0"
            value={cantidadPallets}
            onChange={(e) => onCambiarCantidadPallets(e.target.value)}
            disabled={soloLectura}
          />
          <FormInput
            label="Cantidad de sacos"
            type="number"
            min="0"
            value={cantidadSacos}
            onChange={(e) => onCambiarCantidadSacos(e.target.value)}
            disabled={soloLectura}
          />
          <FormInput
            label="Pallets no conformes"
            type="number"
            min="0"
            value={palletsNoConformes}
            onChange={(e) => onCambiarPalletsNoConformes(e.target.value)}
            disabled={soloLectura}
          />
          <FormInput
            label="Sacos no conformes"
            type="number"
            min="0"
            value={sacosNoConformes}
            onChange={(e) => onCambiarSacosNoConformes(e.target.value)}
            disabled={soloLectura}
          />
        </div>
      </div>
    </>
  )
}
