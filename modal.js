function abrirModal(innerHTML, { largo = false } = {}) {
  const fundo = document.createElement("div");
  fundo.className = "modal-fundo";
  fundo.innerHTML = `
    <div class="modal-caixa ${largo ? "modal-largo" : ""}" role="dialog" aria-modal="true">
      <button class="modal-fechar" aria-label="Fechar">✕</button>
      ${innerHTML}
    </div>`;
  fundo.addEventListener("click", (ev) => {
    if (ev.target === fundo || ev.target.classList.contains("modal-fechar")) fecharModal(fundo);
  });
  document.addEventListener("keydown", function escFecha(ev) {
    if (ev.key === "Escape") {
      fecharModal(fundo);
      document.removeEventListener("keydown", escFecha);
    }
  });
  document.body.appendChild(fundo);
  return fundo;
}

function fecharModal(fundo) {
  fundo.remove();
}

/* ---------- Registrar ---------- */

function abrirModalRegistro(tipoInicial = null, transacaoEditando = null) {
  const editando = !!transacaoEditando;

  if (!tipoInicial && !editando) {
    const fundo = abrirModal(`
      <h2>O que você quer registrar?</h2>
      <div class="escolha-tipo">
        <button class="escolha-opt" data-escolher="gasto"><span class="escolha-icone">−</span>Gasto</button>
        <button class="escolha-opt" data-escolher="receita"><span class="escolha-icone">+</span>Entrada</button>
        <button class="escolha-opt" data-escolher="investimento"><span class="escolha-icone">↑</span>Investimento</button>
      </div>
    `);
    fundo.querySelectorAll("[data-escolher]").forEach((btn) => {
      btn.addEventListener("click", () => {
        fecharModal(fundo);
        abrirModalRegistro(btn.dataset.escolher, null);
      });
    });
    return;
  }

  const tipo = editando ? transacaoEditando.tipo : tipoInicial;
  const titulo = { gasto: "Registrar gasto", receita: "Registrar entrada", investimento: "Registrar investimento" }[tipo];

  let camposHTML = "";
  if (tipo === "gasto") {
    camposHTML = `
      <div class="campo-grupo"><label for="mDescricao">Descrição</label>
        <input type="text" id="mDescricao" placeholder="ex: almoço, uber, mercado" required></div>
      <div class="campo-linha">
        <div class="campo-grupo"><label for="mValor">Valor (R$)</label>
          <input type="number" id="mValor" inputmode="decimal" step="0.01" min="0.01" required></div>
        <div class="campo-grupo"><label for="mCategoria">Categoria</label>
          <select id="mCategoria"></select></div>
      </div>
      <div class="campo-grupo"><label for="mData">Data</label><input type="date" id="mData" required></div>
      <div class="campo-grupo"><label for="mObs">Observação (opcional)</label><input type="text" id="mObs" placeholder="ex: parcela 2/3"></div>`;
  } else if (tipo === "receita") {
    camposHTML = `
      <div class="campo-grupo"><label for="mDescricao">Descrição</label>
        <input type="text" id="mDescricao" placeholder="ex: salário, freelance" required></div>
      <div class="campo-linha">
        <div class="campo-grupo"><label for="mValor">Valor (R$)</label>
          <input type="number" id="mValor" inputmode="decimal" step="0.01" min="0.01" required></div>
        <div class="campo-grupo"><label for="mCategoria">Origem (opcional)</label>
          <select id="mCategoria"></select></div>
      </div>
      <div class="campo-grupo"><label for="mData">Data</label><input type="date" id="mData" required></div>`;
  } else {
    camposHTML = `
      <div class="campo-grupo"><label for="mDescricao">Ativo / investimento</label>
        <input type="text" id="mDescricao" placeholder="ex: Tesouro Selic, ações, reserva" required></div>
      <div class="campo-linha">
        <div class="campo-grupo"><label for="mValor">Valor (R$)</label>
          <input type="number" id="mValor" inputmode="decimal" step="0.01" min="0.01" required></div>
        <div class="campo-grupo"><label for="mData">Data</label><input type="date" id="mData" required></div>
      </div>`;
  }

  const fundo = abrirModal(`
    <h2>${titulo}</h2>
    <form class="form-lancamento" id="formModalLancamento">
      ${camposHTML}
      <button type="submit" class="btn-primario">${editando ? "Salvar alterações" : "Registrar"}</button>
    </form>
  `);

  if (tipo === "gasto") preencherSelectCategorias(document.getElementById("mCategoria"));
  if (tipo === "receita") preencherSelectCategorias(document.getElementById("mCategoria"), ORIGENS_RECEITA.filter((o) => !CATEGORIAS.includes(o)));

  if (editando) {
    document.getElementById("mDescricao").value = transacaoEditando.descricao;
    document.getElementById("mValor").value = transacaoEditando.valor;
    document.getElementById("mData").value = transacaoEditando.data;
    if (document.getElementById("mObs")) document.getElementById("mObs").value = transacaoEditando.observacao || "";
    if (document.getElementById("mCategoria")) document.getElementById("mCategoria").value = transacaoEditando.categoria || "";
  } else {
    document.getElementById("mData").value = hojeISO();
  }

  document.getElementById("formModalLancamento").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const descricao = document.getElementById("mDescricao").value.trim();
    const valor = parseFloat(document.getElementById("mValor").value);
    const data = document.getElementById("mData").value;
    if (!descricao || !valor || valor <= 0 || !data) return;

    const dados = {
      tipo,
      descricao,
      valor,
      data,
      categoria: tipo === "investimento" ? "Investimento" : (document.getElementById("mCategoria").value || (tipo === "receita" ? "Entrada" : "Outros")),
      observacao: document.getElementById("mObs") ? document.getElementById("mObs").value.trim() : undefined,
    };

    if (editando) {
      editarTransacao(transacaoEditando.id, dados);
    } else {
      estado.transacoes.push({ id: gerarId(), ...dados });
      salvarEstado();
    }
    fecharModal(fundo);
    renderTudo();
  });
}

/* ---------- Orçamento ---------- */

function abrirModalOrcamento(orcamentoEditando = null) {
  const editando = !!orcamentoEditando;
  const fundo = abrirModal(`
    <h2>${editando ? "Editar orçamento" : "Novo orçamento"}</h2>
    <form class="form-lancamento" id="formModalOrcamento">
      <div class="campo-grupo"><label for="oCategoria">Categoria</label><select id="oCategoria"></select></div>
      <div class="campo-grupo"><label for="oValor">Valor mensal (R$)</label><input type="number" id="oValor" step="0.01" min="0.01" required></div>
      <label class="campo-checkbox"><input type="checkbox" id="oRepetir"> Repetir todo mês</label>
      <button type="submit" class="btn-primario">${editando ? "Salvar" : "Criar orçamento"}</button>
    </form>
  `);
  preencherSelectCategorias(document.getElementById("oCategoria"));
  if (editando) {
    document.getElementById("oCategoria").value = orcamentoEditando.categoria;
    document.getElementById("oValor").value = orcamentoEditando.valor;
    document.getElementById("oRepetir").checked = !!orcamentoEditando.repetir;
  } else {
    document.getElementById("oRepetir").checked = true;
  }

  document.getElementById("formModalOrcamento").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const categoria = document.getElementById("oCategoria").value;
    const valor = parseFloat(document.getElementById("oValor").value);
    const repetir = document.getElementById("oRepetir").checked;
    if (!valor || valor <= 0) return;

    if (editando) {
      editarOrcamento(orcamentoEditando.id, { categoria, valor, repetir, mesAno: repetir ? null : mesAnoAtual() });
    } else {
      criarOrcamento({ categoria, valor, repetir });
    }
    fecharModal(fundo);
    renderTudo();
  });
}

/* ---------- Meta financeira ---------- */

function abrirModalMeta(metaEditando = null) {
  const editando = !!metaEditando;
  const fundo = abrirModal(`
    <h2>${editando ? "Editar meta" : "Nova meta"}</h2>
    <form class="form-lancamento" id="formModalMeta">
      <div class="campo-grupo"><label for="gNome">Nome</label><input type="text" id="gNome" placeholder="ex: Reserva de emergência" required></div>
      <div class="campo-linha">
        <div class="campo-grupo"><label for="gAtual">Valor atual (R$)</label><input type="number" id="gAtual" step="0.01" min="0" required></div>
        <div class="campo-grupo"><label for="gObjetivo">Valor objetivo (R$)</label><input type="number" id="gObjetivo" step="0.01" min="0.01" required></div>
      </div>
      <div class="campo-grupo"><label for="gPrazo">Prazo (opcional)</label><input type="date" id="gPrazo"></div>
      <button type="submit" class="btn-primario">${editando ? "Salvar" : "Criar meta"}</button>
    </form>
  `);
  if (editando) {
    document.getElementById("gNome").value = metaEditando.nome;
    document.getElementById("gAtual").value = metaEditando.valorAtual;
    document.getElementById("gObjetivo").value = metaEditando.valorObjetivo;
    document.getElementById("gPrazo").value = metaEditando.prazo || "";
  }

  document.getElementById("formModalMeta").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const nome = document.getElementById("gNome").value.trim();
    const valorAtual = parseFloat(document.getElementById("gAtual").value) || 0;
    const valorObjetivo = parseFloat(document.getElementById("gObjetivo").value);
    const prazo = document.getElementById("gPrazo").value || null;
    if (!nome || !valorObjetivo || valorObjetivo <= 0) return;

    if (editando) {
      editarMeta(metaEditando.id, { nome, valorAtual, valorObjetivo, prazo });
    } else {
      criarMeta({ nome, valorAtual, valorObjetivo, prazo });
    }
    fecharModal(fundo);
    renderTudo();
  });
}

/* ---------- Fechamento de mês ---------- */

function abrirModalFechamento() {
  const mesAno = mesAnoAtual();
  if (jaFechado(mesAno)) return;

  const { totalReceitas, totalGastos, totalInvestido, saldo } = resumoDoMes(mesAno);
  const categorias = gastosPorCategoria(mesAno);

  const fundo = abrirModal(`
    <h2>Fechar ${nomeMesExtenso(mesAno)}?</h2>
    <p class="explicacao">Isso guarda um resumo e um recibo deste mês no histórico. Seus lançamentos continuam disponíveis no extrato — nada é apagado.</p>
    <div class="pre-fechamento">
      <div class="pf-item"><span class="pf-rotulo">Entradas</span><span class="pf-valor">${formatarMoeda(totalReceitas)}</span></div>
      <div class="pf-item"><span class="pf-rotulo">Gastos</span><span class="pf-valor">${formatarMoeda(totalGastos)}</span></div>
      <div class="pf-item"><span class="pf-rotulo">Investido</span><span class="pf-valor">${formatarMoeda(totalInvestido)}</span></div>
      <div class="pf-item"><span class="pf-rotulo">Saldo</span><span class="pf-valor" style="color:${saldo >= 0 ? "var(--verde)" : "var(--vermelho)"}">${formatarMoeda(saldo)}</span></div>
    </div>
    ${categorias.length ? `<h3>Maiores categorias</h3><div class="grafico-categorias">${barraCategoriasHTML(categorias.slice(0, 3))}</div>` : ""}
    <div class="modal-acoes">
      <button class="btn-secundario" id="btnCancelarFechamento">Cancelar</button>
      <button class="btn-primario btn-fechar" id="btnConfirmarFechamento">Fechar mês</button>
    </div>
  `);

  document.getElementById("btnCancelarFechamento").addEventListener("click", () => fecharModal(fundo));
  document.getElementById("btnConfirmarFechamento").addEventListener("click", () => {
    const registro = fecharMes(mesAno);
    fecharModal(fundo);
    if (!registro) return;
    renderTudo();
    abrirModal(htmlDoRecibo(registro));
  });
}

/* ---------- Detalhe do histórico ---------- */

function abrirModalDetalheHistorico(registro) {
  abrirModal(htmlDetalheHistorico(registro), { largo: true });
}

/* ---------- Exportar / importar / limpar dados ---------- */

function abrirModalDados() {
  const fundo = abrirModal(`
    <h2>Seus dados</h2>
    <p class="explicacao">Tudo fica salvo apenas neste navegador. Exporte um backup de vez em quando para não perder nada.</p>
    <div class="modal-acoes-empilhadas">
      <button class="btn-secundario" id="btnExportarDados">Exportar dados (JSON)</button>
      <label class="btn-secundario" style="text-align:center;cursor:pointer;">
        Importar backup (JSON)
        <input type="file" id="inputImportar" accept="application/json" hidden>
      </label>
      <button class="btn-secundario btn-perigo" id="btnLimparDados">Limpar todos os dados</button>
    </div>
  `);

  document.getElementById("btnExportarDados").addEventListener("click", () => {
    const blob = new Blob([exportarDadosJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-financeiro-${hojeISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("inputImportar").addEventListener("change", (ev) => {
    const arquivo = ev.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      if (!confirm("Importar este backup vai substituir os dados atuais deste navegador. Continuar?")) return;
      try {
        importarDadosJSON(leitor.result);
        fecharModal(fundo);
        renderTudo();
        alert("Dados importados com sucesso.");
      } catch (erro) {
        alert("Não foi possível importar este arquivo. Confira se é um backup válido.");
      }
    };
    leitor.readAsText(arquivo);
  });

  document.getElementById("btnLimparDados").addEventListener("click", () => {
    if (!confirm("Isso apaga TODOS os seus lançamentos, contas fixas, orçamentos, metas e histórico deste navegador. Não dá pra desfazer. Continuar?")) return;
    if (!confirm("Tem mesmo certeza? Essa é a última confirmação.")) return;
    limparTodosOsDados();
    fecharModal(fundo);
    renderTudo();
  });
}
