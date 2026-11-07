# Painel Pessoal

App pessoal para Windows que organiza o dia: tarefas, metas, água, refeições e histórico.
Feito com **Electron + Vite + React** (JavaScript). Os dados ficam salvos só no seu computador.

## Funcionalidades

- **Hoje**: data, saudação e resumo do dia (tarefas, água, próxima refeição).
- **Tarefas**: adicionar, marcar, editar (duplo clique), apagar, reordenar (arrastar ou setas), recorrentes (todo dia ou dias da semana) e adiar para amanhã. As não feitas passam para o dia seguinte (opção nas Configurações).
- **Metas**: diárias (checkbox ou contador) e de longo prazo com barra de progresso.
- **Água**: meta diária, botões rápidos, valor personalizado, desfazer, copo enchendo e lembrete periódico.
- **Alimentação**: horários configuráveis, notificação no horário, marcar como feita e anotações.
  Calorias: busque o alimento na Tabela TACO (591 alimentos, funciona offline), informe os gramas e o app calcula kcal,
  proteína, carboidrato e gordura. Alimentos de marca podem ser cadastrados com os dados do rótulo. Meta diária de kcal opcional.
  Para atualizar a tabela: baixe os CSVs de [raulfdm/taco-api](https://github.com/raulfdm/taco-api/tree/main/references/csv)
  e rode `node scripts/build-taco.mjs <pasta-dos-csv>`.
- **Treino**: mapa muscular clicável (frente/costas), 876 exercícios com prévia animada (fotos de início/fim
  do movimento), filtros por músculo, equipamento e tipo, e montagem de treinos (séries, repetições, carga e dias).
  68 exercícios têm passo a passo próprio em português; os demais vêm do
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (domínio público), com nome traduzido e
  instruções originais em inglês. Para baixar/atualizar a lista e as fotos: `npm run exercises`.
- **Gravação**: registre os minutos gravados no dia (botões rápidos ou valor digitado) e acompanhe a meta diária e a sequência de dias batendo a meta.
- **Histórico**: dias anteriores e gráficos de 7/30 dias. Tudo zera à meia-noite, mas o histórico fica guardado.
- **Configurações**: tema claro/escuro, água, refeições, notificações, iniciar com o Windows e backup.
- Ao fechar a janela, o app continua na **bandeja do sistema** (perto do relógio). Para sair: clique com o botão direito no ícone → **Sair**.

## Pré-requisitos

- [Node.js LTS](https://nodejs.org) (inclui o npm)
- [Git](https://git-scm.com)

## Como rodar (modo de desenvolvimento)

```bash
npm install      # só na primeira vez (ou quando mudar dependências)
npm run dev      # abre o app com recarregamento automático
```

Para ver só a interface no navegador: `npm run dev:web` e abra http://localhost:5173.

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
  platform.js     Único ponto da interface que fala com o Electron (no navegador usa APIs web)
  store/          Dados, localStorage, virada do dia e resumo para o histórico
  hooks/          Lembretes de água e refeições
  components/     Copo d'água, gráfico, ícones e peças de UI
  pages/          Hoje, Tarefas, Metas, Água, Alimentação, Histórico, Configurações
scripts/          Gerador de ícone e inicializador do Electron em dev
build/icon.ico    Ícone do instalador
```

A interface é React puro, então dá para reaproveitar como web app (PWA) no celular:
basta servir a pasta `dist/` gerada por `npm run build`.
