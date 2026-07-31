# Design Map

## Spacing Scale
4px · 6px · 8px · 10px · 16px · 24px · 32px · 36px · 48px · 60px · 72px · 80px · 120px (base unit 4px)

## Font Hierarchy
- Hero: 80px / 450 — Google Sans Flex
- H2-large: 54px / 450
- H2: 42px / 450
- H2-small: 32px / 450
- Lede: 24px / 450
- Body: 17.5px / 400
- Button/label: 14.5px / 450

## Color Palette
- Background: `#F8F9FC`
- Background inverse: `#121317`
- Text primary: `#45474D`
- Text heading: `#121317`
- Accent (pricing only): `#3279F9`
- Surface white: `#FFFFFF`

## Image Ratios
- Hero: 1.78:1 · Feature: 0.88:1 · Feature-square: 1:1 · Thumbnail: 1:1

## Component Tokens
- Radius: `9999px` (buttons/badges) · `36px` (large panels) · `24px` (pricing cards) · `16px` / `8px` / `4px` (small elements)
- Shadows: none — depth via background-tint only
- Grid: fluid container ~1425px, columns vary by section (2/4/9)
- Motion: `transform 0.3s ease-in-out, background-color 0.3s` (shared hover), always eased 0.15-0.3s

---

# Taste DNA

### No-Shadow Flat Depth
- **Trigger**: When deciding how pricing cards, feature panels, and code-screenshot mockups should read as distinct surfaces.
- **Decision**: Chose zero elevation shadows, using near-invisible background tint instead, over conventional card shadows.
- **Reason**: A product about AI agents doing real engineering work wants to feel calm and technical, not like a marketing site stacking glossy cards.
- **Evidence**: `effects.shadows: []` on all 3 pages analyzed; card-detection heuristic found zero matches anywhere.

### Single-Typeface, Weight-Only Hierarchy
- **Trigger**: Differentiating an 80px hero headline from 17.5px body copy and 14.5px button labels.
- **Decision**: Chose one variable font (Google Sans Flex) across every role using fractional weights, over pairing a display face with a separate body face.
- **Reason**: A single voice at every scale feels engineered and consistent — appropriate when the product itself is meant to be the star.
- **Evidence**: `uniqueFamilies` = Google Sans Flex + icon font only, on all 3 pages; weight never exceeds 500.

### Accent Color Confined to Its One Job
- **Trigger**: Deciding where the system's one non-neutral hue (#3279F9 blue) should appear.
- **Decision**: Chose to restrict blue to /pricing alone, over extending it as a site-wide accent.
- **Reason**: Color pulls attention; the only place a user needs a quick visual distinction is comparing pricing tiers.
- **Evidence**: Blue appears in /pricing's top-6 color lists but is absent from home and /product entirely.

### Decorative Motion Stays Out of the UI's Way
- **Trigger**: Wanting a distinctive "liftoff" mood without making the interface feel unpredictable.
- **Decision**: Chose to split motion into page-specific atmospheric particles versus one shared functional hover transition, over a single unified animation system.
- **Reason**: Users get the brand personality without it ever slowing down or obscuring what they came to click.
- **Evidence**: Particle pattern differs per page; identical hover-transition string recurs verbatim on all 3 pages.
