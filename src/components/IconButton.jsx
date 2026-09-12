// Botón de ícono chico para acciones de fila — extraído de
// PanelFormularios.jsx donde estaba definido localmente. Cubre dos tonos:
// "normal" (acción estándar) y "peligro" (destructiva, baja, eliminar).
// No existía en el resto del panel porque los botones de acción siempre
// eran de texto (ver Button.jsx); este cubre el caso visual de icono solo.
export default function IconButton({ children, tono = 'normal', className = '', ...props }) {
  const tonos = {
    normal: 'text-marron-cafe/60 hover:bg-marron-tierra/10 hover:text-marron-cafe',
    peligro: 'text-rojo-pasankalla/70 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla',
  }
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full p-1.5 transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 ${tonos[tono]} ${className}`}
    >
      {children}
    </button>
  )
}
