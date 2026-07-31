// Config única de navegación — la usan SiteNav y SiteFooter, así nunca
// quedan desincronizados. Cada entrada es una ruta real de react-router,
// nunca un ancla a algo que no existe en esa página.
export const NAV_LINKS = [
  { to: '/modulos', label: 'Módulos' },
  { to: '/descargas', label: 'Descargas' },
  { to: '/novedades', label: 'Novedades' },
]
