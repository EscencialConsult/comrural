import { useNavigate, useParams } from 'react-router-dom'
import FormularioInspeccionMateriaPrima from '../components/formularios/FormularioInspeccionMateriaPrima.jsx'

// Envoltorio delgado con URL propia sobre FormularioInspeccionMateriaPrima.jsx
// — el punto de entrada real y cotidiano es la subpestaña "Recepción/Inspección"
// de Calidad y Laboratorio (PanelCalidad.jsx), que monta el mismo componente
// inline, sin navegar. Esta ruta queda para un link directo y compartible a
// un lote puntual (por ejemplo, desde el resumen de Almacén en
// PanelRecepcionLote.jsx, o el hub completo que sigue usando PanelLotes.jsx
// de Compras) — ver docs/formulario-inspeccion-materia-prima.md.
export default function PanelInspeccionMateriaPrima() {
  const { lotId } = useParams()
  const navigate = useNavigate()

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <FormularioInspeccionMateriaPrima lotId={lotId} onVolver={() => navigate(-1)} tituloVolver="Volver" />
    </main>
  )
}
