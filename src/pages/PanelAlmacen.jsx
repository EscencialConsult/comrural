import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  Warehouse,
  ArrowLeftRight,
  Boxes,
  Package,
  Archive,
  ClipboardCheck,
  FlaskConical,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { lotsService } from '../services/lotsService'
import { rawMaterialReceptionsService } from '../services/rawMaterialReceptionsService'
import { LOTES_EN_PROCESO, SOLICITUDES_PENDIENTES_EJEMPLO, PRODUCTOS_POR_VENCER_EJEMPLO, ENVASES_BLOQUEADOS_EJEMPLO } from '../data/almacenMock.js'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import Skeleton from '../components/Skeleton.jsx'
import Button from '../components/Button.jsx'

const TONOS = {
  neutro: 'bg-marron-tierra/10 text-marron-cafe/70',
  alerta: 'bg-marron-arcilla/15 text-marron-arcilla',
  positivo: 'bg-verde-hoja/15 text-verde-bosque',
  info: 'bg-azul-andino/15 text-azul-andino',
  negativo: 'bg-rojo-pasankalla/10 text-rojo-pasankalla',
}

// Ejemplos de P-14 (narrativa) — solo "MP en proceso" sale de datos reales
// (mismo mock que Almacén Intermedio, ver src/data/almacenMock.js, para
// que el número coincida en las dos pantallas). El resto son ejemplos
// porque Envases, Producto Terminado y Almacén General todavía no tienen
// backend que los cuente de verdad — de ahí el ícono de frasco (mismo que
// MockupBanner) en vez de repetir el banner completo cuatro veces.
const PANORAMA = [
  { valor: () => LOTES_EN_PROCESO.length, etiqueta: 'MP en proceso (buffer)', Icon: ArrowLeftRight, tono: 'info' },
  { valor: () => ENVASES_BLOQUEADOS_EJEMPLO, etiqueta: 'Envases bloqueados', Icon: Boxes, tono: 'negativo' },
  { valor: () => SOLICITUDES_PENDIENTES_EJEMPLO, etiqueta: 'Solicitudes pendientes', Icon: ClipboardList, tono: 'neutro' },
  { valor: () => PRODUCTOS_POR_VENCER_EJEMPLO, etiqueta: 'PT próximos a vencer', Icon: Package, tono: 'alerta' },
]

// Módulos de Almacén — mismas rutas que config/gruposMaestros.js, para
// saltar directo desde el Inicio sin pasar por el sidebar. No incluye
// Recepción/Entrega de MP: esas ya tienen su propio bloque arriba.
const MODULOS = [
  { nombre: 'Envases y Embalaje', descripcion: 'Ingreso y salida de envases e insumos', ruta: '/panel/almacen/envases', Icon: Boxes, tono: 'info' },
  { nombre: 'Producto Terminado', descripcion: 'Ingreso y salida de PT local', ruta: '/panel/almacen/producto-terminado', Icon: Package, tono: 'positivo' },
  { nombre: 'Almacén General', descripcion: 'Escritorio, limpieza, EPP, bajas', ruta: '/panel/almacen/general', Icon: Archive, tono: 'neutro' },
  { nombre: 'Inventario', descripcion: 'Existencias, conteos y ajustes', ruta: '/panel/almacen/gestion-inventario', Icon: ClipboardCheck, tono: 'alerta' },
]

// Almacén — Inicio del área: solo analytics, sin tabla ni acciones sobre
// lotes puntuales (eso vive en "Recepción", ver PanelAlmacenRecepcion.jsx
// y config/gruposMaestros.js — pedido explícito de Facundo). Rediseño:
// antes tenía un listado de "Pendientes de recepción" acá mismo,
// duplicando lo que ya se ve completo en "Recepción" — se sacó a pedido
// explícito. La grilla pareja de StatCards repetida tres veces se
// reemplazó por un layout asimétrico: un bloque destacado de Recepción
// (el único con datos reales) al lado de una lista compacta de Panorama,
// y los módulos como tarjetas con color propio por categoría.
export default function PanelAlmacen() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')

  const [lotes, setLotes] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  // lotId -> vista consolidada real (o 'error') — mismo criterio que
  // PanelAlmacenRecepcion.jsx: nunca se usa `lot.currentStatus` para
  // decidir si una recepción está iniciada, cerrada o sin arrancar, porque
  // ese campo agregado puede quedar desactualizado. La única fuente real
  // es `warehouseReceipt.status` de la vista consolidada.
  const [resumenes, setResumenes] = useState({})

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    lotsService
      .listar({ limit: 100 })
      .then((resp) => !cancelado && setLotes(resp.data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const lotesPM = useMemo(() => (lotes ?? []).filter((l) => l.nature === 'PM'), [lotes])

  // Igual que la pantalla de trabajo: sin endpoint de agregados, se pide
  // la vista consolidada de cada lote PM para poder contar de verdad.
  // Volumen hoy chico (decenas, no miles) — si crece, esto necesita un
  // endpoint de agregados del backend.
  useEffect(() => {
    if (lotesPM.length === 0) return
    let cancelado = false
    Promise.allSettled(lotesPM.map((l) => rawMaterialReceptionsService.obtener(l.id))).then((resultados) => {
      if (cancelado) return
      setResumenes((prev) => {
        const siguiente = { ...prev }
        resultados.forEach((r, i) => {
          siguiente[lotesPM[i].id] = r.status === 'fulfilled' ? r.value : 'error'
        })
        return siguiente
      })
    })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotes])

  const receiptDe = (l) => {
    const r = resumenes[l.id]
    return r && r !== 'error' ? r.warehouseReceipt : undefined // undefined = todavía no llegó la respuesta
  }

  // KPIs reales — "Liberados"/"Rechazados" van a mostrar 0 hasta que exista
  // el flujo de liberación (Proceso 2, todavía sin endpoints); no es un
  // dato falso, es el estado real de la base hoy.
  const kpis = useMemo(() => {
    const cargados = lotesPM.filter((l) => receiptDe(l) !== undefined)
    return {
      sinRecepcion: cargados.filter((l) => !receiptDe(l)).length,
      enProceso: cargados.filter((l) => receiptDe(l)?.status === 'INICIADA').length,
      liberados: lotesPM.filter((l) => l.currentStatus === 'LIBERADO').length,
      rechazados: lotesPM.filter((l) => l.currentStatus === 'RECHAZADO').length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotesPM, resumenes])

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Warehouse className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Almacén</h1>
          <p className="text-sm text-marron-cafe/60">Resumen del área y acceso a cada módulo.</p>
        </div>
      </header>

      {errorCarga && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">
          No se pudo cargar: {errorCarga}
        </p>
      )}

      <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Bloque destacado — el único con datos reales, por eso ocupa más
            espacio y lleva el número grande en vez de una grilla pareja de
            StatCards. */}
        <div className="flex flex-col gap-5 rounded-3xl bg-marron-tierra/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold text-marron-cafe">Recepción de Materia Prima</h2>
            <Button to="/panel/almacen/recepcion" variant="secondary" className="gap-1.5 px-3.5 py-1.5 text-xs">
              Ver recepción
              <ArrowRight className="size-3.5" strokeWidth={2} />
            </Button>
          </div>

          {!lotes ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/50">Sin recepción</span>
                <span className="text-4xl font-extrabold text-marron-cafe sm:text-5xl">{kpis.sinRecepcion}</span>
              </div>
              <div className="grid flex-1 grid-cols-3 gap-2 border-t border-marron-tierra/10 pt-4 sm:gap-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
                {[
                  { valor: kpis.enProceso, etiqueta: 'En proceso', tono: 'info' },
                  { valor: kpis.liberados, etiqueta: 'Liberados', tono: 'positivo' },
                  { valor: kpis.rechazados, etiqueta: 'Rechazados', tono: 'negativo' },
                ].map(({ valor, etiqueta, tono }) => (
                  <div key={etiqueta} className="flex min-w-0 flex-col gap-1">
                    <span className={`w-fit rounded-full px-2 py-0.5 text-base font-extrabold sm:text-lg ${TONOS[tono]}`}>{valor}</span>
                    <span className="text-xs text-marron-cafe/60">{etiqueta}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-marron-cafe/40">
            Cuenta todos los lotes de materia prima cargados hoy — no hay un endpoint de agregados en el backend todavía.
          </p>
        </div>

        {/* Panorama del área (P-14) — lista compacta en vez de otra grilla
            de StatCards, para que se note a simple vista que es un bloque
            distinto (ejemplo) del de arriba (real). */}
        <div className="flex flex-col gap-1 rounded-3xl bg-marron-tierra/5 p-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-extrabold text-marron-cafe">Panorama del área</h2>
            <span className="flex items-center gap-1 rounded-full border border-dashed border-oro-quinua/50 bg-oro-quinua/15 px-2 py-0.5 text-[10px] font-semibold text-marron-cafe">
              <FlaskConical className="size-3" strokeWidth={2} />
              Ejemplo
            </span>
          </div>
          {PANORAMA.map(({ valor, etiqueta, Icon, tono }) => (
            <div key={etiqueta} className="flex items-center gap-3 border-b border-marron-tierra/10 py-2.5 last:border-b-0">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${TONOS[tono]}`}>
                <Icon className="size-4" strokeWidth={1.75} />
              </div>
              <span className="flex-1 text-sm text-marron-cafe/80">{etiqueta}</span>
              <span className="text-lg font-extrabold text-marron-cafe">{valor()}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULOS.map(({ nombre, descripcion, ruta, Icon, tono }) => (
            <Link
              key={ruta}
              to={ruta}
              className="group flex flex-col gap-3 rounded-3xl border border-marron-tierra/10 bg-marron-tierra/5 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-marron-tierra/15 hover:bg-marron-tierra/8"
            >
              <div className="flex items-center justify-between">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-full ${TONOS[tono]}`}>
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <ArrowRight className="size-4 text-marron-cafe/30 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-verde-bosque" strokeWidth={2} />
              </div>
              <div>
                <p className="font-bold text-marron-cafe">{nombre}</p>
                <p className="text-xs text-marron-cafe/60">{descripcion}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
