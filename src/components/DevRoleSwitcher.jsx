import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { authService } from '../services/authService'

// ⚠️ SOLO PARA DESARROLLO — ver src/mock/README.md.
// Selector rápido de usuarios de prueba para no tener que loguearse a
// mano en cada test. Desde 2026-07-31 son 8 usuarios placeholder, uno
// por rol genérico ("Rol N°1".."Rol N°8", ver src/services/rolesService.js)
// — todavía sin distinción real, para poder empezar a diseñar el
// dashboard antes de que se definan los roles y permisos finales.
// Confirmado explícitamente por Facundo (2026-07-30): "se elimina antes
// de producción". Queda bien marcado visualmente (etiqueta DEV, borde
// punteado) para que nadie lo confunda con UI real.
export default function DevRoleSwitcher() {
  const [abierto, setAbierto] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (abierto && usuarios.length === 0) {
      authService.getUsuariosPrueba().then(setUsuarios)
    }
  }, [abierto, usuarios.length])

  const elegir = async (usuarioId) => {
    await authService.loginComoUsuarioPrueba(usuarioId)
    navigate('/panel')
  }

  return (
    <div className="fixed top-1/2 right-0 -translate-y-1/2 z-50 flex items-center">
      {abierto && (
        <div className="mr-2 rounded-2xl bg-marron-cafe text-white p-4 w-64 shadow-none border border-dashed border-white/30">
          <p className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
            Dev — roles de prueba
          </p>
          <ul className="flex flex-col gap-1">
            {usuarios.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => elegir(u.id)}
                  className="w-full text-left text-sm rounded-lg px-2 py-1.5 hover:bg-white/10 transition-colors duration-200"
                >
                  {u.nombre}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Selector de usuarios de prueba (solo desarrollo)"
        className="h-10 w-6 rounded-l-lg bg-marron-cafe text-white/70 flex items-center justify-center border border-dashed border-white/30 hover:text-white transition-colors duration-200"
      >
        {abierto ? <ChevronRight className="size-4" strokeWidth={1.75} /> : <ChevronLeft className="size-4" strokeWidth={1.75} />}
      </button>
    </div>
  )
}
