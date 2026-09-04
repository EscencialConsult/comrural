import { useEffect, useMemo, useState } from 'react'
import { Send, Stamp, Gavel, Truck, Ban, SquareCheck, Square } from 'lucide-react'
import { suppliersService } from '../../services/suppliersService'
import { externalShipmentsService } from '../../services/externalShipmentsService'
import { listarTodo } from '../../services/paginacion'
import { laboratoryReportsService } from '../../services/laboratoryReportsService'
import { UNIDADES_SUBMUESTRA } from '../../config/laboratoriosDestino'
import { useAuth } from '../../context/AuthContext.jsx'
import { toast } from '../../lib/toast'
import BotonVolver from '../BotonVolver.jsx'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import SelectorDeBase from '../formularios/SelectorDeBase.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'
import SubidorDocumento from './SubidorDocumento.jsx'

// Registro I-LAB-16/R-01 — "Registro Envío de Muestras". Ahora respaldado
// por `external_shipments` real, con su circuito de dos firmas:
//
//   BORRADOR → (enviar a firma) PENDIENTE_GAC → (verificar) PENDIENTE_GG
//            → (autorizar) AUTORIZADO → (despachar) ENVIADO
//            → (cargar resultado) RESULTADO_RECIBIDO → CERRADO
//
// Se abre en dos situaciones distintas:
//   * `envio === null` → se está ARMANDO uno nuevo, con los `ensayos` que
//     vienen del bloque "Por despachar".
//   * `envio` presente → se está gestionando uno ya creado; el formulario
//     pasa a solo lectura y lo que se muestra son las acciones de su estado.
const TIPOS_SERVICIO = ['HIPER', 'SUPER', 'REGULAR']

const ESTADO_TONO = {
  BORRADOR: 'neutro',
  PENDIENTE_GAC: 'alerta',
  PENDIENTE_GG: 'alerta',
  AUTORIZADO: 'positivo',
  ENVIADO: 'positivo',
  RESULTADO_RECIBIDO: 'positivo',
  CERRADO: 'positivo',
  ANULADO: 'negativo',
}

// El nombre visible de un proveedor sale de la persona o la organización que
// lo respalda — nunca las dos (ver suppliers_exactly_one_identity_check).
const nombreProveedor = (sup) =>
  sup.organization?.tradeName ??
  sup.organization?.legalName ??
  [sup.person?.firstNames, sup.person?.lastNames].filter(Boolean).join(' ') ??
  'Sin nombre'

export default function FormularioAutorizarEnvio({ solicitud, ensayos, envio: envioInicial, onVolver }) {
  const { permisos } = useAuth()
  const puedeVerificar = permisos.has('external-shipments:verify')
  const puedeAutorizar = permisos.has('external-shipments:authorize')
  const puedeGestionar = permisos.has('external-shipments:manage')
  const puedeCargarInforme = permisos.has('laboratory-reports:manage')

  const [envio, setEnvio] = useState(envioInicial ?? null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  // Catálogo real de laboratorios: proveedores activos con type=LABORATORY.
  // Si el que hace falta no está, se da de alta en Proveedores — no hay
  // opción de escribir un nombre suelto.
  const [laboratorios, setLaboratorios] = useState([])
  const [cargandoLabs, setCargandoLabs] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarTodo(suppliersService.listar, { type: 'LABORATORY', isActive: true })
      .then((proveedores) => {
        if (cancelado) return
        setLaboratorios(proveedores.map((s) => ({ id: s.id, nombre: nombreProveedor(s), detalle: '' })))
      })
      .catch((err) => {
        if (cancelado) return
        // El detalle real (útil para diagnosticar) queda en consola, no en
        // pantalla — a quien usa esto no le sirve un mensaje de backend.
        console.error('No se pudo cargar el catálogo de laboratorios:', err)
        setError('No se pudo cargar el catálogo de laboratorios. Probá de nuevo en un momento.')
      })
      .finally(() => !cancelado && setCargandoLabs(false))
    return () => {
      cancelado = true
    }
  }, [])

  // ---- Formulario de alta (solo cuando todavía no existe el envío) ------
  const [laboratorio, setLaboratorio] = useState(null)
  const [destino, setDestino] = useState('')
  const [tipoServicio, setTipoServicio] = useState('REGULAR')
  const [cuantificacion, setCuantificacion] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState('G')
  const [justificacion, setJustificacion] = useState('')
  const [fechaResultado, setFechaResultado] = useState('')
  // Precio unitario por ensayo — solo aplica mientras se arma el envío
  // (`!envio`); una vez creado, el precio de cada ítem viaja de solo
  // lectura en `envio.items[i].unitPrice` (ver `ensayosDelEnvio`).
  const [precios, setPrecios] = useState({})
  // Qué ensayos van EN ESTE envío puntual — pedido explícito: `ensayos`
  // (prop) trae TODOS los pendientes de externo de la solicitud, no solo
  // los que se quieren mandar ahora; el resto queda para otro envío
  // después, a otro laboratorio si hace falta. Arranca vacío (nada
  // tildado) — pedido explícito, para no dar por hecho que este envío es
  // "todos juntos" y forzar a elegir a propósito cada vez.
  const [seleccionados, setSeleccionados] = useState(new Set())
  const alternarSeleccion = (itemId) => {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(itemId)) siguiente.delete(itemId)
      else siguiente.add(itemId)
      return siguiente
    })
  }

  const ensayosDelEnvio = useMemo(() => {
    if (envio) return envio.items.map((i) => ({ id: i.itemId, nombre: i.testName, unitPrice: i.unitPrice }))
    return (ensayos ?? []).map((i) => ({ id: i.id, nombre: i.isCustom ? i.otherTestName : i.name }))
  }, [envio, ensayos])

  // Precio total — ya no se tipea, se suma sola de los precios unitarios de
  // los ensayos SELECCIONADOS. Con `envio` ya creado, la suma sale de
  // `unitPrice` (lo que quedó guardado, ahí todos los items del envío ya
  // están seleccionados por definición); mientras se arma, de `precios`.
  const precioTotalCalculado = useMemo(() => {
    const fuente = envio
      ? envio.items.map((i) => i.unitPrice)
      : ensayosDelEnvio.filter((e) => seleccionados.has(e.id)).map((e) => precios[e.id])
    return fuente.reduce((acc, v) => acc + (Number(v) || 0), 0)
  }, [envio, ensayosDelEnvio, precios, seleccionados])

  // Precarga el destino analítico con los ensayos que viajan — es un texto
  // libre en el papel, pero por defecto describe qué se manda.
  useEffect(() => {
    if (!envio && destino === '' && ensayosDelEnvio.length > 0) {
      setDestino(ensayosDelEnvio.map((e) => e.nombre).join(', ').slice(0, 200))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensayosDelEnvio.length])

  const puedeCrear =
    laboratorio !== null &&
    destino.trim() !== '' &&
    Number(cantidad) > 0 &&
    ensayosDelEnvio.length > 0 &&
    (envio || seleccionados.size > 0)

  const ejecutar = async (accion, mensajeExito) => {
    setError(null)
    setGuardando(true)
    try {
      const actualizado = await accion()
      if (actualizado) setEnvio(actualizado)
      if (mensajeExito) toast.success(mensajeExito)
      return actualizado
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setGuardando(false)
    }
  }

  const crear = () =>
    ejecutar(
      () =>
        externalShipmentsService.crear(solicitud.id, {
          laboratorySupplierId: laboratorio.id,
          analyticalDestination: destino.trim(),
          serviceType: tipoServicio,
          ...(cuantificacion.trim() ? { quantification: cuantificacion.trim() } : {}),
          quantity: cantidad,
          unit: unidad,
          ...(precioTotalCalculado > 0 ? { totalPrice: precioTotalCalculado.toFixed(2) } : {}),
          ...(justificacion.trim() ? { justification: justificacion.trim() } : {}),
          ...(fechaResultado ? { expectedResultDate: fechaResultado } : {}),
          items: ensayosDelEnvio
            .filter((e) => seleccionados.has(e.id))
            .map((e) => ({ itemId: e.id, ...(precios[e.id] ? { unitPrice: precios[e.id] } : {}) })),
        }),
      'Envío creado en borrador.',
    )

  const esBorrador = !envio || envio.status === 'BORRADOR'

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a Solicitudes" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-marron-cafe sm:text-lg">
            {envio ? 'Envío externo' : 'Armar envío externo'} — {solicitud.sample.code}
          </h2>
          <p className="truncate text-xs text-marron-cafe/60">
            Lote {solicitud.lot.code} · {solicitud.product.name}
          </p>
        </div>
        {envio && <Badge tono={ESTADO_TONO[envio.status] ?? 'neutro'}>{envio.status.replace(/_/g, ' ')}</Badge>}
      </div>

      <CabeceraFormulario
        antetitulo="Registro"
        titulo="Registro Envío de Muestras"
        codigo="I-LAB-16/R-01"
        version="03"
        pagina="1 de 1"
      />

      {error && (
        <p className="rounded-xl bg-rojo-pasankalla/10 px-3 py-2 text-sm font-medium text-rojo-pasankalla">{error}</p>
      )}

      <SeccionFormulario numero={1} titulo="Muestra y ensayos">
        <div className="flex flex-col gap-3">
          {!envio && (
            <p className="text-xs text-marron-cafe/50">
              Tildá qué ensayos van en este envío — los que dejes afuera quedan pendientes para armar otro envío
              después, a otro laboratorio si hace falta. A los tildados se les activa el precio unitario.
            </p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ensayosDelEnvio.map((e) => {
              if (envio) {
                return (
                  <div key={e.id} className="flex items-center gap-2 rounded-full bg-marron-tierra/5 py-1 pr-1.5 pl-3">
                    <span className="min-w-0 flex-1 truncate text-xs text-marron-cafe/70" title={e.nombre}>
                      {e.nombre}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-marron-cafe/60">
                      {e.unitPrice != null ? `$${e.unitPrice}` : 'Sin precio'}
                    </span>
                  </div>
                )
              }
              const tildado = seleccionados.has(e.id)
              return (
                <div
                  key={e.id}
                  className={`flex items-center gap-2 rounded-full border py-1 pr-1.5 pl-1 transition-colors duration-150 ${
                    tildado ? 'border-verde-hoja/40 bg-verde-hoja/10' : 'border-marron-tierra/15 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={tildado}
                    onClick={() => alternarSeleccion(e.id)}
                    title={tildado ? 'Va en este envío — clic para dejarlo afuera' : 'Queda afuera de este envío — clic para incluirlo'}
                    className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                      tildado ? 'text-verde-bosque' : 'text-marron-cafe/40'
                    }`}
                  >
                    {tildado ? (
                      <SquareCheck className="size-3.5 shrink-0" strokeWidth={2.25} />
                    ) : (
                      <Square className="size-3.5 shrink-0" strokeWidth={2.25} />
                    )}
                    <span className="min-w-0 truncate" title={e.nombre}>
                      {e.nombre}
                    </span>
                  </button>
                  {tildado && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-marron-tierra/15">
                      <span className="text-xs text-marron-cafe/40">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        aria-label={`Precio unitario de ${e.nombre}`}
                        value={precios[e.id] ?? ''}
                        onChange={(ev) => setPrecios((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                        className="w-14 bg-transparent text-xs text-marron-cafe outline-none"
                      />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-marron-cafe/50">
            Muestra total disponible: {solicitud.sample.quantity}{' '}
            {solicitud.sample.unit === 'OTRA' ? solicitud.sample.otherUnit : solicitud.sample.unit}
          </p>
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Destino y servicio">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {envio ? (
            <FormInput
              label="Laboratorio"
              value={laboratorios.find((l) => l.id === envio.laboratorySupplierId)?.nombre ?? envio.laboratorySupplierId}
              disabled
            />
          ) : (
            <SelectorDeBase
              label="Laboratorio destino"
              valor={laboratorio}
              opciones={laboratorios}
              onSeleccionar={setLaboratorio}
              cargando={cargandoLabs}
              placeholder="Buscar laboratorio…"
              className="sm:col-span-2 lg:col-span-1"
            />
          )}

          <FormInput
            label="Destino analítico"
            value={envio ? envio.analyticalDestination : destino}
            onChange={(e) => setDestino(e.target.value)}
            disabled={!!envio}
            className="sm:col-span-2"
          />

          <FormSelect
            label="Tipo de servicio"
            value={envio ? envio.serviceType : tipoServicio}
            onChange={(e) => setTipoServicio(e.target.value)}
            disabled={!!envio}
          >
            {TIPOS_SERVICIO.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </FormSelect>

          <FormInput
            label="Tipo de cuantificación"
            value={envio ? (envio.quantification ?? '') : cuantificacion}
            onChange={(e) => setCuantificacion(e.target.value)}
            disabled={!!envio}
          />

          <FormInput
            label="Cantidad enviada"
            type="number"
            min="0.001"
            step="0.001"
            value={envio ? envio.quantity : cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            disabled={!!envio}
          />

          <FormSelect
            label="Unidad"
            value={envio ? envio.unit : unidad}
            onChange={(e) => setUnidad(e.target.value)}
            disabled={!!envio}
          >
            {UNIDADES_SUBMUESTRA.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </FormSelect>

          <FormInput
            label="Precio total ($)"
            hint="Se suma solo, de los precios unitarios de cada ensayo."
            type="number"
            value={envio ? (envio.totalPrice ?? '') : precioTotalCalculado.toFixed(2)}
            disabled
          />

          <FormInput
            label="Fecha esperada de resultado"
            type="date"
            value={envio ? (envio.expectedResultDate ?? '') : fechaResultado}
            onChange={(e) => setFechaResultado(e.target.value)}
            disabled={!!envio && envio.status !== 'AUTORIZADO'}
          />

          <label className="flex flex-col gap-1.5 text-sm text-marron-cafe sm:col-span-2 lg:col-span-3">
            Justificación
            <textarea
              rows={3}
              value={envio ? (envio.justification ?? '') : justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              disabled={!!envio}
              placeholder="Motivo del envío — opcional si es parte de un programa de seguimiento."
              className="w-full resize-y rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima disabled:bg-marron-tierra/5 disabled:text-marron-cafe/50"
            />
          </label>
        </div>
      </SeccionFormulario>

      {envio && (
        <SeccionFormulario numero={3} titulo="Autorización">
          <div className="grid gap-4 sm:grid-cols-2">
            <FirmaEstado
              titulo="Verificación GAC"
              Icon={Stamp}
              estado={envio.verification.status}
              fecha={envio.verification.at}
              observacion={envio.verification.observation}
            />
            <FirmaEstado
              titulo="Autorización Gerencia General"
              Icon={Gavel}
              estado={envio.authorization.status}
              fecha={envio.authorization.at}
              observacion={envio.authorization.observation}
            />
          </div>
        </SeccionFormulario>
      )}

      {envio && ['ENVIADO', 'RESULTADO_RECIBIDO', 'CERRADO'].includes(envio.status) && (
        <SeccionFormulario numero={4} titulo="Resultado del laboratorio">
          {envio.status === 'ENVIADO' && puedeCargarInforme ? (
            <SubidorDocumento
              etiqueta="Informe del laboratorio externo (PDF)"
              ayuda="Se sube directo al almacenamiento privado; el backend verifica el archivo antes de aceptarlo."
              onSubido={async (documento) => {
                await ejecutar(async () => {
                  await laboratoryReportsService.crearExterno(envio.id, { documentId: documento.id })
                  return externalShipmentsService.obtener(envio.id)
                }, 'Resultado registrado — queda pendiente de validación.')
              }}
            />
          ) : (
            <p className="text-sm text-marron-cafe/60">
              {envio.status === 'ENVIADO'
                ? 'Esperando el informe del laboratorio.'
                : 'El resultado ya fue registrado — se valida desde la pestaña de informes de la solicitud.'}
            </p>
          )}
        </SeccionFormulario>
      )}

      {/* Acciones según el estado. Cada una está además gateada por su
          permiso: `authorize` no lo tiene el rol calidad a propósito. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-marron-tierra/10 pt-4">
        <Button type="button" variant="secondary" onClick={onVolver}>
          Volver
        </Button>

        {!envio && (
          <Button type="button" disabled={!puedeCrear || guardando} onClick={crear} className="gap-1.5">
            <Send className="size-4" strokeWidth={2} />
            {guardando ? 'Creando…' : 'Crear envío'}
          </Button>
        )}

        {envio && esBorrador && puedeGestionar && (
          <Button
            type="button"
            disabled={guardando}
            onClick={() => ejecutar(() => externalShipmentsService.enviarAFirma(envio.id), 'Enviado a verificación GAC.')}
            className="gap-1.5"
          >
            <Send className="size-4" strokeWidth={2} />
            Enviar a verificación
          </Button>
        )}

        {envio?.status === 'PENDIENTE_GAC' && puedeVerificar && (
          <>
            <Button
              type="button"
              disabled={guardando}
              onClick={() =>
                ejecutar(() => externalShipmentsService.verificar(envio.id, { approved: true }), 'Verificado — pasa a Gerencia.')
              }
              className="gap-1.5"
            >
              <Stamp className="size-4" strokeWidth={2} />
              Verificar (GAC)
            </Button>
            <BotonObservar
              disabled={guardando}
              etiqueta="Observar"
              onConfirmar={(observation) =>
                ejecutar(
                  () => externalShipmentsService.verificar(envio.id, { approved: false, observation }),
                  'Observado — vuelve a borrador para corregir.',
                )
              }
            />
          </>
        )}

        {envio?.status === 'PENDIENTE_GG' && puedeAutorizar && (
          <>
            <Button
              type="button"
              disabled={guardando}
              onClick={() =>
                ejecutar(() => externalShipmentsService.autorizar(envio.id, { approved: true }), 'Envío autorizado.')
              }
              className="gap-1.5"
            >
              <Gavel className="size-4" strokeWidth={2} />
              Autorizar (Gerencia)
            </Button>
            <BotonObservar
              disabled={guardando}
              etiqueta="Rechazar"
              onConfirmar={(observation) =>
                ejecutar(
                  () => externalShipmentsService.autorizar(envio.id, { approved: false, observation }),
                  'Rechazado — vuelve a borrador.',
                )
              }
            />
          </>
        )}

        {envio?.status === 'AUTORIZADO' && puedeGestionar && (
          <Button
            type="button"
            disabled={guardando}
            onClick={() =>
              ejecutar(
                () =>
                  externalShipmentsService.marcarEnviado(envio.id, {
                    ...(fechaResultado ? { expectedResultDate: fechaResultado } : {}),
                  }),
                'Envío despachado.',
              )
            }
            className="gap-1.5"
          >
            <Truck className="size-4" strokeWidth={2} />
            Marcar como enviado
          </Button>
        )}

        {envio && !['CERRADO', 'ANULADO', 'RESULTADO_RECIBIDO'].includes(envio.status) && puedeGestionar && (
          <BotonObservar
            disabled={guardando}
            etiqueta="Anular envío"
            variante="peligro"
            onConfirmar={(cancellationReason) =>
              ejecutar(() => externalShipmentsService.anular(envio.id, cancellationReason), 'Envío anulado.')
            }
          />
        )}
      </div>
    </div>
  )
}

function FirmaEstado({ titulo, Icon, estado, fecha, observacion }) {
  const tono =
    estado === 'APROBADO' ? 'positivo' : estado === 'PENDIENTE' ? 'neutro' : 'negativo'
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-marron-cafe/60" strokeWidth={1.75} />
        <p className="text-sm font-bold text-marron-cafe">{titulo}</p>
        <Badge tono={tono} className="ml-auto">
          {estado}
        </Badge>
      </div>
      {fecha && (
        <p className="text-xs text-marron-cafe/50">
          {new Date(fecha).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
      {observacion && <p className="text-xs text-marron-cafe/70">{observacion}</p>}
    </div>
  )
}

// Acción que necesita un motivo escrito antes de ejecutarse (observar,
// rechazar, anular) — despliega el campo en vez de abrir un modal aparte.
function BotonObservar({ etiqueta, onConfirmar, disabled, variante }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')

  if (!abierto) {
    return (
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => setAbierto(true)} className="gap-1.5">
        <Ban className="size-4" strokeWidth={2} />
        {etiqueta}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <FormInput
        label={`Motivo — ${etiqueta.toLowerCase()}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        autoFocus
        className="min-w-[240px]"
      />
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || texto.trim() === ''}
        onClick={async () => {
          await onConfirmar(texto.trim())
          setAbierto(false)
          setTexto('')
        }}
        className={variante === 'peligro' ? 'border-rojo-pasankalla/30 text-rojo-pasankalla' : ''}
      >
        Confirmar
      </Button>
      <Button type="button" variant="secondary" onClick={() => setAbierto(false)}>
        Cancelar
      </Button>
    </div>
  )
}
