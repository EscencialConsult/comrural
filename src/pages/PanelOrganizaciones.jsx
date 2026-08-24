import { useEffect, useState } from 'react'
import { Building2, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { useCatalogoMaestro } from '../hooks/useCatalogoMaestro'
import { organizationsService } from '../services/organizationsService'
import { countriesService } from '../services/countriesService'
import { telefonoValido, emailValido } from '../config/validaciones'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormInput from '../components/FormInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import Button from '../components/Button.jsx'
import Skeleton from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'

// FE·M3 · Gestionar Organización (ver comrural_erp_backend/docs/organizations.md).
// A diferencia de Países: catálogo grande con paginación keyset real (usa
// siguienteCursor de FE·M0) y vista de detalle propia. `countryId` sale de
// GET /countries (mismo catálogo de FE·M1, se carga una sola vez acá).
// Deliberadamente SIN campo NIT: la tabla `organizations` real todavía no
// tiene esa columna (ver organizations.schema.ts) — no hay nada que ocultar
// a medias, directamente no se construye esa UI en esta fase.
//
// La vista de detalle pide GET /organizations/:id por su cuenta (no busca
// en el array ya cargado del listado): el id ordena la paginación (UUID
// aleatorio, ver organizations.schema.ts — no es un orden "reciente
// primero"), así que un registro puede no estar en la página ya traída.
// Buscarlo solo en el array local podía dejar la pantalla en blanco sin
// avisar nada.
export default function PanelOrganizaciones() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('organizations:read')
  const puedeCrear = permisos.has('organizations:create')
  const puedeEditar = permisos.has('organizations:update')

  const [paises, setPaises] = useState(null)
  const [paisesError, setPaisesError] = useState(false)
  const [vista, setVista] = useState({ modo: 'lista', organizationId: null })
  const {
    items: organizaciones,
    setItems: setOrganizaciones,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle: orgDetalle,
    setDetalle: setOrgDetalle,
    errorDetalle,
    abrirDetalle: abrirDetalleHook,
    setConfirmacion,
  } = useCatalogoMaestro(organizationsService, { puedeVer })

  const abrirDetalle = (organizationId) => {
    setVista({ modo: 'detalle', organizationId })
    abrirDetalleHook(organizationId)
  }

  // El selector de país (para el form) es independiente del listado de
  // organizaciones — no vive en useCatalogoMaestro porque ningún otro
  // módulo lo necesita, solo Organizaciones.
  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    countriesService
      .listar()
      .then((data) => {
        if (!cancelado) setPaises(data)
      })
      .catch(() => {
        // Si falla solo el catálogo de países, el listado de organizaciones
        // igual puede mostrarse — el selector del form avisa el error ahí
        // puntualmente (ver FormularioOrganizacion / paisesError).
        if (!cancelado) setPaisesError(true)
      })
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al catálogo de organizaciones." />
  }

  const nombrePais = (countryId) => paises?.find((p) => p.id === countryId)?.nombre ?? '—'
  // Para el selector del form, alfabético por nombre (lo que lee una
  // persona) — el listado que devuelve el backend viene ordenado por
  // codigoIso, que no siempre coincide (ej. "Estados Unidos Mexicanos"
  // quedaba después de "Japón").
  const paisesOrdenados = paises ? [...paises].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : paises

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Building2 className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Organizaciones</h1>
          <p className="text-sm text-marron-cafe/60">Personas jurídicas: empresas, proveedores organizacionales.</p>
        </div>
      </header>

      {vista.modo === 'lista' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Listado{' '}
              {organizaciones && (
                <span className="text-sm font-medium text-marron-cafe/40">{organizaciones.length}</span>
              )}
            </h2>
            {puedeCrear && (
              <Button
                className="px-4 py-2 text-sm"
                onClick={() => setVista({ modo: 'crear', organizationId: null })}
              >
                + Agregar organización
              </Button>
            )}
          </div>

          {errorCarga ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl bg-rojo-pasankalla/10 px-4 py-3.5 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar el listado: {errorCarga}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={cargarPrimeraPagina}>
                Reintentar
              </Button>
            </div>
          ) : organizaciones === null ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-2xl bg-marron-tierra/5 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : organizaciones.length === 0 ? (
            <EmptyState
              Icon={Building2}
              titulo="Todavía no hay organizaciones cargadas"
              descripcion={puedeCrear ? 'Agregá la primera para empezar.' : undefined}
              accion={
                puedeCrear && (
                  <Button
                    className="px-4 py-2 text-sm"
                    onClick={() => setVista({ modo: 'crear', organizationId: null })}
                  >
                    + Agregar organización
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {organizaciones.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => abrirDetalle(o.id)}
                    className="flex flex-col gap-1 rounded-2xl bg-marron-tierra/5 p-4 text-left transition-colors duration-150 hover:bg-marron-tierra/10"
                  >
                    <p className="truncate font-semibold text-marron-cafe">{o.legalName}</p>
                    <p className="truncate text-xs text-marron-cafe/50">
                      {o.tradeName ? `${o.tradeName} · ` : ''}
                      {nombrePais(o.countryId)}
                    </p>
                  </button>
                ))}
              </div>

              {errorCargarMas && (
                <p className="text-center text-xs font-medium text-rojo-pasankalla">
                  No se pudo cargar más: {errorCargarMas}
                </p>
              )}

              {cursor && (
                <Button
                  variant="secondary"
                  className="self-center px-4 py-2 text-sm"
                  disabled={cargandoMas}
                  onClick={cargarMas}
                >
                  {cargandoMas ? 'Cargando…' : errorCargarMas ? 'Reintentar' : 'Cargar más'}
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'detalle' && (
        <section className="flex flex-col gap-5 rounded-3xl bg-marron-tierra/5 p-6">
          <button
            type="button"
            onClick={() => setVista({ modo: 'lista', organizationId: null })}
            className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            Volver al listado
          </button>

          {errorDetalle ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {errorDetalle}</p>
              <Button
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                onClick={() => abrirDetalle(vista.organizationId)}
              >
                Reintentar
              </Button>
            </div>
          ) : orgDetalle === null ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-7 w-52" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-marron-cafe">{orgDetalle.legalName}</h2>
                {orgDetalle.tradeName && <p className="text-sm text-marron-cafe/60">{orgDetalle.tradeName}</p>}
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <CampoDetalle etiqueta="País" valor={nombrePais(orgDetalle.countryId)} />
                <CampoDetalle etiqueta="Dirección" valor={orgDetalle.address} />
                <CampoDetalle etiqueta="Teléfono" valor={orgDetalle.phone} />
                <CampoDetalle etiqueta="Email" valor={orgDetalle.email} />
              </dl>

              {puedeEditar && (
                <Button
                  className="self-start px-4 py-2 text-sm"
                  onClick={() => setVista({ modo: 'editar', organizationId: orgDetalle.id })}
                >
                  Editar
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioOrganizacion
          paises={paisesOrdenados}
          paisesError={paisesError}
          onCancelar={() => setVista({ modo: 'lista', organizationId: null })}
          onGuardado={(org) => {
            // Refresca desde el servidor en vez de insertar el nuevo
            // registro a mano: el id es un UUID aleatorio (no correlativo
            // ni por fecha), así que no hay una posición "correcta" para
            // pegarlo en el array ya cargado sin mentir sobre el orden real
            // de paginación.
            cargarPrimeraPagina()
            setVista({ modo: 'lista', organizationId: null })
            setConfirmacion(`"${org.legalName}" se agregó al catálogo.`)
          }}
        />
      )}

      {vista.modo === 'editar' && orgDetalle && (
        <FormularioOrganizacion
          organizacion={orgDetalle}
          paises={paisesOrdenados}
          paisesError={paisesError}
          onCancelar={() => setVista({ modo: 'detalle', organizationId: orgDetalle.id })}
          onGuardado={(org) => {
            // El PATCH ya devuelve el registro actualizado completo — se usa
            // directo, sin pedirlo de nuevo por separado.
            setOrgDetalle(org)
            setOrganizaciones((prev) => prev?.map((o) => (o.id === org.id ? org : o)) ?? prev)
            setVista({ modo: 'detalle', organizationId: org.id })
            setConfirmacion(`"${org.legalName}" se actualizó.`)
          }}
        />
      )}
    </main>
  )
}

function CampoDetalle({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</dt>
      <dd className="text-sm text-marron-cafe">{valor || <span className="text-marron-cafe/40">Sin cargar</span>}</dd>
    </div>
  )
}

// Un solo formulario para alta y edición. tradeName/address/phone/email son
// nullable en el backend y el PATCH solo toca las claves presentes en el
// body (ver organizations.service.ts) — por eso acá SIEMPRE se manda el
// campo completo (string recortado o `null` si quedó vacío), nunca se omite
// una clave: es la única forma de "vaciar" un campo ya cargado (subtarea
// "limpiar tradeName/address/phone/email enviando null").
function FormularioOrganizacion({ organizacion, paises, paisesError, onCancelar, onGuardado }) {
  const editando = Boolean(organizacion)
  const [legalName, setLegalName] = useState(organizacion?.legalName ?? '')
  const [tradeName, setTradeName] = useState(organizacion?.tradeName ?? '')
  const [countryId, setCountryId] = useState(organizacion?.countryId ?? '')
  const [address, setAddress] = useState(organizacion?.address ?? '')
  const [phone, setPhone] = useState(organizacion?.phone ?? '')
  const [email, setEmail] = useState(organizacion?.email ?? '')
  const [countryTocado, setCountryTocado] = useState(editando)
  // Hook transversal de FE·M0 (ver hooks/useSolicitud.js) — antes esta
  // pantalla también reimplementaba guardando/error a mano.
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const legalNameValido = legalName.trim().length > 0
  const countryIdValido = countryId !== ''
  const phoneOk = telefonoValido(phone)
  const emailOk = emailValido(email)
  const puedeGuardar = legalNameValido && countryIdValido && phoneOk && emailOk

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    const dto = {
      legalName: legalName.trim(),
      tradeName: tradeName.trim() ? tradeName.trim() : null,
      countryId,
      address: address.trim() ? address.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
      email: email.trim() ? email.trim() : null,
    }
    try {
      const guardada = await ejecutar(() =>
        editando ? organizationsService.actualizar(organizacion.id, dto) : organizationsService.crear(dto),
      )
      onGuardado(guardada)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error`.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">
        {editando ? `Editar ${organizacion.legalName}` : 'Nueva organización'}
      </h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormInput
            label="Razón social"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Agroindustrias del Sur S.A."
            maxLength={200}
            required
          />
          {legalName.length > 0 && !legalNameValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">La razón social no puede quedar vacía.</p>
          )}
        </div>

        <FormInput
          label="Nombre comercial"
          value={tradeName}
          onChange={(e) => setTradeName(e.target.value)}
          placeholder="Agrosur (opcional)"
          maxLength={200}
        />

        <div>
          <FormSelect
            label="País"
            value={countryId}
            onChange={(e) => {
              setCountryId(e.target.value)
              setCountryTocado(true)
            }}
            onBlur={() => setCountryTocado(true)}
            hint={paisesError ? 'No se pudo cargar el catálogo de países.' : paises === null ? 'Cargando países…' : undefined}
            required
          >
            <option value="">Seleccioná un país…</option>
            {paises?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </FormSelect>
          {countryTocado && !countryIdValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Toda organización necesita un país.</p>
          )}
        </div>

        <FormInput
          label="Dirección"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Opcional"
          maxLength={500}
        />

        <div>
          <FormInput
            label="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+59171234567 (opcional)"
            maxLength={16}
          />
          {!phoneOk && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">
              Formato E.164 inválido — ej. +59171234567.
            </p>
          )}
        </div>

        <div>
          <FormInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@agrosur.bo (opcional)"
            maxLength={254}
          />
          {!emailOk && <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Formato de email inválido.</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear organización'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
