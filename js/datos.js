// Datos hipotéticos del caso financiero.
// Se calcula b = A*x objetivo para comprobar los resultados.

export const VARIABLES = [
  { id: "x1", nombre: "Infraestructura tecnológica", color: "blue" },
  { id: "x2", nombre: "Desarrollo de software", color: "purple" },
  { id: "x3", nombre: "Seguridad informática", color: "green" },
  { id: "x4", nombre: "Mantenimiento y soporte", color: "orange" }
];

const A1 = [
  [4, 1, 0.5, 0.5],
  [1, 4, 0.5, 0.5],
  [0.5, 0.5, 3, 0.5],
  [0.5, 0.5, 0.5, 3]
];

const D = [10, 3, 1, 0.3];

const A3 = A1.map((fila, i) =>
  fila.map((valor, j) => valor * D[i] * D[j])
);

const multiplicar = (A, x) =>
  A.map(fila => fila.reduce((s, v, j) => s + v * x[j], 0));

const x1 = [120, 100, 70, 60];
const x2 = [105, 85, 60, 50];
const x3 = [110, 90, 65, 55];

export const ESCENARIOS = {
  ideal: {
    id: "ideal",
    numero: "ESCENARIO 01",
    nombre: "Ideal",
    descripcion: "Recursos y necesidades equilibrados entre cuatro áreas.",
    detalle: "Matriz bien condicionada.",
    A: A1,
    b: multiplicar(A1, x1),
    icono: "↗",
    color: "blue"
  },

  estres: {
    id: "estres",
    numero: "ESCENARIO 02",
    nombre: "Bajo estrés financiero",
    descripcion: "Disminuyen las necesidades presupuestarias estimadas.",
    detalle: "Cambia la solución, no la matriz.",
    A: A1.map(fila => [...fila]),
    b: multiplicar(A1, x2),
    icono: "↓",
    color: "orange"
  },

  mal: {
    id: "mal",
    numero: "ESCENARIO 03",
    nombre: "Mal condicionado",
    descripcion: "Los coeficientes tienen escalas diferentes entre áreas.",
    detalle: "Se evaluará el precondicionador Jacobi.",
    A: A3,
    b: multiplicar(A3, x3),
    icono: "≋",
    color: "purple"
  }
};

export const copiarMatriz = A => A.map(fila => [...fila]);
export const copiarVector = b => [...b];