/* ===================================================================
   dados.js — regras de negócio financeiras (V3)
   Datas, dinheiro e formatação agora moram em utils.js.
   Persistência (localStorage) mora em storage.js.
   Formato padrão e migração de versões moram em migration.js.
   Leitura/escrita do `estado` global passa por state.js.
   Tudo continua salvo apenas no aparelho da pessoa.
   =================================================================== */

let estado = state.init(migration.carregarEstado());

function salvarEstado() {
  // Ressincroniza a referência (cobre tanto mutação em lugar,
  // como estado.fixos.push(...), quanto troca completa do objeto,
  // como em limparTodosOsDados/importarDadosJSON) e persiste.
  state.set(estado);
}

/* ---------- Consultas sobre transações ---------- */

function transacoesDoMes(mesAno = mesAnoAtual()) {
  return estado.transacoes.filter((t) => mesAnoDe(t.data) === mesAno);
}

function transacoesDoDia(dataISO = hojeISO()) {
  return estado.transacoes.filter((t) => t.data === dataISO);
}

function somarPorTipo(transacoes, tipo) {
  const centavos = transacoes
    .filter((t) => t.tipo === tipo)
    .reduce((soma, t) => soma + reaisParaCentavos(t.valor), 0);
  return centavosParaReais(centavos);
}

function resumoDoMes(mesAno = mesAnoAtual()) {
  const docs = transacoesDoMes(mesAno);
  const totalReceitas = somarPorTipo(docs, "receita");
  const totalGastos = somarPorTipo(docs, "gasto");
  const totalInvestido = somarPorTipo(docs, "investimento");
  const saldo = subtrairDinheiro(subtrairDinheiro(totalReceitas, totalGastos), totalInvestido);
  return { totalReceitas, totalGastos, totalInvestido, saldo, docs };
}

function gastosPorCategoria(mesAno = mesAnoAtual()) {
  const docs = transacoesDoMes(mesAno).filter((t) => t.tipo === "gasto");
  const mapaCentavos = {};
  for (const t of docs) {
    mapaCentavos[t.categoria] = (mapaCentavos[t.categoria] || 0) + reaisParaCentavos(t.valor);
  }
  const mapa = Object.fromEntries(
    Object.entries(mapaCentavos).map(([cat, centavos]) => [cat, centavosParaReais(centavos)])
  );
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
  const centavos = estado.fixos
    .filter((f) => f.ativo)
    .reduce((soma, f) => soma + reaisParaCentavos(f.valor), 0);
  return centavosParaReais(centavos);
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
    return { ...o, gasto, pct, restante: subtrairDinheiro(o.valor, gasto) };
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
    if (o.pct >= LIMITES_ORCAMENTO.ESTOURADO) {
      alertas.push({ tipo: "erro", texto: `Orçamento de ${o.categoria} excedido: ${formatarMoeda(o.gasto)} de ${formatarMoeda(o.valor)}.` });
    } else if (o.pct >= LIMITES_ORCAMENTO.ATENCAO) {
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
  return storage.export(estado);
}

function importarDadosJSON(texto) {
  const dados = storage.import(texto);
  const base = migration.estadoPadrao();
  estado = {
    ...base,
    ...dados,
    investConfig: { ...base.investConfig, ...(dados.investConfig || {}) },
  };
  salvarEstado();
}

function limparTodosOsDados() {
  estado = migration.estadoPadrao();
  salvarEstado();
}
