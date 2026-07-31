import { useEffect, useState } from 'react'
import { servicioService } from '../services/servicioService'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import { useSitioBase } from '../hooks/useSitioBase'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'
import ModuloCard from '../components/ModuloCard'

export default function Modulos() {
  const { usuario, plataforma } = useSitioBase()
  const [modulos, setModulos] = useState([])
  const [loading, setLoading] = useState(true)
  const [gridRef, visible] = useRevealOnScroll()

  useEffect(() => {
    let cancelado = false
    servicioService.getModulos().then((data) => {
      if (!cancelado) {
        setModulos(data)
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
            Módulos del sistema
          </h1>
          <p className="mt-4 text-marron-cafe/70">
            Cada módulo se releva con el área responsable real antes de construirse — acá el estado
            de cada uno, tal como está hoy.
          </p>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-5xl w-full mx-auto">
        {loading ? (
          <p className="text-marron-cafe/60">Cargando…</p>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulos.map((modulo, index) => (
              <ModuloCard key={modulo.id} modulo={modulo} index={index} visible={visible} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter plataforma={plataforma} />
    </div>
  )
}
