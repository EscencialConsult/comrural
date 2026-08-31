import { useEffect, useState } from 'react'
import { Layers, Droplets, Beaker, Ruler, Boxes } from 'lucide-react'
import { controlProcesoAService } from '../../services/controlProcesoAService'
import { shiftsService } from '../../services/shiftsService'
import { iamService } from '../../services/iamService'
import { useSolicitud } from '../../hooks/useSolicitud'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import Button from '../Button.jsx'
import Modal from '../Modal.jsx'

// Conteo de piezas encontradas en la muestra, NO gramos — el peso total va
// aparte en pesoImpurezaG (ver comrural_erp_backend/docs/control-proceso-a.md
// §3, ERR-03: aclarado explícitamente para no confundir ambos).
const CAMPOS_IMPUREZAS = [
  { key: 'paja', label: 'Paja' },
  { key: 'heces_raton', label: 'Heces de ratón' },
  { key: 'heces_ave', label: 'Heces de ave' },
  { key: 'larva', label: 'Larva' },
  { key: 'semilla', label: 'Semilla' },
  { key: 'piedra_volcanica', label: 'Piedra volcánica' },
  { key: 'piedra_dura', label: 'Piedra dura' },
  { key: 'piedra_cuarzo', label: 'Piedra cuarzo' },
  { key: 'otros', label: 'Otros' },
]

// null (no 0) para que el input arranque vacío — un "0" precargado obliga a
// borrarlo a mano antes de tipear el valor real, y es fácil hacer clic sin
// darse cuenta de que ya había un cero.
const IMPUREZAS_VACIAS = Object.fromEntries([...CAMPOS_IMPUREZAS.map((c) => [c.key, null]), ['otros_descripcion', null]])

const CAMPOS_TAMANO_GRANO = [
  { key: 'm12_pct', label: 'Malla 12 (%)' },
  { key: 'm14_pct', label: 'Malla 14 (%)' },
  { key: 'm16_pct', label: 'Malla 16 (%)' },
  { key: 'polvillo_pct', label: 'Polvillo (%)' },
]
const TAMANO_GRANO_VACIO = { m12_pct: null, m14_pct: null, m16_pct: null, polvillo_pct: null }

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

  const sumaTamanoGrano = CAMPOS_TAMANO_GRANO.reduce((acc, { key }) => acc + (Number(tamanoGrano[key]) || 0), 0)
  const tamanoGranoValido = sumaTamanoGrano >= 99.5 && sumaTamanoGrano <= 100.5

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
    if (!CAMPOS_TAMANO_GRANO.every(({ key }) => tamanoGrano[key] !== null && tamanoGrano[key] !== ''))
      errores.push('Completá los 4 porcentajes de tamaño de grano.')
    else if (!tamanoGranoValido)
      errores.push(`La suma de tamaño de grano debe estar entre 99.5% y 100.5% (actual: ${sumaTamanoGrano.toFixed(2)}%).`)
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
            ...Object.fromEntries(CAMPOS_IMPUREZAS.map((c) => [c.key, Number(impurezas[c.key]) || 0])),
            otros_descripcion: impurezas.otros_descripcion?.trim() || null,
          },
          pesoImpurezaG: Number(pesoImpurezaG),
          tamanoGrano: Object.fromEntries(CAMPOS_TAMANO_GRANO.map(({ key }) => [key, Number(tamanoGrano[key])])),
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

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Droplets}>Saponina y humedad</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormInput
              label="Saponina escarificado (mm)"
              type="number"
              step="0.01"
              min="0"
              value={saponinaEscarificadoMm}
              onChange={(e) => setSaponinaEscarificadoMm(e.target.value)}
            />
            <FormInput
              label="Humedad de lavado (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={washHumidityPct}
              onChange={(e) => setWashHumidityPct(e.target.value)}
            />
            <FormInput
              label="Saponina secado (mm)"
              type="number"
              step="0.01"
              min="0"
              value={saponinaSecadoMm}
              onChange={(e) => setSaponinaSecadoMm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Beaker}>Impurezas (conteo de piezas) y pureza</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CAMPOS_IMPUREZAS.map(({ key, label }) => (
              <FormInput
                key={key}
                label={label}
                type="number"
                min="0"
                value={impurezas[key] ?? ''}
                onChange={(e) => setImpurezas((i) => ({ ...i, [key]: e.target.value === '' ? 0 : Number(e.target.value) }))}
              />
            ))}
          </div>
          <FormInput
            label="Descripción de 'otros' (opcional)"
            value={impurezas.otros_descripcion ?? ''}
            onChange={(e) => setImpurezas((i) => ({ ...i, otros_descripcion: e.target.value }))}
          />
          <FormInput
            label="Peso total de impurezas (g)"
            type="number"
            step="0.0001"
            min="0"
            value={pesoImpurezaG}
            onChange={(e) => setPesoImpurezaG(e.target.value)}
            hint={
              pesoImpurezaG !== ''
                ? `Pureza calculada: ${(100 - (100 * Number(pesoImpurezaG)) / 1000).toFixed(2)}%`
                : 'Sobre una referencia de 1000 g de muestra.'
            }
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Ruler}>Tamaño y clasificación de grano</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-4">
            {CAMPOS_TAMANO_GRANO.map(({ key, label }) => (
              <FormInput
                key={key}
                label={label}
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={tamanoGrano[key] ?? ''}
                onChange={(e) => setTamanoGrano((t) => ({ ...t, [key]: e.target.value === '' ? null : Number(e.target.value) }))}
              />
            ))}
          </div>
          <p className={`text-xs font-medium ${tamanoGranoValido ? 'text-verde-bosque' : 'text-rojo-pasankalla'}`}>
            Suma: {sumaTamanoGrano.toFixed(2)}% (debe estar entre 99.5% y 100.5%)
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormInput
              label="Contrastante"
              type="number"
              min="0"
              value={contrastante}
              onChange={(e) => setContrastante(e.target.value)}
            />
            <FormInput
              label="Otros controles"
              value={otrosControles}
              onChange={(e) => setOtrosControles(e.target.value)}
              className="sm:col-span-2"
            />
            <FormInput
              label="Descripción (opcional)"
              value={descripcionClasificacion ?? ''}
              onChange={(e) => setDescripcionClasificacion(e.target.value)}
              className="sm:col-span-3"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-marron-tierra/10 p-4">
          <TituloSeccion Icon={Boxes}>Conformidad de volumen</TituloSeccion>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormInput label="Cantidad de pallets" type="number" min="0" value={cantidadPallets} onChange={(e) => setCantidadPallets(e.target.value)} />
            <FormInput label="Cantidad de sacos" type="number" min="0" value={cantidadSacos} onChange={(e) => setCantidadSacos(e.target.value)} />
            <FormInput
              label="Pallets no conformes"
              type="number"
              min="0"
              value={palletsNoConformes}
              onChange={(e) => setPalletsNoConformes(e.target.value)}
            />
            <FormInput
              label="Sacos no conformes"
              type="number"
              min="0"
              value={sacosNoConformes}
              onChange={(e) => setSacosNoConformes(e.target.value)}
            />
          </div>
        </div>

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
