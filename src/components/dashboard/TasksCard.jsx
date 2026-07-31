import { Link } from 'react-router-dom'

export default function TasksCard({ tareas }) {
  return (
    <div className="flex flex-col rounded-3xl bg-marron-tierra/5 p-5">
      <p className="font-extrabold text-marron-cafe">Próximas Tareas</p>
      <p className="mb-4 text-xs text-marron-cafe/50">Tareas pendientes</p>
      <ul className="flex flex-1 flex-col gap-3">
        {tareas.map((t) => (
          <li key={t.titulo} className="flex items-center justify-between rounded-xl bg-crema-quinua px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-marron-cafe">{t.titulo}</p>
              <p className="text-xs text-marron-cafe/50">{t.campo}</p>
            </div>
            <span className="rounded-full bg-celeste-aqua/20 px-2 py-0.5 text-[11px] font-medium text-marron-cafe">
              {t.estado}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to="/panel/produccion"
        className="mt-4 text-center text-sm font-medium text-verde-bosque hover:text-verde-hoja"
      >
        Ver todas las tareas →
      </Link>
    </div>
  )
}
