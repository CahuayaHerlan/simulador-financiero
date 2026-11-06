import {
  VARIABLES,
  ESCENARIOS,
  copiarMatriz,
  copiarVector
} from "./datos.js";

import { resolverSistemaDirecto } from "./metodosDirectos.js";

import {
  gradientesConjugados,
  gradientesConjugadosPrecondicionado
} from "./gradientesConjugados.js";

import {
  validarModelo,
  calcularErrores,
  calcularResiduoRelativo,
  numeroCondicion2,
  matrizEquivalenteJacobi
} from "./analisis.js";

import { ejecutarPruebasQA } from "./qa.js";

let actual = "ideal";
let A = [];
let b = [];
let x0 = [0, 0, 0, 0];
let ultimaComparacion = [];

const $ = id => document.getElementById(id);

const fmt = (valor, decimales = 6) =>
  Number.isFinite(valor)
    ? valor.toLocaleString("es-BO", {
        maximumFractionDigits: decimales
      })
    : "No definido";

const exp = valor =>
  Number.isFinite(valor)
    ? valor.toExponential(3)
    : "No definido";

const prettyVector = vector =>
  "[" + vector.map(valor => fmt(valor, 5)).join("; ") + "]";

const productoPunto = (a, b) =>
  a.reduce((suma, valor, i) => suma + valor * b[i], 0);

const multiplicarMatrizVector = (matriz, vector) =>
  matriz.map(fila =>
    fila.reduce((suma, valor, j) => suma + valor * vector[j], 0)
  );

const norma = vector =>
  Math.sqrt(productoPunto(vector, vector));

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* =========================================================
   ESCENARIOS Y EDITORES
========================================================= */

function cargar(id) {
  actual = id;

  const escenario = ESCENARIOS[id];

  A = copiarMatriz(escenario.A);
  b = copiarVector(escenario.b);
  x0 = [0, 0, 0, 0];

  $("scenarioTitle").textContent = escenario.nombre;
  $("scenarioDescription").textContent = escenario.descripcion;

  dibujarTarjetas();
  dibujarEditores();
  limpiarResultados();

  $("validationMessage").className = "message";
  $("validationMessage").textContent =
    "Escenario cargado. Pulsa «Calcular resultados» para comenzar.";
}

function dibujarTarjetas() {
  const contenedor = $("scenarioGrid");
  contenedor.innerHTML = "";

  Object.values(ESCENARIOS).forEach(escenario => {
    const boton = document.createElement("button");

    boton.type = "button";
    boton.className =
      "scenario-card " +
      (escenario.id === actual ? "active" : "");

    boton.setAttribute(
      "aria-pressed",
      String(escenario.id === actual)
    );

    const numero = document.createElement("small");
    numero.textContent = escenario.numero;

    const titulo = document.createElement("h3");
    titulo.textContent = escenario.nombre;

    const descripcion = document.createElement("p");
    descripcion.textContent = escenario.descripcion;

    const detalle = document.createElement("small");
    detalle.textContent = escenario.detalle;

    boton.append(numero, titulo, descripcion, detalle);
    boton.onclick = () => cargar(escenario.id);

    contenedor.appendChild(boton);
  });
}

function leerX0() {
  return Array.from(
    document.querySelectorAll("#x0Editor input"),
    entrada =>
      entrada.value.trim() === ""
        ? NaN
        : Number(entrada.value)
  );
}

function dibujarEditores() {
  const editorMatriz = $("matrixEditor");
  editorMatriz.innerHTML = "";

  A.forEach((fila, i) => {
    fila.forEach((valor, j) => {
      const entrada = document.createElement("input");

      entrada.type = "number";
      entrada.step = "any";
      entrada.value = valor;
      entrada.title = `A[${i + 1},${j + 1}]`;

      entrada.setAttribute(
        "aria-label",
        `Matriz A, fila ${i + 1}, columna ${j + 1}`
      );

      entrada.addEventListener("change", () => {
        A[i][j] =
          entrada.value.trim() === ""
            ? NaN
            : Number(entrada.value);

        pendiente();
        calcular();
      });

      editorMatriz.appendChild(entrada);
    });
  });

  const editorVector = $("vectorEditor");
  editorVector.innerHTML = "";

  b.forEach((valor, i) => {
    const fila = document.createElement("div");
    fila.className = "vector-row";

    const etiqueta = document.createElement("label");
    etiqueta.className = "vector-label";
    etiqueta.textContent = VARIABLES[i].id;
    etiqueta.htmlFor = `b${i}`;

    const entrada = document.createElement("input");
    entrada.id = `b${i}`;
    entrada.type = "number";
    entrada.step = "any";
    entrada.value = valor;

    entrada.setAttribute(
      "aria-label",
      VARIABLES[i].nombre
    );

    entrada.addEventListener("change", () => {
      b[i] =
        entrada.value.trim() === ""
          ? NaN
          : Number(entrada.value);

      pendiente();
      calcular();
    });

    fila.append(etiqueta, entrada);
    editorVector.appendChild(fila);
  });

  const editorInicial = $("x0Editor");
  editorInicial.innerHTML = "";

  x0.forEach((valor, i) => {
    const fila = document.createElement("div");
    fila.className = "vector-row";

    const etiqueta = document.createElement("label");
    etiqueta.className = "vector-label";
    etiqueta.textContent = `x${i + 1}⁰`;
    etiqueta.htmlFor = `x0${i}`;

    const entrada = document.createElement("input");
    entrada.id = `x0${i}`;
    entrada.type = "number";
    entrada.step = "any";
    entrada.value = valor;

    entrada.setAttribute(
      "aria-label",
      `Componente ${i + 1} del vector inicial`
    );

    entrada.addEventListener("change", () => {
      x0 = leerX0();
      pendiente();
      calcular();
    });

    fila.append(etiqueta, entrada);
    editorInicial.appendChild(fila);
  });
}

function pendiente() {
  $("validationMessage").className = "message";
  $("validationMessage").textContent =
    "Se modificaron los datos. Recalculando resultados...";
}

/* =========================================================
   LIMPIEZA DE RESULTADOS
========================================================= */

function limpiarResultados() {
  [
    "conditionA",
    "conditionPre",
    "iterationsGC",
    "iterationsPCG"
  ].forEach(id => {
    $(id).textContent = "—";
  });

  $("solutionTable").innerHTML =
    '<tr><td colspan="8">Ejecuta el cálculo para ver resultados.</td></tr>';

  $("diagnostics").textContent =
    "Los diagnósticos aparecerán después del cálculo.";

  $("symmetryProof").textContent =
    "Ejecuta el cálculo para ver la comprobación.";

  $("minorProof").innerHTML = "";

  $("comparisonTable").innerHTML =
    '<tr><td colspan="4">Ejecuta el cálculo para comparar escenarios.</td></tr>';

  $("conditionChart").innerHTML =
    '<p class="muted">El gráfico aparecerá después del cálculo.</p>';

  $("allocationChart").innerHTML =
    '<p class="muted">El gráfico aparecerá después del cálculo.</p>';

  $("interpretation").innerHTML =
    "<p>La interpretación aparecerá después del cálculo.</p>";

  $("procedureContent").innerHTML =
    "<p>Ejecuta un cálculo válido para generar el procedimiento.</p>";

  $("scenarioConclusions").innerHTML = "";

  ultimaComparacion = [];

  [
    ["solutionConclusion", "Conclusión de la solución"],
    ["diagnosticsConclusion", "Conclusión del diagnóstico"],
    ["allocationConclusion", "Conclusión del gráfico"],
    ["conditionConclusion", "Conclusión del condicionamiento"],
    ["comparisonConclusion", "Conclusión comparativa"]
  ].forEach(([id, titulo]) => {
    $(id).innerHTML =
      `<h3>${titulo}</h3>` +
      "<p>La conclusión aparecerá después del cálculo.</p>";
  });
}

/* =========================================================
   MÉTODOS NUMÉRICOS
========================================================= */

function ejecutar(matriz, vector, opciones) {
  const validacion = validarModelo(matriz, vector);

  if (!validacion.valido) {
    throw Error(validacion.mensaje);
  }

  const referencia = resolverSistemaDirecto(matriz, vector);

  const gc = gradientesConjugados(
    matriz,
    vector,
    opciones
  );

  const gcp = gradientesConjugadosPrecondicionado(
    matriz,
    vector,
    opciones
  );

  const condicionA = numeroCondicion2(matriz);

  const equivalente =
    opciones.precondicionador === "jacobi"
      ? matrizEquivalenteJacobi(matriz)
      : matriz;

  const condicionPre = numeroCondicion2(equivalente);

  return {
    ref: referencia,
    gc,
    gcp,
    valid: validacion,
    condA: condicionA,
    condPre: condicionPre,
    equivalente,
    errores: calcularErrores(referencia, gcp.x),
    residuoGC: calcularResiduoRelativo(
      matriz,
      vector,
      gc.x
    ),
    residuoGCP: calcularResiduoRelativo(
      matriz,
      vector,
      gcp.x
    )
  };
}

function diagnostico(etiqueta, valor) {
  const contenedor = document.createElement("div");
  contenedor.className = "diagnostic";

  const nombre = document.createElement("span");
  nombre.textContent = etiqueta;

  const resultado = document.createElement("strong");
  resultado.textContent = valor;

  contenedor.append(nombre, resultado);

  return contenedor;
}

/* =========================================================
   CÁLCULO PRINCIPAL
========================================================= */

function calcular() {
  const tolerancia = Number($("tolerance").value);
  const maxIteraciones = Number($("maxIterations").value);

  x0 = leerX0();

  if (!(tolerancia > 0) || !Number.isFinite(tolerancia)) {
    $("validationMessage").className = "message error";
    $("validationMessage").textContent =
      "La tolerancia debe ser un número positivo y finito.";
    return;
  }

  if (
    !(maxIteraciones >= 1) ||
    !Number.isInteger(maxIteraciones)
  ) {
    $("validationMessage").className = "message error";
    $("validationMessage").textContent =
      "El máximo de iteraciones debe ser un entero positivo.";
    return;
  }

  if (
    x0.length !== A.length ||
    x0.some(valor => !Number.isFinite(valor))
  ) {
    $("validationMessage").className = "message error";
    $("validationMessage").textContent =
      "Completa las cuatro componentes numéricas de x₀.";
    return;
  }

  const validacion = validarModelo(A, b);

  if (!validacion.valido) {
    $("validationMessage").className = "message error";
    $("validationMessage").textContent = validacion.mensaje;

    limpiarResultados();
    return;
  }

  try {
    const opciones = {
      tolerancia,
      maxIteraciones,
      x0: [...x0],
      precondicionador: $("preconditioner").value
    };

    const r = ejecutar(A, b, opciones);

    mostrarMetricas(r);
    mostrarTablaSolucion(r);
    mostrarDiagnosticos(r, opciones);
    dibujarComparacion(opciones);
    dibujarGraficoCondicion(ultimaComparacion);
    dibujarGraficoAsignacion(ultimaComparacion);
    dibujarInterpretacion(r, opciones);
    mostrarProcedimiento(r, opciones);

    $("validationMessage").className = "message success";
    $("validationMessage").textContent =
      validacion.mensaje +
      " Se completó la comparación de Gauss, GC y GCP.";

  } catch (error) {
    $("validationMessage").className = "message error";
    $("validationMessage").textContent =
      "Error de cálculo: " + error.message;
  }
}

/* =========================================================
   MÉTRICAS
========================================================= */

function mostrarMetricas(r) {
  $("conditionA").textContent = fmt(r.condA, 5);
  $("conditionPre").textContent = fmt(r.condPre, 5);
  $("iterationsGC").textContent = r.gc.iteraciones;
  $("iterationsPCG").textContent = r.gcp.iteraciones;
}

/* =========================================================
   TABLA DE SOLUCIÓN Y CONCLUSIONES POR ÁREA
========================================================= */

function conclusionArea(variable, error, convergio) {
  if (!convergio) {
    return (
      `Para ${variable.nombre.toLowerCase()}, GCP no alcanzó ` +
      "la tolerancia. No conviene interpretar esta aproximación " +
      "como una asignación suficientemente precisa sin revisar " +
      "las iteraciones o los datos."
    );
  }

  if (
    error.porcentual !== null &&
    error.porcentual < 0.01
  ) {
    return (
      `La estimación de ${variable.nombre.toLowerCase()} es muy ` +
      `cercana a Gauss (error ${fmt(error.porcentual, 5)} %). ` +
      "Dentro del modelo, la asignación es numéricamente consistente."
    );
  }

  if (
    error.porcentual !== null &&
    error.porcentual < 1
  ) {
    return (
      `La estimación de ${variable.nombre.toLowerCase()} presenta ` +
      `un error porcentual de ${fmt(error.porcentual, 4)} %. ` +
      "La aproximación parece consistente, pero la asignación " +
      "debe contrastarse con las necesidades reales del área."
    );
  }

  if (error.porcentual === null) {
    return (
      `La referencia de ${variable.nombre.toLowerCase()} es cero; ` +
      "no se puede definir un error porcentual. Debe revisarse " +
      "la interpretación de esta asignación en el modelo."
    );
  }

  return (
    `La estimación de ${variable.nombre.toLowerCase()} tiene un ` +
    `error porcentual de ${fmt(error.porcentual, 4)} %. ` +
    "Antes de utilizarla para distribuir recursos, conviene " +
    "revisar la convergencia y los datos de entrada."
  );
}

function mostrarTablaSolucion(r) {
  const tabla = $("solutionTable");
  tabla.innerHTML = "";

  VARIABLES.forEach((variable, i) => {
    const error = r.errores[i];
    const fila = document.createElement("tr");

    const valores = [
      variable.id,
      variable.nombre,
      fmt(r.ref[i]),
      fmt(r.gc.x[i]),
      fmt(r.gcp.x[i]),
      fmt(error.absoluto, 7),
      error.relativo === null
        ? "No definido"
        : fmt(error.relativo, 8),
      error.porcentual === null
        ? "No definido"
        : fmt(error.porcentual, 6) + " %"
    ];

    valores.forEach((valor, j) => {
      const celda = document.createElement("td");
      celda.textContent = valor;

      if (j < 2) {
        celda.style.textAlign = "left";
      }

      fila.appendChild(celda);
    });

    tabla.appendChild(fila);
  });

  $("solutionConclusion").innerHTML =
    "<h3>Conclusión de la solución</h3><p>" +
    "La distribución calculada mediante GCP se compara con la " +
    "referencia de Gauss. El residuo relativo final de GCP es " +
    exp(r.residuoGCP) +
    ". Esto permite evaluar la precisión numérica de las cuatro " +
    "asignaciones. Como los datos son sintéticos, las cifras " +
    "sirven para analizar el método, no como presupuesto real.</p>";
}

/* =========================================================
   DIAGNÓSTICOS MATEMÁTICOS
========================================================= */

function mostrarDiagnosticos(r, opciones) {
  const contenedor = $("diagnostics");
  contenedor.innerHTML = "";

  const datos = [
    [
      "Convergencia GC",
      r.gc.convergio ? "Sí" : "No alcanzó la tolerancia"
    ],
    [
      "Convergencia GCP",
      r.gcp.convergio ? "Sí" : "No alcanzó la tolerancia"
    ],
    ["Residuo relativo GC", exp(r.residuoGC)],
    ["Residuo relativo GCP", exp(r.residuoGCP)],
    ["Número de condición κ₂(A)", fmt(r.condA, 8)],
    ["Condición equivalente", fmt(r.condPre, 8)],
    [
      "Precondicionador",
      opciones.precondicionador === "jacobi"
        ? "Jacobi diagonal"
        : "Identidad"
    ],
    ["Vector inicial x₀", prettyVector(x0)],
    [
      "Criterio de parada",
      `Residuo relativo < ${opciones.tolerancia.toExponential(1)}`
    ],
    ["Máximo de iteraciones", opciones.maxIteraciones]
  ];

  datos.forEach(([etiqueta, valor]) => {
    contenedor.appendChild(
      diagnostico(etiqueta, String(valor))
    );
  });

  $("symmetryProof").textContent =
    "La validación confirmó que A es simétrica y definida positiva. " +
    "Los menores principales se utilizan para comprobar el criterio de Sylvester.";

  const menores = $("minorProof");
  menores.innerHTML = "";

  (r.valid.menores || []).forEach((valor, i) => {
    const chip = document.createElement("div");
    chip.className = "minor-chip";

    chip.textContent =
      `Δ${i + 1} = ${fmt(valor, 8)} ${valor > 0 ? "✓" : "✗"}`;

    menores.appendChild(chip);
  });

  let conclusion =
    `El residuo relativo final de GCP es ${exp(r.residuoGCP)}. `;

  if (!r.gcp.convergio) {
    conclusion +=
      "GCP no alcanzó la tolerancia solicitada; antes de interpretar " +
      "la distribución financiera conviene revisar los parámetros.";
  } else if (r.condPre < r.condA) {
    conclusion +=
      "El número de condición estimado disminuyó con el precondicionamiento. " +
      "Esto indica una mejora en el condicionamiento del sistema equivalente, " +
      "aunque no garantiza por sí solo menos iteraciones.";
  } else {
    conclusion +=
      "No se observa una reducción del número de condición con la " +
      "configuración elegida. La conveniencia del precondicionador debe " +
      "evaluarse comparando los resultados.";
  }

  conclusion +=
    " En el desafío financiero, estos diagnósticos permiten determinar " +
    "si la distribución calculada es numéricamente confiable dentro del modelo.";

  $("diagnosticsConclusion").innerHTML =
    "<h3>Conclusión del diagnóstico</h3><p>" +
    escaparHTML(conclusion) +
    "</p>";
}

/* =========================================================
   COMPARACIÓN DE LOS TRES ESCENARIOS
========================================================= */

function conclusionEscenario(escenario, r) {
  if (escenario.id === "estres") {
    return (
      "En el escenario de bajo estrés se modifica la demanda representada " +
      "por b, mientras se mantiene la matriz A. Por ello, cambia la " +
      "distribución estimada de recursos, pero el condicionamiento de A " +
      "debe mantenerse como en el escenario ideal."
    );
  }

  if (escenario.id === "mal") {
    return (
      `En el escenario mal condicionado, κ₂(A) = ${fmt(r.condA, 5)} ` +
      `y la condición equivalente es ${fmt(r.condPre, 5)}. ` +
      "La diferencia de escalas puede dificultar el cálculo; Jacobi " +
      "se evalúa para determinar si ayuda a mejorar la situación."
    );
  }

  return (
    "El escenario ideal sirve como referencia de comparación. " +
    "La solución permite examinar cómo se distribuyen los recursos " +
    "cuando los coeficientes del modelo tienen escalas más equilibradas."
  );
}

function dibujarComparacion(opciones) {
  ultimaComparacion = [];

  for (const escenario of Object.values(ESCENARIOS)) {
    try {
      const r = ejecutar(
        escenario.A,
        escenario.b,
        opciones
      );

      ultimaComparacion.push({ e: escenario, r });
    } catch (error) {
      ultimaComparacion.push({
        e: escenario,
        error: error.message
      });
    }
  }

  const filas = [
    [
      "Solución de Gauss",
      item => prettyVector(item.r.ref)
    ],
    [
      "Solución GCP",
      item => prettyVector(item.r.gcp.x)
    ],
    [
      "Error absoluto máximo GCP",
      item => fmt(
        Math.max(...item.r.errores.map(error => error.absoluto)),
        8
      )
    ],
    [
      "Error porcentual máximo GCP",
      item => {
        const errores = item.r.errores
          .map(error => error.porcentual)
          .filter(valor => valor !== null);

        return errores.length
          ? fmt(Math.max(...errores), 6) + " %"
          : "No definido";
      }
    ],
    [
      "Iteraciones GC",
      item => String(item.r.gc.iteraciones)
    ],
    [
      "Iteraciones GCP",
      item => String(item.r.gcp.iteraciones)
    ],
    [
      "κ₂(A)",
      item => fmt(item.r.condA, 7)
    ],
    [
      "κ₂ equivalente",
      item => fmt(item.r.condPre, 7)
    ],
    [
      "Residuo relativo GCP",
      item => exp(item.r.residuoGCP)
    ],
    [
      "¿Convergió GCP?",
      item => item.r.gcp.convergio ? "Sí" : "No"
    ]
  ];

  const tabla = $("comparisonTable");
  tabla.innerHTML = "";

  filas.forEach(([etiqueta, obtener]) => {
    const fila = document.createElement("tr");
    const primera = document.createElement("td");

    primera.textContent = etiqueta;
    primera.style.textAlign = "left";
    fila.appendChild(primera);

    ultimaComparacion.forEach(item => {
      const celda = document.createElement("td");
      celda.textContent = item.error || obtener(item);
      fila.appendChild(celda);
    });

    tabla.appendChild(fila);
  });

  const contenedor = $("scenarioConclusions");
  contenedor.innerHTML = "";

  ultimaComparacion.forEach(item => {
    if (!item.r) return;

    const tarjeta = document.createElement("article");
    tarjeta.className = "scenario-conclusion";

    const titulo = document.createElement("h4");
    titulo.textContent = "Conclusión · " + item.e.nombre;

    const texto = document.createElement("p");
    texto.textContent =
      conclusionEscenario(item.e, item.r) +
      ` GCP ${item.r.gcp.convergio ? "alcanzó" : "no alcanzó"} ` +
      `la tolerancia en ${item.r.gcp.iteraciones} iteraciones, ` +
      `con un residuo relativo de ${exp(item.r.residuoGCP)}.`;

    tarjeta.append(titulo, texto);
    contenedor.appendChild(tarjeta);
  });

  const validos = ultimaComparacion.filter(item => item.r);

  if (validos.length) {
    const maximoError = Math.max(
      ...validos.map(item =>
        Math.max(
          ...item.r.errores.map(error => error.absoluto)
        )
      )
    );

    $("comparisonConclusion").innerHTML =
      "<h3>Conclusión comparativa</h3><p>" +
      "Los escenarios permiten estudiar el efecto de los cambios " +
      "en la demanda y las escalas de la matriz. El mayor error " +
      "absoluto de GCP frente a Gauss entre los escenarios válidos " +
      `es ${fmt(maximoError, 7)}. ` +
      "Para tomar decisiones financieras reales se deben utilizar " +
      "datos observados y restricciones presupuestarias explícitas.</p>";
  }
}

/* =========================================================
   GRÁFICO CARTESIANO: DISTRIBUCIÓN POR ÁREA
========================================================= */

function dibujarGraficoAsignacion(datos) {
  const contenedor = $("allocationChart");
  contenedor.innerHTML = "";

  const validos = datos.filter(item => item.r);

  if (!validos.length) {
    contenedor.textContent =
      "No existen resultados válidos para graficar.";
    return;
  }

  const NS = "http://www.w3.org/2000/svg";

  const ancho = 760;
  const alto = 330;
  const izquierda = 65;
  const derecha = 25;
  const arriba = 25;
  const abajo = 62;

  const anchoGrafico = ancho - izquierda - derecha;
  const altoGrafico = alto - arriba - abajo;

  const svg = document.createElementNS(NS, "svg");

  svg.setAttribute("viewBox", `0 0 ${ancho} ${alto}`);
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Comparación cartesiana de las asignaciones financieras por área"
  );

  const valores = validos.flatMap(item => item.r.ref);

  const minimo = Math.min(0, ...valores);
  const maximo = Math.max(1, ...valores);
  const rango = maximo - minimo || 1;

  const minimoGrafico = minimo - rango * 0.05;
  const maximoGrafico = maximo + rango * 0.1;
  const rangoGrafico = maximoGrafico - minimoGrafico;

  const agregar = (etiqueta, atributos, texto = "") => {
    const nodo = document.createElementNS(NS, etiqueta);

    Object.entries(atributos).forEach(([clave, valor]) => {
      nodo.setAttribute(clave, valor);
    });

    if (texto !== "") {
      nodo.textContent = texto;
    }

    svg.appendChild(nodo);
    return nodo;
  };

  const xPosicion = i =>
    izquierda +
    (anchoGrafico / (VARIABLES.length - 1)) * i;

  const yPosicion = valor =>
    arriba +
    altoGrafico -
    ((valor - minimoGrafico) / rangoGrafico) * altoGrafico;

  for (let i = 0; i <= 4; i++) {
    const valor =
      minimoGrafico + rangoGrafico * i / 4;

    const y = yPosicion(valor);

    agregar("line", {
      x1: izquierda,
      y1: y,
      x2: ancho - derecha,
      y2: y,
      class: "chart-gridline"
    });

    agregar("text", {
      x: izquierda - 9,
      y: y + 4,
      "text-anchor": "end",
      class: "chart-axis-label"
    }, fmt(valor, 1));
  }

  agregar("line", {
    x1: izquierda,
    y1: arriba,
    x2: izquierda,
    y2: arriba + altoGrafico,
    class: "chart-axis"
  });

  agregar("line", {
    x1: izquierda,
    y1: arriba + altoGrafico,
    x2: ancho - derecha,
    y2: arriba + altoGrafico,
    class: "chart-axis"
  });

  VARIABLES.forEach((variable, i) => {
    agregar("text", {
      x: xPosicion(i),
      y: alto - 35,
      "text-anchor": "middle",
      class: "chart-axis-label"
    }, variable.id);

    const nombre =
      variable.nombre.length > 17
        ? variable.nombre.slice(0, 16) + "…"
        : variable.nombre;

    agregar("text", {
      x: xPosicion(i),
      y: alto - 17,
      "text-anchor": "middle",
      class: "chart-category-label"
    }, nombre);
  });

  const colores = [
    "#86b7ff",
    "#ffbb79",
    "#c2a0ff"
  ];

  validos.forEach((item, indice) => {
    const puntos = item.r.ref
      .map((valor, i) =>
        `${xPosicion(i)},${yPosicion(valor)}`
      )
      .join(" ");

    agregar("polyline", {
      points: puntos,
      fill: "none",
      stroke: colores[indice % colores.length],
      "stroke-width": 3,
      "stroke-linejoin": "round",
      "stroke-linecap": "round"
    });

    item.r.ref.forEach((valor, i) => {
      const circulo = agregar("circle", {
        cx: xPosicion(i),
        cy: yPosicion(valor),
        r: 4,
        fill: colores[indice % colores.length],
        stroke: "#080808",
        "stroke-width": 1.5
      });

      const titulo = document.createElementNS(NS, "title");

      titulo.textContent =
        `${item.e.nombre} · ${VARIABLES[i].nombre}: ` +
        `${fmt(valor, 4)} miles de Bs`;

      circulo.appendChild(titulo);
    });
  });

  contenedor.appendChild(svg);

  const leyenda = document.createElement("div");
  leyenda.className = "chart-legend";

  validos.forEach((item, indice) => {
    const elemento = document.createElement("span");
    const punto = document.createElement("i");

    punto.style.background = colores[indice % colores.length];

    elemento.append(
      punto,
      document.createTextNode(item.e.nombre)
    );

    leyenda.appendChild(elemento);
  });

  contenedor.appendChild(leyenda);

  let mayor = {
    valor: -Infinity,
    variable: VARIABLES[0],
    escenario: ""
  };

  validos.forEach(item => {
    item.r.ref.forEach((valor, i) => {
      if (Math.abs(valor) > Math.abs(mayor.valor)) {
        mayor = {
          valor,
          variable: VARIABLES[i],
          escenario: item.e.nombre
        };
      }
    });
  });

  $("allocationConclusion").innerHTML =
    "<h3>Conclusión del gráfico</h3><p>" +
    "El gráfico permite comparar cómo se distribuyen los recursos " +
    "entre las cuatro áreas según el escenario. La mayor magnitud " +
    "representada corresponde a " +
    escaparHTML(mayor.variable.nombre) +
    `, con ${fmt(mayor.valor, 5)} miles de Bs en el escenario ` +
    escaparHTML(mayor.escenario) +
    ". Una asignación mayor no implica automáticamente una prioridad " +
    "empresarial: debe contrastarse con las necesidades y los riesgos reales.</p>";
}

/* =========================================================
   GRÁFICO DE NÚMERO DE CONDICIÓN
========================================================= */

function dibujarGraficoCondicion(datos) {
  const contenedor = $("conditionChart");
  contenedor.innerHTML = "";

  const validos = datos.filter(item => item.r);

  if (!validos.length) {
    contenedor.textContent =
      "No existen resultados válidos para graficar.";
    return;
  }

  const valores = validos.flatMap(item => [
    item.r.condA,
    item.r.condPre
  ]).filter(Number.isFinite);

  const maxLog = Math.max(
    1,
    ...valores.map(valor =>
      Math.log10(Math.max(valor, 1))
    )
  );

  validos.forEach(({ e, r }) => {
    const grupo = document.createElement("div");
    grupo.className = "chart-group";

    const titulo = document.createElement("h4");
    titulo.textContent = e.nombre;
    grupo.appendChild(titulo);

    [
      ["κ₂(A)", r.condA, "bar-a"],
      ["κ₂ equivalente", r.condPre, "bar-p"]
    ].forEach(([etiqueta, valor, clase]) => {
      const fila = document.createElement("div");
      fila.className = "bar-line";

      const nombre = document.createElement("span");
      nombre.textContent = etiqueta;

      const pista = document.createElement("div");
      pista.className = "bar-track";

      const barra = document.createElement("div");
      barra.className = "bar " + clase;

      barra.style.width =
        `${Math.max(
          1,
          Math.log10(Math.max(valor, 1)) / maxLog * 100
        )}%`;

      pista.appendChild(barra);

      const resultado = document.createElement("strong");
      resultado.textContent = fmt(valor, 5);

      fila.append(nombre, pista, resultado);
      grupo.appendChild(fila);
    });

    contenedor.appendChild(grupo);
  });

  const item = validos.find(v => v.e.id === actual) || validos[0];

  let conclusion =
    `En el escenario ${item.e.nombre}, κ₂(A) es ` +
    `${fmt(item.r.condA, 5)} y la condición equivalente es ` +
    `${fmt(item.r.condPre, 5)}. `;

  if (item.r.condPre < item.r.condA) {
    conclusion +=
      "La reducción indica una mejora en el condicionamiento " +
      "estimado del sistema equivalente.";
  } else {
    conclusion +=
      "No se observa una reducción del número de condición " +
      "con el precondicionador seleccionado.";
  }

  conclusion +=
    " Un mejor condicionamiento puede favorecer la estabilidad " +
    "del cálculo de las asignaciones, pero no sustituye la " +
    "validación financiera del modelo.";

  $("conditionConclusion").innerHTML =
    "<h3>Conclusión del condicionamiento</h3><p>" +
    escaparHTML(conclusion) +
    "</p>";
}

/* =========================================================
   INTERPRETACIÓN FINANCIERA
========================================================= */

function dibujarInterpretacion(r, opciones) {
  const contenedor = $("interpretation");
  contenedor.innerHTML = "";

  const parrafo1 = document.createElement("p");

  parrafo1.textContent =
    `En el escenario «${ESCENARIOS[actual].nombre}», Gauss ` +
    "proporciona la solución numérica de referencia. GC " +
    (r.gc.convergio ? "alcanzó" : "no alcanzó") +
    ` la tolerancia en ${r.gc.iteraciones} iteraciones; GCP ` +
    (r.gcp.convergio ? "alcanzó" : "no alcanzó") +
    ` la tolerancia en ${r.gcp.iteraciones} iteraciones. ` +
    `El residuo relativo final de GCP es ${exp(r.residuoGCP)}.`;

  const parrafo2 = document.createElement("p");

  parrafo2.textContent =
    `El número de condición de A es ${fmt(r.condA, 5)}, ` +
    `mientras que el de la matriz equivalente es ${fmt(r.condPre, 5)}. ` +
    `El precondicionador seleccionado es ${
      opciones.precondicionador === "jacobi"
        ? "Jacobi diagonal"
        : "identidad"
    }. La comparación permite evaluar si el escalamiento mejora ` +
    "el condicionamiento y si afecta las iteraciones.";

  const parrafo3 = document.createElement("p");

  if (actual === "estres") {
    parrafo3.textContent =
      "En el escenario de bajo estrés cambia el vector b y se mantiene " +
      "la matriz A. Por tanto, cambia la asignación financiera estimada, " +
      "pero no debería cambiar el condicionamiento de la matriz original.";
  } else if (actual === "mal") {
    parrafo3.textContent =
      "En el escenario mal condicionado, las escalas de los coeficientes " +
      "son distintas. Esto puede hacer que el cálculo sea más sensible. " +
      "Jacobi busca compensar parte de esa diferencia.";
  } else {
    parrafo3.textContent =
      "El escenario ideal funciona como referencia. Permite estudiar " +
      "cómo los métodos calculan la distribución cuando la escala de " +
      "los coeficientes es relativamente equilibrada.";
  }

  const parrafo4 = document.createElement("p");

  parrafo4.textContent =
    "Conclusión financiera: los métodos numéricos permiten comparar " +
    "asignaciones hipotéticas para infraestructura, desarrollo, seguridad " +
    "y mantenimiento. Para convertir estos resultados en decisiones " +
    "empresariales, se necesitarían costos reales, prioridades operativas " +
    "y restricciones presupuestarias.";

  contenedor.append(
    parrafo1,
    parrafo2,
    parrafo3,
    parrafo4
  );
}

/* =========================================================
   PROCEDIMIENTO MATEMÁTICO DESPLEGABLE
========================================================= */

function mostrarProcedimiento(r, opciones) {
  const contenedor = $("procedureContent");

  const residuoInicial = b.map(
    (valor, i) =>
      valor - multiplicarMatrizVector(A, x0)[i]
  );

  const Ar = multiplicarMatrizVector(A, residuoInicial);

  const denominadorGC = productoPunto(
    residuoInicial,
    Ar
  );

  const alfaGC =
    denominadorGC !== 0
      ? productoPunto(residuoInicial, residuoInicial) /
        denominadorGC
      : NaN;

  const x1GC = x0.map(
    (valor, i) => valor + alfaGC * residuoInicial[i]
  );

  const residuoGC1 = residuoInicial.map(
    (valor, i) => valor - alfaGC * Ar[i]
  );

  const jacobi = opciones.precondicionador === "jacobi";

  const z0 = jacobi
    ? residuoInicial.map(
        (valor, i) => valor / A[i][i]
      )
    : [...residuoInicial];

  const Az0 = multiplicarMatrizVector(A, z0);

  const denominadorGCP = productoPunto(z0, Az0);

  const alfaGCP =
    denominadorGCP !== 0
      ? productoPunto(residuoInicial, z0) /
        denominadorGCP
      : NaN;

  const x1GCP = x0.map(
    (valor, i) => valor + alfaGCP * z0[i]
  );

  const fmtVector = vector =>
    "[" + vector.map(valor => fmt(valor, 6)).join("; ") + "]";

  const fmtMatriz = matriz =>
    matriz.map(fila =>
      "[" + fila.map(valor => fmt(valor, 5)).join("; ") + "]"
    ).join("\n");

  contenedor.innerHTML = `
    <h4>1. Formulación del sistema</h4>

    <p>El problema se representa mediante el sistema lineal Ax = b.
    Se utiliza Gauss como referencia para comparar los métodos iterativos.</p>

    <pre>A =
${escaparHTML(fmtMatriz(A))}

b = ${escaparHTML(fmtVector(b))}
x₀ = ${escaparHTML(fmtVector(x0))}</pre>

    <h4>2. Método de Gauss con pivoteo parcial</h4>

    <ol>
      <li>Se construye la matriz aumentada [A | b].</li>
      <li>Se selecciona el pivote de mayor valor absoluto en la columna.</li>
      <li>Se eliminan los elementos situados debajo del pivote.</li>
      <li>Se obtiene la solución mediante sustitución regresiva.</li>
    </ol>

    <p class="formula">Solución de referencia:
    x = ${escaparHTML(fmtVector(r.ref))}</p>

    <h4>3. Gradientes Conjugados (GC)</h4>

    <p>Se comienza con r₀ = b − Ax₀ y p₀ = r₀.</p>

    <pre>r₀ = ${escaparHTML(fmtVector(residuoInicial))}
Ap₀ = ${escaparHTML(fmtVector(Ar))}
α₀ = (r₀ᵀr₀)/(p₀ᵀAp₀) = ${escaparHTML(fmt(alfaGC, 8))}
x₁ = x₀ + α₀p₀ = ${escaparHTML(fmtVector(x1GC))}
r₁ = r₀ − α₀Ap₀ = ${escaparHTML(fmtVector(residuoGC1))}</pre>

    <p>Se repiten las iteraciones hasta alcanzar la tolerancia
    o llegar al máximo permitido.</p>

    <h4>4. Gradientes Conjugados Precondicionado (GCP)</h4>

    <p>Se aplica ${
      jacobi
        ? "Jacobi diagonal, usando la diagonal de A."
        : "la identidad, que no modifica el residuo."
    }</p>

    <pre>z₀ = M⁻¹r₀ = ${escaparHTML(fmtVector(z0))}
α₀ = (r₀ᵀz₀)/(p₀ᵀAp₀) = ${escaparHTML(fmt(alfaGCP, 8))}
x₁ = x₀ + α₀p₀ = ${escaparHTML(fmtVector(x1GCP))}</pre>

    <h4>5. Criterio de parada</h4>

    <pre>Residuo relativo = ||b − Axₖ||₂ / ||b||₂
Tolerancia = ${escaparHTML(opciones.tolerancia.toExponential(3))}
Máximo de iteraciones = ${escaparHTML(opciones.maxIteraciones)}

Residuo relativo GC = ${escaparHTML(exp(r.residuoGC))}
Residuo relativo GCP = ${escaparHTML(exp(r.residuoGCP))}</pre>

    <h4>6. Errores de GCP frente a Gauss</h4>

    <pre>Eaᵢ = |xᵢ(Gauss) − xᵢ(GCP)|
Erᵢ = Eaᵢ / |xᵢ(Gauss)|
Epᵢ = 100 × Erᵢ

Solución GC = ${escaparHTML(fmtVector(r.gc.x))}
Solución GCP = ${escaparHTML(fmtVector(r.gcp.x))}</pre>

    <h4>7. Interpretación del desafío</h4>

    <p>Los componentes de la solución representan las asignaciones
    estimadas para infraestructura, desarrollo, seguridad y mantenimiento.
    Los errores permiten evaluar la precisión de los métodos, mientras
    que el condicionamiento ayuda a estudiar la sensibilidad del cálculo.
    La distribución es hipotética y no reemplaza una evaluación financiera real.</p>
  `;
}

/* =========================================================
   BOTONES Y EVENTOS
========================================================= */

$("runCalculation").addEventListener("click", calcular);

$("resetScenario").addEventListener("click", () => {
  cargar(actual);
  calcular();
});

[
  "tolerance",
  "maxIterations",
  "preconditioner"
].forEach(id => {
  $(id).addEventListener("change", () => {
    pendiente();
    calcular();
  });
});

$("toggleProcedure").addEventListener("click", () => {
  const contenedor = $("procedureContent");
  const boton = $("toggleProcedure");

  const abrir = contenedor.hidden;

  contenedor.hidden = !abrir;

  boton.textContent = abrir
    ? "Ocultar procedimiento"
    : "Mostrar procedimiento";

  boton.setAttribute(
    "aria-expanded",
    String(abrir)
  );
});

/* =========================================================
   PRUEBAS QA
========================================================= */

$("runQA").addEventListener("click", () => {
  const resultados = ejecutarPruebasQA();
  const tabla = $("qaTable");

  tabla.innerHTML = "";

  resultados.forEach(prueba => {
    const fila = document.createElement("tr");

    [
      prueba.prueba,
      prueba.entrada,
      prueba.esperado,
      prueba.obtenido,
      prueba.conclusion
    ].forEach((valor, i) => {
      const celda = document.createElement("td");
      celda.textContent = valor;

      if (i === 4) {
        celda.className = prueba.aprobada
          ? "qa-pass"
          : "qa-fail";
      }

      fila.appendChild(celda);
    });

    tabla.appendChild(fila);
  });

  const aprobadas = resultados.filter(
    prueba => prueba.aprobada
  ).length;

  const resumen = $("qaSummary");

  resumen.className =
    "message " +
    (aprobadas === resultados.length ? "success" : "error");

  resumen.textContent =
    `Resultado QA: ${aprobadas} de ${resultados.length} pruebas aprobadas.`;
});

/* =========================================================
   INICIO
========================================================= */

cargar("ideal");
calcular();