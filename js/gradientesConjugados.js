// Gradientes Conjugados (GC) y Gradientes Conjugados Precondicionado (GCP).
// El GCP permite usar Jacobi diagonal o identidad.

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const mv = (A, x) => A.map(fila => dot(fila, x));
const norm = v => Math.sqrt(dot(v, v));

export function ejecutarGC(
  A,
  b,
  {
    tolerancia = 1e-6,
    maxIteraciones = Math.max(100, 10 * b.length),
    x0,
    precondicionador = "jacobi"
  } = {},
  precondicionado = false
) {
  const n = b.length;
  let x = x0 && x0.length === n ? [...x0] : Array(n).fill(0);
  const normaB = norm(b);

  const Ax = mv(A, x);
  let r = b.map((v, i) => v - Ax[i]);

  if (normaB === 0) {
    const rr = norm(r);
    return {
      x,
      iteraciones: 0,
      residuoRelativo: rr,
      convergio: rr < tolerancia
    };
  }

  const calcularZ = () =>
    precondicionado && precondicionador === "jacobi"
      ? r.map((v, i) => v / A[i][i])
      : [...r];

  let z = calcularZ();
  let p = [...z];
  let rz = dot(r, z);
  let residuoRelativo = norm(r) / normaB;

  if (residuoRelativo < tolerancia) {
    return { x, iteraciones: 0, residuoRelativo, convergio: true };
  }

  for (let k = 0; k < maxIteraciones; k++) {
    const Ap = mv(A, p);
    const denominador = dot(p, Ap);

    if (!(denominador > 0) || !Number.isFinite(denominador)) {
      throw Error("Dirección no positiva; revisa que A sea definida positiva.");
    }

    const alpha = rz / denominador;

    x = x.map((v, i) => v + alpha * p[i]);
    r = r.map((v, i) => v - alpha * Ap[i]);

    residuoRelativo = norm(r) / normaB;

    if (residuoRelativo < tolerancia) {
      return {
        x,
        iteraciones: k + 1,
        residuoRelativo,
        convergio: true
      };
    }

    z = calcularZ();

    const rzNew = dot(r, z);

    if (!Number.isFinite(rzNew) || rz === 0) {
      break;
    }

    const beta = rzNew / rz;
    p = z.map((v, i) => v + beta * p[i]);
    rz = rzNew;
  }

  return {
    x,
    iteraciones: maxIteraciones,
    residuoRelativo,
    convergio: false
  };
}

export const gradientesConjugados = (A, b, opciones = {}) =>
  ejecutarGC(A, b, opciones, false);

export const gradientesConjugadosPrecondicionado = (A, b, opciones = {}) =>
  ejecutarGC(A, b, opciones, true);