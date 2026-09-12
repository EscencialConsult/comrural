import { useEffect, useState } from 'react'
import { CheckCircle2, Layers } from 'lucide-react'
import { controlProcesoAService } from '../../services/controlProcesoAService'
import { shiftsService } from '../../services/shiftsService'
import { iamService } from '../../services/iamService'
import { useSolicitud } from '../../hooks/useSolicitud'
import { toast } from '../../lib/toast'
import Modal from '../Modal.jsx'
import Button from '../Button.jsx'
import Badge from '../Badge.jsx'
import FormSelect from '../FormSelect.jsx'
import CamposMedicionControlProceso from './CamposMedicionControlProceso.jsx'
import { tamanoGranoValido } from './controlProcesoAConstantes'

const LABEL_IMPUREZAS = {
  paja: 'Paja',
  heces_raton: 'Heces de ratón',
  heces_ave: 'Heces de ave',
  larva: 'Larva',
  semilla: 'Semilla',
  piedra_volcanica: 'Piedra volcánica',
  piedra_dura: 'Piedra dura',
  piedra_cuarzo: 'Piedra cuarzo',
  otros: 'Otros',
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-marron-cafe/40">{etiqueta}</span>
      <span className="text-sm font-medium text-marron-cafe">{valor}</span>
    </div>
  )
}

// Estado editable, seedeado desde `control` cada vez que se abre — mismos
// campos que ModalCrearControlProceso.jsx, salvo lote/turno/fecha/
// inspector (clave natural del registro, no editable ni acá ni en el
// backend, ver PATCH /control-proceso-a/:id).
function estadoDesdeControl(control) {
  if (!control) return null
  return {
    supervisorProduccionId: control.supervisorProduccionId,
    encargadoGrupoId: control.encargadoGrupoId,
    saponinaEscarificadoMm: String(control.saponinaEscarificadoMm),
    washHumidityPct: String(control.washHumidityPct),
    saponinaSecadoMm: String(control.saponinaSecadoMm),
    impurezas: { ...control.impurezas },
    pesoImpurezaG: String(control.pesoImpurezaG),
    tamanoGrano: { ...control.tamanoGrano },
    contrastante: String(control.clasificacionGrano.contrastante),
    otrosControles: control.clasificacionGrano.otros_controles,
    descripcionClasificacion: control.clasificacionGrano.descripcion,
    cantidadPallets: String(control.cantidadPallets),
    cantidadSacos: String(control.cantidadSacos),
    palletsNoConformes: String(control.palletsNoConformes),
    sacosNoConformes: String(control.sacosNoConformes),
  }
}

// Resumen de un control de proceso — editable mientras no tenga vobo
// (pedido explícito, ver docs/control-proceso-a.md §4/§8: PATCH
// /control-proceso-a/:id). Con vobo ya registrado, queda de solo lectura
// (el vobo es la aprobación de Calidad sobre esos datos puntuales,
// editarlos después lo invalidaría en silencio) y solo muestra el resumen.
export default function ModalDetalleControlProceso({ abierto, control, puedeEditar, puedeAprobar, onCerrar, onActualizado }) {
  const [form, setForm] = useState(null)
  const [turnos, setTurnos] = useState(null)
  const [usuarios, setUsuarios] = useState(null)
  const [erroresValidacion, setErroresValidacion] = useState([])
  const { enviando, error, ejecutar, limpiarError } = useSolicitud()

  const editable = Boolean(control) && !control.voboEn && puedeEditar

  useEffect(() => {
    if (!abierto || !control) return
    setForm(estadoDesdeControl(control))
    setErroresValidacion([])
    limpiarError()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, control?.id])

  useEffect(() => {
    if (!abierto || !editable) return
    let cancelado = false
    Promise.all([shiftsService.listar(), iamService.listarUsuarios()])
      .then(([turnosResp, usuariosResp]) => {
        if (cancelado) return
        setTurnos(turnosResp)
        setUsuarios(usuariosResp)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [abierto, editable])

  if (!control || !form) return null

  const turnoNombre = turnos?.find((t) => t.id === control.shiftId)?.name

  const actualizarForm = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const validar = () => {
    const errores = []
    if (!form.supervisorProduccionId) errores.push('Elegí un supervisor de producción.')
    if (!form.encargadoGrupoId) errores.push('Elegí un encargado de grupo.')
    if (form.saponinaEscarificadoMm === '') errores.push('Saponina escarificado es obligatoria.')
    if (form.washHumidityPct === '') errores.push('Humedad de lavado es obligatoria.')
    if (form.saponinaSecadoMm === '') errores.push('Saponina secado es obligatoria.')
    if (form.pesoImpurezaG === '') errores.push('Peso total de impurezas es obligatorio.')
    const camposTamanoGrano = ['m12_pct', 'm14_pct', 'm16_pct', 'polvillo_pct']
    if (!camposTamanoGrano.every((k) => form.tamanoGrano[k] !== null && form.tamanoGrano[k] !== ''))
      errores.push('Completá los 4 porcentajes de tamaño de grano.')
    else if (!tamanoGranoValido(form.tamanoGrano)) errores.push('La suma de tamaño de grano debe estar entre 99.5% y 100.5%.')
    if (form.contrastante === '') errores.push('Contrastante es obligatorio.')
    if (form.otrosControles.trim() === '') errores.push("El campo 'Otros controles' es obligatorio.")
    if (form.cantidadPallets === '') errores.push('Cantidad de pallets es obligatoria.')
    if (form.cantidadSacos === '') errores.push('Cantidad de sacos es obligatoria.')
    if (form.cantidadPallets !== '' && Number(form.palletsNoConformes) > Number(form.cantidadPallets))
      errores.push('Pallets no conformes no puede superar la cantidad de pallets.')
    if (form.cantidadSacos !== '' && Number(form.sacosNoConformes) > Number(form.cantidadSacos))
      errores.push('Sacos no conformes no puede superar la cantidad de sacos.')
    return errores
  }

  const guardarCambios = async () => {
    const errores = validar()
    if (errores.length > 0) {
      setErroresValidacion(errores)
      return
    }
    setErroresValidacion([])
    try {
      const actualizado = await ejecutar(() =>
        controlProcesoAService.actualizar(control.id, {
          supervisorProduccionId: form.supervisorProduccionId,
          encargadoGrupoId: form.encargadoGrupoId,
          saponinaEscarificadoMm: Number(form.saponinaEscarificadoMm),
          washHumidityPct: Number(form.washHumidityPct),
          saponinaSecadoMm: Number(form.saponinaSecadoMm),
          impurezas: {
            ...Object.fromEntries(Object.keys(form.impurezas).filter((k) => k !== 'otros_descripcion').map((k) => [k, Number(form.impurezas[k]) || 0])),
            otros_descripcion: form.impurezas.otros_descripcion?.trim() || null,
          },
          pesoImpurezaG: Number(form.pesoImpurezaG),
          tamanoGrano: Object.fromEntries(Object.keys(form.tamanoGrano).map((k) => [k, Number(form.tamanoGrano[k])])),
          clasificacionGrano: {
            contrastante: Number(form.contrastante),
            otros_controles: form.otrosControles.trim(),
            descripcion: form.descripcionClasificacion?.trim() || null,
          },
          cantidadPallets: Number(form.cantidadPallets),
          cantidadSacos: Number(form.cantidadSacos),
          palletsNoConformes: Number(form.palletsNoConformes),
          sacosNoConformes: Number(form.sacosNoConformes),
        }),
      )
      toast.success('Cambios guardados.')
      onActualizado(actualizado)
    } catch (err) {
      // el 409 (ya tiene vobo) no queda en `error` de forma clara para el
      // usuario final — se traduce a un mensaje puntual y se refresca el
      // registro para que la pantalla pase a solo lectura sola.
      if (err.status === 409) {
        toast.error('Ese control ya tiene visto bueno — no se puede editar.')
        onActualizado(control)
      }
      // el resto de los mensajes ya quedó en `error`
    }
  }

  const confirmarVobo = async () => {
    try {
      const actualizado = await ejecutar(() => controlProcesoAService.darVobo(control.id))
      toast.success('Visto bueno registrado.')
      onActualizado(actualizado)
      onCerrar()
    } catch (err) {
      toast.error(err.message ?? 'No se pudo registrar el visto bueno.')
    }
  }

  const impurezasConValor = Object.entries(LABEL_IMPUREZAS).filter(([key]) => (control.impurezas?.[key] ?? 0) > 0)

  return (
    <Modal abierto={abierto} titulo="Control de proceso" onCerrar={onCerrar} maxWidth="max-w-3xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-verde-bosque" strokeWidth={1.75} />
            <h3 className="text-sm font-bold text-marron-cafe">Lote y turno</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Dato etiqueta="Fecha operativa" valor={control.entryDate} />
            <Dato etiqueta="Turno" valor={turnoNombre ?? '—'} />
            <Dato etiqueta="Pureza" valor={`${control.purezaPct.toFixed(2)}%`} />
          </div>
          {editable && (
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <FormSelect
                label="Supervisor de Producción"
                value={form.supervisorProduccionId}
                onChange={(e) => actualizarForm('supervisorProduccionId')(e.target.value)}
              >
                <option value="">{usuarios ? 'Seleccionar…' : 'Cargando…'}</option>
                {usuarios?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </FormSelect>
              <FormSelect
                label="Encargado de grupo"
                value={form.encargadoGrupoId}
                onChange={(e) => actualizarForm('encargadoGrupoId')(e.target.value)}
              >
                <option value="">{usuarios ? 'Seleccionar…' : 'Cargando…'}</option>
                {usuarios?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}
        </div>

        {editable ? (
          <>
            {error && (
              <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
            )}
            <CamposMedicionControlProceso
              saponinaEscarificadoMm={form.saponinaEscarificadoMm}
              onCambiarSaponinaEscarificadoMm={actualizarForm('saponinaEscarificadoMm')}
              washHumidityPct={form.washHumidityPct}
              onCambiarWashHumidityPct={actualizarForm('washHumidityPct')}
              saponinaSecadoMm={form.saponinaSecadoMm}
              onCambiarSaponinaSecadoMm={actualizarForm('saponinaSecadoMm')}
              impurezas={form.impurezas}
              onCambiarImpurezas={actualizarForm('impurezas')}
              pesoImpurezaG={form.pesoImpurezaG}
              onCambiarPesoImpurezaG={actualizarForm('pesoImpurezaG')}
              tamanoGrano={form.tamanoGrano}
              onCambiarTamanoGrano={actualizarForm('tamanoGrano')}
              contrastante={form.contrastante}
              onCambiarContrastante={actualizarForm('contrastante')}
              otrosControles={form.otrosControles}
              onCambiarOtrosControles={actualizarForm('otrosControles')}
              descripcionClasificacion={form.descripcionClasificacion}
              onCambiarDescripcionClasificacion={actualizarForm('descripcionClasificacion')}
              cantidadPallets={form.cantidadPallets}
              onCambiarCantidadPallets={actualizarForm('cantidadPallets')}
              cantidadSacos={form.cantidadSacos}
              onCambiarCantidadSacos={actualizarForm('cantidadSacos')}
              palletsNoConformes={form.palletsNoConformes}
              onCambiarPalletsNoConformes={actualizarForm('palletsNoConformes')}
              sacosNoConformes={form.sacosNoConformes}
              onCambiarSacosNoConformes={actualizarForm('sacosNoConformes')}
            />
          </>
        ) : (
          <>
            <div className="grid gap-4 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-3">
              <Dato etiqueta="Humedad de lavado" valor={`${control.washHumidityPct.toFixed(2)}%`} />
              <Dato etiqueta="Saponina escarificado" valor={`${control.saponinaEscarificadoMm.toFixed(2)} mm`} />
              <Dato etiqueta="Saponina secado" valor={`${control.saponinaSecadoMm.toFixed(2)} mm`} />
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border border-marron-tierra/10 p-4">
              <h3 className="text-sm font-bold text-marron-cafe">Impurezas encontradas</h3>
              {impurezasConValor.length === 0 ? (
                <p className="text-xs text-marron-cafe/50">Sin impurezas registradas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {impurezasConValor.map(([key, label]) => (
                    <Badge key={key} tono="alerta">
                      {label}: {control.impurezas[key]}
                    </Badge>
                  ))}
                </div>
              )}
              {control.impurezas?.otros_descripcion && (
                <p className="text-xs text-marron-cafe/60">Otros: {control.impurezas.otros_descripcion}</p>
              )}
            </div>

            <div className="grid gap-4 rounded-2xl border border-marron-tierra/10 p-4 sm:grid-cols-4">
              <Dato etiqueta="Malla 12" valor={`${control.tamanoGrano.m12_pct}%`} />
              <Dato etiqueta="Malla 14" valor={`${control.tamanoGrano.m14_pct}%`} />
              <Dato etiqueta="Malla 16" valor={`${control.tamanoGrano.m16_pct}%`} />
              <Dato etiqueta="Polvillo" valor={`${control.tamanoGrano.polvillo_pct}%`} />
              <Dato etiqueta="Contrastante" valor={control.clasificacionGrano.contrastante} />
              <Dato etiqueta="Otros controles" valor={control.clasificacionGrano.otros_controles} />
              {control.clasificacionGrano.descripcion && (
                <Dato etiqueta="Descripción" valor={control.clasificacionGrano.descripcion} />
              )}
            </div>

            <div className="grid gap-4 rounded-2xl bg-marron-tierra/5 p-4 sm:grid-cols-2">
              <Dato etiqueta="Pallets / no conformes" valor={`${control.cantidadPallets} / ${control.palletsNoConformes}`} />
              <Dato etiqueta="Sacos / no conformes" valor={`${control.cantidadSacos} / ${control.sacosNoConformes}`} />
            </div>
          </>
        )}

        {control.observaciones && !editable && (
          <div className="rounded-2xl border border-marron-tierra/10 p-4">
            <Dato etiqueta="Observaciones" valor={control.observaciones} />
          </div>
        )}

        {control.voboEn ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-verde-bosque">
            <CheckCircle2 className="size-4" strokeWidth={2} />
            Ya tiene visto bueno.
          </p>
        ) : (
          <div className="flex flex-col items-end gap-2 border-t border-marron-tierra/10 pt-4">
            <div className="flex items-center justify-end gap-3">
              {editable && (
                <Button variant="secondary" onClick={guardarCambios} disabled={enviando} className="px-4 py-2 text-sm">
                  {enviando ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              )}
              {puedeAprobar && (
                <Button onClick={confirmarVobo} disabled={enviando} className="px-5 py-2.5">
                  {enviando ? 'Guardando…' : 'Confirmar visto bueno'}
                </Button>
              )}
              {!editable && !puedeAprobar && (
                <Button variant="secondary" onClick={onCerrar} className="px-4 py-2 text-sm">
                  Cerrar
                </Button>
              )}
            </div>
            {erroresValidacion.length > 0 && (
              <ul className="flex w-full flex-col gap-1 rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-right text-xs font-medium text-rojo-pasankalla">
                {erroresValidacion.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
