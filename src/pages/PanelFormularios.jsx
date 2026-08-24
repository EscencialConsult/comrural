import { useEffect, useState, useRef } from 'react'
import { ClipboardList, CheckCircle2, ChevronLeft, Plus, Trash2, Pencil, Save, TriangleAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSolicitud } from '../hooks/useSolicitud'
import { useCatalogoMaestro } from '../hooks/useCatalogoMaestro'
import { formsService } from '../services/formsService'
import { areasService } from '../services/areasService'
import { formItemsService } from '../services/formItemsService'
import { siguienteCursor } from '../services/paginacion'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import FormInput from '../components/FormInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import Button from '../components/Button.jsx'
import { DocumentSheet, DocumentFooter } from '../components/documento/DocumentSheet.jsx'
import { DocumentHeader } from '../components/documento/DocumentHeader.jsx'
import { EditableTitleInput, EditableSelect, EditableCheckbox, EditableTextarea } from '../components/documento/EditableFields.jsx'
import { DocumentTable, DocumentSectionTitle, DocumentRow } from '../components/documento/DocumentTable.jsx'
import Badge from '../components/Badge.jsx'
import {
  FORM_CODE_INSPECCION_MATERIA_PRIMA,
  CODIGOS_ITEM_CRITICOS_INSPECCION,
} from '../components/formularios/codigosCriticosInspeccion.js'

// Mismo patrón que forms.code en el backend (ver form.dto.ts,
// formCodeSchema): 3 a 50 caracteres, solo mayúsculas, números, '-' y '/'.
const CODE_REGEX = /^[A-Z0-9][A-Z0-9/-]{2,49}$/

// Ítems: section/code/groupCode van en snake_case (ver form-item.dto.ts,
// snakeCaseSchema) — distinto del code del formulario en sí, que va en
// mayúsculas.
const SNAKE_CASE_REGEX = /^[a-z][a-z0-9_]*$/

const DATA_TYPE_LABEL = {
  BOOLEAN: 'Sí / No',
  INTEGER: 'Número entero',
  DECIMAL: 'Número decimal',
  TEXT: 'Texto',
  SELECT: 'Opciones',
  DATE: 'Fecha',
}

// FE·Configuración · Gestionar Formulario (ver
// comrural_erp_backend/docs/forms.md + docs/form-items.md, leídos
// completos). Un formulario tiene dos capas editables por API muy
// distintas: el formulario en sí (name/areaId/isActive, PATCH normal) y
// sus ítems (form_items), donde SOLO el label es editable y un ítem
// jamás vuelve de "inactivo" a "activo" — no hay endpoint para eso. La UI
// de acá refleja esa asimetría en vez de simular una edición completa que
// el backend no ofrece.
export default function PanelFormularios() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('forms:read')
  const puedeCrear = permisos.has('forms:create')
  const puedeEditar = permisos.has('forms:update')
  const puedeGestionarItems = permisos.has('forms:manage_items')

  const [areas, setAreas] = useState(null)
  const [areasError, setAreasError] = useState(false)
  const [vista, setVista] = useState({ modo: 'lista', formId: null })
  const {
    items: formularios,
    setItems: setFormularios,
    cursor,
    cargandoMas,
    errorCargarMas,
    errorCarga,
    cargarPrimeraPagina,
    cargarMas,
    detalle: formularioDetalle,
    setDetalle: setFormularioDetalle,
    errorDetalle,
    abrirDetalle: abrirDetalleHook,
    confirmacion,
    setConfirmacion,
  } = useCatalogoMaestro(formsService, { puedeVer })

  const abrirDetalle = (formId) => {
    setVista({ modo: 'detalle', formId })
    abrirDetalleHook(formId)
  }

  // Áreas son para resolver nombres en listado/detalle y poblar el
  // selector del alta — independiente del listado de formularios en sí,
  // mismo criterio que productos/proveedores en Lotes.
  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    areasService
      .listar()
      .then((resp) => {
        if (!cancelado) setAreas(resp.data)
      })
      .catch(() => {
        if (!cancelado) setAreasError(true)
      })
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso al catálogo de formularios." />
  }

  const areaNombre = (id) => areas?.find((a) => a.id === id)?.name ?? '—'

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ClipboardList className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Formularios</h1>
          <p className="text-sm text-marron-cafe/60">Catálogo de formularios que otros módulos referencian.</p>
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
              {formularios && <span className="text-sm font-medium text-marron-cafe/40">{formularios.length}</span>}
            </h2>
            {puedeCrear && (
              <Button className="px-4 py-2 text-sm" onClick={() => setVista({ modo: 'crear', formId: null })}>
                + Agregar formulario
              </Button>
            )}
          </div>

          {errorCarga ? (
            <div className="flex flex-col items-start gap-2 rounded-2xl bg-rojo-pasankalla/10 px-4 py-3.5 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar el catálogo: {errorCarga}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={cargarPrimeraPagina}>
                Reintentar
              </Button>
            </div>
          ) : formularios === null ? (
            <p className="text-sm text-marron-cafe/50">Cargando…</p>
          ) : (
            <>
              <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
                {formularios.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => abrirDetalle(f.id)}
                    className="flex w-full items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-3.5 text-left last:border-b-0 transition-colors duration-150 hover:bg-marron-tierra/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-marron-tierra/10 px-2.5 py-1 font-mono text-xs font-semibold text-marron-cafe/70">
                        {f.code}
                      </span>
                      <p className="font-semibold text-marron-cafe">{f.name}</p>
                    </div>
                    {!f.isActive && (
                      <span className="rounded-full bg-marron-tierra/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-marron-cafe/50 uppercase">
                        Inactivo
                      </span>
                    )}
                  </button>
                ))}
                {formularios.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                    No hay formularios cargados todavía.
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
        <section className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setVista({ modo: 'lista', formId: null })}
            className="flex items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            Volver al listado
          </button>

          {errorDetalle ? (
            <div className="flex flex-col items-start gap-2 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {errorDetalle}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => abrirDetalle(vista.formId)}>
                Reintentar
              </Button>
            </div>
          ) : formularioDetalle === null ? (
            <p className="text-sm text-marron-cafe/50">Cargando…</p>
          ) : (
            <FormularioDocumento
              form={formularioDetalle}
              areas={areas}
              areasError={areasError}
              areaNombre={areaNombre(formularioDetalle.areaId)}
              puedeEditar={puedeEditar}
              puedeGestionarItems={puedeGestionarItems}
              onActualizado={(form) => {
                setFormularioDetalle(form)
                setFormularios((prev) => prev?.map((f) => (f.id === form.id ? form : f)) ?? prev)
                setConfirmacion(`Formulario "${form.code}" actualizado.`)
              }}
            />
          )}
        </section>
      )}

      {vista.modo === 'crear' && (
        <FormularioAltaForm
          areas={areas}
          areasError={areasError}
          onCancelar={() => setVista({ modo: 'lista', formId: null })}
          onGuardado={(form) => {
            cargarPrimeraPagina()
            setVista({ modo: 'lista', formId: null })
            setConfirmacion(`Formulario "${form.code}" creado.`)
          }}
        />
      )}
    </main>
  )
}

function FormularioAltaForm({ areas, areasError, onCancelar, onGuardado }) {
  const [code, setCode] = useState('')
  const [codeTocado, setCodeTocado] = useState(false)
  const [name, setName] = useState('')
  const [areaId, setAreaId] = useState('')
  const [areaIdTocado, setAreaIdTocado] = useState(false)
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const codeValido = CODE_REGEX.test(code)
  const nameValido = name.trim().length > 0
  const areaIdValido = areaId !== ''
  const puedeGuardar = codeValido && nameValido && areaIdValido

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    try {
      const guardado = await ejecutar(() => formsService.crear({ code, name, areaId }))
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` (incluye 404 si
      // el área no existe, y 409 si el code choca).
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <h2 className="text-lg font-bold text-marron-cafe">Nuevo formulario</h2>

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormInput
            label="Código"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setCodeTocado(true)
            }}
            onBlur={() => setCodeTocado(true)}
            maxLength={50}
            placeholder="I-CAL-29/R-01"
            hint="Mayúsculas, números, '-' y '/'."
            required
          />
          {codeTocado && !codeValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">
              El código debe tener entre 3 y 50 caracteres válidos.
            </p>
          )}
        </div>
        <div>
          <FormInput
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Inspección de recepción de materia prima"
            maxLength={150}
            required
          />
          {name.length > 0 && !nameValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">El nombre no puede quedar vacío.</p>
          )}
        </div>
      </div>

      <div>
        <FormSelect
          label="Área"
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value)
            setAreaIdTocado(true)
          }}
          onBlur={() => setAreaIdTocado(true)}
          hint={
            areasError
              ? 'No se pudo cargar el catálogo de áreas.'
              : areas === null
                ? 'Cargando áreas…'
                : areas.length === 0
                  ? 'No hay áreas cargadas todavía.'
                  : undefined
          }
          required
        >
          <option value="">Seleccioná un área…</option>
          {areas?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </FormSelect>
        {areaIdTocado && !areaIdValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Todo formulario necesita un área.</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : 'Crear formulario'}
        </Button>
        <Button type="button" variant="secondary" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// El documento completo: cabecera (nombre/área/estado) + secciones con
// tabla de campos — todo se edita "en borrador" (name/areaId/isActive del
// formulario, label de cada campo, baja de cada campo) y se persiste
// junto con un único botón "Guardar cambios". El backend no tiene un
// endpoint de guardado masivo, así que ese botón dispara varios PATCH por
// debajo (uno por cada cosa que cambió) — pero de cara al usuario es una
// sola acción de guardado para todo el formulario.
//
// Ítems: siempre se traen activos e inactivos juntos (status=all), pero
// acá SOLO se muestran los activos — esta pantalla es donde se decide si
// un campo sigue activo o se da de baja, no un lugar para revisar historial
// de bajas. Un campo dado de baja desaparece de la vista en cuanto se
// guarda (limit tope real del backend es 100, ver
// common/dtos/pagination.dto.ts — pedir más tira 400 "Too big").
function FormularioDocumento({ form, areas, areasError, areaNombre, puedeEditar, puedeGestionarItems, onActualizado }) {
  const formId = form.id
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [agregandoEnSeccion, setAgregandoEnSeccion] = useState(null)
  // Nombre ya confirmado para la sección nueva que se está creando — hasta
  // que esto tenga valor, el panel de "Agregar sección nueva" solo muestra
  // el input del nombre (no todo el formulario de alta de campo junto).
  const [seccionNuevaNombre, setSeccionNuevaNombre] = useState(null)

  const [headerDraft, setHeaderDraft] = useState({ name: form.name, areaId: form.areaId, isActive: form.isActive })
  const [labelDrafts, setLabelDrafts] = useState({})
  const [bajas, setBajas] = useState({})
  const [guardandoTodo, setGuardandoTodo] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState(null)

  // El endpoint pagina por cursor (máximo 100 por página, ver
  // common/dtos/pagination.dto.ts) — un formulario con muchos campos entre
  // todas sus secciones puede superar eso fácil. Antes esto solo pedía UNA
  // página y descartaba nextCursor/hasMore: cualquier campo que cayera
  // después del corte de esa página (por ejemplo, el primer campo de una
  // sección nueva cuyo nombre ordena alfabéticamente después de las que ya
  // existían) quedaba invisible sin ningún error — el fetch "funcionaba"
  // (200 OK), solo traía una porción. Acá se sigue el cursor hasta agotar
  // hasMore para traer todos los campos siempre.
  const cargarTodosLosItems = async () => {
    let cursor
    let acumulado = []
    for (;;) {
      const resp = await formItemsService.listar(formId, { status: 'all', limit: 100, cursor })
      acumulado = acumulado.concat(resp.data)
      cursor = siguienteCursor(resp)
      if (!cursor) break
    }
    return acumulado
  }

  const cargar = () => {
    setError(null)
    setItems(null)
    cargarTodosLosItems()
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    let cancelado = false
    setError(null)
    setItems(null)
    cargarTodosLosItems()
      .then((data) => {
        if (!cancelado) setItems(data)
      })
      .catch((err) => {
        if (!cancelado) setError(err.message)
      })
    return () => {
      cancelado = true
    }
  }, [formId])

  const actualizarItem = (item) => {
    setItems((prev) => prev?.map((i) => (i.id === item.id ? item : i)) ?? prev)
  }

  const agregarCampo = (item) => {
    setItems((prev) => (prev ? [...prev, item] : [item]))
    setAgregandoEnSeccion(null)
    setSeccionNuevaNombre(null)
  }

  const itemsActivos = items ? items.filter((i) => i.isActive) : []
  const grupos = agruparPorSeccion(itemsActivos)
  const secciones = [...new Set(itemsActivos.map((i) => i.section))]

  // El formulario de Inspección de Materia Prima tiene lógica fija
  // amarrada al `code` exacto de algunos ítems (ver
  // codigosCriticosInspeccion.js) — darlos de baja no rompe nada visible,
  // pero apaga esa lógica en silencio. Se advierte antes de dejar
  // marcar la baja.
  const esItemCritico = (item) =>
    form.code === FORM_CODE_INSPECCION_MATERIA_PRIMA && CODIGOS_ITEM_CRITICOS_INSPECCION.has(item.code)

  const headerDirty =
    headerDraft.name.trim() !== form.name || headerDraft.areaId !== form.areaId || headerDraft.isActive !== form.isActive
  const labelsDirty = itemsActivos.some(
    (i) => labelDrafts[i.id] !== undefined && labelDrafts[i.id].trim() !== i.label,
  )
  const bajasDirty = Object.values(bajas).some((b) => b?.marcado)
  const hayCambios = headerDirty || labelsDirty || bajasDirty
  const puedeGuardarAlgo = puedeEditar || puedeGestionarItems

  const guardarTodo = async () => {
    setGuardandoTodo(true)
    const errores = []

    if (headerDirty && puedeEditar) {
      const patch = {}
      if (headerDraft.name.trim() !== form.name) patch.name = headerDraft.name.trim()
      if (headerDraft.areaId !== form.areaId) patch.areaId = headerDraft.areaId
      if (headerDraft.isActive !== form.isActive) patch.isActive = headerDraft.isActive
      if (patch.name !== undefined && patch.name.length === 0) {
        errores.push('El nombre del formulario no puede quedar vacío.')
      } else {
        try {
          const actualizado = await formsService.actualizar(form.id, patch)
          onActualizado(actualizado)
        } catch (err) {
          errores.push(`Formulario: ${err.message}`)
        }
      }
    }

    if (puedeGestionarItems) {
      for (const item of itemsActivos) {
        const nuevaLabel = labelDrafts[item.id]
        if (nuevaLabel !== undefined && nuevaLabel.trim() !== item.label) {
          if (nuevaLabel.trim().length === 0) {
            errores.push(`"${item.code}": el nombre no puede quedar vacío.`)
          } else {
            try {
              const actualizado = await formItemsService.actualizarLabel(formId, item.id, nuevaLabel.trim())
              actualizarItem(actualizado)
              setLabelDrafts((prev) => {
                const next = { ...prev }
                delete next[item.id]
                return next
              })
            } catch (err) {
              errores.push(`"${item.label}": ${err.message}`)
            }
          }
        }

        const baja = bajas[item.id]
        if (baja?.marcado) {
          if (baja.motivo.trim().length < 5) {
            errores.push(`"${item.code}": el motivo de baja necesita al menos 5 caracteres.`)
          } else {
            try {
              const actualizado = await formItemsService.desactivar(formId, item.id, baja.motivo.trim())
              actualizarItem({ ...item, ...actualizado })
              setBajas((prev) => {
                const next = { ...prev }
                delete next[item.id]
                return next
              })
            } catch (err) {
              errores.push(`"${item.label}": ${err.message}`)
            }
          }
        }
      }
    }

    setErrorGuardado(errores.length > 0 ? errores.join(' — ') : null)
    setGuardandoTodo(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <DocumentSheet>
        <DocumentHeader
          titleNode={
            puedeEditar ? (
              <EditableTitleInput
                value={headerDraft.name}
                onChange={(e) => setHeaderDraft({ ...headerDraft, name: e.target.value })}
                disabled={guardandoTodo}
                title="Editar nombre del formulario"
              />
            ) : (
              <span className="text-[15px] font-bold uppercase tracking-wide text-marron-cafe">{form.name}</span>
            )
          }
          code={form.code}
          areaNode={
            puedeEditar ? (
              <EditableSelect
                value={headerDraft.areaId}
                onChange={(e) => setHeaderDraft({ ...headerDraft, areaId: e.target.value })}
                disabled={guardandoTodo || areas === null || areasError}
                options={areas?.map((a) => ({ value: a.id, label: a.name }))}
                title="Cambiar área"
              />
            ) : (
              areaNombre
            )
          }
          statusNode={
            puedeEditar ? (
              <EditableCheckbox
                checked={headerDraft.isActive}
                onChange={(e) => setHeaderDraft({ ...headerDraft, isActive: e.target.checked })}
                disabled={guardandoTodo}
                labelActivo="Activo"
                labelInactivo="Inactivo"
                title="Cambiar estado activo/inactivo"
              />
            ) : (
              <span className={form.isActive ? 'font-semibold text-verde-bosque' : 'text-marron-cafe/50'}>
                {form.isActive ? 'Activo' : 'Inactivo'}
              </span>
            )
          }
        />

        <div className="px-5 pb-5">
          {error ? (
            <div className="mt-4 flex flex-col items-start gap-2 rounded-2xl bg-rojo-pasankalla/10 px-4 py-3.5 text-sm">
              <p className="font-medium text-rojo-pasankalla">No se pudo cargar: {error}</p>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={cargar}>
                Reintentar
              </Button>
            </div>
          ) : items === null ? (
            <p className="mt-4 text-sm text-marron-cafe/50">Cargando…</p>
          ) : itemsActivos.length === 0 && agregandoEnSeccion !== '__nueva__' ? (
            <p className="mt-4 text-sm text-marron-cafe/50">Este formulario todavía no tiene campos.</p>
          ) : (
            Object.entries(grupos).map(([seccion, itemsSeccion], i) => (
              <div key={seccion}>
                <DocumentSectionTitle prefix={i + 1} title={seccion.replace(/_/g, ' ')} />
                <DocumentTable>
                  {itemsSeccion.map((item) => (
                    <CampoDocumentoFila
                      key={item.id}
                      item={item}
                      critico={esItemCritico(item)}
                      puedeGestionar={puedeGestionarItems}
                      deshabilitado={guardandoTodo}
                      labelValue={labelDrafts[item.id] ?? item.label}
                      onLabelChange={(v) => setLabelDrafts((prev) => ({ ...prev, [item.id]: v }))}
                      bajaMarcada={bajas[item.id]?.marcado ?? false}
                      motivoBaja={bajas[item.id]?.motivo ?? ''}
                      onToggleBaja={(marcado) =>
                        setBajas((prev) => ({ ...prev, [item.id]: { marcado, motivo: prev[item.id]?.motivo ?? '' } }))
                      }
                      onMotivoChange={(motivo) =>
                        setBajas((prev) => ({ ...prev, [item.id]: { marcado: true, motivo } }))
                      }
                    />
                  ))}
                </DocumentTable>
                {puedeGestionarItems && form.isActive && (
                  <div className="print:hidden">
                    <BotonAgregarCampo
                      activo={agregandoEnSeccion === seccion}
                      onAbrir={() => setAgregandoEnSeccion(seccion)}
                      onCerrar={() => setAgregandoEnSeccion(null)}
                    >
                      <ItemAltaForm
                        formId={formId}
                        seccionFija={seccion}
                        siguienteOrden={(itemsSeccion.length || 0) + 1}
                        onCancelar={() => setAgregandoEnSeccion(null)}
                        onGuardado={agregarCampo}
                      />
                    </BotonAgregarCampo>
                  </div>
                )}
              </div>
            ))
          )}

          {puedeGestionarItems && form.isActive && items !== null && (
            <div className="print:hidden">
              <BotonAgregarCampo
                nuevaSeccion
                activo={agregandoEnSeccion === '__nueva__'}
                onAbrir={() => setAgregandoEnSeccion('__nueva__')}
                onCerrar={() => {
                  setAgregandoEnSeccion(null)
                  setSeccionNuevaNombre(null)
                }}
              >
                {/* Dos pasos: primero solo el nombre de la sección, recién
                    después se despliega el alta de campo completa (con
                    seccionFija, igual que agregar un campo a una sección
                    ya existente) — pedido explícito de no mostrar todos
                    los inputs del campo antes de tener el nombre. */}
                {seccionNuevaNombre ? (
                  <ItemAltaForm
                    formId={formId}
                    seccionFija={seccionNuevaNombre}
                    onCancelar={() => setSeccionNuevaNombre(null)}
                    onGuardado={agregarCampo}
                  />
                ) : (
                  <NombreSeccionForm
                    seccionesExistentes={secciones}
                    onCancelar={() => {
                      setAgregandoEnSeccion(null)
                      setSeccionNuevaNombre(null)
                    }}
                    onConfirmar={setSeccionNuevaNombre}
                  />
                )}
              </BotonAgregarCampo>
            </div>
          )}
        </div>

        {/* Barra de acciones al pie del documento */}
        <DocumentFooter>
          {errorGuardado && (
            <p className="w-full rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-xs font-medium text-rojo-pasankalla">
              {errorGuardado}
            </p>
          )}
          <Button variant="secondary" className="px-4 py-2 text-sm" onClick={() => window.print()}>
            Imprimir
          </Button>
          {puedeGuardarAlgo && (
            <Button
              className="flex items-center gap-2 px-5 py-2 text-sm"
              disabled={!hayCambios || guardandoTodo}
              onClick={guardarTodo}
            >
              <Save className="size-4" strokeWidth={1.75} />
              {guardandoTodo ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
        </DocumentFooter>
      </DocumentSheet>
    </div>
  )
}

// Botón + panel para agregar un campo, en el borde de una sección (o al
// pie del documento para una sección nueva) — pedido explícito de que
// agregar un campo sea "en cada sección", no un formulario global donde
// hay que tipear a mano a qué sección va. Esta creación sí es inmediata
// (no pasa por "Guardar cambios"): es un alta nueva, no la edición de algo
// que ya existía.
function BotonAgregarCampo({ activo, onAbrir, onCerrar, nuevaSeccion = false, children }) {
  if (activo) {
    return <div className="my-3.5 rounded-lg border border-dashed border-marron-tierra/30 bg-marron-tierra/5 p-3">{children}</div>
  }
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="my-3.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-marron-tierra/30 bg-marron-tierra/5 py-2 text-xs font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
    >
      <Plus className="size-3.5" strokeWidth={1.75} />
      {nuevaSeccion ? 'Agregar sección nueva' : 'Agregar campo a esta sección'}
    </button>
  )
}

// Paso 1 de "Agregar sección nueva": solo el nombre — recién al confirmar
// se pasa a ItemAltaForm (con esa sección ya fija) para completar el
// primer campo. Evita mostrar de una todos los inputs de un campo antes
// de saber siquiera cómo se va a llamar la sección.
function NombreSeccionForm({ seccionesExistentes, onCancelar, onConfirmar }) {
  const [nombre, setNombre] = useState('')
  const [tocado, setTocado] = useState(false)

  const valido = SNAKE_CASE_REGEX.test(nombre) && nombre.length >= 3

  const submit = (e) => {
    e.preventDefault()
    setTocado(true)
    if (!valido) return
    onConfirmar(nombre)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div>
        <FormInput
          label="Nombre de la sección"
          value={nombre}
          onChange={(e) => setNombre(e.target.value.toLowerCase())}
          onBlur={() => setTocado(true)}
          maxLength={100}
          placeholder="arrival_conditions"
          hint="snake_case, entre 3 y 100 caracteres."
          list="secciones-existentes-nueva"
          autoFocus
        />
        {seccionesExistentes?.length > 0 && (
          <datalist id="secciones-existentes-nueva">
            {seccionesExistentes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
        {tocado && !valido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Sección inválida.</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button type="submit" className="px-4 py-2 text-sm" disabled={!valido}>
          Continuar
        </Button>
        <Button type="button" variant="secondary" className="px-4 py-2 text-sm" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function agruparPorSeccion(items) {
  const grupos = {}
  for (const item of items) {
    ;(grupos[item.section] ??= []).push(item)
  }
  return grupos
}

// Control de solo-lectura que representa cómo se ve el campo real al
// completarlo — no envía nada, es puramente visual (ver comentario más
// arriba). Cubre las 6 variantes de dataType, mismo criterio que
// ItemAltaForm al construir `config`.
function ControlDeCampo({ item }) {
  switch (item.dataType) {
    case 'BOOLEAN':
      return (
        <div className="flex items-center gap-1.5">
          <span className="inline-block rounded-[3px] border border-marron-tierra/30 px-2 py-0.5 text-[11px] text-marron-cafe/60">Sí</span>
          <span className="inline-block rounded-[3px] border border-marron-tierra/30 px-2 py-0.5 text-[11px] text-marron-cafe/60">No</span>
        </div>
      )
    case 'INTEGER':
    case 'DECIMAL': {
      const { min, max } = item.config ?? {}
      const rango = min !== undefined || max !== undefined ? `Rango: ${min ?? '–'} a ${max ?? '–'}` : ''
      return <input disabled type="number" placeholder={rango} className="w-full bg-transparent px-0.5 py-[3px] text-[12.5px] text-marron-cafe outline-none" />
    }
    case 'TEXT': {
      const { minLength, maxLength } = item.config ?? {}
      const limite = minLength !== undefined || maxLength !== undefined ? `Entre ${minLength ?? 0} y ${maxLength ?? '∞'} caracteres` : ''
      return <input disabled type="text" placeholder={limite} className="w-full bg-transparent px-0.5 py-[3px] text-[12.5px] text-marron-cafe outline-none" />
    }
    case 'SELECT': {
      const opciones = item.config?.options ?? []
      return (
        <select disabled className="w-full bg-transparent font-sans text-[12.5px] text-marron-cafe outline-none">
          <option>Seleccionar…</option>
          {opciones.map((o) => (
            <option key={o.value}>{o.label}</option>
          ))}
        </select>
      )
    }
    case 'DATE': {
      const { min, max } = item.config ?? {}
      const rango = min || max ? `Entre ${min ?? '–'} y ${max ?? '–'}` : null
      return (
        <div>
          <input disabled type="date" className="w-full bg-transparent px-0.5 py-[3px] text-[12.5px] text-marron-cafe outline-none" />
          {rango && <span className="mt-0.5 block text-[10px] text-marron-cafe/40">{rango}</span>}
        </div>
      )
    }
    default:
      return null
  }
}

// Fila de la tabla de campos, dentro del "papel" del documento. Solo se
// renderizan campos ACTIVOS (el padre ya filtra) — esta pantalla es donde
// se decide si un campo sigue activo o se da de baja, no un archivo de
// bajas históricas.
//
// "Eliminar" en el sentido estricto no existe en el backend (form_items no
// tiene DELETE, ver docs/form-items.md §10). El ícono de tacho NO
// desactiva al toque: solo abre el panel de motivo — la baja real recién
// se manda al backend cuando se toca "Guardar cambios" arriba, junto con
// cualquier otro cambio pendiente. Es irreversible por API una vez
// guardada (no hay forma de reactivar un campo dado de baja).
//
// `critico` marca ítems de los que FormularioInspeccionMateriaPrima.jsx
// depende por `code` exacto (ver codigosCriticosInspeccion.js): la baja
// no rompe nada visible ahí, pero apaga en silencio la lógica de rechazo
// o hace desaparecer una fila de su tabla fija. Para esos, el tacho no
// marca la baja directo — primero pide una confirmación explícita.
function CampoDocumentoFila({ item, puedeGestionar, deshabilitado, labelValue, onLabelChange, bajaMarcada, motivoBaja, onToggleBaja, onMotivoChange, critico }) {
  const [confirmandoCritico, setConfirmandoCritico] = useState(false)

  const manejarClickTacho = () => {
    if (bajaMarcada) {
      onToggleBaja(false)
      setConfirmandoCritico(false)
      return
    }
    if (critico && !confirmandoCritico) {
      setConfirmandoCritico(true)
      return
    }
    onToggleBaja(true)
  }

  return (
    <>
      <DocumentRow
        labelNode={
          <>
            {puedeGestionar ? (
              <EditableTextarea
                value={labelValue}
                onChange={(e) => onLabelChange(e.target.value)}
                disabled={deshabilitado}
                title="Editar etiqueta del campo"
              />
            ) : (
              item.label
            )}
            {critico && (
              <Badge
                tono="alerta"
                className="ml-1.5 inline-flex items-center gap-1 align-middle normal-case"
                title="Este campo tiene lógica propia en el formulario de Inspección de Materia Prima (por su código). Verifica antes de darlo de baja."
              >
                <TriangleAlert className="size-2.5" strokeWidth={2.5} />
                Usado por Inspección
              </Badge>
            )}
          </>
        }
        code={item.code}
        required={item.isRequired}
        unit={item.unit}
        controlNode={
          <div className="flex flex-col gap-1.5">
            <Badge tono="neutro" className="w-fit normal-case">
              {DATA_TYPE_LABEL[item.dataType]}
            </Badge>
            <ControlDeCampo item={item} />
          </div>
        }
        actionsNode={
          puedeGestionar ? (
            <IconButton
              title={bajaMarcada ? 'Cancelar la baja' : 'Marcar para dar de baja (se aplica al Guardar cambios)'}
              tono={bajaMarcada ? 'peligro' : 'normal'}
              disabled={deshabilitado}
              onClick={manejarClickTacho}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </IconButton>
          ) : null
        }
      />

      {critico && confirmandoCritico && !bajaMarcada && (
        <tr className="print:hidden">
          <td colSpan={puedeGestionar ? 3 : 2} className="border border-marron-tierra/20 bg-[#fff5f5] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-rojo-pasankalla">
                "{item.label}" es un campo del que depende la lógica de la pestaña de Inspección (Calidad). Darlo de
                baja no rompe la pantalla, pero puede apagar en silencio la pregunta de rechazo o hacer desaparecer
                una fila de la tabla. ¿Seguro que quieres continuar?
              </span>
              <Button
                variant="secondary"
                className="px-2.5 py-1 text-xs"
                onClick={() => setConfirmandoCritico(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                className="border-rojo-pasankalla/40 px-2.5 py-1 text-xs text-rojo-pasankalla hover:bg-rojo-pasankalla/10"
                onClick={() => {
                  onToggleBaja(true)
                  setConfirmandoCritico(false)
                }}
              >
                Entiendo el riesgo, dar de baja
              </Button>
            </div>
          </td>
        </tr>
      )}

      {bajaMarcada && (
        <tr className="print:hidden">
          <td colSpan={puedeGestionar ? 3 : 2} className="border border-marron-tierra/20 bg-[#fff5f5] px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-marron-cafe/70">
                Motivo de la baja de "{item.label}" (se aplica recién al guardar):
              </span>
              <input
                value={motivoBaja}
                onChange={(e) => onMotivoChange(e.target.value)}
                maxLength={500}
                disabled={deshabilitado}
                placeholder="Mínimo 5 caracteres"
                className="min-w-[220px] flex-1 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-rojo-pasankalla"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// Botón de ícono chico para acciones de fila — no existía un componente
// así en el resto del panel (los botones de acción eran siempre de texto,
// ver Button.jsx), así que se define acá en vez de forzar Button a cubrir
// un caso visual que no es el suyo.
function IconButton({ children, tono = 'normal', className = '', ...props }) {
  const tonos = {
    normal: 'text-marron-cafe/60 hover:bg-marron-tierra/10 hover:text-marron-cafe',
    peligro: 'text-rojo-pasankalla/70 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla',
  }
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full p-1.5 transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 ${tonos[tono]} ${className}`}
    >
      {children}
    </button>
  )
}

const DATA_TYPE_OPTIONS = Object.keys(DATA_TYPE_LABEL)

// Alta de un campo — cubre las 6 variantes de config del backend
// (form-item.dto.ts, configSchemaByDataType). section/code/groupCode van
// en snake_case porque el backend los valida con ese regex; a diferencia
// del code del formulario (mayúsculas), acá se fuerza minúsculas.
//
// `seccionFija`: cuando se agrega un campo desde el botón "+" de una
// sección existente, la sección viene fija y no se vuelve a pedir — pedido
// explícito de que agregar un campo sea "en cada sección", no un
// formulario global donde hay que tipear a mano a qué sección va. Sin
// `seccionFija` (alta de sección nueva), el campo de sección queda
// editable, con las secciones existentes como sugerencia vía datalist.
//
// TEXT ya no expone minLength/maxLength en la UI — quedan fijos en
// {minLength:1, maxLength:300}, un rango razonable para una respuesta de
// texto corta (nombre, observación) sin pedirle al usuario que piense en
// límites de caracteres que no le importan.
function ItemAltaForm({ formId, seccionFija, siguienteOrden, seccionesExistentes, onCancelar, onGuardado }) {
  const [section, setSection] = useState(seccionFija ?? '')
  const [sortOrder, setSortOrder] = useState(String(siguienteOrden ?? 1))
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [dataType, setDataType] = useState('TEXT')
  const [unit, setUnit] = useState('')
  const [isRequired, setIsRequired] = useState(true)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [decimalPlaces, setDecimalPlaces] = useState('')
  const [opciones, setOpciones] = useState([{ value: '', label: '' }])
  const { enviando: guardando, error, ejecutar } = useSolicitud()

  const sectionValida = Boolean(seccionFija) || (SNAKE_CASE_REGEX.test(section) && section.length >= 3)
  const codeValido = SNAKE_CASE_REGEX.test(code)
  const labelValido = label.trim().length > 0
  const sortOrderValido = Number.isInteger(Number(sortOrder)) && Number(sortOrder) >= 1
  // INTEGER exige min/max enteros en el backend (integerConfigSchema,
  // z.number().int()) — el input numérico no bloquea que alguien tipee
  // "1.5" a mano (noValidate desactiva la validación nativa del navegador,
  // igual que el resto de los formularios del panel), así que se valida acá
  // para no mandar un 400 evitable.
  const minMaxEnterosValidos =
    dataType !== 'INTEGER' ||
    ((min === '' || Number.isInteger(Number(min))) && (max === '' || Number.isInteger(Number(max))))
  const opcionesValidas =
    dataType !== 'SELECT' ||
    (opciones.every((o) => o.value.trim() && o.label.trim()) &&
      new Set(opciones.map((o) => o.value.trim())).size === opciones.length)
  const puedeGuardar =
    sectionValida && codeValido && labelValido && sortOrderValido && minMaxEnterosValidos && opcionesValidas

  const construirConfig = () => {
    switch (dataType) {
      case 'BOOLEAN':
        return {}
      case 'INTEGER':
        return {
          ...(min !== '' ? { min: Math.trunc(Number(min)) } : {}),
          ...(max !== '' ? { max: Math.trunc(Number(max)) } : {}),
        }
      case 'DECIMAL':
        return {
          ...(min !== '' ? { min: Number(min) } : {}),
          ...(max !== '' ? { max: Number(max) } : {}),
          ...(decimalPlaces !== '' ? { decimalPlaces: Number(decimalPlaces) } : {}),
        }
      case 'TEXT':
        return { minLength: 1, maxLength: 300 }
      case 'SELECT':
        return { options: opciones.map((o) => ({ value: o.value.trim(), label: o.label.trim() })) }
      case 'DATE':
        return {
          ...(min !== '' ? { min } : {}),
          ...(max !== '' ? { max } : {}),
        }
      default:
        return {}
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    try {
      const guardado = await ejecutar(() =>
        formItemsService.crear(formId, {
          section: seccionFija ?? section,
          sortOrder: Number(sortOrder),
          code,
          label: label.trim(),
          dataType,
          unit: unit.trim() || undefined,
          isRequired,
          config: construirConfig(),
        }),
      )
      onGuardado(guardado)
    } catch {
      // ejecutar() ya guardó el mensaje legible en `error` (incluye 409 si
      // el code ya existe en este formulario).
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl bg-white/70 p-4">
      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {seccionFija ? (
          <div>
            <span className="mb-1.5 block text-sm text-marron-cafe">Sección</span>
            <p className="rounded-xl border border-marron-tierra/20 bg-marron-tierra/5 px-3 py-2 text-sm text-marron-cafe/70">
              {seccionFija.replace(/_/g, ' ')}
            </p>
          </div>
        ) : (
          <div>
            <FormInput
              label="Sección nueva"
              value={section}
              onChange={(e) => setSection(e.target.value.toLowerCase())}
              maxLength={100}
              placeholder="arrival_conditions"
              hint="snake_case, entre 3 y 100 caracteres."
              list="secciones-existentes"
            />
            {seccionesExistentes?.length > 0 && (
              <datalist id="secciones-existentes">
                {seccionesExistentes.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            )}
            {section.length > 0 && !sectionValida && (
              <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Sección inválida.</p>
            )}
          </div>
        )}
        <div>
          <FormInput
            label="Código del campo"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            maxLength={100}
            placeholder="peso_bruto"
            hint="snake_case, único dentro del formulario (no solo de la sección)."
          />
          {code.length > 0 && !codeValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Código inválido.</p>
          )}
        </div>
      </div>

      <div>
        <FormInput
          label="Etiqueta"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={200}
          placeholder="Peso bruto"
        />
        {label.length > 0 && !labelValido && (
          <p className="mt-1 text-xs font-medium text-rojo-pasankalla">La etiqueta no puede quedar vacía.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FormSelect label="Tipo de dato" value={dataType} onChange={(e) => setDataType(e.target.value)}>
          {DATA_TYPE_OPTIONS.map((dt) => (
            <option key={dt} value={dt}>
              {DATA_TYPE_LABEL[dt]}
            </option>
          ))}
        </FormSelect>
        <FormInput
          label="Unidad (opcional)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          maxLength={30}
          placeholder="kg"
        />
        <div>
          <FormInput
            label="Orden"
            type="number"
            min={1}
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          {!sortOrderValido && (
            <p className="mt-1 text-xs font-medium text-rojo-pasankalla">Debe ser un número entero ≥ 1.</p>
          )}
        </div>
      </div>

      {(dataType === 'INTEGER' || dataType === 'DECIMAL') && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <FormInput
              label="Mínimo (opcional)"
              type="number"
              step={dataType === 'INTEGER' ? 1 : 'any'}
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </div>
          <div>
            <FormInput
              label="Máximo (opcional)"
              type="number"
              step={dataType === 'INTEGER' ? 1 : 'any'}
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </div>
          {dataType === 'INTEGER' && !minMaxEnterosValidos && (
            <p className="col-span-full text-xs font-medium text-rojo-pasankalla">
              Un campo numérico entero no admite mínimo/máximo con decimales.
            </p>
          )}
          {dataType === 'DECIMAL' && (
            <FormInput
              label="Decimales (opcional)"
              type="number"
              min={0}
              max={10}
              value={decimalPlaces}
              onChange={(e) => setDecimalPlaces(e.target.value)}
            />
          )}
        </div>
      )}

      {dataType === 'DATE' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput label="Fecha mínima (opcional)" type="date" value={min} onChange={(e) => setMin(e.target.value)} />
          <FormInput label="Fecha máxima (opcional)" type="date" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      )}

      {dataType === 'SELECT' && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-marron-cafe">Opciones</span>
          {opciones.map((op, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-1 gap-2">
                <input
                  value={op.value}
                  onChange={(e) =>
                    setOpciones((prev) => prev.map((o, idx) => (idx === i ? { ...o, value: e.target.value } : o)))
                  }
                  placeholder="valor"
                  className="min-w-0 flex-1 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
                />
                <input
                  value={op.label}
                  onChange={(e) =>
                    setOpciones((prev) => prev.map((o, idx) => (idx === i ? { ...o, label: e.target.value } : o)))
                  }
                  placeholder="etiqueta visible"
                  className="min-w-0 flex-1 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
                />
              </div>
              {opciones.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOpciones((prev) => prev.filter((_, idx) => idx !== i))}
                  className="self-end text-xs font-medium text-rojo-pasankalla/80 hover:text-rojo-pasankalla sm:self-auto"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOpciones((prev) => [...prev, { value: '', label: '' }])}
            className="self-start text-xs font-medium text-verde-bosque hover:text-verde-hoja"
          >
            + Agregar opción
          </button>
          {!opcionesValidas && (
            <p className="text-xs font-medium text-rojo-pasankalla">
              Completá valor y etiqueta de cada opción; los valores no pueden repetirse.
            </p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-marron-cafe">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={(e) => setIsRequired(e.target.checked)}
          className="size-4 rounded border-marron-tierra/30 accent-verde-lima"
        />
        Campo obligatorio
      </label>

      <div className="flex gap-3">
        <Button type="submit" className="px-4 py-2 text-sm" disabled={guardando || !puedeGuardar}>
          {guardando ? 'Guardando…' : 'Agregar campo'}
        </Button>
        <Button type="button" variant="secondary" className="px-4 py-2 text-sm" disabled={guardando} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
