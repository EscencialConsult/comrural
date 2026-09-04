import { useEffect } from 'react'
import { Save, CircleCheck } from 'lucide-react'
import { PARAMETROS_MICROBIOLOGICO } from '../../config/informeMicrobiologicoParametros'
import BotonVolver from '../BotonVolver.jsx'
import Button from '../Button.jsx'
import FormInput from '../FormInput.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import FirmasResponsables from '../formularios/FirmasResponsables.jsx'
import TablaResultadosSimple from './TablaResultadosSimple.jsx'

const formatearFecha = (iso) => (iso ? iso.slice(0, 10) : '')
const fechaDeHoy = () => new Date().toLocaleDateString('en-CA')

// Informe P-LAB-06/R-07 "Informe de Ensayo Microbiológico" — formulario
// oficial de la categoría Microbiológico, mismo criterio que
// InformeAnalisisFisicoquimico.jsx (P-LAB-10/R-04): planilla FIJA de
// parámetros microbiológicos estándar (informeMicrobiologicoParametros.js),
// no depende de qué ensayos eligió Calidad al pedir el análisis.
//
// Autocompletado: lo que YA existe en la solicitud (GET
// /analysis-requests/:id) llega de solo lectura — ID muestra, Muestra
// (producto), Lote, Cantidad, Cliente (proveedor), Fecha de ingreso
// (recepción en laboratorio). Lo que el backend no tiene (N° de reporte,
// fecha de toma de muestra, fechas de inicio/fin de análisis, fecha de
// emisión del reporte) queda editable — "Fecha inicio de análisis" se
// autocompleta con la fecha de la máquina, mismo criterio que el
// fisicoquímico. `valores`/`onGuardar`/`onFinalizar` son props genéricas
// (mismo criterio que InformeAnalisisFisicoquimico.jsx): quien persiste de
// verdad en `laboratory_reports.report_data` es FormularioIniciarAnalisis.jsx,
// vía laboratoryReportsService.
export default function InformeAnalisisMicrobiologico({
  solicitud,
  estado,
  valores,
  onCambiarValor,
  onVolver,
  onGuardar,
  onFinalizar,
  areaImprimibleRef,
}) {
  const finalizada = estado === 'FINALIZADO'

  useEffect(() => {
    if (!finalizada && valores['fecha-inicio-analisis'] === undefined) {
      onCambiarValor('fecha-inicio-analisis', fechaDeHoy())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe
    // correr una vez al montar (o si cambia de solicitud/categoría, que
    // remonta el componente entero) — no en cada cambio de `valores`.
  }, [])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a categorías" />
        <h2 className="text-lg font-bold text-marron-cafe">Informe de análisis — Microbiológico</h2>
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
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Informe de Ensayo Microbiológico"
          codigo="P-LAB-06/R-07"
          version="01"
          pagina="1 de 1"
        />

        <section className="flex flex-col gap-4 rounded-3xl bg-verde-pistacho/25 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">Información de la muestra</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput
              label="N° reporte"
              value={valores['numero-reporte'] ?? ''}
              onChange={(e) => onCambiarValor('numero-reporte', e.target.value)}
              disabled={finalizada}
            />
            <FormInput
              label="Fecha toma de muestra"
              type="date"
              value={valores['fecha-toma-muestra'] ?? ''}
              onChange={(e) => onCambiarValor('fecha-toma-muestra', e.target.value)}
              disabled={finalizada}
            />
            <FormInput label="ID muestra" value={solicitud.sample.code} disabled />
            <FormInput label="Fecha ingreso de muestra" value={formatearFecha(solicitud.reception?.receivedAt)} disabled />
            <FormInput label="Muestra" value={solicitud.product.name} disabled />
            <FormInput
              label="Fecha inicio de análisis"
              type="date"
              value={valores['fecha-inicio-analisis'] ?? ''}
              onChange={(e) => onCambiarValor('fecha-inicio-analisis', e.target.value)}
              disabled={finalizada}
            />
            <FormInput label="Lote" value={solicitud.lot.code} disabled />
            <FormInput
              label="Fecha finalización de análisis"
              type="date"
              value={valores['fecha-fin-analisis'] ?? ''}
              onChange={(e) => onCambiarValor('fecha-fin-analisis', e.target.value)}
              disabled={finalizada}
            />
            <FormInput
              label="Cantidad"
              value={`${solicitud.sample.quantity} ${solicitud.sample.unit === 'OTRA' ? (solicitud.sample.otherUnit ?? '') : solicitud.sample.unit}`}
              disabled
            />
            <FormInput
              label="Fecha emisión de reporte"
              type="date"
              value={valores['fecha-emision-reporte'] ?? ''}
              onChange={(e) => onCambiarValor('fecha-emision-reporte', e.target.value)}
              disabled={finalizada}
            />
            <FormInput label="Cliente" value={solicitud.supplier?.name ?? '—'} disabled className="sm:col-span-2" />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl bg-verde-pistacho/25 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">Resultados</h3>
          <TablaResultadosSimple
            filas={PARAMETROS_MICROBIOLOGICO}
            limiteEtiqueta="Límite: NB 0038"
            valores={valores}
            onCambiarValor={onCambiarValor}
            soloLectura={finalizada}
          />
          <p className="text-[11px] italic text-marron-cafe/50">
            Nota: la expresión "&lt; 1,0x10¹ UFC/g", "&lt; 1,0x10² UFC/g", "&lt;3 NMP/g" significa que no existe
            desarrollo de colonias con respecto a la técnica utilizada.
          </p>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl bg-verde-pistacho/25 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-marron-cafe">Firmas</h3>
          <FirmasResponsables
            responsables={[
              { rol: 'Analista', usuario: null, puesto: null, firmadoEn: null },
              { rol: 'Verificado', usuario: null, puesto: null, firmadoEn: null },
            ]}
            claseGrilla="sm:grid-cols-2"
          />
        </section>

        <p className="text-center text-[11px] italic text-marron-cafe/50">
          Los resultados obtenidos en el presente informe corresponden únicamente a la muestra analizada. Está
          prohibida la reproducción parcial o total de este documento sin aprobación escrita de la empresa COMRURAL
          XXI SRL.
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
