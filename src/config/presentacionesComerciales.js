// Tabla de presentaciones comerciales del relevamiento (RP-19) — única
// fuente para los formularios de Producción que la necesitan (Volumen B,
// Envasado de PT, Control de Producto en Almacén). `pesoNetoKg` es el que
// permite calcular Kg a partir de una cantidad de unidades sin volver a
// tipearlo en cada pantalla.
export const PRESENTACIONES_COMERCIALES = [
  { id: 'bigbag-1000', nombre: 'Big Bag / Vivac 1.000 kg', pesoNetoKg: 1000, notaLiberacion: 'Liberación por unidad' },
  { id: 'bigbag-1200', nombre: 'Big Bag / Vivac 1.200 kg', pesoNetoKg: 1200, notaLiberacion: 'Liberación por unidad' },
  { id: 'kraft-25kg', nombre: 'Papel Kraft 25 kg', pesoNetoKg: 25, notaLiberacion: 'Liberación del lote completo' },
  { id: 'kraft-25lb', nombre: 'Papel Kraft 11,34 kg (25 lb)', pesoNetoKg: 11.34, notaLiberacion: 'Liberación del lote completo' },
]
