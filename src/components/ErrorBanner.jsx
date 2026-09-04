import Button from './Button.jsx'

// Banner de error con botón de reintento opcional — patrón que se repetía
// inline en múltiples puntos de PanelFormularios.jsx (y probablemente en
// otros paneles). Cuando `onReintentar` no se pasa, no renderiza el botón.
export default function ErrorBanner({ mensaje, onReintentar, className = '' }) {
  return (
    <div className={`flex flex-col items-start gap-2 rounded-2xl bg-rojo-pasankalla/10 px-4 py-3.5 text-sm ${className}`}>
      <p className="font-medium text-rojo-pasankalla">{mensaje}</p>
      {onReintentar && (
        <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onReintentar}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
