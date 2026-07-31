import { useEffect, useState } from 'react'
import { servicioService } from '../services/servicioService'
import { useRevealOnScroll } from '../hooks/useRevealOnScroll'
import { useSitioBase } from '../hooks/useSitioBase'
import SiteNav from '../components/SiteNav'
import SiteFooter from '../components/SiteFooter'
import DescargaCard from '../components/DescargaCard'

// Contenido de relleno para poder maquetar la pantalla completa — NO son
// requisitos reales confirmados por nadie, son valores típicos de
// referencia. Reemplazar cuando se defina el stack real de las apps de
// escritorio/mobile (si es que llegan a existir, ver pregunta abierta en
// wiki/comrural-shell-frontend.md).
const REQUISITOS = [
  {
    id: 'pc',
    nombre: 'Desde PC',
    items: [
      'Windows 10 de 64 bits o superior',
      'macOS 12 (Monterey) o superior',
      '4 GB de RAM como mínimo',
      'Conexión a internet para sincronizar datos',
    ],
  },
  {
    id: 'celular',
    nombre: 'Desde el celular',
    items: ['Android 10 o superior', 'iOS 15 o superior', 'Conexión a internet para sincronizar datos'],
  },
  {
    id: 'acceso-directo',
    nombre: 'Acceso directo',
    items: ['Cualquier navegador moderno (Chrome, Edge, Firefox)', 'No requiere instalación'],
  },
]

export default function Descargas() {
  const { usuario, plataforma } = useSitioBase()
  const [descargas, setDescargas] = useState([])
  const [loading, setLoading] = useState(true)
  const [gridRef, visible] = useRevealOnScroll()

  useEffect(() => {
    let cancelado = false
    servicioService.getDescargas().then((data) => {
      if (!cancelado) {
        setDescargas(data)
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
            Descargas y acceso
          </h1>
          <p className="mt-4 text-marron-cafe/70">
            Formas de usar el sistema — hoy todas están en construcción, se van a habilitar a medida
            que cada una esté lista.
          </p>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 max-w-5xl w-full mx-auto">
        {loading ? (
          <p className="text-marron-cafe/60">Cargando…</p>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {descargas.map((descarga, index) => (
              <DescargaCard key={descarga.id} descarga={descarga} index={index} visible={visible} />
            ))}
          </div>
        )}

        <div className="mt-16">
          <h2 className="text-xl font-extrabold text-marron-cafe mb-1">Requisitos del sistema</h2>
          <p className="text-sm text-marron-cafe/70 mb-5">
            Borrador de referencia — se confirma cuando se defina el desarrollo real de cada acceso.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {REQUISITOS.map((req) => (
              <div key={req.id} className="rounded-3xl bg-marron-tierra/5 p-6">
                <h3 className="font-extrabold text-marron-cafe mb-3">{req.nombre}</h3>
                <ul className="flex flex-col gap-2">
                  {req.items.map((item) => (
                    <li key={item} className="text-sm text-marron-cafe/70 flex gap-2">
                      <span className="text-verde-bosque">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter plataforma={plataforma} />
    </div>
  )
}
