import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { servicioService } from '../services/servicioService'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import { useSitioBase } from '../hooks/useSitioBase'
import ParticleWave from '../components/ParticleWave'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'
import ModuloCard from '../components/ModuloCard'
import DescargaCard from '../components/DescargaCard'
import Button from '../components/Button'
import MetalButton from '../components/MetalButton'

// Estructura clonada de antigravity.google (ver CLAUDE.md — Design Taste):
// hero a pantalla completa con partículas + 2 CTAs en pastilla, nav y
// footer reales (src/components/SiteNav.jsx y SiteFooter.jsx, compartidos
// con /modulos, /descargas y /novedades). Colores y tipografía son 100%
// COMRURAL, no los de la referencia.
export default function Servicio() {
  const { usuario, plataforma } = useSitioBase()
  const [modulos, setModulos] = useState([])
  const [descargas, setDescargas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modulosRef, modulosVisible] = useRevealOnScroll()
  const [descargasRef, descargasVisible] = useRevealOnScroll()

  useEffect(() => {
    let cancelado = false

    Promise.all([servicioService.getModulos(), servicioService.getDescargas()])
      .then(([modulosData, descargasData]) => {
        if (cancelado) return
        setModulos(modulosData)
        setDescargas(descargasData)
      })
      .catch((err) => {
        if (!cancelado) setError(err)
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [])

  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-crema-quinua">
        <p className="text-rojo-pasankalla">No se pudo cargar la información. Intentá de nuevo.</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh flex flex-col bg-crema-quinua">
      <SiteNav usuario={usuario} />

      {/* min-h-svh: el efecto de partículas está tuneado (cámara, grilla)
          para un contenedor a pantalla completa, como en la referencia —
          en una sección más baja la cámara queda desproporcionada. */}
      <section className="relative overflow-hidden min-h-svh flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="hero-dots absolute inset-0" aria-hidden="true" />
        <div className="absolute inset-0">
          <ParticleWave />
        </div>
        <div className="rise-in relative max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black text-marron-tierra leading-tight">
            Toda la operación de COMRURAL, en un solo lugar
          </h1>
          <p className="mt-5 text-lg text-marron-cafe/70">
            Almacén, Calidad, Producción, Compras y el resto de los módulos del sistema de gestión — accedé al estado de cada uno acá abajo.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <MetalButton to="/modulos" label="Ver módulos" width={200} height={52} />
            <Button to="/descargas" variant="secondary">
              Ver descargas
            </Button>
          </div>
        </div>
      </section>

      <main className="flex-1 px-6 py-10 max-w-5xl w-full mx-auto flex flex-col gap-16">
        <section>
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-xl font-extrabold text-marron-cafe">Módulos del sistema</h2>
            <Link to="/modulos" className="text-sm font-medium text-verde-bosque hover:text-verde-hoja">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <p className="text-marron-cafe/60">Cargando…</p>
          ) : (
            <div ref={modulosRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modulos.map((modulo, index) => (
                <ModuloCard key={modulo.id} modulo={modulo} index={index} visible={modulosVisible} />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-end justify-between mb-1">
            <h2 className="text-xl font-extrabold text-marron-cafe">Descargas y acceso</h2>
            <Link to="/descargas" className="text-sm font-medium text-verde-bosque hover:text-verde-hoja">
              Ver todas →
            </Link>
          </div>
          <p className="text-sm text-marron-cafe/70 mb-5">
            Formas de usar el sistema — hoy todas están en construcción.
          </p>
          {loading ? (
            <p className="text-marron-cafe/60">Cargando…</p>
          ) : (
            <div ref={descargasRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {descargas.map((descarga, index) => (
                <DescargaCard key={descarga.id} descarga={descarga} index={index} visible={descargasVisible} />
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter plataforma={plataforma} />
    </div>
  )
}
