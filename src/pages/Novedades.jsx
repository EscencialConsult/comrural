import { useEffect, useState } from 'react'
import { servicioService } from '../services/servicioService'
import { useSitioBase } from '../hooks/useSitioBase'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'

// Bolivia es UTC-4: una fecha guardada a medianoche UTC ("...T00:00:00Z")
// retrocede un día al convertir con new Date() + toLocaleDateString, que
// interpreta en huso local. Se parsean los componentes Y/M/D del ISO
// directo, sin pasar por conversión de huso horario.
const formatearFecha = (iso) => {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Novedades() {
  const { usuario, plataforma } = useSitioBase()
  const [novedades, setNovedades] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    servicioService.getNovedades().then((data) => {
      if (!cancelado) {
        setNovedades(data)
        setLoading(false)
      }
    })
    return () => {
      cancelado = true
    }
  }, [])

  return (
    <div className="min-h-svh flex flex-col bg-crema-quinua">
      <SiteNav usuario={usuario} />

      <header className="relative overflow-hidden px-6 py-16 text-center">
        <div className="hero-dots absolute inset-0" aria-hidden="true" />
        <div className="relative max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-black text-marron-tierra leading-tight">
            Novedades
          </h1>
          <p className="mt-4 text-marron-cafe/70">Registro real de avance del sistema, versión por versión.</p>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-2xl w-full mx-auto flex flex-col gap-6">
        {loading ? (
          <p className="text-marron-cafe/60">Cargando…</p>
        ) : (
          novedades.map((entrada) => (
            <article key={entrada.id} className="rounded-3xl bg-marron-tierra/5 p-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="rounded-full bg-verde-hoja/15 text-verde-bosque px-2.5 py-0.5 text-xs font-medium">
                  v{entrada.version}
                </span>
                <span className="text-xs text-marron-cafe/50">{formatearFecha(entrada.fecha)}</span>
              </div>
              <h2 className="font-extrabold text-marron-cafe">{entrada.titulo}</h2>
              <p className="text-sm text-marron-cafe/70 mt-1">{entrada.descripcion}</p>
            </article>
          ))
        )}
      </main>

      <SiteFooter plataforma={plataforma} />
    </div>
  )
}
