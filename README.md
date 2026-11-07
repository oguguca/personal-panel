# Painel Pessoal

[![CI](https://github.com/oguguca/personal-panel/actions/workflows/ci.yml/badge.svg)](https://github.com/oguguca/personal-panel/actions/workflows/ci.yml)

App pessoal para Windows que organiza o dia: tarefas, metas, água, refeições e histórico.
Feito com **Electron + Vite + React + TypeScript** (modo `strict`). Os dados ficam salvos só no seu computador.

## Funcionalidades

- **Hoje**: data, saudação e resumo do dia (tarefas, água, próxima refeição).
- **Tarefas**: adicionar, marcar, editar (duplo clique), apagar, reordenar (arrastar ou setas), recorrentes (todo dia ou dias da semana) e adiar para amanhã. As não feitas passam para o dia seguinte (opção nas Configurações).
- **Metas**: diárias (checkbox ou contador) e de longo prazo com barra de progresso.
- **Água** (aba dentro de Alimentação, com atalho rápido na aba Refeições): meta diária, botões rápidos, valor personalizado, desfazer, copo enchendo e lembrete periódico.
- **Alimentação**: horários configuráveis, notificação no horário, marcar como feita e anotações.
  Calorias: busque o alimento na Tabela TACO (591 alimentos, funciona offline), informe os gramas e o app calcula kcal,
  proteína, carboidrato e gordura. Alimentos de marca podem ser cadastrados com os dados do rótulo. Meta diária de kcal opcional.
  Para atualizar a tabela: baixe os CSVs de [raulfdm/taco-api](https://github.com/raulfdm/taco-api/tree/main/references/csv)
  e rode `node scripts/build-taco.mjs <pasta-dos-csv>`.
- **Treino**: mapa muscular clicável (frente/costas), 876 exercícios com prévia animada (fotos de início/fim
  do movimento), filtros por músculo, equipamento e tipo, e montagem de treinos (séries, repetições, carga e dias).
  Todos os nomes e passos a passos estão em português: 68 exercícios com texto próprio e os demais vindos do
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público), traduzidos à mão
  (traduções em `scripts/translations/`). Também há aba de **ciclo e descanso**: sequência de 1 a 7 treinos,
  dias de descanso e previsão que segue o último treino feito. Para baixar/atualizar a lista e as fotos:
  `npm run exercises`.
- **Evolução** (desenvolvimento pessoal em modo jogo): personagem holográfico com 6 atributos (Intelecto, Idiomas,
  Vitalidade, Força, Disciplina, Resistência). Cada tarefa pode ter um atributo (o app sugere pelo título: "ler", "inglês"…).
  Tarefas, água, refeições, metas, renda e treinos dão XP; o personagem sobe de nível, ganha rank (E a S) e brilha mais.
  **Rank por temporada** (cada mês): cada dia é uma partida (vitória/derrota), PR, divisões III → I, combo de sequência e tela de promoção.
  Os ranks têm nomes de marombeiros brasileiros: Toguro (frango), Marombeiro, Balestrin, Jorlan, Cariani, Stronda, Brandão, CBum e Ganley (topo).
  Imagem de cada rank (opcional): coloque em `public/ranks/<nome>.png` (ex.: `ganley.png`, `cbum.png`). Essa pasta não vai para o GitHub.
  Rank da academia (mesmos nomes) usa os treinos feitos e a evolução das cargas.
- **Renda** (antiga Gravação): registre os minutos gravados no dia (botões rápidos ou valor digitado) e acompanhe a meta diária e a sequência de dias batendo a meta.
- **Histórico**: dias anteriores e gráficos de 7/30 dias. Tudo zera à meia-noite, mas o histórico fica guardado.
- **Configurações**: tema claro/escuro, água, refeições, notificações, iniciar com o Windows e backup.
- Ao fechar a janela, o app continua na **bandeja do sistema** (perto do relógio). Para sair: clique com o botão direito no ícone → **Sair**.

Créditos e licenças dos dados e desenhos de terceiros: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Pré-requisitos

- [Node.js LTS](https://nodejs.org) (inclui o npm)
- [Git](https://git-scm.com)

## Como rodar (modo de desenvolvimento)

```bash
npm install      # só na primeira vez (ou quando mudar dependências)
npm run dev      # abre o app com recarregamento automático
```

Para ver só a interface no navegador: `npm run dev:web` e abra http://localhost:5173.

## Qualidade: tipos, testes e CI

```bash
npm run typecheck   # TypeScript em modo strict (tsc --noEmit)
npm test            # testes da lógica com Vitest
npm run test:watch  # testes rodando a cada alteração
```

Os testes ficam ao lado do código (`src/store/*.test.ts`) e cobrem a lógica do app: virada do dia,
tarefas recorrentes e adiadas, busca de alimentos e macros, gasto calórico, ciclo de treino, XP/níveis
da aba Evolução e backup. A cada push, o GitHub Actions (`.github/workflows/ci.yml`) roda tipos, testes e build.

## Como gerar o instalador (.exe)

```bash
npm run dist
```

O instalador fica em `release/Painel Pessoal Setup <versão>.exe`.
Dê dois cliques nele e siga os passos. Ele cria atalho na área de trabalho e no menu Iniciar.
A pasta `release/` **não** vai para o GitHub (está no `.gitignore`).

> Para trocar o ícone: edite `scripts/make-icon.mjs` e rode `npm run icon`.

## Backup dos dados

Os dados ficam no armazenamento local do app (pasta `%APPDATA%\Painel Pessoal`).

- **Exportar**: Configurações → Backup dos dados → **Exportar**. Salva um arquivo `painel-pessoal-backup-AAAA-MM-DD.json`.
- **Importar**: Configurações → Backup dos dados → **Importar** e escolha o arquivo `.json`. Os dados atuais são substituídos.

Dica: o modo de desenvolvimento e o app instalado guardam dados separados. Use exportar/importar para levar os dados de um para o outro.

## Estrutura

```
electron/         Tudo que é específico do Windows (janela, bandeja, notificações, iniciar com o Windows)
  main.js
  preload.js
  icons/
src/
  platform.ts     Único ponto da interface que fala com o Electron (no navegador usa APIs web)
  store/          Dados, localStorage, virada do dia e resumo para o histórico
  hooks/          Lembretes de água e refeições
  components/     Copo d'água, gráfico, ícones e peças de UI
  pages/          Hoje, Tarefas, Metas, Água, Alimentação, Histórico, Configurações
scripts/          Gerador de ícone e inicializador do Electron em dev
build/icon.ico    Ícone do instalador
```

A interface é React puro, então dá para reaproveitar como web app (PWA) no celular:
basta servir a pasta `dist/` gerada por `npm run build`.
