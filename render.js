let filtroMovTipo = "todos";
let filtroMovBusca = "";
let filtroMovMes = null; // mês atual

function preencherSelectCategorias(select, extra = []) {
  const opcoes = [...CATEGORIAS, ...extra];
  select.innerHTML = opcoes.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function itemLancamentoHTML(t, { mostrarData = true } = {}) {
  const sinal = t.tipo === "gasto" ? "−" : t.tipo === "investimento" ? "↑" : "+";
  const meta = mostrarData
    ? `${formatarDataCurta(t.data)} · ${t.categoria || (t.tipo === "investimento" ? "Investimento" : "Entrada")}`
    : (t.categoria || (t.tipo === "investimento" ? "Investimento" : "Entrada"));
  return `
    <li data-id="${t.id}">
      <div class="lanc-info">
        <span class="lanc-desc">${escaparHTML(t.descricao)}</span>
        <span class="lanc-meta">${meta}${t.observacao ? ` · ${escaparHTML(t.observacao)}` : ""}</span>
      </div>
      <span class="lanc-valor ${t.tipo}">${sinal} ${formatarMoeda(t.valor)}</span>
      <div class="lanc-acoes">
        <button class="lanc-editar" data-editar="${t.id}" title="Editar" aria-label="Editar lançamento">✎</button>
        <button class="lanc-excluir" data-excluir="${t.id}" title="Excluir" aria-label="Excluir lançamento">✕</button>
      </div>
    </li>`;
}

function listaOuVazio(itens, htmlVazio) {
  return itens.length ? itens.join("") : `<li class="vazio">${htmlVazio}</li>`;
}

/* ==================================================================
  Dashboard
   ================================================================== */

function renderInicio() {
  const mesAno = mesAnoAtual();
  const { totalReceitas, totalGastos, totalInvestido, saldo, docs } = resumoDoMes(mesAno);

  document.getElementById("inicioMesCorrente").textContent = nomeMesExtenso(mesAno).replace(/^\w/, (c) => c.toUpperCase());
  document.getElementById("saldoPrincipalValor").textContent = formatarMoeda(saldo);
  document.getElementById("saldoPrincipalCartao").classList.toggle("negativo", saldo < 0);
  document.getElementById("resReceitas").textContent = formatarMoeda(totalReceitas);
  document.getElementById("resGastos").textContent = formatarMoeda(totalGastos);
  document.getElementById("resInvestido").textContent = formatarMoeda(totalInvestido);

  // indicador do mês
  const pctGasto = totalReceitas > 0 ? Math.round((totalGastos / totalReceitas) * 100) : (totalGastos > 0 ? 100 : 0);
  const pctInvest = totalReceitas > 0 ? Math.round((totalInvestido / totalReceitas) * 100) : 0;
  document.getElementById("indicadorTexto").textContent = totalReceitas > 0
    ? `Você já comprometeu ${pctGasto}% da sua renda deste mês.`
    : `Ainda não há entradas registradas este mês.`;
  document.getElementById("indicadorBarra").innerHTML = barraProgresso(pctGasto);
  document.getElementById("indicadorInvestido").textContent = `${pctInvest}% investido`;
  document.getElementById("indicadorRestante").textContent = `Restam ${formatarMoeda(Math.max(0, saldo))}`;

  // alertas
  const alertas = gerarAlertas(mesAno);
  document.getElementById("listaAlertas").innerHTML = alertas.length
    ? alertas.map((a) => `<li class="alerta alerta-${a.tipo}">${iconeAlerta(a.tipo)} ${escaparHTML(a.texto)}</li>`).join("")
    : `<li class="vazio">Sem avisos por enquanto. Continue registrando seus lançamentos.</li>`;

  // próximas contas
  const proximas = proximasContas(5);
  document.getElementById("proximasContas").innerHTML = listaOuVazio(
    proximas.map((c) => `
      <li>
        <div class="lanc-info">
          <span class="lanc-desc">${escaparHTML(c.nome)}</span>
          <span class="lanc-meta">${rotuloDias(c.dias)}</span>
        </div>
        <span class="lanc-valor gasto">${formatarMoeda(c.valor)}</span>
      </li>`),
    "Nenhuma conta fixa cadastrada ainda."
  );
  document.getElementById("totalPrevistoContas").textContent = `Total previsto: ${formatarMoeda(totalFixosAtivos())}`;

  // categorias
  document.getElementById("graficoCategorias").innerHTML = barraCategoriasHTML(gastosPorCategoria(mesAno));

  // últimos lançamentos
  const ultimos = [...docs]
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0))
    .slice(0, 6)
    .map((t) => itemLancamentoHTML(t));
  document.getElementById("ultimosLancamentos").innerHTML = listaOuVazio(ultimos, "Nada por aqui ainda. Registre seu primeiro lançamento.");
}

function iconeAlerta(tipo) {
  if (tipo === "erro") return "🔴";
  if (tipo === "atencao") return "⚠";
  if (tipo === "conta") return "🔴";
  if (tipo === "invest") return "📈";
  return "✓";
}

function rotuloDias(dias) {
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "amanhã";
  if (dias < 0) return "atrasada";
  return `em ${dias} dias`;
}

/* ==================================================================
   MOVIMENTAÇÕES
   ================================================================== */

function mesesDisponiveis() {
  const meses = new Set(estado.transacoes.map((t) => mesAnoDe(t.data)));
  meses.add(mesAnoAtual());
  return [...meses].sort().reverse();
}

function renderSeletorMes() {
  const sel = document.getElementById("filtroMes");
  const atual = filtroMovMes || mesAnoAtual();
  sel.innerHTML = mesesDisponiveis()
    .map((m) => `<option value="${m}" ${m === atual ? "selected" : ""}>${nomeMesExtenso(m)}</option>`)
    .join("");
}

function renderMovimentacoes() {
  renderSeletorMes();
  const mesAno = filtroMovMes || mesAnoAtual();
  let docs = transacoesDoMes(mesAno);

  if (filtroMovTipo !== "todos") {
    docs = docs.filter((t) => t.tipo === filtroMovTipo);
  }
  if (filtroMovBusca.trim()) {
    const termo = filtroMovBusca.trim().toLowerCase();
    docs = docs.filter((t) =>
      t.descricao.toLowerCase().includes(termo) ||
      (t.categoria || "").toLowerCase().includes(termo)
    );
  }

  docs = docs.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  const grupos = new Map();
  for (const t of docs) {
    if (!grupos.has(t.data)) grupos.set(t.data, []);
    grupos.get(t.data).push(t);
  }

  if (!docs.length) {
    document.getElementById("extratoLista").innerHTML = `<p class="vazio">Nenhum lançamento encontrado.</p>`;
    return;
  }

  const html = [...grupos.entries()]
    .map(([data, itens]) => `
      <div class="extrato-grupo">
        <div class="extrato-data">${formatarDataCompleta(data).replace(/^\w/, (c) => c.toUpperCase())}</div>
        <ul class="lista-lancamentos">${itens.map((t) => itemLancamentoHTML(t, { mostrarData: false })).join("")}</ul>
      </div>`)
    .join("");

  document.getElementById("extratoLista").innerHTML = html;
}

/* ==================================================================
   PLANEJAMENTO 
   ================================================================== */

function rotuloTipoFixo(tipo) {
  if (tipo === "assinatura") return "Assinatura";
  if (tipo === "cartao") return "Cartão";
  return "Conta fixa";
}

function renderFixos() {
  document.getElementById("fixosTotalMes").textContent = `${formatarMoeda(totalFixosAtivos())} / mês em contas ativas`;

  const itens = estado.fixos
    .slice()
    .sort((a, b) => a.diaVencimento - b.diaVencimento)
    .map((f) => `
      <li data-id="${f.id}">
        <div class="lanc-info">
          <span class="lanc-desc">${escaparHTML(f.nome)}</span>
          <span class="lanc-meta">
            <span class="fixo-tag">${rotuloTipoFixo(f.tipo)}</span>
            · vence dia ${f.diaVencimento} · ${escaparHTML(f.categoria)}
          </span>
        </div>
        <span class="lanc-valor gasto">${formatarMoeda(f.valor)}</span>
        <div class="fixo-acoes">
          <button class="fixo-toggle ${f.ativo ? "ativo" : ""}" data-toggle-fixo="${f.id}">
            ${f.ativo ? "Ativa" : "Pausada"}
          </button>
          <button class="lanc-excluir" data-excluir-fixo="${f.id}" title="Remover" aria-label="Remover">✕</button>
        </div>
      </li>`);

  document.getElementById("listaFixos").innerHTML = listaOuVazio(itens, "Nenhuma conta fixa cadastrada.");
}

function renderOrcamentos() {
  const mesAno = mesAnoAtual();
  const itens = orcamentoComProgresso(mesAno).map((o) => {
    let statusHTML = "";
    if (o.pct >= 100) statusHTML = `<span class="orc-status estourou">🔴 Orçamento excedido</span>`;
    else if (o.pct >= 85) statusHTML = `<span class="orc-status atencao">⚠ Próximo do limite</span>`;

    return `
      <li class="orc-item" data-id="${o.id}">
        <div class="orc-cabecalho">
          <span class="orc-nome">${escaparHTML(o.categoria)}</span>
          <span class="orc-valores">${formatarMoeda(o.gasto)} / ${formatarMoeda(o.valor)}</span>
        </div>
        ${barraProgresso(o.pct, "var(--papel-sombra)")}
        <div class="orc-rodape">
          <span>${o.pct}% ${statusHTML}</span>
          <span class="orc-restante">${o.restante >= 0 ? `Restam ${formatarMoeda(o.restante)}` : `Ultrapassou em ${formatarMoeda(Math.abs(o.restante))}`}</span>
        </div>
        <div class="orc-acoes">
          <button class="link-editar" data-editar-orcamento="${o.id}">Editar</button>
          <button class="link-excluir" data-excluir-orcamento="${o.id}">Excluir</button>
        </div>
      </li>`;
  });

  document.getElementById("listaOrcamentos").innerHTML = listaOuVazio(itens, "Nenhum orçamento criado ainda. Defina quanto pretende gastar por categoria.");
}

/* ==================================================================
   INVESTIMENTOS
   ================================================================== */

function renderInvestimentos() {
  const mesAno = mesAnoAtual();
  const { totalInvestido } = resumoDoMes(mesAno);
  const cfg = estado.investConfig;

  document.getElementById("patrimonioValor").textContent = formatarMoeda(cfg.patrimonio);
  document.getElementById("aportesMesValor").textContent = formatarMoeda(totalInvestido);

  const meta = Number(cfg.metaPatrimonio) || 0;
  const pctMeta = meta > 0 ? Math.min(100, Math.round((cfg.patrimonio / meta) * 100)) : 0;
  document.getElementById("metaPatrimonioTexto").textContent = meta > 0
    ? `${formatarMoeda(cfg.patrimonio)} / ${formatarMoeda(meta)}`
    : "Defina uma meta de patrimônio abaixo.";
  document.getElementById("metaPatrimonioBarra").innerHTML = meta > 0 ? barraProgresso(pctMeta) : "";

  document.getElementById("iPatrimonio").value = cfg.patrimonio || "";
  document.getElementById("iMetaPatrimonio").value = cfg.metaPatrimonio || "";

  // distribuição
  const distItens = (cfg.distribuicao || []).map((d) => `
    <li data-id="${d.id}">
      <div class="lanc-info">
        <span class="lanc-desc">${escaparHTML(d.nome)}</span>
      </div>
      <span class="lanc-valor investimento">${d.percentual}%</span>
      <button class="lanc-excluir" data-excluir-distribuicao="${d.id}" title="Remover" aria-label="Remover">✕</button>
    </li>`);
  document.getElementById("listaDistribuicao").innerHTML = listaOuVazio(distItens, "Nenhuma distribuição cadastrada.");

  // aportes deste mês
  const docs = transacoesDoMes(mesAno)
    .filter((t) => t.tipo === "investimento")
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  document.getElementById("listaInvestMes").innerHTML = listaOuVazio(
    docs.map((t) => itemLancamentoHTML(t)),
    "Nenhum aporte este mês."
  );

  // evolução
  const historicoOrdenado = estado.historico.slice().sort((a, b) => (a.mesAno < b.mesAno ? -1 : 1));
  document.getElementById("graficoEvolucaoInvest").innerHTML = evolucaoSVG(historicoOrdenado, "totalInvestido", "var(--dourado)");

  renderMetas();
}

function renderMetas() {
  const itens = estado.metas.map((m) => {
    const pct = m.valorObjetivo > 0 ? Math.min(100, Math.round((m.valorAtual / m.valorObjetivo) * 100)) : 0;
    return `
      <li class="meta-item" data-id="${m.id}">
        <div class="orc-cabecalho">
          <span class="orc-nome">${escaparHTML(m.nome)}</span>
          <span class="orc-valores">${formatarMoeda(m.valorAtual)} / ${formatarMoeda(m.valorObjetivo)}</span>
        </div>
        ${barraProgresso(pct, "var(--papel-sombra)")}
        <div class="orc-rodape">
          <span>${pct}%${m.prazo ? ` · prazo ${formatarDataCurta(m.prazo)}` : ""}</span>
        </div>
        <div class="orc-acoes">
          <button class="link-editar" data-editar-meta="${m.id}">Editar</button>
          <button class="link-excluir" data-excluir-meta="${m.id}">Excluir</button>
        </div>
      </li>`;
  });
  document.getElementById("listaMetas").innerHTML = listaOuVazio(itens, "Nenhuma meta criada ainda.");
}

/* ==================================================================
   HISTÓRICO
   ================================================================== */

function renderHistorico() {
  const mesAno = mesAnoAtual();
  const fechado = jaFechado(mesAno);
  const btn = document.getElementById("btnFecharMes");
  btn.disabled = fechado;
  btn.textContent = fechado ? "Este mês já foi fechado" : `Fechar ${nomeMesExtenso(mesAno)}`;

  const itens = estado.historico
    .slice()
    .sort((a, b) => (a.mesAno < b.mesAno ? 1 : -1))
    .map((h) => `
      <div class="cartao-hist" data-hist-id="${h.id}" tabindex="0" role="button">
        <div class="ch-mes">${nomeMesExtenso(h.mesAno)}</div>
        <div class="ch-saldo ${h.saldo >= 0 ? "positivo" : "negativo"}">${formatarMoeda(h.saldo)}</div>
        <div class="ch-detalhe">${formatarMoeda(h.totalReceitas)} entradas · ${formatarMoeda(h.totalGastos)} gastos · ${formatarMoeda(h.totalInvestido)} investido</div>
      </div>`);

  document.getElementById("gradeHistorico").innerHTML = itens.length
    ? itens.join("")
    : `<p class="vazio">Nenhum mês fechado ainda. Feche o mês atual para começar seu histórico.</p>`;

  renderComparacao();
  renderEvolucaoHistorico();
}

function renderComparacao() {
  const el = document.getElementById("comparacaoMeses");
  const ordenado = estado.historico.slice().sort((a, b) => (a.mesAno < b.mesAno ? 1 : -1));
  if (ordenado.length < 2) {
    el.innerHTML = `<p class="vazio">Feche pelo menos dois meses para ver comparações.</p>`;
    return;
  }
  const [atual, anterior] = ordenado;
  const campos = [
    ["totalReceitas", "Entradas", "verde"],
    ["totalGastos", "Gastos", "vermelho"],
    ["totalInvestido", "Investido", "dourado"],
    ["saldo", "Saldo", null],
  ];
  el.innerHTML = campos.map(([campo, rotulo]) => {
    const diff = atual[campo] - anterior[campo];
    const caiu = diff < 0;
    const frase = Math.abs(diff) < 0.005
      ? `Igual a ${nomeMesExtenso(anterior.mesAno)}.`
      : `Você ${campo === "totalGastos" ? (caiu ? "gastou" : "gastou") : (caiu ? "teve" : "teve")} ${formatarMoeda(Math.abs(diff))} ${caiu ? "a menos" : "a mais"} que em ${nomeMesExtenso(anterior.mesAno)}.`;
    return `
      <div class="comp-item">
        <span class="comp-rotulo">${rotulo}</span>
        <span class="comp-seta ${caiu ? "queda" : "alta"}">${caiu ? "↓" : "↑"}</span>
        <span class="comp-frase">${frase}</span>
      </div>`;
  }).join("");
}

function renderEvolucaoHistorico() {
  const ordenado = estado.historico.slice().sort((a, b) => (a.mesAno < b.mesAno ? -1 : 1));
  document.getElementById("graficoEvolucaoGastos").innerHTML = evolucaoSVG(ordenado, "totalGastos", "var(--vermelho)");
  document.getElementById("graficoEvolucaoSaldo").innerHTML = evolucaoSVG(ordenado, "saldo", "var(--verde)");
}

function gerarTextoAnalise(registro) {
  const { totalReceitas, totalGastos, totalInvestido, saldo, categorias, mesAno } = registro;
  const partes = [];
  const entradasCategorias = Object.entries(categorias).sort((a, b) => b[1] - a[1]);

  if (entradasCategorias.length) {
    const [maiorCat, maiorValor] = entradasCategorias[0];
    const pctMaior = totalGastos > 0 ? Math.round((maiorValor / totalGastos) * 100) : 0;
    partes.push(`A maior parte do dinheiro foi para <strong>${escaparHTML(maiorCat)}</strong>, com ${formatarMoeda(maiorValor)} (${pctMaior}% dos gastos).`);
    if (entradasCategorias.length > 1) {
      partes.push(`Em seguida vem ${escaparHTML(entradasCategorias[1][0])}.`);
    }
  } else {
    partes.push("Não houve gastos registrados neste mês.");
  }

  if (totalInvestido > 0) {
    const pctInvest = totalReceitas > 0 ? Math.round((totalInvestido / totalReceitas) * 100) : 0;
    partes.push(`Foram investidos ${formatarMoeda(totalInvestido)}${totalReceitas > 0 ? `, cerca de ${pctInvest}% do que entrou` : ""}.`);
  } else {
    partes.push("Nenhum valor foi investido neste mês.");
  }

  if (saldo >= 0) {
    partes.push(`O mês fechou no azul: sobraram ${formatarMoeda(saldo)} depois dos gastos e investimentos.`);
  } else {
    partes.push(`O mês fechou no vermelho: faltaram ${formatarMoeda(Math.abs(saldo))} para cobrir tudo o que saiu.`);
  }

  const mesAnt = mesAnterior(mesAno);
  const registroAnterior = estado.historico.find((h) => h.mesAno === mesAnt);
  if (registroAnterior) {
    const diferenca = totalGastos - registroAnterior.totalGastos;
    if (Math.abs(diferenca) > 0.005) {
      partes.push(
        diferenca > 0
          ? `Os gastos subiram ${formatarMoeda(diferenca)} em relação a ${nomeMesExtenso(mesAnt)}.`
          : `Os gastos caíram ${formatarMoeda(Math.abs(diferenca))} em relação a ${nomeMesExtenso(mesAnt)}.`
      );
    }
  }

  return partes.join(" ");
}

function htmlDoRecibo(registro) {
  const positivo = registro.saldo >= 0;
  const categorias = Object.entries(registro.categorias).sort((a, b) => b[1] - a[1]);

  return `
    <div class="recibo">
      <div class="recibo-cabecalho">
        <p class="recibo-titulo">Fechamento do mês</p>
        <p class="recibo-periodo">${nomeMesExtenso(registro.mesAno)}</p>
      </div>

      <div class="recibo-linha"><span>Entradas</span><span>${formatarMoeda(registro.totalReceitas)}</span></div>
      <div class="recibo-linha"><span>Gastos</span><span>${formatarMoeda(registro.totalGastos)}</span></div>
      <div class="recibo-linha"><span>Investido</span><span>${formatarMoeda(registro.totalInvestido)}</span></div>
      <div class="recibo-linha total"><span>Saldo</span><span>${formatarMoeda(registro.saldo)}</span></div>

      ${categorias.length ? `
        <div style="margin-top:0.9rem;">
          ${categorias.slice(0, 5).map(([cat, valor]) => `
            <div class="recibo-linha"><span>${escaparHTML(cat)}</span><span>${formatarMoeda(valor)}</span></div>
          `).join("")}
        </div>
      ` : ""}

      <div class="recibo-selo ${positivo ? "" : "negativo"}">
        ${positivo ? "Mês no azul" : "Mês no vermelho"}
      </div>

      <p class="recibo-analise">${gerarTextoAnalise(registro)}</p>
      <p class="recibo-rodape">fechado em ${new Date(registro.fechadoEm).toLocaleDateString("pt-BR")}</p>
    </div>`;
}

function htmlDetalheHistorico(registro) {
  const docsDoMes = transacoesDoMes(registro.mesAno).sort((a, b) => (a.data < b.data ? 1 : -1));
  return `
    <div class="detalhe-hist">
      <h2>${nomeMesExtenso(registro.mesAno).replace(/^\w/, (c) => c.toUpperCase())}</h2>
      <div class="cartoes-resumo cartoes-resumo-mini">
        <div class="cartao-resumo" data-tipo="receita"><span class="cr-rotulo">Entradas</span><span class="cr-valor">${formatarMoeda(registro.totalReceitas)}</span></div>
        <div class="cartao-resumo" data-tipo="gasto"><span class="cr-rotulo">Gastos</span><span class="cr-valor">${formatarMoeda(registro.totalGastos)}</span></div>
        <div class="cartao-resumo" data-tipo="investimento"><span class="cr-rotulo">Investido</span><span class="cr-valor">${formatarMoeda(registro.totalInvestido)}</span></div>
        <div class="cartao-resumo cartao-saldo ${registro.saldo < 0 ? "negativo" : "positivo"}"><span class="cr-rotulo">Saldo</span><span class="cr-valor">${formatarMoeda(registro.saldo)}</span></div>
      </div>
      <h3>Para onde foi o dinheiro</h3>
      <div class="grafico-categorias">${barraCategoriasHTML(Object.entries(registro.categorias).sort((a, b) => b[1] - a[1]))}</div>
      <h3>Extrato completo</h3>
      <ul class="lista-lancamentos">${listaOuVazio(docsDoMes.map((t) => itemLancamentoHTML(t)), "Sem lançamentos guardados para este mês.")}</ul>
      <h3>Recibo</h3>
      ${htmlDoRecibo(registro)}
    </div>`;
}


function renderTudo() {
  renderInicio();
  renderMovimentacoes();
  renderFixos();
  renderOrcamentos();
  renderInvestimentos();
  renderHistorico();

  document.getElementById("dataAtualHeader").textContent = formatarDataCompleta(hojeISO())
    .replace(/^\w/, (c) => c.toUpperCase());
}
