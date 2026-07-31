// Silueta de montañas andinas en capas, para el panel de ilustración de
// las pantallas de auth. Recoloreado a paleta COMRURAL (nunca los hex
// literales de una referencia) — evoca el origen geográfico real del
// producto (Potosí/Oruro) en vez de un motivo cósmico genérico.
export default function AndeanWaves() {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-2/5 md:h-1/3 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <svg
        className="absolute bottom-0 w-full h-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill="var(--color-verde-bosque)"
          opacity="0.2"
          d="M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,197.3C672,224,768,224,864,208C960,192,1056,160,1152,149.3C1248,139,1344,149,1392,154.7L1440,160L1440,320L0,320Z"
        />
        <path
          fill="var(--color-marron-arcilla)"
          opacity="0.35"
          d="M0,224L60,213.3C120,203,240,181,360,176C480,171,600,181,720,197.3C840,213,960,235,1080,224C1200,213,1320,171,1380,149.3L1440,128L1440,320L0,320Z"
        />
        <path
          fill="var(--color-marron-tierra)"
          opacity="0.6"
          d="M0,288L80,277.3C160,267,320,245,480,240C640,235,800,245,960,229.3C1120,213,1280,171,1360,149.3L1440,128L1440,320L0,320Z"
        />
      </svg>
    </div>
  )
}
