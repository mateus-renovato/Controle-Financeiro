/* ===================================================================
   storage.js — única porta de entrada para o localStorage (V3)
   Nenhum outro arquivo deve chamar localStorage.getItem/setItem
   diretamente — tudo passa por aqui, incluindo export/import.
   =================================================================== */

const CHAVE_V1 = "controleFinanceiro_v1";
const CHAVE_V2 = "controleFinanceiro_v2";
const CHAVE_V3 = "controleFinanceiro_v3";

const storage = {
  CHAVE_V1,
  CHAVE_V2,
  CHAVE_V3,

  lerBruto(chave) {
    try {
      return localStorage.getItem(chave);
    } catch (erro) {
      console.error(`storage: não foi possível ler "${chave}":`, erro);
      return null;
    }
  },

  lerJSON(chave) {
    const bruto = this.lerBruto(chave);
    if (!bruto) return null;
    try {
      return JSON.parse(bruto);
    } catch (erro) {
      console.error(`storage: dado inválido em "${chave}":`, erro);
      return null;
    }
  },

  getState() {
    return this.lerJSON(CHAVE_V3);
  },

  getStateV2() {
    return this.lerJSON(CHAVE_V2);
  },

  getStateV1() {
    return this.lerJSON(CHAVE_V1);
  },

  saveState(estadoAtual) {
    try {
      localStorage.setItem(CHAVE_V3, JSON.stringify(estadoAtual));
      return true;
    } catch (erro) {
      console.error("storage: não foi possível salvar os dados:", erro);
      alert("Não consegui salvar os dados agora. Veja se o navegador não está em modo privado/anônimo.");
      return false;
    }
  },

  // Só apaga o registro ativo (V3), e só quando pedido explicitamente
  // pelo usuário (ex: "Limpar todos os dados"). V1/V2 nunca são
  // apagados automaticamente por aqui.
  clear() {
    try {
      localStorage.removeItem(CHAVE_V3);
      return true;
    } catch (erro) {
      console.error("storage: não foi possível limpar os dados:", erro);
      return false;
    }
  },

  export(estadoAtual) {
    return JSON.stringify(estadoAtual, null, 2);
  },

  // Faz só a validação de formato mínima (é um objeto?). Quem chama
  // decide o que fazer com o conteúdo (ver migration.js).
  import(texto) {
    const dados = JSON.parse(texto);
    if (!dados || typeof dados !== "object") {
      throw new Error("Backup inválido: formato inesperado.");
    }
    return dados;
  },
};
