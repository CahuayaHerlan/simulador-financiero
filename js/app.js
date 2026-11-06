
import{VARIABLES,ESCENARIOS,copiarMatriz,copiarVector}from"./datos.js";
import{resolverSistemaDirecto}from"./metodosDirectos.js";
import{gradientesConjugados,gradientesConjugadosPrecondicionado}from"./gradientesConjugados.js";
import{validarModelo,calcularErrores,calcularResiduoRelativo,numeroCondicion2,matrizEquivalenteJacobi,menoresPrincipales}from"./analisis.js";
import{ejecutarPruebasQA}from"./qa.js";

let actual="ideal",A=[],b=[],x0=[0,0,0,0],ultimaComparacion=[];
const $=id=>document.getElementById(id);
const fmt=(v,d=7)=>Number.isFinite(v)?v.toLocaleString("es-BO",{maximumFractionDigits:d}):"No definido";
const exp=v=>Number.isFinite(v)?v.toExponential(3):"No definido";
const prettyVector=v=>"["+v.map(n=>fmt(n,5)).join(", ")+"]";

function leerX0(){
 return Array.from(document.querySelectorAll("#x0Editor input"),el=>el.value.trim()===""?NaN:Number(el.value));
}

function cargar(id){
 actual=id;
 const e=ESCENARIOS[id];
 A=copiarMatriz(e.A);
 b=copiarVector(e.b);
 x0=[0,0,0,0];
 $("scenarioTitle").textContent=e.nombre;
 $("scenarioDescription").textContent=e.descripcion;
 dibujarTarjetas();
 dibujarEditores();
 limpiarResultados();
 $("validationMessage").className="message";
 $("validationMessage").textContent="Escenario cargado. Pulsa Validar y calcular.";
}

function dibujarTarjetas(){
 const cont=$("scenarioGrid");
 cont.innerHTML="";
 Object.values(ESCENARIOS).forEach(e=>{
  const bt=document.createElement("button");
  bt.className="scenario-card "+(e.id===actual?"active":"");
  bt.type="button";
  bt.setAttribute("aria-pressed",String(e.id===actual));
  const small=document.createElement("small");
  small.textContent=e.numero;
  const h=document.createElement("h3");
  h.textContent=e.nombre;
  const p=document.createElement("p");
  p.textContent=e.descripcion;
  const detail=document.createElement("small");
  detail.textContent=e.detalle;
  bt.append(small,h,p,detail);
  bt.onclick=()=>cargar(e.id);
  cont.appendChild(bt);
 });
}

function dibujarEditores(){
 const me=$("matrixEditor");
 me.innerHTML="";
 A.forEach((f,i)=>f.forEach((v,j)=>{
  const inp=document.createElement("input");
  inp.type="number";
  inp.step="any";
  inp.value=v;
  inp.title=`A[${i+1},${j+1}]`;
  inp.setAttribute("aria-label",`A fila ${i+1}, columna ${j+1}`);
  inp.onchange=()=>{
   A[i][j]=inp.value.trim()===""?NaN:Number(inp.value);
   pendiente();
   calcular();
  };
  me.appendChild(inp);
 }));

 const ve=$("vectorEditor");
 ve.innerHTML="";
 b.forEach((v,i)=>{
  const row=document.createElement("div");
  row.className="vector-row";
  const label=document.createElement("label");
  label.className="vector-label";
  label.style.color=`var(--${VARIABLES[i].color})`;
  label.textContent=VARIABLES[i].id;
  label.htmlFor=`b${i}`;
  const inp=document.createElement("input");
  inp.id=`b${i}`;
  inp.type="number";
  inp.step="any";
  inp.value=v;
  inp.setAttribute("aria-label",VARIABLES[i].nombre);
  inp.onchange=()=>{
   b[i]=inp.value.trim()===""?NaN:Number(inp.value);
   pendiente();
   calcular();
  };
  row.append(label,inp);
  ve.appendChild(row);
 });

 const xe=$("x0Editor");
 xe.innerHTML="";
 x0.forEach((v,i)=>{
  const row=document.createElement("div");
  row.className="vector-row";
  const label=document.createElement("label");
  label.className="vector-label";
  label.textContent=`x${i+1}⁰`;
  label.htmlFor=`x0${i}`;
  const inp=document.createElement("input");
  inp.id=`x0${i}`;
  inp.type="number";
  inp.step="any";
  inp.value=v;
  inp.setAttribute("aria-label",`Componente ${i+1} del vector inicial`);
  inp.onchange=()=>{
   x0=leerX0();
   pendiente();
   calcular();
  };
  row.append(label,inp);
  xe.appendChild(row);
 });
}

function pendiente(){
 $("validationMessage").className="message";
 $("validationMessage").textContent="Datos modificados: la página recalcula los resultados automáticamente.";
}

function limpiarResultados(){
 document.querySelectorAll(".engineering-conclusion").forEach(el=>{
  if(!el.closest(".panel.results")?.querySelector(".eyebrow")?.textContent.includes("05 / CONCLUSIONES")){
   el.remove();
  }
 });

 ["conditionA","conditionPre","iterationsGC","iterationsPCG"].forEach(id=>$(id).textContent="—");
 $("solutionTable").innerHTML='<tr><td colspan="8">Ejecuta el cálculo para ver resultados.</td></tr>';
 $("diagnostics").textContent="Los diagnósticos aparecerán después del cálculo.";
 $("symmetryProof").textContent="Ejecuta el cálculo para ver la comprobación.";
 $("minorProof").innerHTML="";
 $("comparisonTable").innerHTML='<tr><td colspan="4">Ejecuta el cálculo para comparar escenarios.</td></tr>';
 $("conditionChart").innerHTML="";
 $("interpretation").innerHTML="<p>Los resultados e interpretaciones aparecerán después del cálculo.</p>";
 ultimaComparacion=[];
}

function diag(label,value){
 const d=document.createElement("div");
 d.className="diagnostic";
 const s=document.createElement("span");
 const v=document.createElement("strong");
 s.textContent=label;
 v.textContent=value;
 d.append(s,v);
 return d;
}

/* BLOQUE NUEVO: conclusiones de Ingeniería de Sistemas */

function conclusionIngenieria(contenedor,texto){
 if(!contenedor)return;

 const anterior=contenedor.querySelector(":scope > .engineering-conclusion");
 if(anterior)anterior.remove();

 const bloque=document.createElement("div");
 bloque.className="engineering-conclusion";
 bloque.style.cssText="margin-top:14px;padding:13px 15px;border-left:3px solid #78aaff;border-radius:8px;background:#14213a;color:#dce8fb;font-size:12px;line-height:1.6";

 const titulo=document.createElement("strong");
 titulo.textContent="Aplicación a la mención de Ingeniería de Sistemas";
 titulo.style.cssText="display:block;color:#9fc2ff;margin-bottom:5px;font-size:12px";

 const parrafo=document.createElement("p");
 parrafo.textContent=texto;
 parrafo.style.margin="0";

 bloque.append(titulo,parrafo);
 contenedor.appendChild(bloque);
}

function agregarConclusionFinal(){
 const secciones=Array.from(document.querySelectorAll(".panel.results"));

 const seccion=secciones.find(el=>
  el.querySelector(".eyebrow")?.textContent.includes("05 / CONCLUSIONES")
 );

 if(!seccion)return;

 const prose=seccion.querySelector(".prose");

 conclusionIngenieria(
  prose,
  "Desde la mención de Ingeniería de Sistemas, este simulador demuestra cómo el modelado matemático y los métodos numéricos apoyan la planificación y optimización de recursos tecnológicos. La comparación entre Gauss, GC y GCP permite evaluar la precisión, convergencia y eficiencia de distintas alternativas antes de tomar decisiones sobre infraestructura, desarrollo de software, seguridad informática y mantenimiento. En un entorno real, este análisis debería complementarse con datos institucionales, restricciones presupuestarias y criterios operativos."
 );
}

/* FIN DEL BLOQUE NUEVO */

function ejecutar(Ax,bx,opciones){
 const valid=validarModelo(Ax,bx);
 if(!valid.valido)throw Error(valid.mensaje);

 const ref=resolverSistemaDirecto(Ax,bx);
 const gc=gradientesConjugados(Ax,bx,opciones);
 const gcp=gradientesConjugadosPrecondicionado(Ax,bx,opciones);
 const condA=numeroCondicion2(Ax);
 const Ae=opciones.precondicionador==="jacobi"?matrizEquivalenteJacobi(Ax):Ax;
 const condPre=numeroCondicion2(Ae);

 return{
  ref,gc,gcp,valid,condA,condPre,Ae,
  err:calcularErrores(ref,gcp.x),
  resGC:calcularResiduoRelativo(Ax,bx,gc.x),
  resGCP:calcularResiduoRelativo(Ax,bx,gcp.x)
 };
}

function calcular(){
 const tol=Number($("tolerance").value);
 const max=Number($("maxIterations").value);
 x0=leerX0();

 if(!(tol>0)||!Number.isFinite(tol)){
  $("validationMessage").className="message error";
  $("validationMessage").textContent="La tolerancia debe ser positiva y finita.";
  return;
 }

 if(!(max>=1)||!Number.isInteger(max)){
  $("validationMessage").className="message error";
  $("validationMessage").textContent="El máximo de iteraciones debe ser un entero positivo.";
  return;
 }

 if(x0.length!==A.length||x0.some(v=>!Number.isFinite(v))){
  $("validationMessage").className="message error";
  $("validationMessage").textContent="Completa las cuatro componentes numéricas de x₀.";
  return;
 }

 const valid=validarModelo(A,b);

 if(!valid.valido){
  $("validationMessage").className="message error";
  $("validationMessage").textContent=valid.mensaje;
  limpiarResultados();
  return;
 }

 try{
  const opciones={
   tolerancia:tol,
   maxIteraciones:max,
   x0,
   precondicionador:$("preconditioner").value
  };

  const r=ejecutar(A,b,opciones);

  $("conditionA").textContent=fmt(r.condA,5);
  $("conditionPre").textContent=fmt(r.condPre,5);
  $("iterationsGC").textContent=r.gc.iteraciones;
  $("iterationsPCG").textContent=r.gcp.iteraciones;

  /* SOLUCIÓN Y ERRORES */

  const tb=$("solutionTable");
  tb.innerHTML="";

  VARIABLES.forEach((v,i)=>{
   const tr=document.createElement("tr");
   const er=r.err[i];

   const vals=[
    v.id,
    v.nombre,
    fmt(r.ref[i]),
    fmt(r.gc.x[i]),
    fmt(r.gcp.x[i]),
    fmt(er.absoluto,7),
    er.relativo===null?"No definido":fmt(er.relativo,8),
    er.porcentual===null?"No definido":fmt(er.porcentual,6)+" %"
   ];

   vals.forEach((value,j)=>{
    const td=document.createElement("td");
    td.textContent=value;
    if(j<2)td.style.textAlign="left";
    tr.appendChild(td);
   });

   tb.appendChild(tr);
  });

  conclusionIngenieria(
   $("solutionTable").parentElement.parentElement,
   "La distribución calculada permite comparar cuánto recurso se asigna a infraestructura, desarrollo, seguridad y mantenimiento. Para Ingeniería de Sistemas, esta información sirve como apoyo para priorizar inversiones tecnológicas y comprobar que las decisiones presupuestarias sean coherentes con las necesidades del sistema."
  );

  /* DIAGNÓSTICO MATEMÁTICO */

  const de=$("diagnostics");
  de.innerHTML="";

  [
   ["Convergencia GC",r.gc.convergio?"Sí":"No alcanzó tolerancia"],
   ["Convergencia GCP",r.gcp.convergio?"Sí":"No alcanzó tolerancia"],
   ["Residuo relativo GC",exp(r.resGC)],
   ["Residuo relativo GCP",exp(r.resGCP)],
   ["Número de condición κ₂(A)",fmt(r.condA,8)],
   ["Número de condición precondicionada",fmt(r.condPre,8)],
   ["Precondicionador",opciones.precondicionador==="jacobi"?"Jacobi diagonal":"Identidad (sin precondicionamiento)"],
   ["Vector inicial x₀",prettyVector(x0)],
   ["Criterio de parada",`||b − Ax||₂ / ||b||₂ < ${tol.toExponential(1)}`],
   ["Máximo de iteraciones",max]
  ].forEach(([k,v])=>de.appendChild(diag(k,v)));

  conclusionIngenieria(
   de.parentElement,
   "El diagnóstico permite verificar si los métodos alcanzan la tolerancia y si la matriz presenta condiciones adecuadas. En Ingeniería de Sistemas, estas verificaciones son importantes para confiar en los cálculos que respaldan la planificación de recursos y detectar posibles problemas numéricos antes de utilizar los resultados."
  );

  /* SIMETRÍA Y CRITERIO DE SYLVESTER */

  $("symmetryProof").textContent="Simetría: A = Aᵀ verificada. Criterio de Sylvester: todos los menores principales son positivos.";

  const mp=$("minorProof");
  mp.innerHTML="";

  r.valid.menores.forEach((v,i)=>{
   const el=document.createElement("div");
   el.className="minor-chip";
   el.textContent=`Δ${i+1} = ${fmt(v,8)} ${v>0?"✓":"✗"}`;
   mp.appendChild(el);
  });

  dibujarComparacion(opciones);
  dibujarGrafico(ultimaComparacion);
  dibujarGraficoCartesiano(ultimaComparacion);
  dibujarInterpretacion(r,opciones);

  $("validationMessage").className="message success";
  $("validationMessage").textContent=valid.mensaje+" Gauss, GC y GCP se ejecutaron; revisa convergencia y residuos.";

 }catch(err){
  $("validationMessage").className="message error";
  $("validationMessage").textContent="Error de cálculo: "+err.message;
 }
}

function dibujarComparacion(opciones){
 ultimaComparacion=[];

 for(const e of Object.values(ESCENARIOS)){
  try{
   const r=ejecutar(e.A,e.b,opciones);
   ultimaComparacion.push({e,r});
  }catch(err){
   ultimaComparacion.push({e,error:err.message});
  }
 }

 const rows=[
  ["Solución de referencia (Gauss)",v=>prettyVector(v.r.ref)],
  ["Solución GCP",v=>prettyVector(v.r.gcp.x)],
  ...VARIABLES.map((variable,i)=>[
   `Ea GCP — ${variable.id}`,
   v=>fmt(v.r.err[i].absoluto,8)
  ]),
  ...VARIABLES.map((variable,i)=>[
   `Ep GCP — ${variable.id}`,
   v=>v.r.err[i].porcentual===null?"No definido":fmt(v.r.err[i].porcentual,6)+" %"
  ]),
  ["Error absoluto máximo GCP",v=>fmt(Math.max(...v.r.err.map(z=>z.absoluto)),8)],
  ["Error porcentual máximo GCP",v=>fmt(Math.max(...v.r.err.map(z=>z.porcentual??0)),6)+" %"],
  ["Iteraciones GC",v=>String(v.r.gc.iteraciones)],
  ["Iteraciones GCP",v=>String(v.r.gcp.iteraciones)],
  ["κ₂(A)",v=>fmt(v.r.condA,7)],
  ["κ₂(M⁻¹A) equivalente",v=>fmt(v.r.condPre,7)],
  ["Residuo relativo final GCP",v=>exp(v.r.resGCP)],
  ["¿Convergió GCP?",v=>v.r.gcp.convergio?"Sí":"No"],
  ["Interpretación financiera",v=>interpretacionEscenario(v.e,v.r)]
 ];

 const tb=$("comparisonTable");
 tb.innerHTML="";

 rows.forEach(([label,get])=>{
  const tr=document.createElement("tr");
  const first=document.createElement("td");
  first.textContent=label;
  first.style.textAlign="left";
  tr.appendChild(first);

  ultimaComparacion.forEach(v=>{
   const td=document.createElement("td");
   td.textContent=v.error||get(v);
   tr.appendChild(td);
  });

  tb.appendChild(tr);
 });

 conclusionIngenieria(
  $("comparisonTable").parentElement.parentElement,
  "La comparación entre escenarios permite anticipar cómo una variación de demanda o de escala afecta la asignación de recursos y el comportamiento numérico. Desde Ingeniería de Sistemas, esto ayuda a evaluar alternativas de planificación y a identificar escenarios que requieren mayor control o una estrategia de precondicionamiento."
 );
}

function interpretacionEscenario(e,r){
 if(e.id==="estres"){
  return `El cambio de demanda desplaza la asignación a ${prettyVector(r.ref)} miles de Bs; A no cambió y κ₂(A) se mantiene como en el ideal.`;
 }

 if(e.id==="mal"){
  return `El escalamiento desigual eleva κ₂(A) a ${fmt(r.condA,4)}; Jacobi lo reduce a ${fmt(r.condPre,4)}. Conviene revisar la sensibilidad de las áreas con mayor escala.`;
 }

 return `Caso base: asignación estimada ${prettyVector(r.ref)} miles de Bs. Sirve como referencia para valorar el estrés y el mal escalamiento.`;
}

function dibujarGraficoCartesiano(datos){
 const cont=$("allocationChart");
 cont.innerHTML="";

 const validos=datos.filter(v=>v.r);

 if(!validos.length){
  cont.textContent="No hay resultados válidos para graficar.";
  return;
 }

 const ns="http://www.w3.org/2000/svg";
 const W=760,H=340,L=65,R=24,T=22,B=55;
 const plotW=W-L-R,plotH=H-T-B;

 const svg=document.createElementNS(ns,"svg");
 svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
 svg.setAttribute("role","img");
 svg.setAttribute("aria-label","Comparación cartesiana de asignación por área en miles de bolivianos");

 const todos=validos.flatMap(v=>v.r.ref);
 const minimo=Math.min(0,...todos);
 const maximo=Math.max(1,...todos);
 const rango=maximo-minimo||1;
 const minGraf=minimo-(rango*0.05);
 const maxGraf=maximo+(rango*0.08);
 const rangoGraf=maxGraf-minGraf;

 const el=(tag,attrs={},textValue="")=>{
  const n=document.createElementNS(ns,tag);
  Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));
  if(textValue!="")n.textContent=textValue;
  svg.appendChild(n);
  return n;
 };

 for(let k=0;k<=4;k++){
  const val=minGraf+(rangoGraf*k/4);
  const y=T+plotH-((val-minGraf)/rangoGraf)*plotH;
  el("line",{x1:L,y1:y,x2:W-R,y2:y,class:"chart-gridline"});
  el("text",{x:L-10,y:y+4,"text-anchor":"end",class:"chart-axis-label"},fmt(val,1));
 }

 el("line",{x1:L,y1:T,x2:L,y2:T+plotH,class:"chart-axis"});
 el("line",{x1:L,y1:T+plotH,x2:W-R,y2:T+plotH,class:"chart-axis"});

 const xpos=i=>L+(plotW/(VARIABLES.length-1))*i;
 const ypos=v=>T+plotH-((v-minGraf)/rangoGraf)*plotH;

 VARIABLES.forEach((v,i)=>{
  el("text",{x:xpos(i),y:H-29,"text-anchor":"middle",class:"chart-axis-label"},v.id);
  el("text",{x:xpos(i),y:H-13,"text-anchor":"middle",class:"chart-category-label"},v.nombre.length>17?v.nombre.slice(0,16)+"…":v.nombre);
 });

 const colors=["#78aaff","#ffb86b","#c4a5ff"];

 validos.forEach((item,index)=>{
  const pts=item.r.ref.map((value,i)=>`${xpos(i)},${ypos(value)}`).join(" ");

  el("polyline",{
   points:pts,
   fill:"none",
   stroke:colors[index%colors.length],
   "stroke-width":"3",
   "stroke-linejoin":"round",
   "stroke-linecap":"round"
  });

  item.r.ref.forEach((value,i)=>{
   const c=el("circle",{
    cx:xpos(i),
    cy:ypos(value),
    r:4,
    fill:colors[index%colors.length],
    stroke:"#0b1426",
    "stroke-width":"1.5"
   });

   const title=document.createElementNS(ns,"title");
   title.textContent=`${item.e.nombre} · ${VARIABLES[i].id}: ${fmt(value,4)} miles de Bs`;
   c.appendChild(title);
  });
 });

 cont.appendChild(svg);

 const legend=document.createElement("div");
 legend.className="chart-legend";

 validos.forEach((item,index)=>{
  const span=document.createElement("span");
  const dot=document.createElement("i");
  dot.style.background=colors[index%colors.length];
  span.append(dot,document.createTextNode(item.e.nombre));
  legend.appendChild(span);
 });

 cont.appendChild(legend);

 conclusionIngenieria(
  cont.parentElement,
  "El gráfico permite visualizar qué áreas concentran mayor asignación en cada escenario. Para Ingeniería de Sistemas, esta comparación facilita identificar prioridades de inversión y observar si la infraestructura, el desarrollo, la seguridad y el mantenimiento mantienen un equilibrio razonable."
 );
}

function dibujarGrafico(datos){
 const cont=$("conditionChart");
 cont.innerHTML="";

 const vals=datos.filter(v=>v.r)
  .flatMap(v=>[v.r.condA,v.r.condPre])
  .filter(Number.isFinite);

 const maxLog=Math.max(1,...vals.map(v=>Math.log10(Math.max(v,1))));

 datos.forEach(({e,r,error})=>{
  if(!r)return;

  const group=document.createElement("div");
  group.className="chart-group";

  const title=document.createElement("h4");
  title.textContent=e.nombre;
  group.appendChild(title);

  [["κ₂(A)",r.condA,"bar-a"],["κ₂ precond.",r.condPre,"bar-p"]].forEach(([label,value,cls])=>{
   const line=document.createElement("div");
   line.className="bar-line";

   const name=document.createElement("span");
   name.textContent=label;

   const track=document.createElement("div");
   track.className="bar-track";

   const bar=document.createElement("div");
   bar.className="bar "+cls;
   bar.style.width=`${Math.max(1,Math.log10(Math.max(value,1))/maxLog*100)}%`;

   track.appendChild(bar);

   const val=document.createElement("strong");
   val.textContent=fmt(value,4);

   line.append(name,track,val);
   group.appendChild(line);
  });

  cont.appendChild(group);
 });

 conclusionIngenieria(
  cont.parentElement,
  "El número de condición muestra qué tan sensible puede ser la solución ante cambios en los datos. En Ingeniería de Sistemas, revisar este indicador ayuda a valorar la estabilidad de los cálculos que se utilizan para apoyar decisiones de asignación y planificación tecnológica."
 );
}

function dibujarInterpretacion(r,op){
 const cont=$("interpretation");
 cont.innerHTML="";

 const p1=document.createElement("p");
 p1.textContent=`En el escenario “${ESCENARIOS[actual].nombre}”, Gauss proporciona la solución numérica de referencia. GC ${r.gc.convergio?"alcanzó":"no alcanzó"} la tolerancia en ${r.gc.iteraciones} iteraciones; GCP ${r.gcp.convergio?"alcanzó":"no alcanzó"} la tolerancia en ${r.gcp.iteraciones} iteraciones. El residuo relativo final de GCP es ${exp(r.resGCP)}.`;

 const p2=document.createElement("p");
 p2.textContent=`El número de condición estimado cambia de ${fmt(r.condA,5)} para A a ${fmt(r.condPre,5)} para la matriz simétrica equivalente ${op.precondicionador==="jacobi"?"de Jacobi":"con identidad"}. Si el valor precondicionado es menor, la transformación mejora el condicionamiento estimado; el efecto real sobre iteraciones se comprueba en la tabla.`;

 const p3=document.createElement("p");

 if(actual==="estres"){
  p3.textContent="Interpretación del estrés: se modificó el vector b manteniendo A. Por tanto, cambia la solución financiera estimada, pero el número de condición de A debe mantenerse igual que en el escenario ideal.";
 }else if(actual==="mal"){
  p3.textContent="Interpretación del mal escalamiento: se multiplicaron filas y columnas por factores de escala distintos, equivalente a D·A·D. Esto conserva simetría y definición positiva, pero puede aumentar el número de condición. Jacobi busca compensar la escala dispar.";
 }else{
  p3.textContent="Interpretación del escenario ideal: la matriz base tiene coeficientes de escala relativamente equilibrada. Se utiliza como punto de comparación para estudiar el impacto de cambiar la demanda financiera o el escalamiento.";
 }

 const p4=document.createElement("p");
 p4.textContent=interpretacionEscenario(ESCENARIOS[actual],r);

 cont.append(p1,p2,p3,p4);

 conclusionIngenieria(
  cont,
  "La interpretación conjunta de convergencia, residuo y condicionamiento permite juzgar si la distribución calculada es numéricamente confiable. En Ingeniería de Sistemas, este análisis se traduce en una herramienta de apoyo para planificar recursos tecnológicos, comparar alternativas y justificar decisiones con indicadores cuantificables."
 );
}

/* EVENTOS E INICIALIZACIÓN */

$("runCalculation").onclick=calcular;

["tolerance","maxIterations","preconditioner"].forEach(id=>
 $(id).addEventListener("change",()=>{
  pendiente();
  calcular();
 })
);

$("runQA").onclick=()=>{
 const resultados=ejecutarPruebasQA();
 const tb=$("qaTable");
 tb.innerHTML="";

 resultados.forEach(t=>{
  const tr=document.createElement("tr");

  [t.prueba,t.entrada,t.esperado,t.obtenido,t.conclusion].forEach((v,i)=>{
   const td=document.createElement("td");
   td.textContent=v;
   if(i===4)td.className=t.aprobada?"qa-pass":"qa-fail";
   tr.appendChild(td);
  });

  tb.appendChild(tr);
 });

 const aprobadas=resultados.filter(t=>t.aprobada).length;
 $("qaSummary").className="message "+(aprobadas===resultados.length?"success":"error");
 $("qaSummary").textContent=`Resultado QA: ${aprobadas} de ${resultados.length} pruebas aprobadas.`;
};

$("resetScenario").onclick=()=>cargar(actual);

cargar("ideal");
calcular();
agregarConclusionFinal();
