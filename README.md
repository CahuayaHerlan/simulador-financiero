# Finanzas GCP — Planificación de recursos tecnológicos

Proyecto académico para el desafío de Métodos Numéricos (UMSA). Simula la asignación de recursos entre cuatro áreas de una empresa tecnológica y compara Gauss con pivoteo parcial, Gradientes Conjugados (GC) y Gradientes Conjugados Precondicionado (GCP) con Jacobi.

## Requisitos
- Navegador moderno.
- Visual Studio Code (recomendado).
- Extensión Live Server para ejecutar los módulos JavaScript como ES Modules.

## Ejecución local
1. Descomprime o abre la carpeta `finanzas-gcp-completo` en VS Code.
2. Abre `index.html`.
3. Haz clic derecho y selecciona **Open with Live Server**.
4. Selecciona un escenario y pulsa **Validar y calcular**. Los cambios en A, b, x0, tolerancia o precondicionador recalculan los resultados.
5. Ejecuta **Pruebas QA** y revisa que los cuatro casos estén aprobados.
6. Revisa el gráfico cartesiano: eje X = áreas x₁–x₄; eje Y = asignación en miles de Bs; cada línea representa la solución de Gauss de uno de los escenarios.

No abras `index.html` directamente mediante `file://`, porque los navegadores pueden bloquear la carga de módulos ES.

## Estructura
- `index.html`: interfaz, caso de estudio, tablas, comparación, gráfico cartesiano de asignación, gráfico de condicionamiento, conclusiones y referencias.
- `css/estilos.css`: diseño adaptable.
- `js/datos.js`: variables y tres escenarios sintéticos.
- `js/metodosDirectos.js`: eliminación de Gauss con pivoteo parcial.
- `js/gradientesConjugados.js`: GC y GCP (Jacobi/identidad).
- `js/analisis.js`: validación, criterio de Sylvester, errores, residuos y número de condición.
- `js/qa.js`: cuatro pruebas de control de calidad.
- `js/app.js`: interfaz y actualización de resultados.

## Modelo y supuestos
Las variables son infraestructura tecnológica, desarrollo de software, seguridad informática y mantenimiento/soporte. La matriz base es simétrica definida positiva. El escenario de estrés cambia el vector `b` manteniendo la matriz; por eso cambia la solución pero no el condicionamiento de A. El escenario mal condicionado se construye como `D A D`, con una matriz diagonal D de escalas distintas: esta transformación conserva simetría y definición positiva, pero altera el escalamiento y puede elevar el número de condición.

Los coeficientes son hipotéticos y se generan para el ejercicio; no proceden de una empresa real. Los componentes de la solución se interpretan como miles de bolivianos. El modelo es demostrativo, no un optimizador financiero con restricciones.

## Métodos y criterios
- Solución de referencia: Gauss con pivoteo parcial.
- GC: sin precondicionamiento.
- GCP: precondicionador Jacobi diagonal por defecto; se puede seleccionar identidad como control.
- Criterio de parada: residuo relativo `||b - Ax||₂ / ||b||₂ < tolerancia` (por defecto `10⁻⁶`).
- Condición: número de condición 2 estimado mediante autovalores de matrices simétricas. Para Jacobi se usa la matriz simétrica equivalente `D⁻¹/² A D⁻¹/²`, que tiene el mismo espectro que `D⁻¹ A` para A SPD.

## Referencias
- Suñagua S., P. (2020). *Método de Gradientes Conjugados Precondicionado*. Revista Boliviana de Matemática – UMSA, 04, 2–7.
- Golub, G. H., & Van Loan, C. F. (2013). *Matrix Computations* (4.ª ed.). Johns Hopkins University Press.
- Saad, Y. (2003). *Iterative Methods for Sparse Linear Systems* (2.ª ed.). SIAM.

## Publicación
El proyecto se encuentra publicado en un repositorio público de GitHub y desplegado mediante GitHub Pages.

## Ejemplo predeterminado y resultados de referencia

Al abrir la página se carga el escenario Ideal y se calculan los resultados automáticamente. Los valores iniciales de A y b se generan en `js/datos.js`; las soluciones de referencia conocidas son:

| Escenario | Solución de Gauss esperada (miles de Bs) | Iteraciones GC / GCP | κ₂(A) aproximado | κ₂ precondicionado aproximado |
|---|---|---:|---:|---:|
| Ideal | [120, 100, 70, 60] | 3 / 4 | 2.20 | 2.00 |
| Bajo estrés | [105, 85, 60, 50] | 3 / 4 | 2.20 | 2.00 |
| Mal condicionado | [110, 90, 65, 55] | 4 / 4 | 1575.24 | 2.00 |

Con la tolerancia `10⁻⁶`, el residuo relativo final de GCP esperado es aproximadamente `2.06×10⁻¹⁶` en Ideal, `6.66×10⁻¹⁷` en Bajo estrés y `1.54×10⁻¹⁶` en Mal condicionado. Los últimos dígitos pueden variar por redondeo de coma flotante. Los errores Ea/Ep de GCP frente a Gauss deberían ser prácticamente cero en estos datos sintéticos.

Interpretación financiera: Ideal representa la distribución de referencia; Bajo estrés reduce los valores asignados porque cambia el vector de demanda `b`, sin cambiar el condicionamiento de `A`; Mal condicionado mantiene magnitudes de asignación parecidas, pero usa coeficientes de escala muy dispares. Jacobi mejora mucho el número de condición estimado en ese tercer caso. En este ejemplo GCP iguala, pero no supera, el número de iteraciones de GC en el escenario mal condicionado; la prueba QA exige que sea igual o menor, no necesariamente menor.
