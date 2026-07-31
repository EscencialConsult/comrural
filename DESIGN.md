---
name: COMRURAL XXI — Sistema de Gestión
description: ERP interno agroindustrial con la disciplina estructural de antigravity.google y la identidad orgánica/andina de COMRURAL
colors:
  verde-hoja: "#62A83C"
  verde-bosque: "#2A572B"
  verde-lima: "#84B739"
  verde-pistacho: "#DCE5C8"
  marron-tierra: "#733F1F"
  marron-arcilla: "#9C4119"
  marron-cafe: "#3E2312"
  celeste-aqua: "#48C9C4"
  azul-andino: "#5282A7"
  azul-indigo: "#4278A3"
  crema-quinua: "#FAF4E8"
  rojo-pasankalla: "#C0392B"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    letterSpacing: "0.01em"
rounded:
  sm: "8px"
  md: "16px"
  lg: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.verde-lima}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.verde-hoja}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.marron-cafe}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.marron-tierra}0D"
    textColor: "{colors.marron-cafe}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: COMRURAL XXI — Sistema de Gestión

## 1. Overview

**Creative North Star: "El cuaderno de campo técnico"**

COMRURAL es un ERP interno para una agroindustria de quinua boliviana, usado a diario por personal operativo no técnico (Almacén, Calidad, Producción). El sistema toma la disciplina estructural de antigravity.google — superficies planas sin sombra, jerarquía construida solo con tipografía y peso, un único acento de color por pantalla, motion contenido — y la aplica sobre la identidad propia de COMRURAL: una paleta orgánica/andina (verdes de hoja, marrones de tierra, celeste de agua) y una sola familia tipográfica (Montserrat) variando en peso.

El sistema rechaza explícitamente dos extremos: el look "SaaS genérico hecho por IA" (plano sin textura, sin profundidad de detalle, sin motion, decoración sin propósito) y la calidez rústica literal (ilustraciones de hojas, texturas artesanales) — la calidez viene de la paleta y la tipografía, no de decoración temática.

**Key Characteristics:**
- Superficies planas, profundidad por tinte de color, nunca por `box-shadow`
- Botones y badges siempre en pastilla (`9999px`)
- Un solo acento de color por pantalla (verde lima, `#84B739`) reservado para la acción principal
- Fondo cálido (`#FAF4E8`), nunca blanco puro salvo en reportes/documentos formales
- Motion sutil y con propósito: transiciones de color/transform, nunca decorativo sin función

## 2. Colors

Paleta orgánica de 12 colores en 4 gamas (verdes, marrones/terrosos, celestes/azules, neutros), definida por el cliente — ver `wiki/comrural-kit-de-marca.md` en el vault del proyecto para el detalle completo de aplicación por asset.

### Primary
- **Verde Lima** (`#84B739`): el único acento accionable — CTA principal, hover de botones. Reservado para una sola tarea por pantalla, igual que el acento azul de la referencia antigravity se reserva solo para /pricing.

### Secondary
- **Verde Hoja** (`#62A83C`): estado "relevado"/positivo en badges, hover del CTA primario.
- **Marrón Tierra** (`#733F1F`): titulares (`h1`/`h2`), footer, texto de máxima jerarquía.

### Tertiary
- **Celeste Aqua** (`#48C9C4`): estado "en curso"/parcial en badges, único lugar donde aparece la gama fría.

### Neutral
- **Crema Quinua** (`#FAF4E8`): fondo de página por defecto — cálido, nunca blanco puro.
- **Marrón Café** (`#3E2312`): texto de cuerpo (con opacidad reducida para texto secundario), fondo del footer.
- **Verde Pistacho** (`#DCE5C8`): fondos secundarios muy suaves, cuando hace falta una superficie más clara que el tinte estándar.

### Named Rules
**La Regla del Acento Único.** Cada pantalla tiene como máximo un elemento en Verde Lima puro (el CTA principal). Todo lo demás — badges de estado, texto, fondos — usa la gama tierra/verde en tintes de baja saturación. Si dos elementos compiten por Verde Lima en la misma vista, algo está mal jerarquizado.

## 3. Typography

**Display Font:** Montserrat (con `sans-serif` de fallback)
**Body Font:** Montserrat (misma familia, peso 400/500)
**Label/Mono Font:** ninguna — no hay fuente monoespaciada en el sistema

**Character:** una sola familia variable en peso, sin pareja display/body — la jerarquía se construye por tamaño y peso (400 a 900), nunca por una segunda tipografía. Esto es deliberado: evita el patrón "fuente de marca llamativa + fuente neutra de cuerpo" y mantiene una sola voz consistente, igual que Google Sans Flex en la referencia.

### Hierarchy
- **Display** (900, `clamp(2.25rem, 5vw, 3.75rem)`, line-height 1.1): headline del hero de `/servicio`, en Marrón Tierra.
- **Headline** (800, `1.25rem`, line-height 1.3): títulos de sección y de tarjeta de módulo, en Marrón Café.
- **Body** (400, `1rem`, line-height 1.6, max 65-75ch): descripciones de módulo, subtítulos de sección.
- **Label** (500, `0.8rem`, tracking `0.01em`): texto de badges de estado, nav.

### Named Rules
**La Regla del Peso Único.** Nunca 700 (bold estándar) — la escala salta de 400/500 (cuerpo) directo a 800/900 (títulos). Ese hueco deliberado es lo que separa visualmente "leer" de "escanear" sin necesitar una segunda fuente.

## 4. Elevation

El sistema es completamente plano: cero `box-shadow` en cualquier componente. La profundidad se comunica solo con tinte de fondo (`marron-tierra` a 5-10% de opacidad para tarjetas en reposo, 10-15% en hover) — nunca con sombra ni borde. Esta es una decisión heredada directamente de la referencia antigravity.google (`effects.shadows: []` confirmado en las 3 páginas analizadas con `/taste`).

### Named Rules
**La Regla Plana por Defecto.** Ninguna superficie tiene sombra en reposo ni en hover. Si un componente necesita distinguirse del fondo, sube el tinte de color, no agregues elevación.

## 5. Components

### Buttons
- **Shape:** pastilla completa (`border-radius: 9999px`), sin excepción.
- **Primary:** fondo Verde Lima (`#84B739`), texto blanco, padding `12px 24px`.
- **Hover:** transición de color a Verde Hoja (`#62A83C`) en 300ms, `ease` estándar — nunca bounce/elastic.
- **Secondary/Ghost:** fondo transparente, borde `1px solid` marron-tierra al 20% de opacidad, texto Marrón Café. Mismo radio y padding que el primario.

### Chips (badges de estado)
- **Style:** pastilla, fondo tintado al 15-20% del color de rol, texto en la versión saturada del mismo color (ej. fondo `verde-hoja/15` + texto `verde-bosque`).
- **State:** un color por estado real del dato (relevado / parcial / pendiente) — nunca decorativo, siempre representa información real.

### Cards / Containers
- **Corner Style:** `24px` (`rounded-3xl`).
- **Background:** tinte de `marron-tierra` al 5% en reposo, 10% en hover — nunca blanco puro ni color sólido.
- **Shadow Strategy:** ninguna — ver sección Elevation.
- **Border:** ninguno.
- **Internal Padding:** `24px`.

### Navigation
- Fondo transparente sobre `crema-quinua`, sin banda de color sólida. Logo full-color a la izquierda, links de texto (Montserrat 500, marron-cafe al 70% de opacidad, sube a 100% en hover) al centro-izquierda, estado del usuario a la derecha. Sin dropdown todavía — los links son anclas reales a secciones existentes de la misma página, nunca rutas que no existen.

## 6. Do's and Don'ts

### Do:
- **Do** usar pastilla (`9999px`) en todo botón, chip o badge, sin excepción.
- **Do** reservar Verde Lima puro para un solo elemento accionable por pantalla.
- **Do** construir jerarquía con peso tipográfico (400/500 → 800/900), nunca con una segunda familia.
- **Do** usar tinte de color (`marron-tierra` a 5-15% de opacidad) para dar profundidad a tarjetas y superficies.
- **Do** dejar `crema-quinua` (`#FAF4E8`) como fondo de página por defecto.

### Don't:
- **Don't** usar `box-shadow` en ningún componente — ni siquiera "sutil".
- **Don't** usar una tipografía distinta para headers vs. cuerpo — es Montserrat en todo el sistema.
- **Don't** dejar una pantalla plana sin ningún detalle de textura/motion — eso es exactamente el problema "muy IA" que el cliente señaló en la v1 de `/servicio`: nada de fondo con efecto real, sin profundidad de detalle.
- **Don't** agregar decoración sin propósito (badge por cada dato posible, card dentro de card, gradiente sin razón).
- **Don't** usar blanco puro (`#FFFFFF`) como fondo de página — solo en reportes/documentos formales exportables.
- **Don't** enlazar a rutas que no existen todavía — usar anclas reales dentro de la misma página hasta que la ruta se construya.
