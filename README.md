# Controle-Financeiro
Controle Financeiro — Aplicação web para controle financeiro pessoal, permitindo registrar movimentações, acompanhar contas fixas, organizar orçamentos, definir metas e gerenciar investimentos.

# 📊 Controle-Financeiro

Um aplicativo web de **controle financeiro pessoal** desenvolvido para facilitar o acompanhamento das finanças do dia a dia de forma simples, organizada e visual.

O projeto permite registrar e acompanhar movimentações financeiras, controlar contas fixas, criar orçamentos, estabelecer metas e acompanhar investimentos.

## ✨ Funcionalidades

### 💰 Movimentações

* Registro de receitas e despesas.
* Registro de investimentos.
* Edição de lançamentos existentes.
* Exclusão de movimentações.
* Busca por lançamentos.
* Filtro por tipo.
* Filtro por mês.
* Visualização organizada do histórico financeiro.

O sistema também utiliza eventos delegados para lidar com ações como edição e exclusão dos lançamentos.

### 📅 Contas fixas

* Cadastro de contas recorrentes.
* Definição do valor e dia de vencimento.
* Organização por categoria.
* Ativação e desativação de contas.
* Lançamento automático de contas pendentes.
* Remoção de contas fixas sem apagar lançamentos que já foram registrados.

### 🎯 Orçamentos

* Criação de novos orçamentos.
* Edição de orçamentos.
* Exclusão de orçamentos.
* Organização do planejamento financeiro.

### 🏆 Metas financeiras

* Criação de metas.
* Edição de metas.
* Exclusão de metas.
* Acompanhamento dos objetivos financeiros.

### 📈 Investimentos

* Cadastro de aportes.
* Registro de descrição, valor e data.
* Configuração do patrimônio atual.
* Definição de meta de patrimônio.
* Criação de uma distribuição de investimentos por percentual.
* Remoção de itens da distribuição.

O registro de aportes é armazenado como uma movimentação do tipo `investimento`, utilizando a categoria `Investimento`.

### 🔎 Filtros e organização

A área de movimentações possui:

* Pesquisa por texto;
* Filtro por tipo;
* Filtro por mês;
* Atualização dinâmica da visualização conforme os filtros são utilizados.

### 🧭 Navegação

A aplicação possui uma interface organizada em abas, permitindo alternar entre diferentes áreas do sistema sem recarregar a aplicação. Ao trocar de aba, o conteúdo correspondente é exibido e a interface é atualizada.

## 🛠️ Tecnologias

* HTML
* CSS
* JavaScript
* DOM API
* Eventos JavaScript
* `localStorage`/persistência de estado, conforme as funções de armazenamento utilizadas pelo projeto

## 📂 Organização

O projeto utiliza JavaScript para controlar a interação da interface, formulários, navegação e ações do usuário.

Entre os principais fluxos identificados estão:

* Inicialização da aplicação;
* Navegação entre abas;
* Registro de movimentações;
* Contas fixas;
* Orçamentos;
* Metas;
* Investimentos;
* Distribuição de investimentos;
* Fechamento de mês;
* Edição e exclusão de registros;
* Renderização e atualização da interface.

## 🚀 Objetivo

O objetivo do **Caderno Financeiro** é oferecer uma ferramenta prática para quem deseja visualizar melhor sua vida financeira, registrar suas movimentações e acompanhar seus objetivos em um único ambiente.

## 📌 Status

🚧 Projeto em desenvolvimento.

Novos recursos e melhorias de interface podem ser adicionados conforme a evolução do projeto.

## 👨‍💻 Desenvolvimento

Projeto desenvolvido como uma aplicação web focada em **organização financeira pessoal, usabilidade e acompanhamento visual das finanças**.

