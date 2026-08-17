import { Search } from 'lucide-react'

// Input con ícono de lupa — para campos tipo "escribí para buscar" (placa,
// conductor, etc.). Hoy es un input de texto simple: no hay ninguna base
// de vehículos/conductores contra la cual autocompletar todavía, pero el
// look es el que corresponde para cuando exista.
export default function SearchInput({ label, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-marron-cafe/40"
          strokeWidth={1.75}
        />
        <input
          {...props}
          className={`w-full rounded-xl border border-marron-tierra/20 bg-white py-2 pl-9 pr-3 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima ${className}`}
        />
      </div>
    </label>
  )
}
