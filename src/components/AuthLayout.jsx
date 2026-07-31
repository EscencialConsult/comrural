import { Link } from 'react-router-dom'
import { useAuthImagenDev } from '../hooks/useAuthImagenDev'
import ImagenPickerDev from './ImagenPickerDev'

// Borrador sin confirmar — no hay un eslogan oficial en el kit de marca
// todavía. Escrito a partir de datos reales (18 años de trayectoria,
// quinua real, origen andino), no inventado de la nada. Confirmar con
// Facundo antes de darlo por definitivo.
const ESLOGAN = '18 años cultivando quinua real, con raíces andinas.'

// Layout compartido de las 3 pantallas de auth (Login/Registro/Recuperar),
// split-screen: una única foto real de fondo cubre TODO el panel (ambas
// mitades), la izquierda la muestra nítida (ilustración), la derecha la
// tapa con un vidrio translúcido con blur (glassmorphism) para que el
// formulario sea legible pero se note la foto de fondo detrás, borrosa.
// La foto está en modo "prueba" (ImagenPickerDev, dev-only) hasta que
// Facundo elija la definitiva para cada pantalla — ver
// src/hooks/useAuthImagenDev.js.
export default function AuthLayout({
  tagline,
  promptText,
  linkLabel,
  linkTo,
  onLinkClick,
  hidePrompt = false,
  pageKey,
  children,
}) {
  const { imagen, setImagen, disponibles } = useAuthImagenDev(pageKey)

  return (
    <div className="relative min-h-svh overflow-hidden bg-marron-cafe md:h-svh">
      <img
        key={imagen}
        src={`/imagenes-generadas/${imagen}`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />

      {/*
        En mobile (apilado: foto arriba, form abajo) la página necesita
        poder crecer más que el viewport y scrollear entera como
        cualquier página normal — por eso acá abajo es min-h-svh, no
        h-svh. El tope FIJO a la altura exacta del viewport (md:h-svh)
        solo aplica desde md en adelante, que es donde arranca el split
        de dos columnas — ahí sí, si el formulario necesita más alto que
        la pantalla, scrollea ESE panel nomás (overflow-y-auto ahí abajo)
        en vez de estirar toda la grilla y empujar el eslogan de la
        columna izquierda fuera de la vista.
      */}
      <div className="relative grid min-h-svh md:h-svh md:grid-cols-[3fr_2fr]">
        <div className="relative flex h-56 flex-col justify-between overflow-hidden p-6 md:h-full md:p-12">
          <div
            className="absolute inset-0 bg-linear-to-t from-marron-cafe/95 via-marron-cafe/10 to-transparent"
            aria-hidden="true"
          />

          {/*
            marcablanco.webp/marcacolor.webp tienen mucho relleno
            transparente arriba/abajo del isotipo (el dibujo real ocupa
            solo la franja vertical 99-286 de un lienzo de 400px alto).
            Ese relleno seguía activando el hover aunque el cursor
            estuviera lejos del logo visible. Se recorta solo acá (no se
            tocan los archivos, que también usan SiteNav/SiteFooter).
            Valores fijos en px por breakpoint (nada de aspect-ratio +
            hijos en %: esa combinación entra en dependencia circular).

            El brillo va en una capa APARTE, fuera del contenedor con
            overflow-hidden: si el drop-shadow vive en el mismo elemento
            que el clip-path del reveal, el propio clip-path (no el
            recorte externo) corta el brillo mientras crece, porque un
            filtro y un clip-path en el mismo elemento se recortan juntos
            siempre. Separando en dos capas, el "wipe" recortado (sin
            brillo) vive adentro del overflow-hidden, y el brillo (con su
            propio reveal sincronizado) vive afuera, libre de cortes.
          */}
          <Link
            to="/"
            className="group relative block h-14 w-[144px] md:h-20 md:w-[206px]"
          >
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="/logos/marcablanco.webp"
                alt="COMRURAL XXI"
                className="absolute h-[72px] w-[144px] top-[-6.7px] left-0 md:h-[103px] md:w-[206px] md:top-[-9.5px]"
              />
              <img
                src="/logos/marcacolor.webp"
                alt=""
                aria-hidden="true"
                className="logo-reveal-crisp pointer-events-none absolute h-[72px] w-[144px] top-[-6.7px] left-0 md:h-[103px] md:w-[206px] md:top-[-9.5px]"
              />
            </div>
            <img
              src="/logos/marcacolor.webp"
              alt=""
              aria-hidden="true"
              className="logo-reveal-glow pointer-events-none absolute h-[72px] w-[144px] top-[-6.7px] left-0 md:h-[103px] md:w-[206px] md:top-[-9.5px]"
            />
          </Link>

          <div className="relative hidden md:block">
            <h2 className="whitespace-nowrap text-2xl leading-tight font-extrabold tracking-tight text-crema-quinua lg:text-3xl">
              {tagline}
            </h2>
            <p className="mt-2 whitespace-nowrap text-sm font-medium text-crema-quinua/80">
              {ESLOGAN}
            </p>
          </div>
        </div>

        <div className="relative flex flex-col overflow-y-auto bg-marron-cafe/70 px-6 py-8 backdrop-blur-sm md:px-16 md:py-12">
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
            {children}

            {!hidePrompt && (
              <p className="mt-6 text-center text-sm text-crema-quinua/60">
                {promptText}{' '}
                {onLinkClick ? (
                  <button
                    type="button"
                    onClick={onLinkClick}
                    className="font-medium text-verde-lima transition-colors duration-200 hover:text-verde-pistacho"
                  >
                    {linkLabel}
                  </button>
                ) : (
                  <Link
                    to={linkTo}
                    className="font-medium text-verde-lima transition-colors duration-200 hover:text-verde-pistacho"
                  >
                    {linkLabel}
                  </Link>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {pageKey && (
        <ImagenPickerDev imagen={imagen} setImagen={setImagen} disponibles={disponibles} />
      )}
    </div>
  )
}
