import { useState } from 'react'
import { IdCard, ChevronLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { useCatalogoMaestro } from '../hooks/useCatalogoMaestro'
import { peopleService } from '../services/peopleService'
import { telefonoValido, ciValido, normalizarCi } from '../config/validaciones'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormInput from '../components/FormInput.jsx'
import Button from '../components/Button.jsx'
import Skeleton from '../components/Skeleton.jsx'
import EmptyState from '../components/EmptyState.jsx'

// FE·M2 · Gestionar Persona (ver comrural_erp_backend/docs/people.md). El
// listado paginado + detalle con fetch propio + guarda contra condición de
// carrera vive en useCatalogoMaestro (hooks/useCatalogoMaestro.js) — mismo
// patrón que Organizaciones/Proveedores/Productos, extraído a un solo lugar
// después de que ese patrón se copiara a mano 4 veces y un fix se perdiera
// al copiarlo. Acá solo queda lo específico de Personas: los campos del
// formulario y su validación.
export default function PanelPersonas() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('people:read')
  const puedeCrear = permisos.has('people:create')
  const puedeEditar = permisos.has('people:update')

  const [vista, setVista] = useState({ modo: 'lista', personId: null })
  const {
    items: personas,
    setItems: setPersonas,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle: personaDetalle,
    setDetalle: setPersonaDetalle,
    errorDetalle,
    abrirDetalle: abrirDetalleHook,
    setConfirmacion,
  } = useCatalogoMaestro(peopleService, { puedeVer })

  const abrirDetalle = (personId) => {
    setVista({ modo: 'detalle', personId })
    abrirDetalleHook(personId)
  }

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al listado de personas." />
  }

  const nombreCompleto = (p) => `${p.firstNames} ${p.lastNames}`

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <IdCard className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Personas</h1>
          <p className="text-sm text-marron-cafe/60">Personas físicas: CI, ubicación, contacto.</p>
        </div>
      </header>

      {vista.modo === 'lista' && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-marron-cafe">
              Listado{' '}
              {personas && <span className="text-sm font-medium text-marron-cafe/40">{personas.length}</span>}
            </h2>
            {puedeCrear && (
              <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', personId: null })}>
                + Agregar persona
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
          ) : personas === null ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-2xl bg-marron-tierra/5 p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ))}
            </div>
          ) : personas.length === 0 ? (
            <EmptyState
              Icon={IdCard}
              titulo="Todavía no hay personas cargadas"
              descripcion={puedeCrear ? 'Agregá la primera para empezar.' : undefined}
              accion={
                puedeCrear && (
                  <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', personId: null })}>
                    + Agregar persona
                  </Button>
                )
              }
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => abrirDetalle(p.id)}
                    className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4 text-left transition-colors duration-150 hover:bg-marron-tierra/10"
                  >
                    {p.identityDocument && (
                      <span className="w-fit rounded-full bg-marron-tierra/10 px-2.5 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                        {p.identityDocument}
                      </span>
                    )}
                    <p className="truncate font-semibold text-marron-cafe">{nombreCompleto(p)}</p>
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
            onClick={() => setVista({ modo: 'lista', personId: null })}
            className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            Volver al listado
          </button>

          {errorDetalle ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {errorDetalle}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => abrirDetalle(vista.personId)}>
                Reintentar
              </Button>
            </div>
          ) : personaDetalle === null ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-7 w-52" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-marron-cafe">{nombreCompleto(personaDetalle)}</h2>

              <dl className="grid gap-4 sm:grid-cols-2">
                <CampoDetalle etiqueta="CI" valor={personaDetalle.identityDocument} />
                <CampoDetalle etiqueta="Ubicación" valor={personaDetalle.location} />
                <CampoDetalle etiqueta="Teléfono" valor={personaDetalle.phone} />
              </dl>

              {puedeEditar && (
                <Button
                  className="self-start px-4 py-2 text-sm"
                  onClick={() => setVista({ modo: 'editar', personId: personaDetalle.id })}
                >
                  Editar
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioPersona
          onCancelar={() => setVista({ modo: 'lista', personId: null })}
          onGuardado={(persona) => {
            // Igual que Organizaciones: refresca desde el servidor en vez de
            // insertar a mano — el id es un UUID aleatorio, no hay una
            // posición "correcta" para pegarlo en el array ya cargado.
            cargarPrimeraPagina()
            setVista({ modo: 'lista', personId: null })
            setConfirmacion(`"${nombreCompleto(persona)}" se agregó al listado.`)
          }}
        />
      )}

      {vista.modo === 'editar' && personaDetalle && (
        <FormularioPersona
          persona={personaDetalle}
          onCancelar={() => setVista({ modo: 'detalle', personId: personaDetalle.id })}
          onGuardado={(persona) => {
            setPersonaDetalle(persona)
            setPersonas((prev) => prev?.map((p) => (p.id === persona.id ? persona : p)) ?? prev)
            setVista({ modo: 'detalle', personId: persona.id })
            setConfirmacion(`"${nombreCompleto(persona)}" se actualizó.`)
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

// Un solo formulario para alta y edición. identityDocument/location/phone
// son nullable y el PATCH solo toca las claves presentes en el body (ver
// people.service.ts) — por eso SIEMPRE se manda el campo completo (string
// recortado o `null` si quedó vacío), nunca se omite una clave (subtarea
// "limpiar identityDocument/location/phone enviando null"). `id` y `userId`
// directamente no existen como estado en este formulario — no hay forma de
// mandarlos por accidente (subtarea "nunca enviar id ni userId"), y aunque
// se mandaran el backend los rechazaría igual: el DTO es `.strict()` y no
// tiene `userId` como campo válido.
function FormularioPersona({ persona, onCancelar, onGuardado }) {
  const editando = Boolean(persona)
  const [firstNames, setFirstNames] = useState(persona?.firstNames ?? '')
  const [lastNames, setLastNames] = useState(persona?.lastNames ?? '')
  const [identityDocument, setIdentityDocument] = useState(persona?.identityDocument ?? '')
  const [location, setLocation] = useState(persona?.location ?? '')
  const [phone, setPhone] = useState(persona?.phone ?? '')
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const firstNamesValido = firstNames.trim().length > 0
  const lastNamesValido = lastNames.trim().length > 0
  const ciOk = ciValido(identityDocument)
  const phoneOk = telefonoValido(phone)
  const puedeGuardar = firstNamesValido && lastNamesValido && ciOk && phoneOk

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    const dto = {
      firstNames: firstNames.trim(),
      lastNames: lastNames.trim(),
      identityDocument: normalizarCi(identityDocument.trim()) ? normalizarCi(identityDocument.trim()) : null,
      location: location.trim() ? location.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
    }
    try {
      const guardada = await ejecutar(() =>
        editando ? peopleService.actualizar(persona.id, dto) : peopleService.crear(dto),
      )
      onGuardado(guardada)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` (incluye el 409
      // real de CI duplicada, con el mensaje textual del backend).
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">
        {editando ? `Editar ${persona.firstNames} ${persona.lastNames}` : 'Nueva persona'}
      </h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormInput
            label="Nombres"
            value={firstNames}
            onChange={(e) => setFirstNames(e.target.value)}
            placeholder="Ana"
            maxLength={150}
            required
          />
          {firstNames.length > 0 && !firstNamesValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Los nombres no pueden quedar vacíos.</p>
          )}
        </div>

        <div>
          <FormInput
            label="Apellidos"
            value={lastNames}
            onChange={(e) => setLastNames(e.target.value)}
            placeholder="Gómez"
            maxLength={150}
            required
          />
          {lastNames.length > 0 && !lastNamesValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Los apellidos no pueden quedar vacíos.</p>
          )}
        </div>

        <div>
          <FormInput
            label="CI"
            value={identityDocument}
            onChange={(e) => setIdentityDocument(e.target.value)}
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
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="La Paz (opcional)"
          maxLength={200}
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
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear persona'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
