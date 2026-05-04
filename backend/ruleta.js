// Probabilidades gacha: ajustar solo estos números. La suma DEBE ser 100.
// Sectores visuales iguales en la ruleta; las probabilidades reales son distintas.
// sin_premio domina: 88% total repartido en 3 sectores.
// Perfil activo: premio_especial suma 0.5% total.
// premio_especial aparece 2 veces visualmente, pero la probabilidad real total es 0.5%.
//
// Colores derivados del logo del cliente:
//   Rosas vívidos -> premios / descuentos
//   Azules suaves -> sin_premio
//   Blanco        -> envío gratis
// Las caritas tristes quedan espaciadas en los sectores 0, 3 y 6.
const PREMIOS = [
  { id: 'sin_premio',      label: 'Sin premio',        descuento: null,  color: '#8FC2D6', probabilidad: 23.34 },
  { id: 'premio_especial', label: 'Regalo sorpresa',   descuento: null,  color: '#FF3F6C', probabilidad: 0.5   },
  { id: 'off_5',           label: '5% OFF',            descuento: '5%',  color: '#FF8FA8', probabilidad: 20    },
  { id: 'sin_premio',      label: 'Sin premio',        descuento: null,  color: '#CFEAF3', probabilidad: 23.33 },
  { id: 'envio_gratis',    label: 'Envío gratis',      descuento: null,  color: '#FFFFFF', probabilidad: 5     },
  { id: 'premio_especial', label: 'Regalo sorpresa',   descuento: null,  color: '#D92C55', probabilidad: 0.5   },
  { id: 'sin_premio',      label: 'Sin premio',        descuento: null,  color: '#A9D3E3', probabilidad: 23.33 },
  { id: 'off_10',          label: '10% OFF',           descuento: '10%', color: '#FF5C85', probabilidad: 4     },
];

const PROBABILIDADES_CASA = [29.34, 0.25, 8, 29.33, 2, 0.25, 29.33, 1.5];
PREMIOS.forEach((premio, index) => {
  premio.probabilidad = PROBABILIDADES_CASA[index];
});

// Verificación que las probabilidades sumen 100.
const totalProb = PREMIOS.reduce((sum, p) => sum + p.probabilidad, 0);
if (Math.abs(totalProb - 100) > 0.01) {
  throw new Error(`Las probabilidades deben sumar 100 (actual: ${totalProb})`);
}

function girar() {
  const rand = Math.random() * 100;
  let acum = 0;
  for (const premio of PREMIOS) {
    acum += premio.probabilidad;
    if (rand <= acum) return premio;
  }
  return PREMIOS[0];
}

// Solo expone labels y colores al frontend, nunca las probabilidades.
function getPremiosPublicos() {
  return PREMIOS.map(({ id, label, color }) => ({ id, label, color }));
}

module.exports = { girar, getPremiosPublicos, PREMIOS };
