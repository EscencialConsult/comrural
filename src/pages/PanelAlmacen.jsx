import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Warehouse } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { productsService } from '../services/productsService'
import { lotsService } from '../services/lotsService'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import FormInput from '../components/FormInput.jsx'
import FormSelect from '../components/FormSelect.jsx'
import SearchInput from '../components/SearchInput.jsx'
import Button from '../components/Button.jsx'

const TIPOS_ENVASE = ['Saco de polipropileno', 'Bolsa de yute', 'Bolsa de rafia', 'A granel']

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })

// Almacén — igual que Compras, se construye SOLO lo que el backend puede
// respaldar de verdad; el resto queda mockeado y marcado explícitamente.
// Estado real de la base: solo existe `lots` (con su currentStatus) y
// `products`/`suppliers`. NO existe ningún endpoint para cambiar
// currentStatus (ver docs/lots.md §9) — así que "registrar llegada",
// "cerrar recepción" y "emitir R-11" no pueden mover el lote de verdad
// todavía: quedan como una sesión LOCAL (en memoria de este componente,
// se pierde al recargar la página), no hay tablas para R-02/R-11 en la
// base. La co-edición con Calidad tampoco existe (necesitaría un sistema
// de presencia en tiempo real) — se muestra como texto fijo, no simulado
// dinámicamente, para no fingir una sincronía que no hay.
export default function PanelAlmacen() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')

  const [productos, setProductos] = useState(null)
  const [lotes, setLotes] = useState(null)
  const [sesiones, setSesiones] = useState({}) // lotId -> { apertura, cierre }
  const [pantalla, setPantalla] = useState({ vista: 'lista', lotId: null })

  useEffect(() => {
    if (!puedeVer) return
    let cancelado = false
    productsService.listar().then((data) => !cancelado && setProductos(data))
    lotsService.listar().then((data) => !cancelado && setLotes(data))
    return () => {
      cancelado = true
    }
  }, [puedeVer])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  const lotesPM = useMemo(() => (lotes ?? []).filter((l) => l.nature === 'PM'), [lotes])

  // KPIs reales — cuentan currentStatus de verdad. Van a mostrar 0 en
  // "En proceso"/"Liberados"/"Rechazados" hasta que exista un endpoint que
  // pueda mover un lote a esos estados — no es un dato falso, es el estado
  // real de la base hoy.
  const kpis = useMemo(() => {
    const enProceso = ['EN_RECEPCION', 'ACEPTADO_RECEPCION', 'EN_ANALISIS', 'PENDIENTE_LIBERACION']
    return {
      pendientes: lotesPM.filter((l) => l.currentStatus === 'PROGRAMADO').length,
      enProceso: lotesPM.filter((l) => enProceso.includes(l.currentStatus)).length,
      liberados: lotesPM.filter((l) => l.currentStatus === 'LIBERADO').length,
      rechazados: lotesPM.filter((l) => l.currentStatus === 'RECHAZADO').length,
    }
  }, [lotesPM])

  const pendientes = useMemo(
    () => lotesPM.filter((l) => l.currentStatus === 'PROGRAMADO' && !sesiones[l.id]?.cierre),
    [lotesPM, sesiones],
  )

  const abrirApertura = (lotId) => setPantalla({ vista: 'apertura', lotId })
  const abrirCierre = (lotId) => setPantalla({ vista: 'cierre', lotId })
  const volverALista = () => setPantalla({ vista: 'lista', lotId: null })

  const registrarApertura = (lotId, datos) => {
    setSesiones((prev) => ({ ...prev, [lotId]: { ...prev[lotId], apertura: datos, cierre: null } }))
    setPantalla({ vista: 'lista', lotId: null })
  }

  const registrarCierre = (lotId, datos) => {
    setSesiones((prev) => ({ ...prev, [lotId]: { ...prev[lotId], cierre: datos } }))
    setPantalla({ vista: 'lista', lotId: null })
  }

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Almacén." />
  }

  const lotEnCurso = lotes?.find((l) => l.id === pantalla.lotId)

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Warehouse className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Almacén</h1>
          <p className="text-sm text-marron-cafe/60">Recepción de materia prima.</p>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <StatCard valor={kpis.pendientes} etiqueta="Mis pendientes" />
        <StatCard valor={kpis.enProceso} etiqueta="En proceso" />
        <StatCard valor={kpis.liberados} etiqueta="Liberados" />
        <StatCard valor={kpis.rechazados} etiqueta="Rechazados" />
      </section>

      {pantalla.vista === 'lista' && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-marron-cafe">Lotes pendientes de recepción</h2>
          {lotes === null ? (
            <p className="text-sm text-marron-cafe/50">Cargando…</p>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-marron-tierra/5">
              {pendientes.map((l) => {
                const sesion = sesiones[l.id]
                return (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-marron-tierra/10 px-4 py-3.5 last:border-b-0">
                    <div>
                      <p className="font-mono text-xs text-marron-cafe/50">{l.code}</p>
                      <p className="font-semibold text-marron-cafe">{productoNombre(l.productId)}</p>
                      <p className="text-xs text-marron-cafe/50">
                        Llegada programada: {l.scheduledReceptionAt ? formatearFechaHora(l.scheduledReceptionAt) : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-marron-tierra/10 px-2.5 py-0.5 text-xs font-medium text-marron-cafe/50">
                        Sin co-edición activa
                      </span>
                      {!sesion?.apertura ? (
                        <Button className="px-4 py-1.5 text-sm" onClick={() => abrirApertura(l.id)}>
                          Registrar llegada
                        </Button>
                      ) : (
                        <Button className="px-4 py-1.5 text-sm" onClick={() => abrirCierre(l.id)}>
                          Cerrar recepción
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
              {pendientes.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                  No hay lotes de materia prima esperando recepción.
                </p>
              )}
            </div>
          )}

          {Object.entries(sesiones).some(([, s]) => s.cierre) && (
            <>
              <h2 className="mt-4 text-lg font-bold text-marron-cafe">Recepciones cerradas (sesión local)</h2>
              <div className="overflow-x-auto rounded-3xl bg-marron-tierra/5">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-marron-cafe/40">
                      <th className="px-4 py-3">Lote</th>
                      <th className="px-4 py-3">Peso neto</th>
                      <th className="px-4 py-3">Bolsas aceptadas</th>
                      <th className="px-4 py-3">Sacos rechazados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sesiones)
                      .filter(([, s]) => s.cierre)
                      .map(([lotId, s]) => {
                        const l = lotes.find((x) => x.id === lotId)
                        return (
                          <tr key={lotId} className="border-t border-marron-tierra/10">
                            <td className="px-4 py-3 font-mono text-xs text-marron-cafe">{l?.code}</td>
                            <td className="px-4 py-3 text-marron-cafe">{s.cierre.pesoNetoKg || '—'} kg</td>
                            <td className="px-4 py-3 text-marron-cafe">{s.cierre.bolsasAceptadas || '—'}</td>
                            <td className="px-4 py-3 text-marron-cafe">{s.cierre.sacosRechazados || '0'}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {pantalla.vista === 'apertura' && lotEnCurso && (
        <FormularioApertura
          lot={lotEnCurso}
          productoNombre={productoNombre(lotEnCurso.productId)}
          onCancelar={volverALista}
          onGuardar={(datos) => registrarApertura(lotEnCurso.id, datos)}
        />
      )}

      {pantalla.vista === 'cierre' && lotEnCurso && (
        <FormularioCierre
          lot={lotEnCurso}
          onCancelar={volverALista}
          onGuardar={(datos) => registrarCierre(lotEnCurso.id, datos)}
        />
      )}
    </main>
  )
}

// Apertura de R-02 — TODO local, ver nota de arriba: no hay tabla ni
// endpoint para esta sesión de recepción, solo se guarda en memoria del
// componente padre mientras la pestaña siga abierta. "Registrar llegada"
// no mueve currentStatus de verdad (no existe ese endpoint) — la sesión
// local queda marcada como "en curso" hasta el cierre, que es el
// equivalente visual a lo que sería pasar a EN_RECEPCION.
function FormularioApertura({ lot, productoNombre, onCancelar, onGuardar }) {
  // Sección 1 — Control de documentos.
  const [listaProductores, setListaProductores] = useState('')
  const [guiaRemision, setGuiaRemision] = useState('')

  // Sección 2 — Datos de recepción. Producto/lote no son estado propio,
  // vienen heredados del lote real seleccionado (por FK), por eso no hay
  // useState para esos dos — se muestran de solo lectura más abajo.
  const [fechaRecepcion, setFechaRecepcion] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [tipoEnvase, setTipoEnvase] = useState('')
  const [numeroBolsas, setNumeroBolsas] = useState('')

  // Sección 3 — Datos del vehículo.
  const [placa, setPlaca] = useState('')
  const [vehiculo, setVehiculo] = useState('')
  const [color, setColor] = useState('')

  // Sección 4 — Datos del conductor.
  const [conductor, setConductor] = useState('')
  const [licencia, setLicencia] = useState('')

  const submit = (e) => {
    e.preventDefault()
    onGuardar({
      listaProductores, guiaRemision,
      fechaRecepcion, horaInicio, tipoEnvase, numeroBolsas,
      placa, vehiculo, color,
      conductor, licencia,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-3xl bg-marron-tierra/5 p-6">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Ingreso de materia prima — Apertura R-02</h2>
        <p className="text-xs text-marron-cafe/50 italic">
          Todo este formulario es local a esta pestaña — no hay tabla R-02 en el backend todavía.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-marron-cafe">1. Control de documentos</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect label="Lista de productores" value={listaProductores} onChange={(e) => setListaProductores(e.target.value)}>
            <option value="">Seleccioná…</option>
            <option value="CUMPLE">Cumple</option>
            <option value="NO_CUMPLE">No cumple</option>
          </FormSelect>
          <FormSelect label="Guía de remisión" value={guiaRemision} onChange={(e) => setGuiaRemision(e.target.value)}>
            <option value="">Seleccioná…</option>
            <option value="CUMPLE">Cumple</option>
            <option value="NO_CUMPLE">No cumple</option>
          </FormSelect>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-marron-cafe">2. Datos de recepción</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Producto" disabled value={productoNombre} hint="Heredado del lote — no se recaptura." />
          <FormInput label="Lote designado" disabled value={lot.code} hint="Heredado del lote — no se recaptura." />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <FormInput label="Fecha de recepción" type="date" value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)} />
          <FormInput label="Hora inicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
          <FormSelect label="Tipo de envase" value={tipoEnvase} onChange={(e) => setTipoEnvase(e.target.value)}>
            <option value="">Seleccioná…</option>
            {TIPOS_ENVASE.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FormSelect>
          <FormInput label="N° de bolsas" type="number" min="0" value={numeroBolsas} onChange={(e) => setNumeroBolsas(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-marron-cafe">3. Datos del vehículo</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <SearchInput label="N° de placa" placeholder="Escribe para buscar…" value={placa} onChange={(e) => setPlaca(e.target.value)} />
          <FormInput label="Vehículo" placeholder="Camión, furgón…" value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} />
          <FormInput label="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-marron-cafe">4. Datos del conductor</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <SearchInput label="Nombre del conductor" placeholder="Escribe el nombre…" value={conductor} onChange={(e) => setConductor(e.target.value)} />
          <SearchInput label="N° de licencia" placeholder="Escribe la licencia…" value={licencia} onChange={(e) => setLicencia(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <span title="No mueve el estado real del lote todavía — no existe un endpoint para eso. Solo pasa a 'en curso' en esta sesión local.">
          <Button type="submit">Registrar llegada →</Button>
        </span>
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

// Cierre de R-02 + Nota de Recepción R-11 — mismo criterio: local, no
// persiste. "Emitir R-11" solo arma una vista previa del documento, no
// genera nada real (no hay PDF ni tabla para notas de recepción).
function FormularioCierre({ lot, onCancelar, onGuardar }) {
  const [ticketBalanza, setTicketBalanza] = useState('')
  const [pesoBrutoKg, setPesoBrutoKg] = useState('')
  const [pesoNetoKg, setPesoNetoKg] = useState('')
  const [finDescarga, setFinDescarga] = useState('')
  const [bolsasAceptadas, setBolsasAceptadas] = useState('')
  const [sacosRechazados, setSacosRechazados] = useState('')
  const [causalRechazo, setCausalRechazo] = useState('')
  const [firmaAlmacen, setFirmaAlmacen] = useState('')
  const [firmaConductor, setFirmaConductor] = useState('')
  const [emitido, setEmitido] = useState(false)

  const pesoNetoQq = pesoNetoKg ? (Number(pesoNetoKg) / 46).toFixed(2) : ''

  const submit = (e) => {
    e.preventDefault()
    setEmitido(true)
  }

  const confirmar = () => {
    onGuardar({
      ticketBalanza, pesoBrutoKg, pesoNetoKg, finDescarga,
      bolsasAceptadas, sacosRechazados, causalRechazo, firmaAlmacen, firmaConductor,
    })
  }

  if (emitido) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl bg-verde-hoja/10 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 shrink-0 text-verde-bosque" strokeWidth={1.75} />
          <div>
            <h2 className="text-lg font-bold text-verde-bosque">Nota de Recepción R-11 — vista previa</h2>
            <p className="text-xs text-verde-bosque/70 italic">
              No se generó ningún documento real ni se guardó nada — no hay tabla R-11 en el backend.
            </p>
          </div>
        </div>
        <div className="grid gap-2 rounded-2xl bg-white/60 p-4 text-sm text-marron-cafe sm:grid-cols-2">
          <p><span className="text-marron-cafe/50">Lote:</span> {lot.code}</p>
          <p><span className="text-marron-cafe/50">Peso neto:</span> {pesoNetoKg} kg ({pesoNetoQq} qq)</p>
          <p><span className="text-marron-cafe/50">Bolsas aceptadas (para pago):</span> {bolsasAceptadas || '0'}</p>
          <p><span className="text-marron-cafe/50">Sacos rechazados:</span> {sacosRechazados || '0'}</p>
          <p className="sm:col-span-2"><span className="text-marron-cafe/50">Causal de devolución:</span> {causalRechazo || '—'}</p>
          <p><span className="text-marron-cafe/50">Firma Almacén:</span> {firmaAlmacen || '—'}</p>
          <p><span className="text-marron-cafe/50">Firma Conductor/Proveedor:</span> {firmaConductor || '—'}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={confirmar}>Confirmar cierre</Button>
          <Button variant="secondary" onClick={() => setEmitido(false)}>
            Volver a editar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 rounded-3xl bg-marron-tierra/5 p-6">
      <div>
        <h2 className="text-lg font-bold text-marron-cafe">Cierre de recepción y pesaje — {lot.code}</h2>
        <p className="text-xs text-marron-cafe/50 italic">Local a esta pestaña, mismo motivo que la apertura.</p>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-marron-cafe">Datos de balanza</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput placeholder="Ticket de balanza" value={ticketBalanza} onChange={(e) => setTicketBalanza(e.target.value)} />
          <FormInput type="number" min="0" placeholder="Peso bruto (kg)" value={pesoBrutoKg} onChange={(e) => setPesoBrutoKg(e.target.value)} />
          <FormInput
            type="number"
            min="0"
            placeholder="Peso neto (kg)"
            value={pesoNetoKg}
            onChange={(e) => setPesoNetoKg(e.target.value)}
            hint={pesoNetoQq ? `${pesoNetoQq} quintales` : undefined}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-marron-cafe">Resumen de bolsas</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormInput type="datetime-local" value={finDescarga} onChange={(e) => setFinDescarga(e.target.value)} />
          <FormInput type="number" min="0" placeholder="Bolsas aceptadas" value={bolsasAceptadas} onChange={(e) => setBolsasAceptadas(e.target.value)} />
          <FormInput type="number" min="0" placeholder="Sacos rechazados" value={sacosRechazados} onChange={(e) => setSacosRechazados(e.target.value)} />
        </div>
        <FormInput placeholder="Causal de devolución (si hay rechazados)" value={causalRechazo} onChange={(e) => setCausalRechazo(e.target.value)} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-marron-cafe">Firmas</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput placeholder="Responsable de Almacén (COMRURAL)" value={firmaAlmacen} onChange={(e) => setFirmaAlmacen(e.target.value)} />
          <FormInput placeholder="Conductor / Proveedor" value={firmaConductor} onChange={(e) => setFirmaConductor(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit">Emitir Nota de Recepción (R-11)</Button>
        <Button type="button" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
