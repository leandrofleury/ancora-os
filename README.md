# Âncora OS — MVP local-first

Aplicativo experimental de apoio ao foco, à organização de tarefas, à retomada de contexto e à revisão de conhecimento. Interface em português do Brasil, responsiva, offline após o primeiro carregamento e instalável como PWA. Não é um dispositivo médico nem uma intervenção clínica.

## O que funciona AGORA

- **Hoje:** criar tarefas, indicar próxima ação, selecionar no máximo 3 prioridades por dia, concluir/reabrir tarefas.
- **Foco:** escolher tarefa, blocos de 5/15/25 minutos, pausar/reiniciar; relógio calcula o tempo transcorrido mesmo após troca de abas.
- **Retomada:** salvar onde parou e qual é o primeiro passo ao voltar; recuperar última anotação por tarefa.
- **Memória:** criar cartões manuais, revelar resposta, avaliar lembrança; revisões programadas por intervalos heurísticos.
- **Captura rápida:** anotar sem classificar, excluir ou transformar uma anotação em tarefa.
- **Dados:** salvamento em IndexedDB, backup JSON, restauração validada e limpeza voluntária.
- **Offline:** service worker armazena os arquivos estáticos após o primeiro acesso online.

## O que NÃO está implementado

- Não há integração com Hermes, LLM, CrowdStrike, Intune, Microsoft Teams ou calendário.
- Não há backend Ubuntu, login ou sincronização entre Windows e Android.
- Não há criptografia própria de dados, push, notificação confiável com a tela bloqueada, cron, monitoramento de aplicativos ou armazenamento na nuvem.
- Flashcards utilizam um algoritmo **heurístico** simplificado, e não FSRS ou outro modelo calibrado.
- O temporizador não emite alarmes em segundo plano; o progresso é reconciliado ao retornar ao app.

## Executar no Windows

Com Python 3 instalado, extraia o ZIP, abra PowerShell no diretório do aplicativo e execute:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Acesse `http://localhost:8000/`. Em Chrome ou Edge, o navegador poderá oferecer a instalação da PWA. Use **localhost**, e não `file://`, porque service workers dependem de contexto seguro.

## Executar no Ubuntu

```bash
cd ancora-os-mvp
python3 -m http.server 8000 --bind 127.0.0.1
```

Acesse `http://localhost:8000/` no navegador do próprio computador, ou publique estaticamente via HTTPS quando for usar outro dispositivo. Não vincule `0.0.0.0` e não exponha o servidor de desenvolvimento à Internet.

## Usar no Android

Para instalar uma PWA a partir de outra máquina, hospede os arquivos estáticos em **HTTPS** (ex.: GitHub Pages). Depois, abra no Chrome ou navegador compatível e use **Adicionar à tela inicial / Instalar aplicativo**. O endereço de rede local com `http://IP:8000` não oferece o contexto seguro exigido pelo service worker. Os dados salvos ficam no navegador **do telefone**, separados dos dados salvos no Windows.

O código HTML/JavaScript pode ser publicado publicamente como PWA estática. Isso **não sincroniza** os registros pessoais do IndexedDB com o GitHub, mas o código é visível. Faça um teste de privacidade e de segurança antes de utilizar no ambiente corporativo.

## Testes

```bash
node --test core.test.mjs
node --check app.mjs
```

Requer Node.js recente para os testes; executar o aplicativo não requer Node/npm nem dependências de frontend.

## Backup e privacidade

Use a página **Dados → Exportar meus dados** regularmente. O JSON exportado contém textos completos de tarefas, cartões e anotações, portanto deve ser guardado em local protegido. A restauração **substitui** todos os dados deste navegador.

**Não registre credenciais, chaves de API, informações pessoais de terceiros nem dados corporativos restritos.** IndexedDB não tem criptografia aplicada pelo app, e o isolamento local do browser não substitui controles corporativos.

## Próximo passo arquitetural

A evolução proposta é um backend privado no Ubuntu 24.04, acessível via Tailscale, com FastAPI + SQLite, autenticação e sincronização controlada. A integração do Hermes ficaria do lado do servidor, via tools de permissões mínimas/MCP. Ela **não está implementada** neste MVP.

Leia `docs/ESCOPO-E-ROADMAP.md` e `docs/ARQUITETURA-E-SEGURANCA.md`.
