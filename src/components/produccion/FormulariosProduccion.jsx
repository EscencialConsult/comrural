import { useState } from 'react'
import { FileText } from 'lucide-react'
import { toast } from '../../lib/toast'
import NotaEntregaMateriaPrima from './formularios/NotaEntregaMateriaPrima.jsx'
import ControlVolumenA from './formularios/ControlVolumenA.jsx'
import ControlTemperaturaHumedad from './formularios/ControlTemperaturaHumedad.jsx'
import ControlExistenciasB from './formularios/ControlExistenciasB.jsx'
import ControlVolumenB from './formularios/ControlVolumenB.jsx'
import EnvasadoProductoTerminado from './formularios/EnvasadoProductoTerminado.jsx'
import KardexSubproductos from './formularios/KardexSubproductos.jsx'
import ControlProductoAlmacen from './formularios/ControlProductoAlmacen.jsx'

// Catálogo de los 8 formularios reales del relevamiento (sección 14) — solo
// el primero abre de verdad, el resto son tarjetas "Próximamente" para dar
// contexto de todo lo que falta sin prometer algo que no existe todavía. Se
// suman uno por uno, cada uno con su propio incremento (varios tienen
// tablas por turno con fórmulas de balance propias).
const FORMULARIOS = [
  {
    id: 'nota-entrega-mp',
    codigo: 'P-ADM-03/R-24',
    nombre: 'Nota de Entrega de Materia Prima',
    accion: 'Solicitar MP',
    disponible: true,
  },
  {
    id: 'volumen-a',
    codigo: 'P-PRO-01/R-24',
    nombre: 'Control de Volumen A',
    accion: 'Registrar producción Área A',
    disponible: true,
  },
  {
    id: 'temperatura-humedad',
    codigo: 'I-PRO-03/R-01',
    nombre: 'Control de Temperatura y Humedad',
    accion: 'Registrar lecturas de secado',
    disponible: true,
  },
  {
    id: 'existencias-b',
    codigo: 'P-PRO-01/R-23',
    nombre: 'Control de Existencias B',
    accion: 'Registrar ingreso/salida de quinua lavada',
    disponible: true,
  },
  {
    id: 'volumen-b',
    codigo: 'P-PRO-01/R-25',
    nombre: 'Control de Volumen B',
    accion: 'Registrar producción Área B',
    disponible: true,
  },
  {
    id: 'envasado-pt',
    codigo: 'I-PRO-16/R-01',
    nombre: 'Envasado de PT',
    accion: 'Registrar envasado',
    disponible: true,
  },
  {
    id: 'kardex-subproductos',
    codigo: 'P-PRO-01/R-19',
    nombre: 'Kardex de Subproductos',
    accion: 'Registrar movimientos de subproductos',
    disponible: true,
  },
  {
    id: 'producto-almacen',
    codigo: 'P-PRO-01/R-21',
    nombre: 'Control de Producto en Almacén',
    accion: 'Registrar ingresos/salidas de PT',
    disponible: true,
  },
]

const FORMULARIO_COMPONENT = {
  'nota-entrega-mp': NotaEntregaMateriaPrima,
  'volumen-a': ControlVolumenA,
  'temperatura-humedad': ControlTemperaturaHumedad,
  'existencias-b': ControlExistenciasB,
  'volumen-b': ControlVolumenB,
  'envasado-pt': EnvasadoProductoTerminado,
  'kardex-subproductos': KardexSubproductos,
  'producto-almacen': ControlProductoAlmacen,
}

export default function FormulariosProduccion() {
  const [abierto, setAbierto] = useState(null)

  if (abierto) {
    const FormularioAbierto = FORMULARIO_COMPONENT[abierto]
    return <FormularioAbierto onVolver={() => setAbierto(null)} />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FORMULARIOS.map((f) => (
        <TarjetaFormulario
          key={f.id}
          formulario={f}
          onClick={() =>
            f.disponible ? setAbierto(f.id) : toast.info('Disponible en una próxima iteración.')
          }
        />
      ))}
    </div>
  )
}

function TarjetaFormulario({ formulario, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-3xl bg-marron-tierra/5 p-6 text-left transition-all duration-300 hover:-translate-y-1 ${
        formulario.disponible ? 'hover:bg-marron-tierra/10' : 'opacity-70'
      }`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="rounded-full bg-marron-tierra/10 p-2">
          <FileText className="size-5 text-marron-tierra" strokeWidth={1.75} />
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            formulario.disponible ? 'bg-verde-hoja/15 text-verde-bosque' : 'bg-marron-tierra/10 text-marron-tierra'
          }`}
        >
          {formulario.disponible ? 'Disponible' : 'Próximamente'}
        </span>
      </div>
      <div>
        <p className="font-mono text-xs font-semibold text-marron-cafe/50">{formulario.codigo}</p>
        <h3 className="mt-0.5 font-extrabold text-marron-cafe">{formulario.nombre}</h3>
        <p className="mt-1 text-sm text-marron-cafe/70">{formulario.accion}</p>
      </div>
    </button>
  )
}
