// Tarjeta chica de KPI — reusable en cualquier módulo (Compras, Almacén, y
// los que vengan) en vez de repetir el mismo div con clases a mano.
//
// `Icon`/`tono` son opcionales (compatible con los usos existentes sin
// ícono, ej. PanelAlmacen.jsx) — cuando se pasan, agregan el círculo de
// color con ícono que pedía el modelo de Milenka para "Lotes de materia
// prima" (un color por tarjeta: verde/ámbar/celeste/verde).
const TONOS_CIRCULO = {
  neutro: 'bg-marron-tierra/10 text-marron-cafe/70',
  alerta: 'bg-marron-arcilla/15 text-marron-arcilla',
  positivo: 'bg-verde-hoja/15 text-verde-bosque',
  info: 'bg-azul-andino/15 text-azul-andino',
  negativo: 'bg-rojo-pasankalla/10 text-rojo-pasankalla',
}

export default function StatCard({ valor, etiqueta, Icon, tono = 'neutro' }) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-marron-tierra/10 bg-marron-tierra/5 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-marron-tierra/15 hover:bg-marron-tierra/8">
      {Icon && (
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-full ${TONOS_CIRCULO[tono]}`}>
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
      )}
      <div>
        <p className="text-2xl font-extrabold text-marron-cafe">{valor}</p>
        <p className="text-sm text-marron-cafe/60">{etiqueta}</p>
      </div>
    </div>
  )
}
