/* ===================================================================
   dados.js — estado, armazenamento e regras de negócio (V2)
   Tudo fica salvo no localStorage do navegador, no aparelho da pessoa.
   =================================================================== */

const CHAVE_V1 = "controleFinanceiro_v1";
const CHAVE_V2 = "controleFinanceiro_v2";

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

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/* ---------- Estado padrão / migração ---------- */

function estadoPadrao() {
  return {
    versao: 2,
    transacoes: [],   // {id, tipo:'gasto'|'receita'|'investimento', categoria, descricao, valor, data, observacao, origemFixoId}
    fixos: [],        // {id, nome, tipo, categoria, valor, diaVencimento, ativo, ultimoLancamento}
    orcamentos: [],   // {id, categoria, valor, repetir:boolean, mesAno?}
    metas: [],        // {id, nome, valorObjetivo, valorAtual, prazo}
    investConfig: {
      patrimonio: 0,
      metaPatrimonio: 0,
      distribuicao: [], // {id, nome, percentual}
    },
    historico: [],    // {id, mesAno, totalReceitas, totalGastos, totalInvestido, saldo, categorias, fechadoEm}
  };
}

function migrarDadosV1ParaV2() {
  try {
    const bruto = localStorage.getItem(CHAVE_V1);
    if (!bruto) return null;
    const antigo = JSON.parse(bruto);
    const novo = estadoPadrao();
    novo.transacoes = antigo.transacoes || [];
    novo.fixos = antigo.fixos || [];
    novo.historico = (antigo.historico || []).map((h) => ({ ...h }));
    return novo;
  } catch (erro) {
    console.error("Não foi possível migrar dados da versão 1:", erro);
    return null;
  }
}

function carregarEstado() {
  try {
    const brutoV2 = localStorage.getItem(CHAVE_V2);
    if (brutoV2) {
      const dados = JSON.parse(brutoV2);
      const base = estadoPadrao();
      return {
        ...base,
        ...dados,
        investConfig: { ...base.investConfig, ...(dados.investConfig || {}) },
      };
    }
    // sem dados v2: tenta migrar da v1, sem apagar nada da v1
    const migrado = migrarDadosV1ParaV2();
    if (migrado) {
      localStorage.setItem(CHAVE_V2, JSON.stringify(migrado));
      return migrado;
    }
    return estadoPadrao();
  } catch (erro) {
    console.error("Não foi possível ler os dados salvos:", erro);
    return estadoPadrao();
  }
}

function salvarEstado() {
  try {
    localStorage.setItem(CHAVE_V2, JSON.stringify(estado));
  } catch (erro) {
    console.error("Não foi possível salvar os dados:", erro);
    alert("Não consegui salvar os dados agora. Veja se o navegador não está em modo privado/anônimo.");
  }
}

let estado = carregarEstado();

/* ---------- Utilidades ---------- */

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

function formatarMoeda(valor) {
  const numero = Number(valor) || 0;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

/* ---------- Consultas sobre transações ---------- */

function transacoesDoMes(mesAno = mesAnoAtual()) {
  return estado.transacoes.filter((t) => mesAnoDe(t.data) === mesAno);
}

function transacoesDoDia(dataISO = hojeISO()) {
  return estado.transacoes.filter((t) => t.data === dataISO);
}

function somarPorTipo(transacoes, tipo) {
  return transacoes
    .filter((t) => t.tipo === tipo)
    .reduce((soma, t) => soma + Number(t.valor), 0);
}

function resumoDoMes(mesAno = mesAnoAtual()) {
  const docs = transacoesDoMes(mesAno);
  const totalReceitas = somarPorTipo(docs, "receita");
  const totalGastos = somarPorTipo(docs, "gasto");
  const totalInvestido = somarPorTipo(docs, "investimento");
  const saldo = totalReceitas - totalGastos - totalInvestido;
  return { totalReceitas, totalGastos, totalInvestido, saldo, docs };
}

function gastosPorCategoria(mesAno = mesAnoAtual()) {
  const docs = transacoesDoMes(mesAno).filter((t) => t.tipo === "gasto");
  const mapa = {};
  for (const t of docs) {
    mapa[t.categoria] = (mapa[t.categoria] || 0) + Number(t.valor);
  }
  return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
}

function excluirTransacao(id) {
  estado.transacoes = estado.transacoes.filter((t) => t.id !== id);
  salvarEstado();
}

function editarTransacao(id, dadosNovos) {
  const t = estado.transacoes.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, dadosNovos);
  salvarEstado();
}

/* ---------- Contas fixas / assinaturas ---------- */

function lancarFixosPendentes(mesAno = mesAnoAtual()) {
  let algumLancado = false;
  for (const fixo of estado.fixos) {
    if (!fixo.ativo) continue;
    if (fixo.ultimoLancamento === mesAno) continue;

    const [ano, mes] = mesAno.split("-").map(Number);
    const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
    const dia = Math.min(Number(fixo.diaVencimento), ultimoDiaDoMes);
    const dataLancamento = `${mesAno}-${String(dia).padStart(2, "0")}`;

    estado.transacoes.push({
      id: gerarId(),
      tipo: "gasto",
      categoria: fixo.categoria,
      descricao: fixo.nome,
      valor: Number(fixo.valor),
      data: dataLancamento,
      origemFixoId: fixo.id,
    });
    fixo.ultimoLancamento = mesAno;
    algumLancado = true;
  }
  if (algumLancado) salvarEstado();
}

function totalFixosAtivos() {
  return estado.fixos
    .filter((f) => f.ativo)
    .reduce((soma, f) => soma + Number(f.valor), 0);
}

function proximasContas(limite = 5) {
  const hoje = hojeISO();
  const mesAno = mesAnoAtual();
  const [ano, mes] = mesAno.split("-").map(Number);
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();

  return estado.fixos
    .filter((f) => f.ativo)
    .map((f) => {
      const dia = Math.min(Number(f.diaVencimento), ultimoDiaDoMes);
      let dataVenc = `${mesAno}-${String(dia).padStart(2, "0")}`;
      let dias = diasEntre(dataVenc, hoje);
      if (dias < 0) {
        // já venceu este mês: mostra o vencimento do próximo mês
        const prox = new Date(ano, mes, 1);
        const proxMesAno = `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, "0")}`;
        const [pa, pm] = proxMesAno.split("-").map(Number);
        const ultimoDiaProx = new Date(pa, pm, 0).getDate();
        const diaProx = Math.min(Number(f.diaVencimento), ultimoDiaProx);
        dataVenc = `${proxMesAno}-${String(diaProx).padStart(2, "0")}`;
        dias = diasEntre(dataVenc, hoje);
      }
      return { ...f, dataVenc, dias };
    })
    .sort((a, b) => a.dias - b.dias)
    .slice(0, limite);
}

/* ---------- Orçamentos ---------- */

function orcamentosDoMes(mesAno = mesAnoAtual()) {
  return estado.orcamentos.filter((o) => o.repetir || o.mesAno === mesAno);
}

function orcamentoComProgresso(mesAno = mesAnoAtual()) {
  const gastos = Object.fromEntries(gastosPorCategoria(mesAno));
  return orcamentosDoMes(mesAno).map((o) => {
    const gasto = gastos[o.categoria] || 0;
    const pct = o.valor > 0 ? Math.min(999, Math.round((gasto / o.valor) * 100)) : 0;
    return { ...o, gasto, pct, restante: o.valor - gasto };
  });
}

function criarOrcamento({ categoria, valor, repetir }) {
  estado.orcamentos.push({
    id: gerarId(),
    categoria,
    valor: Number(valor),
    repetir: !!repetir,
    mesAno: repetir ? null : mesAnoAtual(),
  });
  salvarEstado();
}

function editarOrcamento(id, dadosNovos) {
  const o = estado.orcamentos.find((x) => x.id === id);
  if (!o) return;
  Object.assign(o, dadosNovos);
  salvarEstado();
}

function excluirOrcamento(id) {
  estado.orcamentos = estado.orcamentos.filter((o) => o.id !== id);
  salvarEstado();
}

/* ---------- Metas financeiras ---------- */

function criarMeta({ nome, valorObjetivo, valorAtual, prazo }) {
  estado.metas.push({
    id: gerarId(),
    nome,
    valorObjetivo: Number(valorObjetivo),
    valorAtual: Number(valorAtual) || 0,
    prazo: prazo || null,
  });
  salvarEstado();
}

function editarMeta(id, dadosNovos) {
  const m = estado.metas.find((x) => x.id === id);
  if (!m) return;
  Object.assign(m, dadosNovos);
  salvarEstado();
}

function excluirMeta(id) {
  estado.metas = estado.metas.filter((m) => m.id !== id);
  salvarEstado();
}

/* ---------- Investimentos ---------- */

function definirInvestConfig(dadosNovos) {
  estado.investConfig = { ...estado.investConfig, ...dadosNovos };
  salvarEstado();
}

function totalInvestidoHistorico() {
  return somarPorTipo(estado.transacoes, "investimento");
}

/* ---------- Fechamento de mês ---------- */

function jaFechado(mesAno) {
  return estado.historico.some((h) => h.mesAno === mesAno);
}

function fecharMes(mesAno = mesAnoAtual()) {
  if (jaFechado(mesAno)) return null;

  const { totalReceitas, totalGastos, totalInvestido, saldo } = resumoDoMes(mesAno);
  const categorias = Object.fromEntries(gastosPorCategoria(mesAno));

  const registro = {
    id: gerarId(),
    mesAno,
    totalReceitas,
    totalGastos,
    totalInvestido,
    saldo,
    categorias,
    fechadoEm: new Date().toISOString(),
  };

  estado.historico.push(registro);
  // as transações do mês continuam no extrato — apenas guardamos o resumo/recibo no histórico.
  salvarEstado();
  return registro;
}

/* ---------- Alertas automáticos ---------- */

function gerarAlertas(mesAno = mesAnoAtual()) {
  const alertas = [];
  const { totalReceitas, totalGastos, totalInvestido } = resumoDoMes(mesAno);

  for (const o of orcamentoComProgresso(mesAno)) {
    if (o.pct >= 100) {
      alertas.push({ tipo: "erro", texto: `Orçamento de ${o.categoria} excedido: ${formatarMoeda(o.gasto)} de ${formatarMoeda(o.valor)}.` });
    } else if (o.pct >= 85) {
      alertas.push({ tipo: "atencao", texto: `Você já utilizou ${o.pct}% do orçamento de ${o.categoria}.` });
    }
  }

  for (const c of proximasContas(20)) {
    if (c.dias === 0) alertas.push({ tipo: "conta", texto: `${c.nome} vence hoje.` });
    else if (c.dias === 1) alertas.push({ tipo: "conta", texto: `${c.nome} vence amanhã.` });
  }

  if (totalReceitas > 0 && totalInvestido > 0) {
    const pct = Math.round((totalInvestido / totalReceitas) * 100);
    if (pct > 0) alertas.push({ tipo: "invest", texto: `Você investiu ${pct}% da sua renda este mês.` });
  }

  if (!alertas.some((a) => a.tipo === "erro" || a.tipo === "atencao") && orcamentosDoMes(mesAno).length) {
    alertas.push({ tipo: "ok", texto: "Seus gastos estão dentro do orçamento." });
  }

  return alertas.slice(0, 6);
}

/* ---------- Exportar / importar / limpar ---------- */

function exportarDadosJSON() {
  return JSON.stringify(estado, null, 2);
}

function importarDadosJSON(texto) {
  const dados = JSON.parse(texto);
  const base = estadoPadrao();
  estado = {
    ...base,
    ...dados,
    investConfig: { ...base.investConfig, ...(dados.investConfig || {}) },
  };
  salvarEstado();
}

function limparTodosOsDados() {
  estado = estadoPadrao();
  salvarEstado();
}
