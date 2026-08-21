// Pie de firmas del papel: los cuatro recuadros, uno al lado del otro.
//
// En la hoja cada responsable tiene su cuadro — un espacio en blanco arriba
// donde firma de puño y letra, y abajo el cargo y el nombre. Acá se replica
// esa forma en vez de una tabla de filas: son cuatro firmas paralelas, no una
// lista, y puestas en fila se reconocen de un vistazo contra el papel que la
// gente ya conoce.
//
// El marco de la firma queda VACÍO a propósito y con borde punteado. Todavía
// no está conectado: el sistema hoy puede probar como mucho dos de las cuatro
// identidades (`createdBy`/`completedBy` de la inspección y `reviewedBy` de
// la resolución), y el transportista directamente no tiene cuenta de usuario.
// El punteado dice "acá va algo que todavía no está" — un recuadro con borde
// sólido y vacío se leería como una firma que falta, que es otra cosa.
//
// Usuario y puesto se muestran debajo aunque estén pendientes: son las dos
// cosas que van a llenar ese espacio cuando se conecte.
// `claseGrilla`: por defecto arma la grilla de 4 (el pie de firmas de un
// formulario completo). Un solo recuadro suelto (ej. la firma del
// conductor dentro de Datos del transporte) pasa `claseGrilla="max-w-xs"`
// para no estirarse a lo ancho con un solo elemento — y `mostrarNota`
// en `false`, para no repetir el mismo aviso de "todavía no están
// conectadas" dos veces en la misma hoja si ya lo dice el pie de firmas
// del formulario completo.
export default function FirmasResponsables({
  responsables = [],
  claseGrilla = 'sm:grid-cols-2 lg:grid-cols-4',
  mostrarNota = true,
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`grid gap-3 ${claseGrilla}`}>
        {responsables.map(({ rol, usuario, puesto, firmadoEn }) => (
          <div key={rol} className="flex flex-col overflow-hidden rounded-2xl bg-white/70">
            {/* Espacio de firma */}
            <div className="m-3 mb-0 flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-verde-hoja/35">
              {firmadoEn ? (
                <span className="px-2 text-center text-xs font-semibold text-verde-bosque">
                  Registrado el{' '}
                  {new Date(firmadoEn).toLocaleDateString('es-BO', { dateStyle: 'medium' })}
                </span>
              ) : (
                <span className="text-xs font-medium text-marron-cafe/40">Espacio para la firma</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 p-3">
              <p className="text-xs font-bold uppercase leading-snug tracking-wide text-verde-bosque">{rol}</p>
              <Dato etiqueta="Usuario" valor={usuario} />
              <Dato etiqueta="Puesto" valor={puesto} />
            </div>
          </div>
        ))}
      </div>
      {mostrarNota && (
        <p className="px-1 text-xs italic text-marron-cafe/70">
          Las firmas todavía no están conectadas al sistema — por ahora se completan a mano en la versión impresa.
        </p>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
      <span className="font-semibold uppercase tracking-wide text-marron-cafe/55">{etiqueta}</span>
      <span className={valor ? 'font-medium text-marron-cafe' : 'text-marron-cafe/40'}>{valor ?? 'Pendiente'}</span>
    </p>
  )
}
