function barraCategoriasHTML(categorias) {
  if (!categorias.length) {
    return `<p class="vazio">Nenhum gasto lançado este mês ainda.</p>`;
  }
  const maior = categorias[0][1];
  return categorias
    .map(([cat, valor]) => {
      const pct = maior > 0 ? Math.max(4, Math.round((valor / maior) * 100)) : 0;
      return `
        <div class="barra-cat">
          <span class="barra-cat-nome">${escaparHTML(cat)}</span>
          <span class="barra-cat-trilha"><span class="barra-cat-fill" style="width:${pct}%"></span></span>
          <span class="barra-cat-valor">${formatarMoeda(valor)}</span>
        </div>`;
    })
    .join("");
}

function evolucaoSVG(historicoOrdenado, campo, cor) {
  if (!historicoOrdenado.length) {
    return `<p class="vazio">Feche pelo menos um mês para ver a evolução.</p>`;
  }
  const w = 640, h = 160, pad = 28;
  const valores = historicoOrdenado.map((h) => Number(h[campo]) || 0);
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const amplitude = max - min || 1;
  const passo = valores.length > 1 ? (w - pad * 2) / (valores.length - 1) : 0;

  const pontos = valores.map((v, i) => {
    const x = pad + i * passo;
    const y = h - pad - ((v - min) / amplitude) * (h - pad * 2);
    return [x, y];
  });

  const linha = pontos.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const zeroY = h - pad - ((0 - min) / amplitude) * (h - pad * 2);

  const circulos = pontos
    .map(([x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="${cor}" />
      <text x="${x.toFixed(1)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="var(--tinta-suave)">${escaparHTML(nomeMesCurto(historicoOrdenado[i].mesAno))}</text>`)
    .join("");

  return `
    <svg viewBox="0 0 ${w} ${h}" class="grafico-evolucao" role="img" aria-label="Evolução mensal">
      <line x1="${pad}" y1="${zeroY.toFixed(1)}" x2="${w - pad}" y2="${zeroY.toFixed(1)}" stroke="var(--linha)" stroke-width="1" />
      <path d="${linha}" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      ${circulos}
    </svg>`;
}

function barraProgresso(pct, corTrilha = "var(--papel-sombra)") {
  const largura = Math.max(0, Math.min(100, pct));
  const estourou = pct > 100;
  return `<span class="progresso-trilha" style="background:${corTrilha}">
    <span class="progresso-fill ${estourou ? "estourou" : ""}" style="width:${largura}%"></span>
  </span>`;
}
