// Parámetros fijos del informe P-LAB-06/R-07 ("Informe de Ensayo
// Microbiológico"), sección "Resultados". No vienen del backend: son la
// referencia técnica impresa del documento oficial (método/límite NB
// 0038), igual para cualquier ensayo microbiológico de esta materia
// prima. Centralizado acá igual que informeFisicoquimicoParametros.js —
// InformeAnalisisMicrobiologico.jsx no mezcla datos fijos del papel con
// estado de React.
export const PARAMETROS_MICROBIOLOGICO = [
  { id: 'res-aerobios', parametro: 'Recuentos de aerobios mesófilos', unidad: 'UFC/g', metodo: 'NB-32003', limite: '2,0x10^5' },
  { id: 'res-coliformes', parametro: 'Recuento de coliformes', unidad: 'UFC/g', metodo: 'NB-32005', limite: '1,0x10^2' },
  { id: 'res-levaduras', parametro: 'Recuentos de levaduras', unidad: 'UFC/g', metodo: 'NB-32006', limite: '3,0x10^3' },
  { id: 'res-mohos', parametro: 'Recuento de mohos', unidad: 'UFC/g', metodo: 'NB-32006', limite: '3,0x10^3' },
  { id: 'res-salmonella', parametro: 'Recuento de Salmonella', unidad: '-', metodo: 'A-MA-P-01 ISO 6579-1:2017', limite: 'Ausencia 25g' },
]
