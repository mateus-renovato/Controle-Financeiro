/* ===================================================================
   state.js — porta única de leitura/escrita do estado global (V3)

   Por enquanto o resto do app (acoes.js, modal.js) continua mutando
   o objeto `estado` diretamente e chamando salvarEstado() — isso não
   muda nesta fase, pra não arriscar quebrar nada. O que passa a
   existir aqui:

   - toda persistência (storage.saveState) acontece num único lugar;
   - state.subscribe() permite que outras partes do app "escutem"
     mudanças de estado sem precisar saber quem mudou o quê — base
     para o dashboard reagir sozinho no futuro, em vez de depender de
     renderTudo() sendo chamado manualmente toda vez.
   =================================================================== */

const state = (() => {
  let atual = null;
  const assinantes = new Set();

  function init(estadoInicial) {
    atual = estadoInicial;
    return atual;
  }

  function get() {
    return atual;
  }

  // Sincroniza a referência interna com o objeto `estado` atual
  // (importante quando alguém troca o objeto inteiro, como ao
  // importar um backup ou limpar os dados), salva e avisa assinantes.
  function set(novoEstado) {
    atual = novoEstado;
    persistir();
    notificar();
    return atual;
  }

  function persistir() {
    return storage.saveState(atual);
  }

  function notificar() {
    assinantes.forEach((fn) => {
      try {
        fn(atual);
      } catch (erro) {
        console.error("state: erro em um assinante:", erro);
      }
    });
  }

  function subscribe(fn) {
    assinantes.add(fn);
    return () => assinantes.delete(fn);
  }

  function reset() {
    return set(migration.estadoPadrao());
  }

  return { init, get, set, subscribe, reset };
})();
