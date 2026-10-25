# Âncora OS — Escopo funcional, critérios de aceite e roadmap

**Versão de referência:** MVP 1.0, outubro/2026. **Público inicial:** um único usuário em Windows e Android; backend opcional em Ubuntu. **Objetivo:** apoiar comportamento e fluxo de trabalho, não realizar diagnóstico ou tratamento de TDAH.

## Problemas a resolver (em ordem informada pelo usuário)

1. Manter foco sem distrações.
2. Memorizar o que estuda e aprende.
3. Organizar e priorizar demandas.
4. Retomar atividades após interrupções.
5. Concluir atividades já iniciadas.

## Histórias de usuário e aceite do MVP

### F01 — Planejamento diário (P0)

**Como usuário,** quero criar tarefas e selecionar até três prioridades para hoje, para reduzir competição entre demandas.

- [x] Criar tarefa com título e próxima ação concreta.
- [x] Selecionar/remover 1 a 3 prioridades do dia.
- [x] Impedir seleção da quarta prioridade.
- [x] Marcar concluída e reabrir.
- [x] Persistir as tarefas e seleções em IndexedDB.

### F02 — Sessão de foco (P0)

**Como usuário,** quero trabalhar em um único item durante um intervalo controlável.

- [x] Selecionar tarefa de foco.
- [x] Iniciar, pausar e reiniciar blocos de 5/15/25 minutos.
- [x] Reconciliar tempo com relógio real ao mudar de aba.
- [x] Contar blocos completos.
- [ ] Alarme confiável com tela bloqueada (fora do MVP, exige estudo Android/nativo).

### F03 — Contexto de retomada (P0)

**Como usuário,** quero registrar a última evidência e o próximo passo antes de uma interrupção.

- [x] Salvar situação da tarefa em texto.
- [x] Salvar o próximo passo.
- [x] Pausar a sessão de foco ao registrar a interrupção.
- [x] Exibir o último registro da tarefa e permitir recuperação do próximo passo.
- [ ] Histórico navegável de registros (fase seguinte).

### F04 — Aprendizado e memória (P0)

**Como usuário,** quero tentar lembrar antes de ver a resposta.

- [x] Criar cartão manual com tema, pergunta e resposta.
- [x] Exibir pergunta e revelar resposta sob demanda.
- [x] Avaliar 'não lembrei', 'com dificuldade', 'lembrei'.
- [x] Reprogramar revisão com heurística explícita.
- [ ] Importar notas autorizadas e gerar cartões assistidos por IA (fase Hermes).
- [ ] Adaptar algoritmo com métricas de retenção e FSRS validado (fase posterior).

### F05 — Captura rápida (P1)

**Como usuário,** quero registrar uma demanda inesperada sem abandonar a tarefa atual.

- [x] Gravar nota sem organização obrigatória.
- [x] Transformar anotação em tarefa ou excluir.

### F06 — Dados e modo offline (P0)

- [x] Salvar localmente usando IndexedDB.
- [x] Disponibilizar arquivos estáticos offline via service worker.
- [x] Exportar/importar backup JSON com versão de esquema.
- [x] Limpeza voluntária dos registros.
- [ ] Sincronização multi-dispositivo (fora do MVP).
- [ ] Criptografia local gerenciada pelo aplicativo (fora do MVP).

## Fora de escopo explícito

Detecção automática de distrações, monitoramento de processos e janelas, leitura de e-mail/Teams, acesso a dados de clientes, sensores de saúde, inferência clínica, modelos preditivos de TDAH, coleta de telemetria pessoal e bots tomando ações em sistemas corporativos.

## Métricas de valor para piloto de 2-3 semanas

Acompanhar somente com consentimento do próprio usuário e preferencialmente em anotações locais:

- **Planejamento:** quantos dias começaram com 1-3 prioridades claras.
- **Execução:** porcentagem de prioridades concluídas, sem transformar isso em obrigação rígida.
- **Retomada:** autoavaliação do tempo para voltar ao trabalho após interrupção (meta inicial: reduzir em relação à linha de base).
- **Memória:** acerto em perguntas novas e revisitadas, sem usar o total de cartões como medida de sucesso.
- **Fricção:** quantas interações são necessárias para registrar e recuperar contexto.
- **Uso sustentável:** perguntar se a aplicação ajuda ou gera culpa/sobrecarga; ajustar conforme resultado.

Evitar métricas invasivas como rastreamento de teclado, captura de tela ou observação de softwares abertos.

## Entregas propostas

| Etapa | Produto | Critério para avançar |
|---|---|---|
| 0: teste local | MVP PWA atual | Fluxos principais funcionam offline; backup/restauração testados |
| 1: piloto | Uso individual em Windows e Android, sem sincronização | Usuário valida rotina e prioriza melhorias |
| 2: backend | FastAPI + SQLite + autenticação + TLS/Tailscale | Testes de API, conflitos e backup/restauração; política de dados definida |
| 3: Hermes controlado | Dois bots: planejador e mentor; tools de leitura, propostas de escrita sujeitas a aprovação | Auditoria, limites de escopo, avaliações e custo |
| 4: recursos avançados | Busca semântica, revisão adaptativa, calendário opt-in, Android nativo quando justificado | Ganho demonstrável superior à complexidade adicional |

## Backlog priorizado após o primeiro piloto

P0: editar tarefas e cartões, histórico completo de retomadas, filtros, sessões feitas por dia, recuperação contra perda de dados.

P1: lembretes opt-in, relatórios semanais não punitivos, atalho global Windows e captura rápida Android, exportação CSV, visualização de revisões futuras.

P2: sincronização criptografada, contas e múltiplos dispositivos, sugestões de planos com IA, importação segura de fontes escolhidas.

## Definição de pronto antes de utilizar dados reais

- Fluxos de criação, execução, interrupção, recuperação e conclusão passam em teste manual em Chrome/Edge e Android Chrome.
- Dados sobrevivem ao fechamento/reabertura e ao modo offline.
- Exportação, restauração e limpeza são comprovadas com dados sintéticos.
- Política de separação de dados pessoais e corporativos está definida.
- Acesso remoto e agentes permanecem desabilitados até revisão de segurança.
