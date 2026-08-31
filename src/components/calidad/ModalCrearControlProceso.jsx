import { useEffect, useState } from 'react'
import { Layers } from 'lucide-react'
import { controlProcesoAService } from '../../services/controlProcesoAService'
import { shiftsService } from '../../services/shiftsService'
import { iamService } from '../../services/iamService'
import { useSolicitud } from '../../hooks/useSolicitud'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'
import Modal from '../Modal.jsx'
import CamposMedicionControlProceso from './CamposMedicionControlProceso.jsx'
import { IMPUREZAS_VACIAS, TAMANO_GRANO_VACIO, tamanoGranoValido } from './controlProcesoAConstantes'

function TituloSeccion({ Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-verde-bosque" strokeWidth={1.75} />
      <h3 className="text-sm font-bold text-marron-cafe">{children}</h3>
    </div>
  )
}

// Formulario de alta de control-proceso-a (control de calidad sobre el
// lavado de Área A) — ver comrural_erp_backend/docs/control-proceso-a.md.
// `inspectorId`/`purezaPct`/vobo NUNCA se mandan: el servidor los deriva
// (inspectorId del JWT, purezaPct calculado, vobo es un endpoint aparte).
// Los 4 bloques de medición (Saponina/Impurezas/Tamaño de grano/
// Conformidad) viven en CamposMedicionControlProceso.jsx, compartido con
// ModalDetalleControlProceso.jsx (edición) — acá solo queda la sección
// "Lote y turno", que en edición no es editable (son la clave natural del
// registro).
export default function ModalCrearControlProceso({ abierto, onCerrar, lotes, productoNombre, onCreada }) {
  const [lotId, setLotId] = useState('')
  const [shiftId, setShiftId] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [supervisorProduccionId, setSupervisorProduccionId] = useState('')
  const [encargadoGrupoId, setEncargadoGrupoId] = useState('')
  const [saponinaEscarificadoMm, setSaponinaEscarificadoMm] = useState('')
  const [washHumidityPct, setWashHumidityPct] = useState('')
  const [saponinaSecadoMm, setSaponinaSecadoMm] = useState('')
  const [impurezas, setImpurezas] = useState(IMPUREZAS_VACIAS)
  const [pesoImpurezaG, setPesoImpurezaG] = useState('')
  const [tamanoGrano, setTamanoGrano] = useState(TAMANO_GRANO_VACIO)
  const [contrastante, setContrastante] = useState('')
  const [otrosControles, setOtrosControles] = useState('')
  const [descripcionClasificacion, setDescripcionClasificacion] = useState(null)
  const [cantidadPallets, setCantidadPallets] = useState('')
  const [cantidadSacos, setCantidadSacos] = useState('')
  const [palletsNoConformes, setPalletsNoConformes] = useState('')
  const [sacosNoConformes, setSacosNoConformes] = useState('')

  const [turnos, setTurnos] = useState(null)
  const [usuarios, setUsuarios] = useState(null)
  const { enviando, error, ejecutar, limpiarError } = useSolicitud()

  useEffect(() => {
    if (!abierto) return
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
  }, [abierto])

  const reiniciar = () => {
    setLotId('')
    setShiftId('')
    setEntryDate(new Date().toLocaleDateString('en-CA'))
    setSupervisorProduccionId('')
    setEncargadoGrupoId('')
    setSaponinaEscarificadoMm('')
    setWashHumidityPct('')
    setSaponinaSecadoMm('')
    setImpurezas(IMPUREZAS_VACIAS)
    setPesoImpurezaG('')
    setTamanoGrano(TAMANO_GRANO_VACIO)
    setContrastante('')
    setOtrosControles('')
    setDescripcionClasificacion(null)
    setCantidadPallets('')
    setCantidadSacos('')
    setPalletsNoConformes('')
    setSacosNoConformes('')
    setErroresValidacion([])
  }

  const cerrar = () => {
    reiniciar()
    limpiarError()
    onCerrar()
  }

  const [erroresValidacion, setErroresValidacion] = useState([])

  // En vez de deshabilitar "Guardar" hasta que todo esté completo (el
  // usuario no entiende por qué el botón no reacciona), se deja siempre
  // clickeable y al enviar se valida acá — si falta algo, se lista debajo
  // del botón en vez de mandar el POST.
  const validar = () => {
    const errores = []
    if (!lotId) errores.push('Elegí un lote.')
    if (!shiftId) errores.push('Elegí un turno.')
    if (!entryDate) errores.push('La fecha operativa es obligatoria.')
    if (!supervisorProduccionId) errores.push('Elegí un supervisor de producción.')
    if (!encargadoGrupoId) errores.push('Elegí un encargado de grupo.')
    if (saponinaEscarificadoMm === '') errores.push('Saponina escarificado es obligatoria.')
    if (washHumidityPct === '') errores.push('Humedad de lavado es obligatoria.')
    if (saponinaSecadoMm === '') errores.push('Saponina secado es obligatoria.')
    if (pesoImpurezaG === '') errores.push('Peso total de impurezas es obligatorio.')
    const camposTamanoGrano = ['m12_pct', 'm14_pct', 'm16_pct', 'polvillo_pct']
    if (!camposTamanoGrano.every((k) => tamanoGrano[k] !== null && tamanoGrano[k] !== ''))
      errores.push('Completá los 4 porcentajes de tamaño de grano.')
    else if (!tamanoGranoValido(tamanoGrano)) errores.push('La suma de tamaño de grano debe estar entre 99.5% y 100.5%.')
    if (contrastante === '') errores.push('Contrastante es obligatorio.')
    if (otrosControles.trim() === '') errores.push("El campo 'Otros controles' es obligatorio.")
    if (cantidadPallets === '') errores.push('Cantidad de pallets es obligatoria.')
    if (cantidadSacos === '') errores.push('Cantidad de sacos es obligatoria.')
    if (cantidadPallets !== '' && Number(palletsNoConformes) > Number(cantidadPallets))
      errores.push('Pallets no conformes no puede superar la cantidad de pallets.')
    if (cantidadSacos !== '' && Number(sacosNoConformes) > Number(cantidadSacos))
      errores.push('Sacos no conformes no puede superar la cantidad de sacos.')
    return errores
  }

  const enviar = async (e) => {
    e.preventDefault()
    const errores = validar()
    if (errores.length > 0) {
      setErroresValidacion(errores)
      return
    }
    setErroresValidacion([])
    try {
      const creado = await ejecutar(() =>
        controlProcesoAService.crear({
          lotId,
          productoId: lotes.find((l) => l.id === lotId)?.productId,
          shiftId,
          entryDate,
          supervisorProduccionId,
          encargadoGrupoId,
          saponinaEscarificadoMm: Number(saponinaEscarificadoMm),
          washHumidityPct: Number(washHumidityPct),
          saponinaSecadoMm: Number(saponinaSecadoMm),
          impurezas: {
            ...Object.fromEntries(Object.keys(IMPUREZAS_VACIAS).filter((k) => k !== 'otros_descripcion').map((k) => [k, Number(impurezas[k]) || 0])),
            otros_descripcion: impurezas.otros_descripcion?.trim() || null,
          },
          pesoImpurezaG: Number(pesoImpurezaG),
          tamanoGrano: Object.fromEntries(Object.keys(TAMANO_GRANO_VACIO).map((k) => [k, Number(tamanoGrano[k])])),
          clasificacionGrano: {
            contrastante: Number(contrastante),
            otros_controles: otrosControles.trim(),
            descripcion: descripcionClasificacion?.trim() || null,
          },
          cantidadPallets: Number(cantidadPallets),
          cantidadSacos: Number(cantidadSacos),
          palletsNoConformes: Number(palletsNoConformes),
          sacosNoConformes: Number(sacosNoConformes),
        }),
      )
      onCreada(creado)
      cerrar()
    } catch {
      // el mensaje legible ya quedó en `error`
    }
  }

  return (
    <Modal abierto={abierto} titulo="Nuevo control de proceso" onCerrar={cerrar} maxWidth="max-w-3xl">
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        {error && (
          <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Layers}>Lote y turno</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormSelect label="Lote MP" value={lotId} onChange={(e) => setLotId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} · {productoNombre(l.productId)}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Turno" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
              <option value="">{turnos ? 'Seleccionar…' : 'Cargando…'}</option>
              {turnos?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FormSelect>
            <FormInput label="Fecha operativa" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            <FormSelect
              label="Supervisor de Producción"
              value={supervisorProduccionId}
              onChange={(e) => setSupervisorProduccionId(e.target.value)}
            >
              <option value="">{usuarios ? 'Seleccionar…' : 'Cargando…'}</option>
              {usuarios?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </FormSelect>
            <FormSelect label="Encargado de grupo" value={encargadoGrupoId} onChange={(e) => setEncargadoGrupoId(e.target.value)}>
              <option value="">{usuarios ? 'Seleccionar…' : 'Cargando…'}</option>
              {usuarios?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>

        <CamposMedicionControlProceso
          saponinaEscarificadoMm={saponinaEscarificadoMm}
          onCambiarSaponinaEscarificadoMm={setSaponinaEscarificadoMm}
          washHumidityPct={washHumidityPct}
          onCambiarWashHumidityPct={setWashHumidityPct}
          saponinaSecadoMm={saponinaSecadoMm}
          onCambiarSaponinaSecadoMm={setSaponinaSecadoMm}
          impurezas={impurezas}
          onCambiarImpurezas={setImpurezas}
          pesoImpurezaG={pesoImpurezaG}
          onCambiarPesoImpurezaG={setPesoImpurezaG}
          tamanoGrano={tamanoGrano}
          onCambiarTamanoGrano={setTamanoGrano}
          contrastante={contrastante}
          onCambiarContrastante={setContrastante}
          otrosControles={otrosControles}
          onCambiarOtrosControles={setOtrosControles}
          descripcionClasificacion={descripcionClasificacion}
          onCambiarDescripcionClasificacion={setDescripcionClasificacion}
          cantidadPallets={cantidadPallets}
          onCambiarCantidadPallets={setCantidadPallets}
          cantidadSacos={cantidadSacos}
          onCambiarCantidadSacos={setCantidadSacos}
          palletsNoConformes={palletsNoConformes}
          onCambiarPalletsNoConformes={setPalletsNoConformes}
          sacosNoConformes={sacosNoConformes}
          onCambiarSacosNoConformes={setSacosNoConformes}
        />

        <div className="flex flex-col items-end gap-2 border-t border-marron-tierra/10 pt-4">
          <Button type="submit" disabled={enviando} className="px-5 py-2.5">
            {enviando ? 'Guardando…' : 'Guardar control de proceso'}
          </Button>
          {erroresValidacion.length > 0 && (
            <ul className="flex w-full flex-col gap-1 rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-right text-xs font-medium text-rojo-pasankalla">
              {erroresValidacion.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </Modal>
  )
}
