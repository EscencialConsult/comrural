import { Link } from 'react-router-dom'
import { useAuthImagenDev } from '../hooks/useAuthImagenDev'
import ImagenPickerDev from './ImagenPickerDev'

// Borrador sin confirmar — no hay un eslogan oficial en el kit de marca
// todavía. Escrito a partir de datos reales (18 años de trayectoria,
// quinua real, origen andino), no inventado de la nada. Confirmar con
// Facundo antes de darlo por definitivo.
const ESLOGAN = '18 años cultivando quinua real, con raíces andinas.'

// Layout compartido de las 3 pantallas de auth (Login/Registro/Recuperar).
// Son DOS estructuras distintas, no una sola achicada:
//
// - Desktop (lg, 1024px+): split-screen — una única foto real de fondo
//   cubre todo el panel, la izquierda la muestra nítida (ilustración), la
//   derecha la tapa con un vidrio translúcido con blur (glassmorphism)
//   para que el formulario sea legible pero se note la foto detrás.
// - Mobile/tablet (< lg): SIN foto ni blur — barra superior simple con
//   el logo (reemplaza al logo grande + eslogan del panel izquierdo, que
//   acá no entra) y el formulario debajo sobre fondo sólido. La foto de
//   fondo + glassmorphism sobre un formulario angosto no daba suficiente
//   contraste garantizado en pantallas chicas; el fondo sólido no depende
//   de qué tan clara/oscura salga la foto elegida.
//
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
    <div className="relative min-h-svh bg-marron-cafe lg:h-svh lg:overflow-hidden">
      {/* Foto de fondo — decorativa, SOLO existe en el split de desktop.
          En mobile/tablet no se muestra: ver nota arriba sobre contraste. */}
      <img
        key={imagen}
        src={`/imagenes-generadas/${imagen}`}
        alt=""
        className="absolute inset-0 hidden h-full w-full object-cover lg:block"
        aria-hidden="true"
      />

      {/*
        flex-col apilado por default (barra arriba, form abajo, scroll de
        página normal) — desde lg pasa a grid de dos columnas con altura
        fija al viewport (mismo motivo que antes: si el split arrancara en
        md, con la proporción 3fr/2fr + el padding fijo de la columna
        derecha, el formulario quedaba en ~180px de ancho real a 768px,
        todo amontonado. Recién a partir de lg esa columna tiene aire).
      */}
      <div className="relative flex min-h-svh flex-col lg:h-svh lg:grid lg:grid-cols-[3fr_2fr]">
        {/* Barra superior — SOLO mobile/tablet. El logo grande del panel
            izquierdo (más abajo) cumple ese rol en desktop, así que acá
            desaparece del todo (lg:hidden), no se achica. Logo estático,
            sin la animación de hover del panel de desktop: en touch no
            hay hover, así que esa interacción no aplica. */}
        <header className="flex shrink-0 items-center border-b border-crema-quinua/10 px-6 py-4 lg:hidden">
          <Link to="/" className="relative block h-14 w-[144px] overflow-hidden">
            <img
              src="/logos/marcablanco.webp"
              alt="COMRURAL XXI"
              className="absolute top-[-6.7px] left-0 h-[72px] w-[144px]"
            />
          </Link>
        </header>

        {/* Panel izquierdo — SOLO desktop (foto + logo grande con hover +
            eslogan). En mobile/tablet no existe, lo reemplaza la barra de
            arriba. */}
        <div className="relative hidden overflow-hidden p-12 lg:flex lg:h-full lg:flex-col lg:justify-between">
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

            El brillo va en una capa APARTE, fuera del contenedor con
            overflow-hidden: si el drop-shadow vive en el mismo elemento
            que el clip-path del reveal, el propio clip-path (no el
            recorte externo) corta el brillo mientras crece, porque un
            filtro y un clip-path en el mismo elemento se recortan juntos
            siempre. Separando en dos capas, el "wipe" recortado (sin
            brillo) vive adentro del overflow-hidden, y el brillo (con su
            propio reveal sincronizado) vive afuera, libre de cortes.
          */}
          <Link to="/" className="group relative block h-20 w-[206px]">
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="/logos/marcablanco.webp"
                alt="COMRURAL XXI"
                className="absolute top-[-9.5px] left-0 h-[103px] w-[206px]"
              />
              <img
                src="/logos/marcacolor.webp"
                alt=""
                aria-hidden="true"
                className="logo-reveal-crisp pointer-events-none absolute top-[-9.5px] left-0 h-[103px] w-[206px]"
              />
            </div>
            <img
              src="/logos/marcacolor.webp"
              alt=""
              aria-hidden="true"
              className="logo-reveal-glow pointer-events-none absolute top-[-9.5px] left-0 h-[103px] w-[206px]"
            />
          </Link>

          <div className="relative">
            <h2 className="whitespace-nowrap text-2xl leading-tight font-extrabold tracking-tight text-crema-quinua lg:text-3xl">
              {tagline}
            </h2>
            <p className="mt-2 whitespace-nowrap text-sm font-medium text-crema-quinua/80">
              {ESLOGAN}
            </p>
          </div>
        </div>

        {/* Panel del formulario — fondo sólido (hereda el bg-marron-cafe
            del contenedor raíz) en mobile/tablet; en desktop se vuelve
            vidrio translúcido con blur sobre la foto del panel izquierdo. */}
        <div className="relative flex flex-1 flex-col px-6 py-8 lg:overflow-y-auto lg:bg-marron-cafe/70 lg:px-16 lg:py-12 lg:backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-6 lg:py-8">
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
