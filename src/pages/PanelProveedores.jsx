import { useEffect, useState } from 'react'
import { Handshake, CheckCircle2, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { useCatalogoMaestro } from '../hooks/useCatalogoMaestro'
import { suppliersService } from '../services/suppliersService'
import { peopleService } from '../services/peopleService'
import { organizationsService } from '../services/organizationsService'
import { countriesService } from '../services/countriesService'
import { telefonoValido, emailValido, ciValido, normalizarCi } from '../config/validaciones'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormInput from '../components/FormInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import Button from '../components/Button.jsx'

// FE·M4 · Gestionar Proveedor (ver comrural_erp_backend/docs/suppliers.md +
// suppliers.dto.ts/suppliers.service.ts, leídos completos antes de armar
// esto). Mismo esqueleto ya probado en M2/M3 (listado paginado, detalle con
// fetch propio + guarda contra condición de carrera, refetch tras alta,
// useSolicitud) — lo nuevo acá es la identidad: un proveedor ES una persona
// o una organización, nunca ambas, y el alta tiene 4 caminos excluyentes.
const TIPO_LABEL = { PRODUCER: 'Productor', LABORATORY: 'Laboratorio', OTHER: 'Otro' }

const nombrePersona = (p) => `${p.firstNames} ${p.lastNames}`
const nombreOrganizacion = (o) => o.tradeName || o.legalName
// SupplierSummary siempre trae los dos campos (person/organization), solo
// uno no-nulo — nunca hay que decidir "cuál mostrar" a mano en más de un
// lugar, así que se centraliza acá.
const nombreProveedor = (s) => (s.person ? nombrePersona(s.person) : s.organization ? nombreOrganizacion(s.organization) : '—')

export default function PanelProveedores() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('suppliers:read')
  const puedeCrear = permisos.has('suppliers:create')
  const puedeEditar = permisos.has('suppliers:update')

  const [vista, setVista] = useState({ modo: 'lista', supplierId: null })
  const {
    items: proveedores,
    setItems: setProveedores,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle: proveedorDetalle,
    setDetalle: setProveedorDetalle,
    errorDetalle,
    abrirDetalle: abrirDetalleHook,
    confirmacion,
    setConfirmacion,
  } = useCatalogoMaestro(suppliersService, { puedeVer })

  const abrirDetalle = (supplierId) => {
    setVista({ modo: 'detalle', supplierId })
    abrirDetalleHook(supplierId)
  }

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al listado de proveedores." />
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Handshake className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Proveedores</h1>
          <p className="text-sm text-marron-cafe/60">Personas u organizaciones que proveen materia prima o servicios.</p>
        </div>
      </header>

      {confirmacion && (
        <p className="flex items-center gap-2 rounded-xl bg-verde-lima/15 px-3 py-2 text-sm font-medium text-verde-bosque">
          <CheckCircle2 className="size-4 shrink-0" strokeWidth={1.75} />
          {confirmacion}
        </p>
      )}

      {vista.modo === 'lista' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Listado{' '}
              {proveedores && <span className="text-sm font-medium text-marron-cafe/40">{proveedores.length}</span>}
            </h2>
            {puedeCrear && (
              <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', supplierId: null })}>
                + Agregar proveedor
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
          ) : proveedores === null ? (
            <p className="text-sm text-marron-cafe/50">Cargando…</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
                {proveedores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => abrirDetalle(s.id)}
                    className="flex w-full items-center gap-3 border-b border-marron-tierra/10 px-4 py-3.5 text-left last:border-b-0 transition-colors duration-150 hover:bg-marron-tierra/5"
                  >
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                        s.isActive ? 'bg-verde-lima/15 text-verde-bosque' : 'bg-marron-tierra/10 text-marron-cafe/40'
                      }`}
                    >
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <div>
                      <p className="font-semibold text-marron-cafe">{nombreProveedor(s)}</p>
                      <p className="text-xs text-marron-cafe/50">{TIPO_LABEL[s.type] ?? s.type}</p>
                    </div>
                  </button>
                ))}
                {proveedores.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                    No hay proveedores cargados todavía.
                  </p>
                )}
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
            onClick={() => setVista({ modo: 'lista', supplierId: null })}
            className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            Volver al listado
          </button>

          {errorDetalle ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {errorDetalle}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => abrirDetalle(vista.supplierId)}>
                Reintentar
              </Button>
            </div>
          ) : proveedorDetalle === null ? (
            <p className="text-sm text-marron-cafe/50">Cargando…</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    proveedorDetalle.isActive ? 'bg-verde-lima/15 text-verde-bosque' : 'bg-marron-tierra/10 text-marron-cafe/50'
                  }`}
                >
                  {proveedorDetalle.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <span className="rounded-full bg-marron-tierra/10 px-3 py-1 text-xs font-semibold text-marron-cafe/70">
                  {TIPO_LABEL[proveedorDetalle.type] ?? proveedorDetalle.type}
                </span>
              </div>

              {/* Identidad completa, ocultando la no aplicable: SupplierSummary
                  siempre trae person Y organization, uno de los dos null —
                  acá solo se renderiza el bloque del que no es null, nunca
                  los dos ni un placeholder vacío para el que falta. */}
              {proveedorDetalle.person && (
                <div>
                  <h2 className="text-xl font-bold text-marron-cafe">{nombrePersona(proveedorDetalle.person)}</h2>
                  <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    <CampoDetalle etiqueta="CI" valor={proveedorDetalle.person.identityDocument} />
                    <CampoDetalle etiqueta="Ubicación" valor={proveedorDetalle.person.location} />
                    <CampoDetalle etiqueta="Teléfono" valor={proveedorDetalle.person.phone} />
                  </dl>
                </div>
              )}
              {proveedorDetalle.organization && (
                <div>
                  <h2 className="text-xl font-bold text-marron-cafe">{nombreOrganizacion(proveedorDetalle.organization)}</h2>
                  <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                    <CampoDetalle etiqueta="Razón social" valor={proveedorDetalle.organization.legalName} />
                    <CampoDetalle etiqueta="Dirección" valor={proveedorDetalle.organization.address} />
                    <CampoDetalle etiqueta="Teléfono" valor={proveedorDetalle.organization.phone} />
                    <CampoDetalle etiqueta="Email" valor={proveedorDetalle.organization.email} />
                  </dl>
                </div>
              )}

              {puedeEditar && (
                <Button
                  className="self-start px-4 py-2 text-sm"
                  onClick={() => setVista({ modo: 'editar', supplierId: proveedorDetalle.id })}
                >
                  Editar
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioAltaProveedor
          onCancelar={() => setVista({ modo: 'lista', supplierId: null })}
          onGuardado={(prov) => {
            cargarPrimeraPagina()
            setVista({ modo: 'lista', supplierId: null })
            setConfirmacion(`"${nombreProveedor(prov)}" se agregó como proveedor.`)
          }}
        />
      )}

      {vista.modo === 'editar' && proveedorDetalle && (
        <FormularioEdicionProveedor
          proveedor={proveedorDetalle}
          onCancelar={() => setVista({ modo: 'detalle', supplierId: proveedorDetalle.id })}
          onGuardado={(prov) => {
            setProveedorDetalle(prov)
            setProveedores((prev) => prev?.map((p) => (p.id === prov.id ? prov : p)) ?? prev)
            setVista({ modo: 'detalle', supplierId: prov.id })
            setConfirmacion(`"${nombreProveedor(prov)}" se actualizó.`)
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

// Edición: SOLO type e isActive (ver updateSupplierSchema — personId/
// organizationId/person/organization ni siquiera se aceptan, .strict() los
// rechazaría). La identidad se muestra como contexto de solo lectura, con
// la aclaración de que si cambió hay que dar de alta un proveedor nuevo en
// vez de "corregir" este — es la subtarea "redirigir para cambiar
// identidad": no hay una ruta que abrir, es la explicación de por qué acá
// no se puede.
function FormularioEdicionProveedor({ proveedor, onCancelar, onGuardado }) {
  const [type, setType] = useState(proveedor.type)
  const [isActive, setIsActive] = useState(proveedor.isActive)
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const submit = async (e) => {
    e.preventDefault()
    try {
      const guardado = await ejecutar(() => suppliersService.actualizar(proveedor.id, { type, isActive }))
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error`.
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">
        Editar proveedor · {proveedor.person ? nombrePersona(proveedor.person) : nombreOrganizacion(proveedor.organization)}
      </h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <p className="rounded-xl bg-marron-tierra/10 px-3 py-2 text-xs text-marron-cafe/70">
        La identidad ({proveedor.person ? 'persona' : 'organización'}) no se puede cambiar acá — es inmutable una vez
        creado el proveedor. Si la identidad cambió, dá de alta un proveedor nuevo.
      </p>

      <FormSelect label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
        {Object.entries(TIPO_LABEL).map(([valor, label]) => (
          <option key={valor} value={valor}>
            {label}
          </option>
        ))}
      </FormSelect>

      <label className="flex items-center gap-2 text-sm font-medium text-marron-cafe">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 accent-verde-lima"
        />
        Proveedor activo
      </label>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// Alta: 4 caminos excluyentes (personId | organizationId | person:{...} |
// organization:{...}) — el backend los valida con superRefine, "exactamente
// uno". Acá se modelan como DOS toggles de una sola selección cada uno
// (identidad: persona/organización, modo: existente/nueva); la combinación
// arma por construcción una sola de las 4 alternativas, así que no hace
// falta validar "exactamente una" a mano — la UI no permite otra cosa.
function FormularioAltaProveedor({ onCancelar, onGuardado }) {
  const [type, setType] = useState('')
  const [typeTocado, setTypeTocado] = useState(false)
  const [identidadTipo, setIdentidadTipo] = useState('persona')
  const [modo, setModo] = useState('existente')
  const [personId, setPersonId] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [personaNueva, setPersonaNueva] = useState({
    firstNames: '',
    lastNames: '',
    identityDocument: '',
    location: '',
    phone: '',
  })
  const [organizacionNueva, setOrganizacionNueva] = useState({
    legalName: '',
    tradeName: '',
    countryId: '',
    address: '',
    phone: '',
    email: '',
  })
  const [paises, setPaises] = useState(null)
  const [paisesError, setPaisesError] = useState(false)
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  // Necesario para el modo "organización nueva" — se carga una sola vez acá
  // arriba (no dentro de CamposOrganizacionNueva) para no volver a pedirlo
  // cada vez que el usuario cambia de combinación y vuelve.
  useEffect(() => {
    let cancelado = false
    countriesService
      .listar()
      .then((data) => {
        if (!cancelado) setPaises(data)
      })
      .catch(() => {
        if (!cancelado) setPaisesError(true)
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Al cambiar de combinación, se limpia la selección de identidad existente
  // — evita mandar un personId de una combinación anterior si el usuario
  // pasó por "persona existente" y volvió a cambiar de idea.
  useEffect(() => {
    setPersonId('')
    setOrganizationId('')
  }, [identidadTipo, modo])

  const paisesOrdenados = paises ? [...paises].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : paises

  const identidadValida =
    modo === 'existente'
      ? identidadTipo === 'persona'
        ? personId !== ''
        : organizationId !== ''
      : identidadTipo === 'persona'
        ? personaNueva.firstNames.trim().length > 0 &&
          personaNueva.lastNames.trim().length > 0 &&
          ciValido(personaNueva.identityDocument) &&
          telefonoValido(personaNueva.phone)
        : organizacionNueva.legalName.trim().length > 0 &&
          organizacionNueva.countryId !== '' &&
          telefonoValido(organizacionNueva.phone) &&
          emailValido(organizacionNueva.email)
  const puedeGuardar = type !== '' && identidadValida

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    const dto = { type }
    if (modo === 'existente') {
      if (identidadTipo === 'persona') dto.personId = personId
      else dto.organizationId = organizationId
    } else if (identidadTipo === 'persona') {
      dto.person = {
        firstNames: personaNueva.firstNames.trim(),
        lastNames: personaNueva.lastNames.trim(),
        identityDocument: normalizarCi(personaNueva.identityDocument.trim()) || null,
        location: personaNueva.location.trim() || null,
        phone: personaNueva.phone.trim() || null,
      }
    } else {
      dto.organization = {
        legalName: organizacionNueva.legalName.trim(),
        tradeName: organizacionNueva.tradeName.trim() || null,
        countryId: organizacionNueva.countryId,
        address: organizacionNueva.address.trim() || null,
        phone: organizacionNueva.phone.trim() || null,
        email: organizacionNueva.email.trim() || null,
      }
    }
    try {
      const guardado = await ejecutar(() => suppliersService.crear(dto))
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` (incluye el 409
      // real de "ya está registrada como proveedor" y el 404 si el
      // personId/organizationId referenciado no existe).
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">Nuevo proveedor</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div>
        <FormSelect
          label="Tipo de proveedor"
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setTypeTocado(true)
          }}
          onBlur={() => setTypeTocado(true)}
          required
        >
          <option value="">Seleccioná un tipo…</option>
          {Object.entries(TIPO_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </FormSelect>
        {typeTocado && type === '' && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Elegí un tipo de proveedor.</p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <SelectorPastillas
          etiqueta="Identidad"
          opciones={[
            { valor: 'persona', label: 'Persona' },
            { valor: 'organizacion', label: 'Organización' },
          ]}
          valor={identidadTipo}
          onChange={setIdentidadTipo}
        />
        <SelectorPastillas
          etiqueta="Modo"
          opciones={[
            { valor: 'existente', label: 'Existente' },
            { valor: 'nueva', label: 'Nueva' },
          ]}
          valor={modo}
          onChange={setModo}
        />
      </div>

      {modo === 'existente' && identidadTipo === 'persona' && (
        <BuscadorPersona seleccionadoId={personId} onSeleccionar={setPersonId} />
      )}
      {modo === 'existente' && identidadTipo === 'organizacion' && (
        <BuscadorOrganizacion seleccionadoId={organizationId} onSeleccionar={setOrganizationId} />
      )}
      {modo === 'nueva' && identidadTipo === 'persona' && (
        <CamposPersonaNueva valores={personaNueva} onChange={setPersonaNueva} />
      )}
      {modo === 'nueva' && identidadTipo === 'organizacion' && (
        <CamposOrganizacionNueva
          valores={organizacionNueva}
          onChange={setOrganizacionNueva}
          paises={paisesOrdenados}
          paisesError={paisesError}
        />
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : 'Crear proveedor'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function SelectorPastillas({ etiqueta, opciones, valor, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-marron-cafe">{etiqueta}</span>
      <div className="flex gap-2">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => onChange(o.valor)}
            aria-pressed={valor === o.valor}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 ${
              valor === o.valor
                ? 'bg-verde-lima text-marron-cafe'
                : 'bg-marron-tierra/10 text-marron-cafe/60 hover:bg-marron-tierra/15'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// Buscador de persona existente — no hay endpoint de búsqueda por texto en
// el backend (solo paginación keyset), así que se cargan hasta 100 y se
// filtra en el cliente por nombre/CI. Si el catálogo real crece más allá de
// eso, esto necesita un endpoint de búsqueda propio — no es el alcance de
// M4 resolverlo acá.
function BuscadorPersona({ seleccionadoId, onSeleccionar }) {
  const [personas, setPersonas] = useState(null)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let cancelado = false
    peopleService
      .listar({ limit: 100 })
      .then((resp) => {
        if (!cancelado) setPersonas(resp.data)
      })
      .catch((err) => {
        if (!cancelado) setError(err.message)
      })
    return () => {
      cancelado = true
    }
  }, [])

  if (error) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar el listado de personas: {error}</p>
  }
  if (personas === null) {
    return <p className="text-sm text-marron-cafe/50">Cargando personas…</p>
  }

  const filtradas = personas.filter((p) =>
    `${p.firstNames} ${p.lastNames} ${p.identityDocument ?? ''}`.toLowerCase().includes(busqueda.trim().toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-2">
      <FormInput
        label="Buscar persona"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Nombre o CI…"
      />
      <div className="max-h-56 overflow-y-auto rounded-2xl bg-white">
        {filtradas.length === 0 && <p className="px-4 py-4 text-center text-sm text-marron-cafe/50">Sin resultados.</p>}
        {filtradas.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSeleccionar(p.id)}
            className={`flex w-full items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-2.5 text-left text-sm last:border-b-0 transition-colors duration-150 hover:bg-marron-tierra/5 ${
              seleccionadoId === p.id ? 'bg-verde-lima/15' : ''
            }`}
          >
            <span className="font-medium text-marron-cafe">
              {p.firstNames} {p.lastNames}
            </span>
            {p.identityDocument && <span className="font-mono text-xs text-marron-cafe/50">{p.identityDocument}</span>}
          </button>
        ))}
      </div>
      {personas.length === 100 && (
        <p className="text-xs text-marron-cafe/40">
          Mostrando las primeras 100 — si no encontrás a quien buscás, refiná la búsqueda.
        </p>
      )}
    </div>
  )
}

function BuscadorOrganizacion({ seleccionadoId, onSeleccionar }) {
  const [organizaciones, setOrganizaciones] = useState(null)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    let cancelado = false
    organizationsService
      .listar({ limit: 100 })
      .then((resp) => {
        if (!cancelado) setOrganizaciones(resp.data)
      })
      .catch((err) => {
        if (!cancelado) setError(err.message)
      })
    return () => {
      cancelado = true
    }
  }, [])

  if (error) {
    return (
      <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar el listado de organizaciones: {error}</p>
    )
  }
  if (organizaciones === null) {
    return <p className="text-sm text-marron-cafe/50">Cargando organizaciones…</p>
  }

  const filtradas = organizaciones.filter((o) =>
    `${o.legalName} ${o.tradeName ?? ''}`.toLowerCase().includes(busqueda.trim().toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-2">
      <FormInput
        label="Buscar organización"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Razón social o nombre comercial…"
      />
      <div className="max-h-56 overflow-y-auto rounded-2xl bg-white">
        {filtradas.length === 0 && <p className="px-4 py-4 text-center text-sm text-marron-cafe/50">Sin resultados.</p>}
        {filtradas.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onSeleccionar(o.id)}
            className={`flex w-full flex-col border-b border-marron-tierra/10 px-4 py-2.5 text-left text-sm last:border-b-0 transition-colors duration-150 hover:bg-marron-tierra/5 ${
              seleccionadoId === o.id ? 'bg-verde-lima/15' : ''
            }`}
          >
            <span className="font-medium text-marron-cafe">{o.legalName}</span>
            {o.tradeName && <span className="text-xs text-marron-cafe/50">{o.tradeName}</span>}
          </button>
        ))}
      </div>
      {organizaciones.length === 100 && (
        <p className="text-xs text-marron-cafe/40">
          Mostrando las primeras 100 — si no encontrás a quien buscás, refiná la búsqueda.
        </p>
      )}
    </div>
  )
}

// Campos embebidos "persona nueva" — mismo set y misma validación que
// PanelPersonas.jsx (createPersonSchema real), controlado desde afuera para
// vivir dentro del form de alta de proveedor sin un submit propio: acá no
// hay POST /people por separado, todo va en un único POST /suppliers con
// `person: {...}` (ver suppliers.service.ts, create()).
function CamposPersonaNueva({ valores, onChange }) {
  const actualizar = (campo, valor) => onChange({ ...valores, [campo]: valor })
  const firstNamesValido = valores.firstNames.trim().length > 0
  const lastNamesValido = valores.lastNames.trim().length > 0
  const ciOk = ciValido(valores.identityDocument)
  const phoneOk = telefonoValido(valores.phone)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <FormInput
          label="Nombres"
          value={valores.firstNames}
          onChange={(e) => actualizar('firstNames', e.target.value)}
          placeholder="Ana"
          maxLength={150}
          required
        />
        {valores.firstNames.length > 0 && !firstNamesValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Los nombres no pueden quedar vacíos.</p>
        )}
      </div>
      <div>
        <FormInput
          label="Apellidos"
          value={valores.lastNames}
          onChange={(e) => actualizar('lastNames', e.target.value)}
          placeholder="Gómez"
          maxLength={150}
          required
        />
        {valores.lastNames.length > 0 && !lastNamesValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Los apellidos no pueden quedar vacíos.</p>
        )}
      </div>
      <div>
        <FormInput
          label="CI"
          value={valores.identityDocument}
          onChange={(e) => actualizar('identityDocument', e.target.value)}
          placeholder="1234567 (opcional)"
          maxLength={12}
        />
        {!ciOk && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">
            El CI debe tener entre 6 y 8 dígitos, sin complemento.
          </p>
        )}
      </div>
      <FormInput
        label="Ubicación"
        value={valores.location}
        onChange={(e) => actualizar('location', e.target.value)}
        placeholder="La Paz (opcional)"
        maxLength={200}
      />
      <div>
        <FormInput
          label="Teléfono"
          value={valores.phone}
          onChange={(e) => actualizar('phone', e.target.value)}
          placeholder="+59171234567 (opcional)"
          maxLength={16}
        />
        {!phoneOk && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">
            Formato E.164 inválido — ej. +59171234567.
          </p>
        )}
      </div>
    </div>
  )
}

// Campos embebidos "organización nueva" — mismo set/validación que
// PanelOrganizaciones.jsx (createOrganizationSchema real). `paises` se pasa
// desde el form padre (cargado una sola vez ahí), no acá adentro.
function CamposOrganizacionNueva({ valores, onChange, paises, paisesError }) {
  const actualizar = (campo, valor) => onChange({ ...valores, [campo]: valor })
  const legalNameValido = valores.legalName.trim().length > 0
  const countryIdValido = valores.countryId !== ''
  const phoneOk = telefonoValido(valores.phone)
  const emailOk = emailValido(valores.email)
  // "Tocado" real vía onBlur/onChange, no un proxy sobre otro campo — ver
  // PanelOrganizaciones.jsx, donde este mismo selector usaba legalName como
  // proxy de "tocado" y se corrigió en su momento por impreciso (mostraba
  // el error de país antes de tiempo, o lo escondía si legalName seguía
  // vacío aunque el usuario ya hubiera tocado el select).
  const [countryTocado, setCountryTocado] = useState(false)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <FormInput
          label="Razón social"
          value={valores.legalName}
          onChange={(e) => actualizar('legalName', e.target.value)}
          placeholder="Agroindustrias del Sur S.A."
          maxLength={200}
          required
        />
        {valores.legalName.length > 0 && !legalNameValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">La razón social no puede quedar vacía.</p>
        )}
      </div>
      <FormInput
        label="Nombre comercial"
        value={valores.tradeName}
        onChange={(e) => actualizar('tradeName', e.target.value)}
        placeholder="Agrosur (opcional)"
        maxLength={200}
      />
      <div>
        <FormSelect
          label="País"
          value={valores.countryId}
          onChange={(e) => {
            actualizar('countryId', e.target.value)
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
        value={valores.address}
        onChange={(e) => actualizar('address', e.target.value)}
        placeholder="Opcional"
        maxLength={500}
      />
      <div>
        <FormInput
          label="Teléfono"
          value={valores.phone}
          onChange={(e) => actualizar('phone', e.target.value)}
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
          value={valores.email}
          onChange={(e) => actualizar('email', e.target.value)}
          placeholder="contacto@agrosur.bo (opcional)"
          maxLength={254}
        />
        {!emailOk && <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Formato de email inválido.</p>}
      </div>
    </div>
  )
}
