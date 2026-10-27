/* ===================================================================
   migration.js — formato padrão do estado + migração entre versões (V3)
   Regra de ouro: nunca apaga dados antigos e nunca deixa o app quebrar
   por causa de um dado inesperado — na dúvida, cai para o padrão.
   =================================================================== */

const migration = {
  VERSAO_ATUAL: 3,

  estadoPadrao() {
    return {
      versao: this.VERSAO_ATUAL,
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

      // Reservado para as próximas fases (cartão de crédito, parcelas,
      // carteira de investimentos). Já entram na V3 para os módulos
      // futuros não exigirem outra migração de dados.
      cartoes: [],
      parcelamentos: [],
      carteira: [],
    };
  },

  // Checagem propositalmente simples: só confirma que é algo utilizável
  // como estado. Validação fina de cada lançamento fica pra Fase 3.
  validarEstadoBasico(dados) {
    return !!dados && typeof dados === "object";
  },

  migrarV1ParaV2(dadosV1) {
    try {
      const novo = this.estadoPadrao();
      novo.versao = 2;
      novo.transacoes = Array.isArray(dadosV1.transacoes) ? dadosV1.transacoes : [];
      novo.fixos = Array.isArray(dadosV1.fixos) ? dadosV1.fixos : [];
      novo.historico = Array.isArray(dadosV1.historico) ? dadosV1.historico.map((h) => ({ ...h })) : [];
      return novo;
    } catch (erro) {
      console.error("migration: falha ao migrar V1 → V2:", erro);
      return null;
    }
  },

  migrarV2ParaV3(dadosV2) {
    try {
      const base = this.estadoPadrao();
      return {
        ...base,
        ...dadosV2,
        versao: 3,
        investConfig: { ...base.investConfig, ...(dadosV2.investConfig || {}) },
        cartoes: Array.isArray(dadosV2.cartoes) ? dadosV2.cartoes : [],
        parcelamentos: Array.isArray(dadosV2.parcelamentos) ? dadosV2.parcelamentos : [],
        carteira: Array.isArray(dadosV2.carteira) ? dadosV2.carteira : [],
      };
    } catch (erro) {
      console.error("migration: falha ao migrar V2 → V3:", erro);
      return null;
    }
  },

  // Ordem de tentativa: V3 pronto → migra V2 → migra V1 → padrão novo.
  // Cada migração bem-sucedida já é salva como V3, mas o registro de
  // origem (V1/V2 no localStorage) nunca é removido por aqui.
  carregarEstado() {
    try {
      const v3 = storage.getState();
      if (this.validarEstadoBasico(v3)) {
        const base = this.estadoPadrao();
        return {
          ...base,
          ...v3,
          investConfig: { ...base.investConfig, ...(v3.investConfig || {}) },
        };
      }

      const v2 = storage.getStateV2();
      if (this.validarEstadoBasico(v2)) {
        const migrado = this.migrarV2ParaV3(v2);
        if (migrado) {
          storage.saveState(migrado);
          return migrado;
        }
      }

      const v1 = storage.getStateV1();
      if (this.validarEstadoBasico(v1)) {
        const paraV2 = this.migrarV1ParaV2(v1);
        const paraV3 = paraV2 ? this.migrarV2ParaV3(paraV2) : null;
        if (paraV3) {
          storage.saveState(paraV3);
          return paraV3;
        }
      }

      return this.estadoPadrao();
    } catch (erro) {
      console.error("migration: não foi possível carregar os dados salvos, iniciando um caderno novo:", erro);
      return this.estadoPadrao();
    }
  },
};
