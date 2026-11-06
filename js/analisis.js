// Validaciones y análisis numérico para matrices simétricas definidas positivas.

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const norm = v => Math.sqrt(dot(v, v));

export const multiplicarMatrizVector = (A, x) =>
  A.map(fila => dot(fila, x));

export function determinante(a) {
  const n = a.length;
  if (!n) return 1;

  const M = a.map(fila => [...fila]);
  let d = 1;

  for (let k = 0; k < n; k++) {
    let p = k;

    for (let i = k + 1; i < n; i++) {
      if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    }

    if (Math.abs(M[p][k]) < 1e-14) return 0;

    if (p !== k) {
      [M[k], M[p]] = [M[p], M[k]];
      d = -d;
    }

    const piv = M[k][k];
    d *= piv;

    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / piv;

      for (let j = k + 1; j < n; j++) {
        M[i][j] -= factor * M[k][j];
      }
    }
  }

  return d;
}

export function menoresPrincipales(A) {
  return A.map((_, i) =>
    determinante(A.slice(0, i + 1).map(fila => fila.slice(0, i + 1)))
  );
}

export function validarModelo(A, b) {
  const n = A.length;

  if (!n || !Array.isArray(b) || b.length !== n) {
    return { valido: false, mensaje: "Las dimensiones de A y b no coinciden." };
  }

  if (A.some(fila => !Array.isArray(fila) || fila.length !== n)) {
    return { valido: false, mensaje: "A debe ser cuadrada." };
  }

  if (
    A.some(fila => fila.some(v => !Number.isFinite(v))) ||
    b.some(v => !Number.isFinite(v))
  ) {
    return { valido: false, mensaje: "Hay campos vacíos o valores no numéricos." };
  }

  const escala = Math.max(1, ...A.flat().map(Math.abs));

  const simetrica = A.every((fila, i) =>
    fila.every((v, j) => Math.abs(v - A[j][i]) <= 1e-10 * escala)
  );

  if (!simetrica) {
    return { valido: false, mensaje: "A no es simétrica." };
  }

  const menores = menoresPrincipales(A);

  if (menores.some(v => !(v > 0))) {
    return {
      valido: false,
      mensaje: "A no supera el criterio de Sylvester; no es definida positiva."
    };
  }

  return {
    valido: true,
    mensaje: "Modelo válido: A es cuadrada, simétrica y definida positiva.",
    menores
  };
}

export function calcularResiduoRelativo(A, b, x) {
  const Ax = multiplicarMatrizVector(A, x);
  const r = b.map((v, i) => v - Ax[i]);
  const nb = norm(b);

  return nb === 0 ? norm(r) : norm(r) / nb;
}

export function calcularErrores(ref, aprox) {
  return ref.map((v, i) => {
    const absoluto = Math.abs(v - aprox[i]);
    const relativo = v === 0 ? null : absoluto / Math.abs(v);

    return {
      absoluto,
      relativo,
      porcentual: relativo === null ? null : 100 * relativo
    };
  });
}

export function autovaloresSimetricos(A) {
  const M = A.map(fila => [...fila]);
  const n = M.length;

  for (let paso = 0; paso < 100 * n * n; paso++) {
    let p = 0;
    let q = 1;
    let max = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(M[i][j]) > max) {
          max = Math.abs(M[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (max < 1e-13) break;

    const theta = 0.5 * Math.atan2(
      2 * M[p][q],
      M[q][q] - M[p][p]
    );

    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const app = M[p][p];
    const aqq = M[q][q];
    const apq = M[p][q];

    M[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    M[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    M[p][q] = M[q][p] = 0;

    for (let k = 0; k < n; k++) {
      if (k !== p && k !== q) {
        const kp = M[k][p];
        const kq = M[k][q];

        M[k][p] = M[p][k] = c * kp - s * kq;
        M[k][q] = M[q][k] = s * kp + c * kq;
      }
    }
  }

  return M.map((fila, i) => fila[i]).sort((a, b) => a - b);
}

export function numeroCondicion2(A) {
  const l = autovaloresSimetricos(A);
  return l[0] > 0 ? l[l.length - 1] / l[0] : Infinity;
}

export function matrizEquivalenteJacobi(A) {
  const d = A.map((fila, i) => fila[i]);

  if (d.some(v => !(v > 0))) {
    throw Error("Jacobi requiere diagonal positiva.");
  }

  return A.map((fila, i) =>
    fila.map((v, j) => v / Math.sqrt(d[i] * d[j]))
  );
}

export function matrizIdentidad(n) {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 1 : 0)
  );
}