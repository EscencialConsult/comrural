import { ShieldOff } from 'lucide-react'

// Bloque de "no tenés acceso" — estaba duplicado igual en GestionUsuarios,
// PanelModulo y cada página de módulo nueva (Compras, Almacén). Un solo
// lugar para el mensaje y el estilo.
export default function AccesoDenegado({ titulo = 'No tenés acceso a esta sección', mensaje, children }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="rounded-full bg-rojo-pasankalla/10 p-4">
        <ShieldOff className="size-8 text-rojo-pasankalla" strokeWidth={1.5} />
      </div>
      <h1 className="text-2xl font-extrabold text-marron-cafe">{titulo}</h1>
      {mensaje && <p className="max-w-md text-marron-cafe/70">{mensaje}</p>}
      {children}
    </main>
  )
}
