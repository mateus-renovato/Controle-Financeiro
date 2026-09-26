/* ===================================================================
   acoes.js — eventos da interface: navegação, formulários, cliques (V2)
   =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  lancarFixosPendentes();

  preencherSelectCategorias(document.getElementById("fCategoriaFixo"));
  document.getElementById("iData").value = hojeISO();

  configurarCapa();
  configurarAbas();
  configurarFab();
  configurarBotaoDados();
  configurarMovimentacoes();
  configurarFormFixo();
  configurarFormOrcamento();
  configurarFormMeta();
  configurarFormInvestConfig();
  configurarFormDistribuicao();
  configurarFormInvest();
  configurarFechamento();
  configurarCliquesDelegados();

  renderTudo();
});

/* ---------- Capa ---------- */

function configurarCapa() {
  document.getElementById("btnAbrirCaderno").addEventListener("click", () => {
    document.getElementById("capa").remove();
    document.getElementById("app").hidden = false;
  });
}

/* ---------- Navegação entre abas ---------- */

function configurarAbas() {
  const botoes = document.querySelectorAll(".aba");
  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      botoes.forEach((b) => b.removeAttribute("aria-current"));
      botao.setAttribute("aria-current", "page");

      document.querySelectorAll(".pagina").forEach((p) => (p.hidden = true));
      document.getElementById(`pg-${botao.dataset.aba}`).hidden = false;

      renderTudo();
      document.querySelector("main.paginas").scrollTo({ top: 0 });
    });
  });
}

/* ---------- Botão flutuante de registro ---------- */

function configurarFab() {
  document.getElementById("btnRegistrar").addEventListener("click", () => abrirModalRegistro());
}

function configurarBotaoDados() {
  document.getElementById("btnDados").addEventListener("click", () => abrirModalDados());
}

/* ---------- Movimentações: busca, filtros e mês ---------- */

function configurarMovimentacoes() {
  document.getElementById("buscaLancamento").addEventListener("input", (ev) => {
    filtroMovBusca = ev.target.value;
    renderMovimentacoes();
  });

  document.getElementById("filtrosTipo").addEventListener("click", (ev) => {
    const chip = ev.target.closest("[data-filtro]");
    if (!chip) return;
    document.querySelectorAll("#filtrosTipo .chip").forEach((c) => c.classList.remove("ativo"));
    chip.classList.add("ativo");
    filtroMovTipo = chip.dataset.filtro;
    renderMovimentacoes();
  });

  document.getElementById("filtroMes").addEventListener("change", (ev) => {
    filtroMovMes = ev.target.value;
    renderMovimentacoes();
  });
}

/* ---------- Formulário: contas fixas ---------- */

function configurarFormFixo() {
  document.getElementById("formFixo").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = document.getElementById("fNome").value.trim();
    const tipo = document.getElementById("fTipoFixo").value;
    const valor = parseFloat(document.getElementById("fValor").value);
    const dia = parseInt(document.getElementById("fDia").value, 10);
    const categoria = document.getElementById("fCategoriaFixo").value;

    if (!nome || !valor || valor <= 0 || !dia || dia < 1 || dia > 28) return;

    estado.fixos.push({
      id: gerarId(),
      nome,
      tipo,
      categoria,
      valor,
      diaVencimento: dia,
      ativo: true,
      ultimoLancamento: null,
    });
    salvarEstado();
    lancarFixosPendentes();

    ev.target.reset();
    renderTudo();
  });
}

/* ---------- Formulário: orçamento ---------- */

function configurarFormOrcamento() {
  document.getElementById("btnNovoOrcamento").addEventListener("click", () => abrirModalOrcamento());
}

/* ---------- Formulário: metas ---------- */

function configurarFormMeta() {
  document.getElementById("btnNovaMeta").addEventListener("click", () => abrirModalMeta());
}

/* ---------- Investimentos: config patrimônio/meta ---------- */

function configurarFormInvestConfig() {
  document.getElementById("formInvestConfig").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const patrimonio = parseFloat(document.getElementById("iPatrimonio").value) || 0;
    const metaPatrimonio = parseFloat(document.getElementById("iMetaPatrimonio").value) || 0;
    definirInvestConfig({ patrimonio, metaPatrimonio });
    renderInvestimentos();
  });
}

function configurarFormDistribuicao() {
  document.getElementById("formDistribuicao").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = document.getElementById("dNome").value.trim();
    const percentual = parseFloat(document.getElementById("dPercentual").value);
    if (!nome || !percentual || percentual <= 0) return;

    const distribuicao = estado.investConfig.distribuicao || [];
    distribuicao.push({ id: gerarId(), nome, percentual });
    definirInvestConfig({ distribuicao });

    ev.target.reset();
    renderInvestimentos();
  });
}

/* ---------- Formulário: investimentos (aportes) ---------- */

function configurarFormInvest() {
  document.getElementById("formInvest").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const descricao = document.getElementById("iDescricao").value.trim();
    const valor = parseFloat(document.getElementById("iValor").value);
    const data = document.getElementById("iData").value;

    if (!descricao || !valor || valor <= 0 || !data) return;

    estado.transacoes.push({
      id: gerarId(),
      tipo: "investimento",
      categoria: "Investimento",
      descricao,
      valor,
      data,
    });
    salvarEstado();

    ev.target.reset();
    document.getElementById("iData").value = hojeISO();
    renderTudo();
  });
}

/* ---------- Fechamento de mês ---------- */

function configurarFechamento() {
  document.getElementById("btnFecharMes").addEventListener("click", () => abrirModalFechamento());
}

/* ---------- Cliques delegados ---------- */

function configurarCliquesDelegados() {
  document.querySelector("main.paginas").addEventListener("click", (ev) => {
    const btnEditar = ev.target.closest("[data-editar]");
    if (btnEditar) {
      const t = estado.transacoes.find((x) => x.id === btnEditar.dataset.editar);
      if (t) abrirModalRegistro(t.tipo, t);
      return;
    }

    const btnExcluir = ev.target.closest("[data-excluir]");
    if (btnExcluir) {
      if (confirm("Excluir este lançamento?")) {
        excluirTransacao(btnExcluir.dataset.excluir);
        renderTudo();
      }
      return;
    }

    const btnExcluirFixo = ev.target.closest("[data-excluir-fixo]");
    if (btnExcluirFixo) {
      if (confirm("Remover esta conta fixa? Lançamentos já feitos por ela continuam no extrato.")) {
        estado.fixos = estado.fixos.filter((f) => f.id !== btnExcluirFixo.dataset.excluirFixo);
        salvarEstado();
        renderTudo();
      }
      return;
    }

    const btnToggleFixo = ev.target.closest("[data-toggle-fixo]");
    if (btnToggleFixo) {
      const fixo = estado.fixos.find((f) => f.id === btnToggleFixo.dataset.toggleFixo);
      if (fixo) {
        fixo.ativo = !fixo.ativo;
        salvarEstado();
        renderTudo();
      }
      return;
    }

    const btnEditarOrc = ev.target.closest("[data-editar-orcamento]");
    if (btnEditarOrc) {
      const o = estado.orcamentos.find((x) => x.id === btnEditarOrc.dataset.editarOrcamento);
      if (o) abrirModalOrcamento(o);
      return;
    }

    const btnExcluirOrc = ev.target.closest("[data-excluir-orcamento]");
    if (btnExcluirOrc) {
      if (confirm("Excluir este orçamento?")) {
        excluirOrcamento(btnExcluirOrc.dataset.excluirOrcamento);
        renderTudo();
      }
      return;
    }

    const btnEditarMeta = ev.target.closest("[data-editar-meta]");
    if (btnEditarMeta) {
      const m = estado.metas.find((x) => x.id === btnEditarMeta.dataset.editarMeta);
      if (m) abrirModalMeta(m);
      return;
    }

    const btnExcluirMeta = ev.target.closest("[data-excluir-meta]");
    if (btnExcluirMeta) {
      if (confirm("Excluir esta meta?")) {
        excluirMeta(btnExcluirMeta.dataset.excluirMeta);
        renderTudo();
      }
      return;
    }

    const btnExcluirDist = ev.target.closest("[data-excluir-distribuicao]");
    if (btnExcluirDist) {
      const distribuicao = (estado.investConfig.distribuicao || []).filter((d) => d.id !== btnExcluirDist.dataset.excluirDistribuicao);
      definirInvestConfig({ distribuicao });
      renderInvestimentos();
      return;
    }

    const cartaoHist = ev.target.closest("[data-hist-id]");
    if (cartaoHist) {
      const registro = estado.historico.find((h) => h.id === cartaoHist.dataset.histId);
      if (registro) abrirModalDetalheHistorico(registro);
    }
  });
}
