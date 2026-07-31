# Mock Service Layer — leer antes de tocar `src/mock/` o `src/services/`

Este proyecto se desarrolló **solo del lado del frontend**, sin backend ni base de datos todavía. Para poder construir pantallas reales (con loading/success/error de verdad, no placeholders estáticos) sin depender de un backend, toda la data pasa por dos carpetas:

```
src/
├── mock/          ← "base de datos" falsa (JSON estático)
│   ├── data/
│   ├── index.js
│   └── README.md  ← este archivo
└── services/      ← "endpoints" falsos que los componentes consumen
```

**Regla de oro que se respetó en todo el proyecto:** los componentes (`src/pages/`, `src/components/`, etc.) **nunca** importan nada de `src/mock/` directamente. Siempre importan de `src/services/`. Eso es lo que hace que el reemplazo sea seguro.

---

## Si sos el/la ingeniera de backend leyendo esto

### 1. Qué borrar

Toda la carpeta **`src/mock/`** es descartable. Es data inventada para poder maquetar — nombres, emails, versiones, todo es de prueba. **No hay ningún dato real de COMRURAL ahí adentro.** Bórrala entera cuando termines de migrar cada servicio (o al final, cuando ya no quede ningún `import` apuntando ahí).

### 2. Qué reemplazar (y cómo)

Cada archivo en **`src/services/`** exporta un objeto con métodos async (`getX`, `createX`, etc.). Tenés que **reescribir el cuerpo de cada método** para que hable con el backend real (Supabase, API propia, lo que sea) — pero **mantené el nombre del archivo, el nombre del objeto exportado y la firma de cada función exactamente igual**. Si cambiás eso, hay que tocar todos los componentes que lo consumen, y ese es justo el trabajo que este patrón evita.

Ejemplo — así se ve hoy `servicioService.js`:

```js
import { plataforma, modulos } from '../mock'

export const servicioService = {
  async getPlataforma() {
    await delay()
    return { ...plataforma }
  },
  // ...
}
```

Así debería quedar cuando conectes Supabase (mismo nombre de archivo, mismo objeto, mismas funciones):

```js
import { supabase } from './supabaseClient'

export const servicioService = {
  async getPlataforma() {
    const { data, error } = await supabase.from('plataforma').select().single()
    if (error) throw error
    return data
  },
  // ...
}
```

Ningún componente que use `servicioService.getPlataforma()` se entera del cambio.

**Nota sobre el usuario:** `servicioService` ya no expone `getUsuarioActual` — el nav/footer (`useSitioBase.js`) toman el usuario de `authService.getSesionActual()`, que es la sesión real (o la de un usuario de prueba vía `DevRoleSwitcher`). Todo lo que sea "quién está logueado" vive en `authService.js`, no acá.

### 3. Qué NO confiar como dato real

Todo lo que está en `src/mock/data/*.json` es **data sucia de desarrollo**, generada por mí (frontend) para poder ver algo en pantalla mientras maquetaba. Ejemplos concretos ya en este proyecto:

- `usuario-actual.json` → nombre "Usuario de Prueba", email `prueba@comrural.local`, rol inventado — **no es un usuario real de COMRURAL**.
- `plataforma.json` → número de versión y notas de versión inventados para poder mostrar el footer.
- `modulos.json` → esta lista SÍ tiene valor real (nombres/descripciones de los módulos del ERP salen del relevamiento funcional real, ver `~/.claude/proyectos/comrural/wiki/`), pero los campos `estado` reflejan el avance del **relevamiento**, no necesariamente el de una tabla de base de datos — confirmar con Facundo si esa lista pasa a una tabla `modulos` real o queda hardcodeada en el frontend.

Regla práctica: **si un valor viene de `src/mock/`, asumí que es falso hasta que lo compares con el modelo de datos real.**

### 4. Convención de nombres de campos

Los JSON usan `snake_case` (`created_at`, `avatar_url`, `ultima_actualizacion`) a propósito, para que ya coincidan con cómo se llamarían las columnas en una tabla SQL/Supabase real y el mapeo sea directo, sin renombrar campos al conectar.

---

## Mocks activos (actualizar esta tabla cada vez que se agregue uno nuevo)

| Servicio (`src/services/`) | Mock que consume (`src/mock/data/`) | Pantalla que lo usa | Reemplazar por |
|---|---|---|---|
| `servicioService.js` | `plataforma.json`, `modulos.json`, `descargas.json`, `novedades.json` | `/servicio`, `/modulos`, `/descargas`, `/novedades` (públicas — son informativas, no datos operativos reales) | Tabla `modulos` o config estática (a definir) + `descargas.json` se reemplaza cuando existan builds reales de escritorio/mobile + `novedades.json` se reemplaza por una tabla de changelog real (esta sí tiene datos reales del proyecto, no son ficticios, pero igual conviene que backend las persista en vez de hardcodearlas) |
| `authService.js` | `usuario-actual.json`, `usuarios-prueba.json` | `/login`, `/registro`, `/recuperar-contrasena` | Auth real (Supabase Auth u otro proveedor). Hoy `login`/`registrar` aceptan cualquier valor no vacío y guardan la sesión en `localStorage` (`comrural_sesion_mock`) — no hay validación de credenciales real. `loginConProveedor('Google'\|'Facebook')` simula el login social (botones de `SocialButtons.jsx`) hasta que exista un Client ID/App ID real y un backend que verifique el token — se reemplaza por el flujo OAuth real completo (client + verificación server-side), no solo por el Client ID. `loginComoUsuarioPrueba` y `usuarios-prueba.json` son solo para `DevRoleSwitcher.jsx` (dev-only, se elimina antes de producción) y no tienen que migrarse. |
| `rolesService.js` | `roles.json` | `/panel` (`DashboardHeader.jsx` muestra el nombre del rol vía `usuario.rol`; todavía no se usa para mostrar contenido/permisos distintos por rol) | Tabla `roles` real, con permisos/módulos visibles por rol. Hoy son 8 placeholders sin distinción ("Rol N°1".."Rol N°8") a propósito — todavía no está definido qué rol ve qué. `usuarios-prueba.json` referencia estos ids (`rol_1`..`rol_8`) en su campo `rol`. |
| `panelService.js` | `panel-resumen.json` | `/panel` (dashboard genérico: salud IA, área/cultivos, lote destacado, suelo, tareas, crecimiento, distribución) | Un endpoint real por widget, separado por módulo real (ej. el análisis de suelo probablemente sale de Calidad, las tareas de Producción) — hoy es un solo bloque de datos de ejemplo para clonar la referencia visual, no está mapeado a ningún módulo todavía. |
| `notificacionesService.js` | `notificaciones.json` | `/panel` (dropdown de la campana en `DashboardHeader.jsx`) | Tabla `notificaciones` real (o un canal realtime tipo Supabase Realtime). Hoy el service mantiene una copia mutable en memoria (module-level) para simular "marcar todas como leídas"/"borrar todas" sin backend — se pierde al recargar la página a propósito, no hay persistencia real todavía. |

**`climaService.js` NO es mock** — es la única llamada a un servicio externo real que tiene el proyecto (WeatherAPI.com, endpoint `current.json`, ubicación fija: El Alto, La Paz — planta de COMRURAL). Requiere `VITE_WEATHERAPI_KEY` en un `.env` local (ver `.env.example`). El `.env` con la key real SÍ está comiteado a propósito — todavía no hay backend/hosting, así que cualquiera que clone el repo necesita poder correr el proyecto sin pasos extra; esto se revisa cuando exista backend (ver punto 3 abajo). Si la key falta o la API falla, `Panel.jsx` lo atrapa con un `.catch` y muestra un estado explícito de "Clima no disponible por el momento" (ícono `CloudOff`) en vez de dejar el hueco vacío — no rompe el resto del dashboard.

**Pendiente real antes de producción (dato sensible en el frontend):** la key de WeatherAPI queda expuesta en el bundle del cliente — así funcionan las env vars `VITE_*` de Vite, se inyectan en el build y cualquiera las ve con F12 → Network. Cuando exista backend:

1. Crear un endpoint propio (ej. `GET /api/clima`) que guarde la key como variable de entorno del **servidor** (no `VITE_*`) y llame a WeatherAPI desde ahí.
2. Reescribir `climaService.js` para que pida a ese endpoint en vez de a WeatherAPI directo — mismo nombre de archivo, mismo objeto `climaService`, misma forma de respuesta (`{ temperaturaC, ubicacion, condicion }`), para que `Panel.jsx`/`DashboardHeader.jsx` no se enteren del cambio (mismo patrón de reemplazo que el resto de esta tabla).
3. Borrar `VITE_WEATHERAPI_KEY` de `.env`/`.env.example` una vez migrado — no debe quedar ninguna key real del lado del cliente.

Cuando se agregue el mock del módulo Almacén (recepción, stock, salidas), sumar una fila acá — no dejar que la lista quede desactualizada, es la única forma de que quien migre a backend sepa qué falta.

---

## Por qué se hizo así (para quien no conoce el patrón)

1. **El frontend queda listo para producción de verdad**, no es una maqueta descartable — ya maneja loading/success/error porque cada servicio devuelve una Promesa con delay simulado.
2. **Cero fricción en el traspaso**: backend reescribe archivos de `src/services/`, no toca un solo componente ni estilo.
3. **Nada de datos reales de COMRURAL contaminando el repo** mientras se decide el backend — todo lo que hay en `src/mock/` es descartable por diseño.
