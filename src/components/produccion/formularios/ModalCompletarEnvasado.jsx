import { useEffect, useState } from 'react'
import { Link2 } from 'lucide-react'
import { packagingService } from '../../../services/packagingService'
import { productionAreaBService } from '../../../services/productionAreaBService'
import { productsService } from '../../../services/productsService'
import { listarTodo } from '../../../services/paginacion'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Modal from '../../Modal.jsx'
import ComboboxLote from '../../formularios/ComboboxLote.jsx'
import Button from '../../Button.jsx'
import Skeleton from '../../Skeleton.jsx'

const ESTADOS_CANDIDATOS = ['LAVADO', 'LAVADO_COMPLETO', 'EN_AREA_B']

// Modal "Completar" — para un envasado que quedó ABIERTO (ver
// ModalEnvasados.jsx, el listado): antes no había forma de retomarlo, la
// única opción era registrar uno nuevo desde cero. Acá se reintenta el
// mismo reparto greedy que ModalRegistrarEnvasado.jsx hace al crear (POST
// .../sources hasta cubrir lo que falta, POST .../close si queda exacto),
// mismo criterio de comrural_erp_backend/docs/packaging.md.
//
// Si el envasado ya tiene alguna fuente cargada, el lote se infiere de ahí
// (todas las fuentes de un mismo envasado vienen del mismo lote en la
// práctica — no hay ninguna regla que lo obligue, pero así se creó siempre
// desde este formulario). Si no tiene ninguna todavía (se creó "sin lote
// elegido"), hay que elegirlo a mano.
export default function ModalCompletarEnvasado({ abierto, envasadoId, onCerrar, onActualizado }) {
  const [envasado, setEnvasado] = useState(null)
  const [fuentes, setFuentes] = useState(null)
  const [loteInferido, setLoteInferido] = useState(null)
  const [loteId, setLoteId] = useState('')
  const [productos, setProductos] = useState(null)
  const [errorCarga, setErrorCarga] = useState(null)
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    if (!abierto || !envasadoId) return
    let cancelado = false
    setEnvasado(null)
    setFuentes(null)
    setLoteInferido(null)
    setLoteId('')
    Promise.all([packagingService.obtener(envasadoId), packagingService.listarFuentes(envasadoId)])
      .then(async ([envasadoResp, fuentesResp]) => {
        if (cancelado) return
        setEnvasado(envasadoResp)
        setFuentes(fuentesResp)
        if (fuentesResp.length > 0) {
          const entradaAreaB = await productionAreaBService.obtener(fuentesResp[0].areaBEntryId)
          if (cancelado) return
          setLoteInferido(entradaAreaB.lotId)
          setLoteId(entradaAreaB.lotId)
        }
      })
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [abierto, envasadoId])

  useEffect(() => {
    if (!abierto) return
    let cancelado = false
    listarTodo(productsService.listar)
      .then((data) => !cancelado && setProductos(data))
      .catch((err) => !cancelado && setErrorCarga(err.message))
    return () => {
      cancelado = true
    }
  }, [abierto])

  const productoNombre = (id) => productos?.find((p) => p.id === id)?.name ?? '—'

  const vinculadoKg = fuentes ? fuentes.reduce((acc, f) => acc + Number(f.cantidadKg), 0) : 0
  const restante = envasado ? Number(envasado.packagedKg) - vinculadoKg : 0
  const puedeVincular = loteId !== '' && restante > 0.001

  const cerrarModal = () => onCerrar()

  const completar = async () => {
    if (!puedeVincular) return
    try {
      await ejecutar(async () => {
        const entradasAreaB = await productionAreaBService.listarPorLote(loteId)
        const yaUsadas = new Set(fuentes.map((f) => f.areaBEntryId))
        const nuevas = entradasAreaB.filter((e) => e.inputType === 'NUEVA' && !yaUsadas.has(e.id))
        let restanteLocal = restante
        for (const entrada of nuevas) {
          if (restanteLocal <= 0.001) break
          const aporte = Math.min(restanteLocal, entrada.finalKg)
          if (aporte <= 0) continue
          await packagingService.agregarFuente(envasadoId, { areaBEntryId: entrada.id, cantidadKg: Number(aporte.toFixed(3)) })
          restanteLocal -= aporte
        }

        if (restanteLocal <= 0.001) {
          await packagingService.cerrar(envasadoId)
          toast.success('Envasado vinculado a Área B y cerrado.')
        } else {
          toast.info(`Faltan ${restanteLocal.toFixed(3)} kg más por vincular a Área B para poder cerrarlo.`)
        }
      })
      onActualizado()
      cerrarModal()
    } catch (err) {
      toast.error(err.message ?? 'No se pudo vincular el material.')
    }
  }

  const cargando = envasado === null || fuentes === null

  return (
    <Modal abierto={abierto} titulo="Completar envasado" onCerrar={cerrarModal}>
      <div className="flex flex-col gap-5">
        {errorCarga && <p className="text-sm font-medium text-rojo-pasankalla">No se pudo cargar: {errorCarga}</p>}

        {cargando ? (
          <Skeleton className="h-32" />
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-verde-hoja/5 p-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-verde-hoja/15 text-verde-bosque">
                <Link2 className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-marron-cafe">{envasado.presentationLabel}</h3>
                <p className="text-xs text-marron-cafe/60">
                  {vinculadoKg.toFixed(3)} / {Number(envasado.packagedKg).toFixed(3)} kg vinculados — faltan {restante.toFixed(3)} kg
                </p>
              </div>
            </div>

            {loteInferido ? (
              <p className="text-sm text-marron-cafe/70">
                Lote MP: <span className="font-mono text-xs font-semibold text-marron-cafe">{loteInferido}</span> (tomado de las fuentes ya cargadas)
              </p>
            ) : (
              <ComboboxLote
                label="Lote MP"
                value={loteId}
                onChange={setLoteId}
                estados={ESTADOS_CANDIDATOS}
                productoNombre={productoNombre}
              />
            )}

            <div className="flex items-center justify-end gap-3 border-t border-marron-tierra/10 pt-4">
              <Button onClick={completar} disabled={enviando || !puedeVincular} className="px-5 py-2.5">
                {enviando ? 'Vinculando…' : 'Vincular y cerrar si corresponde'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
