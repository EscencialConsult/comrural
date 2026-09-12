import { useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { countriesService } from '../services/countriesService'
import { ISO_3166_1_ALPHA_2_SET } from '../config/isoCountryCodes'
import { toast } from '../lib/toast'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormInput from '../components/FormInput.jsx'
import Button from '../components/Button.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import Skeleton from '../components/Skeleton.jsx'

// FE·M1 · Gestionar País — catálogo cerrado y chico (ver docs/countries.md
// del backend): sin paginación, sin DELETE, codigoIso inmutable una vez
// creado. Mismo criterio de permisos real que el resto del panel
// (permisos.has('countries:read'), no un rol hardcodeado).
export default function PanelPaises() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('countries:read')
  const puedeCrear = permisos.has('countries:create')
  const puedeEditar = permisos.has('countries:update')

  const [paises, setPaises] = useState(null)
  const [vista, setVista] = useState({ modo: 'lista', countryId: null })
  // Sin esto, un 500/red caída al cargar dejaba "Cargando…" pegado para
  // siempre y sin ningún indicio de que algo falló — encontrado al revisar
  // que ni el efecto de montaje ni cargar() tenían .catch().
  const [errorCarga, setErrorCarga] = useState(null)

  const cargar = () => {
    setErrorCarga(null)
    countriesService
      .listar()
      .then(setPaises)
      .catch((err) => setErrorCarga(err.message))
  }

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    countriesService
      .listar()
      .then((data) => {
        if (!cancelado) setPaises(data)
      })
      .catch((err) => {
        if (!cancelado) setErrorCarga(err.message)
      })
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al catálogo de países." />
  }

  const paisEnEdicion = paises?.find((p) => p.id === vista.countryId)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Globe className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Países</h1>
          <p className="text-sm text-marron-cafe/60">Catálogo base para organizaciones.</p>
        </div>
      </header>

      {vista.modo === 'lista' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Listado{' '}
              {paises && <span className="text-sm font-medium text-marron-cafe/40">{paises.length}</span>}
            </h2>
            {puedeCrear && (
              <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', countryId: null })}>
                + Agregar país
              </Button>
            )}
          </div>

          {errorCarga ? (
            <ErrorBanner
              mensaje={`No se pudo cargar el catálogo: ${errorCarga}`}
              onReintentar={cargar}
            />
          ) : paises === null ? (
            <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
              {paises.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-marron-tierra/10 px-2.5 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                      {p.codigoIso}
                    </span>
                    <p className="font-semibold text-marron-cafe">{p.nombre}</p>
                  </div>
                  {puedeEditar && (
                    <Button
                      variant="secondary"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setVista({ modo: 'editar', countryId: p.id })}
                    >
                      Editar
                    </Button>
                  )}
                </div>
              ))}
              {paises.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">No hay países cargados todavía.</p>
              )}
            </div>
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioPais
          onCancelar={() => setVista({ modo: 'lista', countryId: null })}
          onGuardado={(nombre) => {
            cargar()
            setVista({ modo: 'lista', countryId: null })
            toast.success(`"${nombre}" se agregó al catálogo.`)
          }}
        />
      )}

      {vista.modo === 'editar' && paisEnEdicion && (
        <FormularioPais
          pais={paisEnEdicion}
          onCancelar={() => setVista({ modo: 'lista', countryId: null })}
          onGuardado={(nombre) => {
            cargar()
            setVista({ modo: 'lista', countryId: null })
            toast.success(`"${nombre}" se actualizó.`)
          }}
        />
      )}
    </main>
  )
}

// Un solo formulario para alta y edición: en edición, codigoIso viene
// precargado y deshabilitado (es inmutable del lado del backend — ver
// docs/countries.md, "codigoIso es inmutable una vez creado").
function FormularioPais({ pais, onCancelar, onGuardado }) {
  const editando = Boolean(pais)
  const [codigoIso, setCodigoIso] = useState(pais?.codigoIso ?? '')
  const [nombre, setNombre] = useState(pais?.nombre ?? '')
  // Hook transversal de FE·M0 (ver hooks/useSolicitud.js) — antes esta
  // pantalla reimplementaba guardando/error a mano en vez de usarlo, así
  // que el hook nunca se había ejecutado de verdad.
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const codigoValido = editando || ISO_3166_1_ALPHA_2_SET.has(codigoIso.toUpperCase())
  const codigoTocado = codigoIso.length > 0
  // El form usa noValidate (no confía en la validación nativa del
  // navegador — mismo criterio que el resto de los formularios del
  // panel, ver PanelAlmacen.jsx), así que el "required" de nombre no
  // hace nada por sí solo: hay que chequearlo acá a mano.
  const nombreValido = nombre.trim().length > 0
  const puedeGuardar = nombreValido && (editando || codigoValido)

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    try {
      await ejecutar(() =>
        editando
          ? countriesService.actualizar(pais.id, { nombre })
          : countriesService.crear({ codigoIso: codigoIso.toUpperCase(), nombre }),
      )
      onGuardado(nombre)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` — acá no hay
      // nada más que hacer, solo evitar que la rejection quede sin catch.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">{editando ? `Editar ${pais.codigoIso}` : 'Nuevo país'}</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormInput
            label="Código ISO"
            value={codigoIso}
            onChange={(e) => setCodigoIso(e.target.value.toUpperCase().slice(0, 2))}
            disabled={editando}
            maxLength={2}
            placeholder="BO"
            hint={editando ? 'No se puede modificar una vez creado.' : 'Dos letras, ISO 3166-1 alpha-2.'}
            required
          />
          {!editando && codigoTocado && !codigoValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">
              "{codigoIso}" no es un código ISO 3166-1 alpha-2 real.
            </p>
          )}
        </div>
        <div>
          <FormInput
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Bolivia"
            maxLength={100}
            required
          />
          {nombre.length > 0 && !nombreValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">El nombre no puede quedar vacío.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear país'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
