import { ESCENARIOS, copiarMatriz, copiarVector } from "./datos.js";
import {
  validarModelo,
  calcularResiduoRelativo,
  numeroCondicion2,
  matrizEquivalenteJacobi
} from "./analisis.js";
import { resolverSistemaDirecto } from "./metodosDirectos.js";
import {
  gradientesConjugados,
  gradientesConjugadosPrecondicionado
} from "./gradientesConjugados.js";

const TOL = 1e-6;

const cerca = (a, b, eps = 1e-8) =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

const prueba = (prueba, entrada, esperado, obtenido, aprobada) => ({
  prueba,
  entrada,
  esperado,
  obtenido,
  aprobada,
  conclusion: aprobada ? "APROBADA" : "REVISAR"
});

export function ejecutarPruebasQA() {
  const resultados = [];

  // 1. Carga de los tres escenarios.
  try {
    const detalles = Object.values(ESCENARIOS).map(e => {
      const v = validarModelo(e.A, e.b);

      if (!v.valido) throw Error(`${e.nombre}: ${v.mensaje}`);

      const opt = { tolerancia: TOL, maxIteraciones: 100 };
      const ref = resolverSistemaDirecto(e.A, e.b);
      const gc = gradientesConjugados(e.A, e.b, opt);
      const gcp = gradientesConjugadosPrecondicionado(e.A, e.b, opt);

      if (!gc.convergio || !gcp.convergio) {
        throw Error(`${e.nombre}: un método no alcanzó tolerancia`);
      }

      const error = Math.max(
        ...ref.map((x, i) => Math.abs(x - gcp.x[i]))
      );

      return `${e.nombre}: válido; GC ${gc.iteraciones} it.; GCP ${gcp.iteraciones} it.; error ${error.toExponential(2)}`;
    });

    resultados.push(prueba(
      "1. Carga de escenarios",
      "Ideal, Bajo estrés y Mal condicionado",
      "Los tres escenarios son válidos y GC/GCP convergen",
      detalles.join(" | "),
      true
    ));
  } catch (e) {
    resultados.push(prueba(
      "1. Carga de escenarios",
      "Ejecutar los tres escenarios",
      "Los tres son válidos y convergen",
      e.message,
      false
    ));
  }

  // 2. Rechazo de una matriz asimétrica.
  try {
    const e = ESCENARIOS.ideal;
    const A = copiarMatriz(e.A);
    const b = copiarVector(e.b);

    A[0][1] += 0.25;

    const v = validarModelo(A, b);
    const ok = !v.valido && v.mensaje.toLowerCase().includes("simétrica");

    resultados.push(prueba(
      "2. Matriz no válida",
      "Cambiar A[1,2] sin modificar A[2,1]",
      "Rechazar la matriz y mostrar una explicación",
      v.mensaje,
      ok
    ));
  } catch (e) {
    resultados.push(prueba(
      "2. Matriz no válida",
      "Matriz asimétrica",
      "Rechazo controlado sin bloquear la página",
      e.message,
      false
    ));
  }

  // 3. Edición dinámica del vector b.
  try {
    const e = ESCENARIOS.ideal;
    const A = copiarMatriz(e.A);
    const b = copiarVector(e.b);
    const refAntes = resolverSistemaDirecto(A, b);

    b[0] += 1;

    const v = validarModelo(A, b);
    const refDespues = resolverSistemaDirecto(A, b);
    const gcp = gradientesConjugadosPrecondicionado(A, b, {
      tolerancia: TOL,
      maxIteraciones: 100
    });

    const cambio = refAntes.some((x, i) => !cerca(x, refDespues[i]));
    const residuo = calcularResiduoRelativo(A, b, gcp.x);
    const ok = v.valido && cambio && gcp.convergio && residuo < TOL;

    resultados.push(prueba(
      "3. Edición dinámica",
      "Aumentar b₁ en 1 unidad y recalcular",
      "La solución se actualiza y el residuo es menor que 10⁻⁶",
      `Cambio: ${cambio ? "sí" : "no"}; residuo: ${residuo.toExponential(3)}; convergencia: ${gcp.convergio ? "sí" : "no"}`,
      ok
    ));
  } catch (e) {
    resultados.push(prueba(
      "3. Edición dinámica",
      "Modificar b₁ y recalcular",
      "Solución actualizada y convergente",
      e.message,
      false
    ));
  }

  // 4. Comparación de GC y GCP en el escenario mal condicionado.
  try {
    const e = ESCENARIOS.mal;
    const opt = { tolerancia: TOL, maxIteraciones: 100 };
    const gc = gradientesConjugados(e.A, e.b, opt);
    const gcp = gradientesConjugadosPrecondicionado(e.A, e.b, opt);
    const cond = numeroCondicion2(e.A);
    const condJ = numeroCondicion2(matrizEquivalenteJacobi(e.A));

    const ok =
      gc.convergio &&
      gcp.convergio &&
      gcp.iteraciones <= gc.iteraciones;

    resultados.push(prueba(
      "4. Comparación de precondicionamiento",
      "Escenario mal condicionado; tolerancia 10⁻⁶",
      "GCP converge en igual o menor número de iteraciones que GC",
      `GC: ${gc.iteraciones}; GCP: ${gcp.iteraciones}; κ₂(A): ${cond.toFixed(2)}; κ₂(Jacobi): ${condJ.toFixed(2)}`,
      ok
    ));
  } catch (e) {
    resultados.push(prueba(
      "4. Comparación de precondicionamiento",
      "Escenario mal condicionado",
      "Comparación completada sin error",
      e.message,
      false
    ));
  }

  return resultados;
}