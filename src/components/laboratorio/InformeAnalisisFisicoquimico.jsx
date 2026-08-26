import { useEffect } from 'react'
import { Printer, Save, CircleCheck } from 'lucide-react'
import { PARAMETROS_QUIMICO, PARAMETROS_FISICO, IMPUREZAS_CUANTIFICADAS, PARAMETROS_SENSORIAL } from '../../config/informeFisicoquimicoParametros'
import { useGenerarPdf } from '../../hooks/useGenerarPdf'
import BotonVolver from '../BotonVolver.jsx'
import Button from '../Button.jsx'
import FormInput from '../FormInput.jsx'
import FormTextarea from '../FormTextarea.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import TablaResultadosEnsayo from './TablaResultadosEnsayo.jsx'

const formatearFecha = (iso) => (iso ? iso.slice(0, 10) : '')

// Fecha de la máquina del analista, en formato YYYY-MM-DD para <input
// type="date">. Mismo patrón que ya usa ModalRecibirMuestra.jsx
// (`hoy()`) — 'en-CA' da directo ese formato sin armar el string a mano.
const fechaDeHoy = () => new Date().toLocaleDateString('en-CA')

// Informe P-LAB-10/R-04 "Informe de Análisis de Materia Prima" —
// formulario oficial de la categoría Fisicoquímico, maquetado según el
// documento real (código, versión 03, página 1 de 1). Es un caso especial
// dentro de Laboratorio: a diferencia de FormularioResultadosCategoria.jsx
// (genérico, uno por ensayo solicitado), este NO depende de qué ensayos
// eligió Calidad al pedir el análisis — es una planilla FIJA de parámetros
// físico-químicos estándar para cualquier materia prima (Humedad, Dureza,
// tamaño de grano, impurezas, sensorial…), definida por
// informeFisicoquimicoParametros.js.
//
// Autocompletado: los datos que YA existen en la solicitud (GET
// /analysis-requests/:id) llegan de solo lectura — no tiene sentido dejar
// editable un dato que el sistema ya conoce. Lo que el backend no tiene
// (N°, fecha de inicio de ensayo, fecha de emisión del informe) queda
// editable. El resto de la planilla (resultados de laboratorio, firmas) es
// 100% mock: no hay endpoint todavía para guardar resultados de ensayos
// (ver docs/laboratory.md §1) — "Guardar cambios"/"Finalizar categoría"
// solo persisten en este navegador (useAnalisisDraft.js).
export default function InformeAnalisisFisicoquimico({
  solicitud,
  estado,
  valores,
  onCambiarValor,
  onVolver,
  onGuardar,
  onFinalizar,
  autoImprimir = false,
}) {
  const finalizada = estado === 'FINALIZADO'
  const { areaImprimibleRef, generandoPdf, errorPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#ffffff' })

  // Se llegó acá con la tarjeta ya en "Imprimir" (ver TarjetaCategoria.jsx)
  // — ese clic ya cuenta como la intención de imprimir, no hace falta un
  // segundo clic sobre el botón de acá adentro. Solo una vez por montaje
  // (no en cada re-render): `generarPdf` es estable entre renders (viene
  // de un hook con su propia ref), pero igual se guarda explícito para no
  // depender de esa garantía.
  useEffect(() => {
    if (autoImprimir) generarPdf()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autocompleta "Fecha inicio de ensayo" con la fecha de la máquina al
  // abrir el informe, a pedido explícito — sigue editable (el backend no
  // tiene esta columna, ver docs/laboratory.md §1, así que no hay un dato
  // real que traer; esto es solo un valor por defecto razonable). No pisa
  // un valor ya cargado (guardado antes, o retomado de un borrador).
  useEffect(() => {
    if (!finalizada && valores['fecha-inicio-ensayo'] === undefined) {
      onCambiarValor('fecha-inicio-ensayo', fechaDeHoy())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe
    // correr una vez al montar (o si cambia de solicitud/categoría, que
    // remonta el componente entero) — no en cada cambio de `valores`.
  }, [])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a categorías" />
        <h2 className="text-lg font-bold text-marron-cafe">Informe de análisis — Fisicoquímico</h2>
        {errorPdf && <span className="text-xs font-medium text-rojo-pasankalla">{errorPdf}</span>}
        <button
          type="button"
          onClick={generarPdf}
          disabled={generandoPdf}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-marron-tierra/10 px-3 py-1.5 text-xs font-semibold text-marron-cafe transition-colors duration-150 hover:bg-marron-tierra/20 disabled:opacity-50"
        >
          <Printer className="size-3.5" strokeWidth={2} />
          {generandoPdf ? 'Generando PDF…' : 'Imprimir'}
        </button>
      </div>

      <p className="rounded-2xl bg-marron-arcilla/10 px-4 py-3 text-xs text-marron-cafe/70">
        El backend todavía no registra resultados de ensayos — esta planilla es una vista previa. "Guardar cambios" y
        "Finalizar categoría" solo persisten en este navegador, no en el servidor.
      </p>
      {finalizada && (
        <p className="rounded-xl bg-verde-hoja/10 px-3 py-2 text-xs font-medium text-verde-bosque">
          Categoría finalizada — solo lectura.
        </p>
      )}

      <div ref={areaImprimibleRef} className="flex flex-col gap-5">
        <CabeceraFormulario antetitulo="Informe" titulo="Informe de Análisis de Materia Prima" codigo="P-LAB-10/R-04" version="03" pagina="1 de 1" />

        <section className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/25 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">1. Datos generales</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="ID muestra" value={solicitud.sample.code} disabled />
            <FormInput
              label="N°"
              value={valores['numero'] ?? ''}
              onChange={(e) => onCambiarValor('numero', e.target.value)}
              disabled={finalizada}
            />
            <FormInput label="Proveedor" value={solicitud.supplier?.name ?? '—'} disabled />
            <FormInput label="Fecha de recepción" value={formatearFecha(solicitud.reception?.receivedAt)} disabled />
            <FormInput label="N° Lote" value={solicitud.lot.code} disabled />
            <FormInput
              label="Fecha inicio de ensayo"
              type="date"
              value={valores['fecha-inicio-ensayo'] ?? ''}
              onChange={(e) => onCambiarValor('fecha-inicio-ensayo', e.target.value)}
              disabled={finalizada}
            />
            <FormInput label="Producto" value={solicitud.product.name} disabled />
            <FormInput
              label="Fecha emisión de informe"
              type="date"
              value={valores['fecha-emision'] ?? ''}
              onChange={(e) => onCambiarValor('fecha-emision', e.target.value)}
              disabled={finalizada}
            />
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/25 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">2. Resumen de resultados</h3>

          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-marron-cafe/60">Químico</h4>
            <TablaResultadosEnsayo
              categoria="QUÍMICO"
              filas={PARAMETROS_QUIMICO}
              valores={valores}
              onCambiarValor={onCambiarValor}
              soloLectura={finalizada}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-marron-cafe/60">Físico</h4>
            <TablaResultadosEnsayo
              categoria="FÍSICO"
              filas={PARAMETROS_FISICO}
              valores={valores}
              onCambiarValor={onCambiarValor}
              soloLectura={finalizada}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-marron-cafe/60">
              Detalle de impurezas cuantificadas <span className="font-normal normal-case text-marron-cafe/40">(método I-LAB-01)</span>
            </h4>
            <div className="grid gap-3 rounded-2xl bg-white/70 p-4 sm:grid-cols-3">
              {IMPUREZAS_CUANTIFICADAS.map((imp) => (
                <FormInput
                  key={imp.id}
                  label={imp.label}
                  type="number"
                  min="0"
                  value={valores[imp.id] ?? ''}
                  onChange={(e) => onCambiarValor(imp.id, e.target.value)}
                  disabled={finalizada}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wide text-marron-cafe/60">Sensorial</h4>
            <TablaResultadosEnsayo
              categoria="SENSORIAL"
              filas={PARAMETROS_SENSORIAL}
              conUnidad={false}
              valores={valores}
              onCambiarValor={onCambiarValor}
              soloLectura={finalizada}
            />
          </div>

          <FormTextarea
            label="Observación"
            rows={3}
            placeholder="Observaciones del análisis…"
            value={valores['observacion'] ?? ''}
            onChange={(e) => onCambiarValor('observacion', e.target.value)}
            disabled={finalizada}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-3xl bg-verde-pistacho/25 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">3. Firmas de conformidad</h3>
          <FirmasResponsables
            responsables={[
              { rol: 'Analista', usuario: null, puesto: null, firmadoEn: null },
              { rol: 'Verificado', usuario: null, puesto: null, firmadoEn: null },
              { rol: 'Recibido', usuario: null, puesto: null, firmadoEn: null },
            ]}
            claseGrilla="sm:grid-cols-3"
          />
        </section>

        <p className="text-center text-[11px] italic text-marron-cafe/50">
          Los resultados corresponden únicamente a las muestras analizadas en el laboratorio. Prohibida la reproducción
          parcial o total de este informe sin autorización escrita del laboratorio.
        </p>
      </div>

      {!finalizada && (
        <div className="flex items-center justify-end gap-2 border-t border-marron-tierra/10 pt-4">
          <Button variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs" onClick={onGuardar}>
            <Save className="size-3.5" strokeWidth={2} />
            Guardar cambios
          </Button>
          <Button className="gap-1.5 px-3 py-1.5 text-xs" onClick={onFinalizar}>
            <CircleCheck className="size-3.5" strokeWidth={2} />
            Finalizar categoría
          </Button>
        </div>
      )}
    </section>
  )
}
