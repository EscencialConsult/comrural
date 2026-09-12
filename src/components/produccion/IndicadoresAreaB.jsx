import { useEffect, useMemo, useState } from 'react'
import { Gauge, TriangleAlert } from 'lucide-react'
import { productionAreaBService } from '../../services/productionAreaBService'
import { packagingService } from '../../services/packagingService'
import { qualityAreaBInspectionsService } from '../../services/qualityAreaBInspectionsService'
import { lotsService } from '../../services/lotsService'
import { productsService } from '../../services/productsService'
import { listarTodo } from '../../services/paginacion'
import Badge from '../Badge.jsx'
import FormSelect from '../FormSelect.jsx'
import ComboboxLote from '../formularios/ComboboxLote.jsx'
import Skeleton from '../Skeleton.jsx'

// Mismos 3 indicadores que IndicadoresProduccion.jsx (Área A). Sin
// endpoint agregado tipo GET /production-area-a/indicators todavía, así que
// se calculan acá sumando GET /production-area-b/lots/:lotId/entries (ver
// comrural_erp_backend/docs/production-area-b.md §5) de cada lote incluido
// en el filtro — mismo trade-off N+1 que ListaLotesVolumenB
// (ModalRegistrarSalidaAreaB.jsx): candidatos son pocos.
const INDICADORES = [
  { key: 'rendimiento', etiqueta: 'Rendimiento', meta: '> 90%', cumple: (v) => v > 90 },
  { key: 'quinuaSegunda', etiqueta: 'Quinua Segunda', meta: '< 3%', cumple: (v) => v < 3 },
  { key: 'quinuaTercera', etiqueta: 'Quinua Tercera', meta: '< 1,70%', cumple: (v) => v < 1.7 },
]

// Mismo filtro que ModalRegistrarSalidaAreaB.jsx — cualquier lote que ya
// pueda tener (o haber tenido) consumo de Área B.
const ESTADOS_CANDIDATOS = ['LAVADO', 'LAVADO_COMPLETO', 'EN_AREA_B']

const porcentaje = (parte, total) => (total > 0 ? Number(((parte / total) * 100).toFixed(2)) : null)
const sumarCampo = (entradas, campo) => entradas.reduce((acc, e) => acc + e[campo], 0)

// El lote pasa solo a PROCESADO cuando ya no queda quinua lavada por
// consumir Y todas las corridas de envasado vinculadas están APROBADAS
// (ver comrural_erp_backend/docs/lots.md §1/§8 — regla SIMPLIFICADA,
// decisión explícita del cliente). Lo que NO detecta esa regla: si una
// corrida quedó RECHAZADA/PARCIAL y ya se resolvió con un reproceso +
// corrida nueva aprobada, el sistema no conecta ambas — el lote se queda
// en EN_AREA_B para siempre aunque en la realidad ya esté todo resuelto.
// No bloquea nada operativo (se puede seguir registrando Área B/envasado
// sobre ese lote igual), es solo que nunca se va a marcar como terminado
// solo. Esta función arma el diagnóstico para avisarlo. Solo tiene sentido
// para UN lote puntual — con el filtro mostrando varios a la vez no hay
// forma clara de resumir "atascado" para todos, así que el llamador solo
// la invoca cuando el filtro resuelve a exactamente un lote.
const diagnosticarLoteAtascado = async (lot, saldoDisponibleKg) => {
  if (lot.currentStatus !== 'EN_AREA_B') return null
  if (saldoDisponibleKg > 0.001) return null // todavía queda quinua lavada por consumir, no es "atascado" — está en curso

  const corridas = await packagingService.listarPorLote(lot.id)
  if (corridas.length === 0) return null

  const inspecciones = await Promise.all(corridas.map((c) => qualityAreaBInspectionsService.porCorrida(c.id)))
  const sinControl = corridas.filter((_, i) => inspecciones[i] === null)
  const rechazadasOParciales = corridas.filter((_, i) => inspecciones[i] && inspecciones[i].disposition !== 'APROBADO')

  if (rechazadasOParciales.length > 0) {
    return {
      tono: 'alerta',
      titulo: 'Este lote puede estar atascado',
      mensaje: `Ya se consumió toda la quinua lavada, pero ${rechazadasOParciales.length} corrida(s) de envasado quedaron RECHAZADAS o PARCIALES. Si ya se resolvieron con un reproceso y una corrida nueva aprobada, el sistema no lo detecta solo (limitación conocida, no hay vínculo automático entre un rechazo y el reproceso que lo resuelve) — el lote se queda en EN_AREA_B aunque en la realidad ya esté terminado. Hay que revisarlo y, si corresponde, marcarlo a mano.`,
    }
  }
  if (sinControl.length > 0) {
    return {
      tono: 'neutro',
      titulo: 'Falta control de Calidad',
      mensaje: `Ya se consumió toda la quinua lavada, pero ${sinControl.length} corrida(s) de envasado todavía no tienen control de Calidad (Liberación de Envasado). El lote pasa a PROCESADO automáticamente apenas se resuelvan.`,
    }
  }
  return null
}

// Indicador general de Área B — pedido explícito: por defecto agrega TODOS
// los lotes candidatos en vez de forzar a elegir uno para ver algo. El
// filtro sigue siendo un buscador (ComboboxLote, con paginación real del
// backend) para un lote puntual — con potencialmente ~100 candidatos no
// tiene sentido listarlos todos de una en pantalla (checklist/tabla), un
// desplegable que busca es lo que ya usa el resto de la app. "Producto"
// suma un segundo criterio de filtro sin tener que buscar lote por lote.
export default function IndicadoresAreaB() {
  const [lotes, setLotes] = useState(null)
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)

  const [productoId, setProductoId] = useState('')
  const [loteId, setLoteId] = useState('')

  const [entradas, setEntradas] = useState(null)
  const [alerta, setAlerta] = useState(null)

  useEffect(() => {
    let cancelado = false
    Promise.all([lotsService.listar({ limit: 100 }), listarTodo(productsService.listar)])
      .then(([lotesResp, productosResp]) => {
        if (cancelado) return
        setLotes(lotesResp.data.filter((l) => l.nature === 'PM' && ESTADOS_CANDIDATOS.includes(l.currentStatus)))
        setProductos(productosResp)
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  // Lotes que efectivamente entran al cálculo: un lote puntual del
  // buscador gana sobre todo lo demás; si no hay ninguno elegido, el
  // filtro de producto (o, sin ninguno de los dos, todos los candidatos).
  const lotesIncluidos = useMemo(() => {
    if (!lotes) return []
    if (loteId) return lotes.filter((l) => l.id === loteId)
    return productoId ? lotes.filter((l) => l.productId === productoId) : lotes
  }, [lotes, productoId, loteId])

  useEffect(() => {
    if (lotesIncluidos.length === 0) {
      setEntradas([])
      setAlerta(null)
      return
    }
    let cancelado = false
    setEntradas(null)
    setAlerta(null)
    Promise.all(lotesIncluidos.map((l) => productionAreaBService.listarPorLote(l.id)))
      .then((porLote) => !cancelado && setEntradas(porLote.flat()))
      .catch((err) => !cancelado && setErrorCarga(err.message))

    // El diagnóstico de "lote atascado" solo tiene sentido para UN lote
    // puntual — con varios a la vez no hay forma clara de resumirlo.
    if (lotesIncluidos.length === 1) {
      const lote = lotesIncluidos[0]
      productionAreaBService
        .saldoLavado(lote.id)
        .then((saldo) => diagnosticarLoteAtascado(lote, saldo.washedKgDisponible))
        .then((diagnostico) => !cancelado && setAlerta(diagnostico))
        .catch(() => !cancelado && setAlerta(null))
    }

    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotesIncluidos])

  const totalUsadosKg = entradas ? sumarCampo(entradas, 'usedKg') : 0
  const totalFinalKg = entradas ? sumarCampo(entradas, 'finalKg') : 0
  const totalQ2daKg = entradas ? sumarCampo(entradas, 'secondKg') : 0
  const totalTerceraKg = entradas ? sumarCampo(entradas, 'thirdKg') : 0

  const valores = {
    rendimiento: porcentaje(totalFinalKg, totalUsadosKg),
    quinuaSegunda: porcentaje(totalQ2daKg, totalUsadosKg),
    quinuaTercera: porcentaje(totalTerceraKg, totalUsadosKg),
  }

  if (errorCarga) {
    return <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>
  }

  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-marron-tierra/5 p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-verde-hoja/10 text-verde-bosque">
          <Gauge className="size-5" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="font-extrabold text-marron-cafe">Área B</h3>
          <p className="text-xs text-marron-cafe/40">
            Indicador general de todos los lotes candidatos — filtrá por producto o elegí lotes puntuales.
          </p>
        </div>
      </div>

      {!productos || !lotes ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormSelect
              label="Producto"
              value={productoId}
              onChange={(e) => {
                setProductoId(e.target.value)
                setLoteId('')
              }}
            >
              <option value="">Todos</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
            <ComboboxLote
              label="Lote (opcional — sobrescribe el filtro de producto)"
              value={loteId}
              onChange={setLoteId}
              estados={ESTADOS_CANDIDATOS}
              productoNombre={productoNombre}
            />
          </div>

          <p className="text-xs text-marron-cafe/50">
            {lotesIncluidos.length} {lotesIncluidos.length === 1 ? 'lote incluido' : 'lotes incluidos'} en el cálculo.
          </p>

          {alerta && (
            <div
              className={`flex items-start gap-3 rounded-2xl p-4 ${
                alerta.tono === 'alerta' ? 'bg-marron-arcilla/10' : 'bg-marron-tierra/10'
              }`}
            >
              <TriangleAlert
                className={`mt-0.5 size-4.5 shrink-0 ${alerta.tono === 'alerta' ? 'text-marron-arcilla' : 'text-marron-cafe/50'}`}
                strokeWidth={1.75}
              />
              <div>
                <p className="text-sm font-bold text-marron-cafe">{alerta.titulo}</p>
                <p className="text-xs text-marron-cafe/70">{alerta.mensaje}</p>
              </div>
            </div>
          )}

          {lotesIncluidos.length === 0 ? (
            <p className="text-sm text-marron-cafe/50">Ningún lote candidato coincide con el filtro.</p>
          ) : entradas === null ? (
            <Skeleton className="h-24" />
          ) : (
            <div className="flex flex-col gap-3">
              {INDICADORES.map(({ key, etiqueta, meta, cumple }) => {
                const valor = valores[key]
                const ok = valor != null && cumple(valor)
                return (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-marron-cafe">{etiqueta}</p>
                      <p className="text-xs text-marron-cafe/50">Meta: {meta}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-marron-cafe">
                        {valor != null ? `${valor}%`.replace('.', ',') : '—'}
                      </span>
                      {valor != null ? (
                        <Badge tono={ok ? 'positivo' : 'negativo'}>{ok ? 'Cumple' : 'Fuera de meta'}</Badge>
                      ) : (
                        <Badge tono="neutro">Sin datos</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
