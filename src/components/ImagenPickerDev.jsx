import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

// ⚠️ SOLO PARA DESARROLLO — panel para comparar las fotos candidatas del
// panel de auth sin editar código. Se elimina antes de producción, igual
// que DevRoleSwitcher (misma convención: borde punteado + etiqueta DEV).
// Recibe imagen/setImagen/disponibles por props en vez de llamar al hook
// acá adentro — si cada uno tuviera su propia instancia del hook, el
// picker y AuthLayout quedarían con estados independientes y clickear una
// miniatura no cambiaría nada (bug real, ya visto).
export default function ImagenPickerDev({ imagen, setImagen, disponibles }) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-white/40 bg-marron-cafe text-white/80 text-xs px-3 py-1.5 hover:text-white transition-colors duration-200"
      >
        DEV — foto
        {abierto ? <ChevronUp className="size-3.5" strokeWidth={1.75} /> : <ChevronDown className="size-3.5" strokeWidth={1.75} />}
      </button>

      {abierto && (
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-dashed border-white/30 bg-marron-cafe p-3 w-72">
          {disponibles.map((nombre) => (
            <button
              key={nombre}
              type="button"
              onClick={() => setImagen(nombre)}
              title={nombre}
              className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-colors duration-200 ${
                imagen === nombre ? 'border-verde-lima' : 'border-transparent hover:border-white/40'
              }`}
            >
              <img
                src={`/imagenes-generadas/${nombre}`}
                alt={nombre}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
