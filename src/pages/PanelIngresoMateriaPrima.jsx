import { useNavigate, useParams } from 'react-router-dom'
import FormularioIngresoMateriaPrima from '../components/formularios/FormularioIngresoMateriaPrima.jsx'

// Envoltorio delgado con URL propia sobre FormularioIngresoMateriaPrima.jsx
// — el punto de entrada REAL y cotidiano es la subpestaña "Recepción" de
// Almacén (PanelAlmacen.jsx), que monta el mismo componente inline, sin
// navegar. Esta ruta queda para un link directo y compartible a un lote
// puntual (por ejemplo, desde el resumen de Calidad en
// PanelRecepcionLote.jsx) — ver docs/formulario-ingreso-materia-prima.md.
export default function PanelIngresoMateriaPrima() {
  const { lotId } = useParams()
  const navigate = useNavigate()

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <FormularioIngresoMateriaPrima
        lotId={lotId}
        onCambiarLote={(id) => navigate(`/panel/calidad/lotes/${id}/ingreso`)}
        onVolver={() => navigate(-1)}
        tituloVolver="Volver"
      />
    </main>
  )
}
