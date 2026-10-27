/* ===================================================================
   utils.js — utilitários puros, sem dependência de estado (V3)
   Datas, dinheiro, formatação e validação básica moram todos aqui.
   Nenhuma outra parte do app deve reimplementar essas funções.
   =================================================================== */

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const CATEGORIAS = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Compras",
  "Assinaturas",
  "Cartão de crédito",
  "Outros",
];

const ORIGENS_RECEITA = ["Salário", "Freelance", "Venda", "Outros"];

// Limites usados para classificar o progresso de um orçamento.
// Centralizados aqui para não ficarem espalhados como números soltos
// em dados.js e render.js (ver seção 14/41 do plano de evolução).
const LIMITES_ORCAMENTO = {
  ATENCAO: 85,
  ESTOURADO: 100,
};

/* ---------- Identificadores e datas ---------- */

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function hojeISO() {
  const d = new Date();
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function mesAnoDe(dataISO) {
  return dataISO.slice(0, 7);
}

function mesAnoAtual() {
  return mesAnoDe(hojeISO());
}

function nomeMesExtenso(mesAno) {
  const [ano, mes] = mesAno.split("-").map(Number);
  return `${MESES_PT[mes - 1]} de ${ano}`;
}

function nomeMesCurto(mesAno) {
  const [, mes] = mesAno.split("-").map(Number);
  return MESES_PT[mes - 1].slice(0, 3);
}

function formatarDataCurta(dataISO) {
  const [, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}`;
}

function formatarDataCompleta(dataISO) {
  const d = new Date(dataISO + "T00:00:00");
  const diasSemana = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  return `${diasSemana[d.getDay()]}, ${d.getDate()} de ${MESES_PT[d.getMonth()]}`;
}

function diasEntre(dataISOAlvo, dataISOBase = hojeISO()) {
  const a = new Date(dataISOAlvo + "T00:00:00");
  const b = new Date(dataISOBase + "T00:00:00");
  return Math.round((a - b) / 86400000);
}

function mesAnterior(mesAno) {
  const [ano, mes] = mesAno.split("-").map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ---------- Texto ---------- */

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ---------- Dinheiro seguro (evita erro de ponto flutuante) ----------
   Toda soma/subtração financeira "sensível" (totais de mês, orçamento,
   fixos) deve passar por aqui em vez de usar + e - direto em reais.
   Ex.: 0.1 + 0.2 === 0.30000000000000004 em JS puro; convertendo pra
   centavos (inteiros) antes de somar, esse erro desaparece.
   Os dados continuam salvos em reais (compatibilidade com V1/V2) —
   a conversão é só para o cálculo, na hora de somar. ---------- */

function reaisParaCentavos(valor) {
  return Math.round((Number(valor) || 0) * 100);
}

function centavosParaReais(centavos) {
  return (Number(centavos) || 0) / 100;
}

function somarDinheiro(...valoresEmReais) {
  const totalCentavos = valoresEmReais.reduce((soma, v) => soma + reaisParaCentavos(v), 0);
  return centavosParaReais(totalCentavos);
}

function subtrairDinheiro(a, b) {
  return centavosParaReais(reaisParaCentavos(a) - reaisParaCentavos(b));
}

/* ---------- Validação básica ----------
   Primitivas simples e reutilizáveis. A validação de formulários
   inteiros (obrigatoriedade de campos, mensagens pro usuário etc.)
   continua em acoes.js/modal.js — isso aqui é só a régua comum. ---------- */

function validarValor(valor, { permiteZero = false } = {}) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return false;
  if (n < 0) return false;
  if (!permiteZero && n <= 0) return false;
  return true;
}

function validarData(dataISO) {
  if (typeof dataISO !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return false;
  const d = new Date(dataISO + "T00:00:00");
  return !Number.isNaN(d.getTime());
}

function validarPercentual(pct) {
  const n = Number(pct);
  return Number.isFinite(n) && n > 0 && n <= 100;
}
