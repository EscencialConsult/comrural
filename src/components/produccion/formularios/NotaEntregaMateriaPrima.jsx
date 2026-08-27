import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import CampoFechaHora from '../../formularios/CampoFechaHora.jsx'
import ContadorSacos from '../../formularios/ContadorSacos.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Skeleton from '../../Skeleton.jsx'

const TIPOS_SALIDA = ['Solicitud de proceso', 'Reposición', 'Devolución a almacén']

const SOLICITANTES = [
  'Joel Choque · Turno 1',
  'Claudia Rojas · Turno 2',
  'Gabriela Tarqui · Turno 3',
]

const RESPONSABLES = [
  { rol: 'Entregado por', puesto: 'Asistente de Almacén' },
  { rol: 'Recibido por', puesto: 'Supervisor de Producción' },
]

const VACIO = {
  solicitante: '',
  fechaSalida: null,
  tipoSalida: '',
  pesoPromedioKg: null,
  loteMpId: '',
  cantidadSacos: null,
  pesoNetoKgQq: null,
}

// Formulario 1 del relevamiento — abre el flujo real de Área A (RP-06: "la
// MP se entrega por lote completo, con conteo físico previo entre
// Producción y Almacén"). Primer formulario de Producción con fidelidad
// completa: cabecera + sección de datos + firmas + export a PDF, todo con
// componentes ya hechos para Calidad/Laboratorio — nada nuevo que diseñar
// visualmente acá.
export default function NotaEntregaMateriaPrima({ loteInicialId }) {
  const [lotesMp, setLotesMp] = useState(null)
  // Si se abre desde "Lotes" de Producción (SeccionLotesProduccion.jsx) con
  // un lote ya elegido, arranca con ese lote precargado en vez de vacío.
  const [form, setForm] = useState(() => (loteInicialId ? { ...VACIO, loteMpId: loteInicialId } : VACIO))
  const { areaImprimibleRef, generandoPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#faf4e8' })
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    let cancelado = false
    produccionService.listarLotesMp().then((data) => !cancelado && setLotesMp(data))
    return () => {
      cancelado = true
    }
  }, [])

  const actualizar = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const registrar = async () => {
    try {
      await ejecutar(() => produccionService.registrarNotaEntregaMp(form))
      toast.success('Nota de entrega registrada.')
      setForm(VACIO)
    } catch {
      toast.error('No se pudo registrar la nota.')
    }
  }

  const loteSeleccionado = lotesMp?.find((l) => l.id === form.loteMpId)

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Nota de Entrega de Materia Prima"
          codigo="P-ADM-03/R-24"
          version="01"
          acciones={
            <Button variant="secondary" onClick={generarPdf} disabled={generandoPdf} className="px-4 py-2 text-xs">
              <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
              {generandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
            </Button>
          }
        />

        <SeccionFormulario numero={1} titulo="Datos generales">
          {!lotesMp ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormSelect label="Solicitante" value={form.solicitante} onChange={(e) => actualizar('solicitante')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {SOLICITANTES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FormSelect>

              <CampoFechaHora
                id="fecha-salida"
                label="Fecha / N° de salida"
                tipo="date"
                valor={form.fechaSalida}
                onChange={actualizar('fechaSalida')}
              />

              <FormSelect label="Tipo de salida" value={form.tipoSalida} onChange={(e) => actualizar('tipoSalida')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {TIPOS_SALIDA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </FormSelect>

              <FormInput
                label="Peso promedio (Kg)"
                type="number"
                min="0"
                value={form.pesoPromedioKg ?? ''}
                onChange={(e) => actualizar('pesoPromedioKg')(e.target.value === '' ? null : Number(e.target.value))}
              />

              <FormSelect
                label="Materia prima / Lote"
                value={form.loteMpId}
                onChange={(e) => actualizar('loteMpId')(e.target.value)}
                hint={loteSeleccionado ? `Disponible: ${loteSeleccionado.pesoDisponibleKg.toLocaleString('es-BO')} kg` : undefined}
              >
                <option value="">Seleccionar…</option>
                {lotesMp.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} · {l.product}
                  </option>
                ))}
              </FormSelect>

              <div className="flex flex-col gap-1.5 text-sm text-marron-cafe">
                Cantidad de sacos
                <ContadorSacos
                  valor={form.cantidadSacos}
                  onChange={actualizar('cantidadSacos')}
                  etiquetaAccesible="cantidad de sacos"
                />
              </div>

              <FormInput
                label="Peso neto (Kg/QQ)"
                type="number"
                min="0"
                value={form.pesoNetoKgQq ?? ''}
                onChange={(e) => actualizar('pesoNetoKgQq')(e.target.value === '' ? null : Number(e.target.value))}
                hint="Base de pago al proveedor — lo administra Compras, acá solo se registra."
              />
            </div>
          )}
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Firmas">
          <FirmasResponsables responsables={RESPONSABLES} />
        </SeccionFormulario>
      </div>

      <div className="flex justify-end print:hidden">
        <Button onClick={registrar} disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar'}
        </Button>
      </div>
    </div>
  )
}
