import { useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { CATEGORIAS_EXTERNAS } from '../../config/analisisCategorias'
import { useEnvioExternoDraft } from '../../hooks/useEnvioExternoDraft'
import { toast } from '../../lib/toast'
import BotonVolver from '../BotonVolver.jsx'
import Badge from '../Badge.jsx'
import Button from '../Button.jsx'
import FormInput from '../FormInput.jsx'
import FormSelect from '../FormSelect.jsx'
import CabeceraFormulario from '../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../formularios/SeccionFormulario.jsx'

// Registro I-LAB-16/R-01 — "Registro Envío de Muestras", papel que
// autoriza y hace seguimiento del envío de ensayos a un laboratorio
// externo. Se abre desde el botón "Autorizar envío" de la tabla "Análisis
// externo" (SeccionPendientes.jsx) — solo tiene sentido ahí: son
// justamente los ensayos que NO se procesan en el propio Laboratorio (ver
// CATEGORIAS_EXTERNAS).
//
// 100% mock: el backend no tiene ningún endpoint para esto (no hay
// "shipment"/"envío externo" en `analysis-requests` ni en ningún otro
// módulo) — pedido explícito de mantenerlo puro frontend por ahora.
// "Guardar" persiste solo en localStorage (useEnvioExternoDraft.js), mismo
// criterio que useAnalisisDraft.js para los resultados de ensayos.
const TIPOS_SERVICIO = ['HIPER', 'SUPER', 'REGULAR']
const OPCIONES_SI_NO = ['SI', 'NO']
const ESTADOS_LIBERACION = ['PENDIENTE', 'LIBERADO', 'RECHAZADO']

export default function FormularioAutorizarEnvio({ solicitud, onVolver }) {
  const { valores, cambiarValor, precargar, guardar, guardadoEn } = useEnvioExternoDraft(solicitud.id)

  // Precarga "Análisis solicitados" con los ensayos externos reales de esta
  // solicitud (los toxicológicos, ver CATEGORIAS_EXTERNAS) — solo la
  // primera vez que no hay nada guardado todavía, para no pisar una
  // corrección manual ya hecha.
  useEffect(() => {
    const nombres = solicitud.items
      .filter((i) => CATEGORIAS_EXTERNAS.has(i.category))
      .map((i) => i.name)
      .join(', ')
    if (nombres) precargar({ analisisSolicitados: nombres })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitud.id])

  const set = (campo) => (e) => cambiarValor(campo, e.target.value)

  const enviar = (e) => {
    e.preventDefault()
    guardar()
    toast.success('Registro de envío guardado.')
  }

  return (
    <form onSubmit={enviar} className="flex w-full flex-col gap-6">
      <div className="flex items-center gap-3">
        <BotonVolver onClick={onVolver} ariaLabel="Volver a Pendientes" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-marron-cafe sm:text-lg">
            Autorizar envío — {solicitud.sample.code}
          </h2>
          <p className="truncate text-xs text-marron-cafe/60">
            Lote {solicitud.lot.code} · {solicitud.product.name}
          </p>
        </div>
        {guardadoEn && <Badge tono="positivo">Guardado</Badge>}
      </div>

      <CabeceraFormulario
        antetitulo="Registro"
        titulo="Registro Envío de Muestras"
        codigo="I-LAB-16/R-01"
        version="03"
        pagina="1 de 1"
      />

      <SeccionFormulario numero={1} titulo="Autorización de envío">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput
            label="Análisis solicitados"
            className="sm:col-span-2 lg:col-span-3"
            value={valores.analisisSolicitados}
            onChange={set('analisisSolicitados')}
          />
          <FormSelect label="Tipo de servicio" value={valores.tipoServicio} onChange={set('tipoServicio')}>
            <option value="">Seleccioná…</option>
            {TIPOS_SERVICIO.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </FormSelect>
          <FormInput label="Tipo de cuantificación" value={valores.tipoCuantificacion} onChange={set('tipoCuantificacion')} />
          <FormInput label="Laboratorio / Destino" value={valores.laboratorioDestino} onChange={set('laboratorioDestino')} />
          <FormInput label="Cantidad" type="number" min="0" value={valores.cantidad} onChange={set('cantidad')} />
          <FormInput label="Unidad" placeholder="ej. kg" value={valores.unidad} onChange={set('unidad')} />
          <FormInput label="Fecha de envío" type="date" value={valores.fechaEnvio} onChange={set('fechaEnvio')} />
          <FormInput
            label="Precio unitario de análisis ($)"
            type="number"
            min="0"
            step="0.01"
            value={valores.precioUnitario}
            onChange={set('precioUnitario')}
          />
          <FormInput
            label="Precio total de análisis ($)"
            type="number"
            min="0"
            step="0.01"
            value={valores.precioTotal}
            onChange={set('precioTotal')}
          />
          <FormInput label="Solicitado por" value={valores.solicitadoPor} onChange={set('solicitadoPor')} />
          <FormInput label="Verificado por" value={valores.verificadoPorEnvio} onChange={set('verificadoPorEnvio')} />
          <FormInput label="Autorizados por" value={valores.autorizadoPor} onChange={set('autorizadoPor')} />
          <label className="flex flex-col gap-1.5 text-sm text-marron-cafe sm:col-span-2 lg:col-span-3">
            Justificación
            <textarea
              rows={3}
              value={valores.justificacion}
              onChange={set('justificacion')}
              placeholder="Motivo del envío — opcional si es parte de un programa de seguimiento."
              className="w-full resize-y rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none transition-colors duration-150 focus-visible:border-verde-lima"
            />
          </label>
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={2} titulo="Factura">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormInput label="N.° factura laboratorio" value={valores.facturaNumero} onChange={set('facturaNumero')} />
        </div>
      </SeccionFormulario>

      <SeccionFormulario numero={3} titulo="Liberación">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormSelect label="Conforme" value={valores.conforme} onChange={set('conforme')}>
            <option value="">Seleccioná…</option>
            {OPCIONES_SI_NO.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </FormSelect>
          <FormInput label="Verificado por" value={valores.verificadoPorLiberacion} onChange={set('verificadoPorLiberacion')} />
          <FormInput label="Código laboratorio externo" value={valores.codigoLaboratorioExterno} onChange={set('codigoLaboratorioExterno')} />
          <FormInput
            label="Fecha recepción de resultados"
            type="date"
            value={valores.fechaRecepcionResultados}
            onChange={set('fechaRecepcionResultados')}
          />
          <FormInput label="Reporte de análisis" placeholder="ej. PDF" value={valores.reporteAnalisis} onChange={set('reporteAnalisis')} />
          <FormInput label="Categoría" placeholder="ej. A+" value={valores.categoria} onChange={set('categoria')} />
          <FormSelect label="Estado" value={valores.estado} onChange={set('estado')}>
            <option value="">Seleccioná…</option>
            {ESTADOS_LIBERACION.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </FormSelect>
        </div>
      </SeccionFormulario>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="gap-1.5">
          <ShieldCheck className="size-4" strokeWidth={2} />
          Guardar registro
        </Button>
        <Button type="button" variant="secondary" onClick={onVolver}>
          Volver
        </Button>
        {guardadoEn && (
          <span className="text-xs text-marron-cafe/50">
            Último guardado: {new Date(guardadoEn).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
      </div>
    </form>
  )
}
