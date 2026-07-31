import { useState } from 'react'

// SOLO PARA DESARROLLO — deja elegir qué foto de fondo probar en cada
// pantalla de auth (Login/Registro/Recuperar) sin tocar código. Cada
// pantalla recuerda su propia elección por separado (una foto distinta
// por pantalla, decisión de Facundo). Se elimina antes de producción.
export const IMAGENES_DISPONIBLES = [
  'beautiful-shot-large-cornfield-spring.jpg',
  'person-walking-green-brown-field.jpg',
  'mesmerizing-beautiful-wheat-field-greenery-cloudy-sky.jpg',
  'close-up-wheat.jpg',
  'wide-angle-shot-dry-landscape-with-mountains-cloudy-sky.jpg',
  'wide-shot-field-with-green-plants-mountains-distance-blue-cloudy-sky.jpg',
]

const STORAGE_PREFIX = 'comrural_auth_img_dev_'

export function useAuthImagenDev(pageKey) {
  const storageKey = STORAGE_PREFIX + pageKey
  const [imagen, setImagenState] = useState(
    () => localStorage.getItem(storageKey) || IMAGENES_DISPONIBLES[0],
  )

  const setImagen = (nombre) => {
    localStorage.setItem(storageKey, nombre)
    setImagenState(nombre)
  }

  return { imagen, setImagen, disponibles: IMAGENES_DISPONIBLES }
}
