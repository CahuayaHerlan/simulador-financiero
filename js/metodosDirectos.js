// Eliminación de Gauss con pivoteo parcial.
// No modifica la matriz A ni el vector b originales.

export function resolverSistemaDirecto(A, b) {
  const n = A.length;

  if (!n || b.length !== n || A.some(fila => fila.length !== n)) {
    throw Error("Dimensiones incompatibles.");
  }

  const M = A.map((fila, i) => [...fila, b[i]]);

  for (let k = 0; k < n; k++) {
    let p = k;

    for (let i = k + 1; i < n; i++) {
      if (Math.abs(M[i][k]) > Math.abs(M[p][k])) {
        p = i;
      }
    }

    if (Math.abs(M[p][k]) < 1e-14) {
      throw Error("Sistema singular o casi singular.");
    }

    if (p !== k) {
      [M[k], M[p]] = [M[p], M[k]];
    }

    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / M[k][k];
      M[i][k] = 0;

      for (let j = k + 1; j <= n; j++) {
        M[i][j] -= factor * M[k][j];
      }
    }
  }

  const x = Array(n).fill(0);

  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];

    for (let j = i + 1; j < n; j++) {
      s -= M[i][j] * x[j];
    }

    x[i] = s / M[i][i];
  }

  return x;
}