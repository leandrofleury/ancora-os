import {SCHEMA_VERSION, initialState, localDateKey, createRecord, selectTopThree, dueCards, reviewCard, timerRemaining, validateImport} from './core.mjs';
import {loadState, saveState} from './db.mjs';

let state = initialState();
let page = 'hoje';
let revealed = false;
let saveQueue = Promise.resolve();
let toastTimeout;
const app = document.querySelector('#app');
const toastEl = document.querySelector('#toast');
const sanitize = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortDate = timestamp => new Date(timestamp).toLocaleDateString('pt-BR', {day:'2-digit',month:'short'});
const clock = seconds => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const activeTasks = () => state.tasks.filter(t => !t.done);
const getFocusTask = () => state.tasks.find(t => t.id === state.focusTaskId && !t.done);
const todaysSelection = () => (state.topThree[localDateKey()] || []).filter(id=>activeTasks().some(t=>t.id===id));
const todaysTasks = () => todaysSelection().map(id => state.tasks.find(t => t.id === id)).filter(Boolean);
const latestSnapshot = id => state.snapshots.filter(s => s.taskId === id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];

function notify(message) {
  toastEl.textContent = message;
  toastEl.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=>toastEl.classList.remove('visible'), 3200);
}
function persist() {
  const snapshot = structuredClone(state);
  saveQueue = saveQueue.catch(()=>{}).then(()=>saveState(snapshot));
  saveQueue.catch(()=>notify('Não foi possível salvar. Exporte um backup e verifique o armazenamento.'));
}
function nav(next) {page = next; revealed = false; render(); window.scrollTo({top:0, behavior:'instant'});}
function frame(eyebrow, title, subtitle, content) {
  return `<section class="head"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></section>${content}<div class="footnote">Âncora OS · MVP local-first · Sem telemetria ou conexão com serviços externos</div>`;
}
function taskMarkup(task, showPriority=true) {
  const selected = todaysSelection().includes(task.id);
  return `<article class="task">
    <div class="content"><div class="task-title">${sanitize(task.title)}</div>
    <div class="task-step">${task.nextStep ? `Próxima ação: ${sanitize(task.nextStep)}` : 'Ainda sem próxima ação definida'}</div></div>
    <div class="task-actions">
      ${showPriority ? `<button class="icon-button ${selected?'active':''}" data-action="priority" data-id="${sanitize(task.id)}" aria-label="${selected?'Retirar das':'Adicionar às'} prioridades" title="${selected?'Retirar das':'Adicionar às'} prioridades">${selected?'★':'☆'}</button>` : ''}
      <button class="icon-button" data-action="focus-task" data-id="${sanitize(task.id)}" title="Focar nesta tarefa">Focar</button>
      <button class="icon-button" data-action="done" data-id="${sanitize(task.id)}" title="Concluir tarefa">Concluir</button>
    </div></article>`;
}
function todayPage() {
  const selection = todaysTasks();
  const dueCount = dueCards(state.cards).length;
  const completedToday = state.tasks.filter(t=>t.done && t.completedAt && localDateKey(new Date(t.completedAt))===localDateKey()).length;
  const available = activeTasks();
  return frame('Seu painel de hoje', 'Menos ruído. Mais clareza.', 'Escolha até três resultados importantes. O objetivo é avançar, não preencher uma lista infinita.', `
    <div class="overview">
      <div class="stat"><strong>${selection.length}<span class="small-number">/3</span></strong><span>Prioridades escolhidas</span></div>
      <div class="stat"><strong>${completedToday}</strong><span>Concluídas hoje</span></div>
      <div class="stat"><strong>${dueCount}</strong><span>Revisões pendentes</span></div>
    </div>
    <div class="columns">
      <div class="stack">
        <section class="panel"><div class="panel-header"><h2>As três de hoje</h2><span class="pill">${selection.length}/3 selecionadas</span></div>
          ${selection.length ? `<div class="tasks">${selection.map(t=>taskMarkup(t)).join('')}</div>` : '<div class="empty">Selecione tarefas da lista abaixo usando a estrela ☆.</div>'}
        </section>
        <section class="panel"><div class="panel-header"><h2>Minhas demandas</h2><span class="pill gray">${available.length} abertas</span></div>
          ${available.length ? `<div class="tasks">${available.map(t=>taskMarkup(t)).join('')}</div>` : '<div class="empty">Nenhuma tarefa pendente. Registre uma tarefa para começar.</div>'}
        </section>
        ${state.tasks.some(t=>t.done) ? `<section class="panel"><div class="panel-header"><h2>Concluídas recentemente</h2></div><div class="tasks">${state.tasks.filter(t=>t.done).slice(-4).reverse().map(t=>`<div class="task"><span class="highlight">✓</span><div class="content"><div class="task-title">${sanitize(t.title)}</div></div><button class="icon-button" data-action="reopen" data-id="${sanitize(t.id)}">Reabrir</button></div>`).join('')}</div></section>` : ''}
      </div>
      <div class="stack">
        <section class="panel"><h2>Registrar uma tarefa</h2><div class="separator"></div>
          <form class="form" id="new-task-form"><div><label class="label" for="task-title">O que precisa ser feito?</label><input class="field" name="title" id="task-title" maxlength="160" placeholder="Ex.: concluir relatório de análise" required /></div>
          <div><label class="label" for="task-step">Qual é a próxima ação física?</label><input class="field" name="nextStep" id="task-step" maxlength="250" placeholder="Ex.: abrir o relatório e revisar a seção 1" /></div>
          <button class="btn full" type="submit">Adicionar demanda</button></form></section>
        <section class="panel"><h2>Uma sugestão de rotina</h2><div class="separator"></div>
          <p class="muted">1. Escolha três prioridades.<br/>2. Selecione apenas uma para iniciar.<br/>3. Registre onde parou ao ser interrompido.<br/>4. Conclua ou descreva o próximo passo.</p>
          <button class="btn secondary full" data-action="navigate" data-target="foco" class="mt14">Ir para o foco</button></section>
      </div>
    </div>`);
}
function focusPage() {
  const task = getFocusTask();
  const f = state.focus;
  const snapshot = task ? latestSnapshot(task.id) : null;
  return frame('Trabalho em andamento','Uma tarefa por vez.','Comece pequeno. Ao interromper, registre o ponto exato para voltar sem reconstruir todo o raciocínio.', `
    <div class="columns"><div class="stack">
      <section class="panel"><div class="panel-header"><h2>Sessão de foco</h2><span class="pill">Sem notificações automáticas</span></div>
        <label class="label" for="focus-select">Tarefa atual</label><select id="focus-select" class="field">
          <option value="">Escolha uma tarefa</option>${activeTasks().map(t=>`<option value="${sanitize(t.id)}" ${task?.id===t.id?'selected':''}>${sanitize(t.title)}</option>`).join('')}
        </select>
        ${task ? `<div class="context-note" class="mt15"><strong>Próxima ação</strong><p>${sanitize(task.nextStep || 'Defina um pequeno primeiro passo para começar.')}</p></div>` : '<p class="muted small" class="mt14">Registre uma demanda em Hoje se a lista estiver vazia.</p>'}
        <div id="timer-display" class="timer-display" role="timer" aria-label="Tempo restante">${clock(timerRemaining(f))}</div>
        <div class="timer-options">${[300,900,1500].map(n=>`<button class="seg ${f.durationSec===n?'active':''}" data-action="duration" data-seconds="${n}" ${f.running?'disabled':''}>${n/60} min</button>`).join('')}</div>
        <div class="timer-actions" class="mt20">
          <button class="btn" data-action="timer-toggle" ${!task?'disabled':''}>${f.running?'Pausar':'Iniciar foco'}</button>
          <button class="btn ghost" data-action="timer-reset">Reiniciar</button>
        </div><p class="muted small" class="center mt13">O tempo é calculado pelo relógio mesmo ao trocar de janela. Alertas com a tela bloqueada não estão disponíveis neste MVP.</p>
      </section>
      <section class="panel"><div class="panel-header"><h2>Interrupção sem perda de contexto</h2></div>
        <form class="form" id="snapshot-form">
          <div><label for="snapshot-where" class="label">Onde você parou?</label><textarea id="snapshot-where" class="field" name="where" maxlength="1600" placeholder="Ex.: analisei os três primeiros ativos; ainda não validei evidências do quarto" required></textarea></div>
          <div><label for="snapshot-next" class="label">Qual é o primeiro passo para retomar?</label><input id="snapshot-next" class="field" name="next" maxlength="250" placeholder="Ex.: verificar hostname e exposição do ativo 4" required /></div>
          <button type="submit" class="btn secondary full" ${!task?'disabled':''}>Salvar contexto e interromper</button>
        </form>
      </section>
    </div><div class="stack">
      <section class="panel"><div class="panel-header"><h2>Voltar de onde parou</h2></div>
      ${snapshot ? `<div class="context-note"><span class="small muted">Registro de ${shortDate(snapshot.createdAt)}</span><strong>Última situação</strong><p>${sanitize(snapshot.where)}</p><strong>Próxima ação</strong><p>${sanitize(snapshot.next)}</p></div>
      <button class="btn secondary full" data-action="resume-context" class="mt12">Usar o próximo passo registrado</button>` : '<div class="empty">Quando registrar uma interrupção, o resumo de retomada aparecerá aqui.</div>'}
      </section>
      <section class="panel"><h2>Finalizar é parte do trabalho</h2><div class="separator"></div><p class="muted">Se terminou, marque a tarefa como concluída. Se não terminou, registre o próximo passo e encerre sem perder o contexto.</p>
        <button class="btn ghost full" data-action="complete-focused" class="mt14" ${!task?'disabled':''}>Marcar tarefa como concluída</button></section>
      <section class="panel"><span class="eyebrow">Progresso acumulado</span><div class="timer-display" class="count-large">${f.completed}</div><p class="muted small">Blocos de foco completados neste navegador.</p></section>
    </div></div>`);
}
function memoryPage() {
  const cards = dueCards(state.cards);
  const card = cards[0];
  return frame('Aprendizagem ativa', 'Lembre antes de reler.', 'Responda mentalmente, revele a resposta e avalie como foi. O sistema programa a próxima revisão.', `
    <div class="overview"><div class="stat"><strong>${state.cards.length}</strong><span>Cartões criados</span></div><div class="stat"><strong>${cards.length}</strong><span>Para revisar</span></div><div class="stat"><strong>${state.cards.reduce((n,c)=>n+(c.reviews||0),0)}</strong><span>Revisões realizadas</span></div></div>
    <div class="columns"><div class="stack">
      <section class="panel"><div class="panel-header"><h2>Revisão atual</h2>${card?`<span class="pill">${sanitize(card.topic||'Geral')}</span>`:''}</div>
      ${card ? `<div class="card-question">${sanitize(card.question)}</div>
         ${revealed ? `<div class="card-answer">${sanitize(card.answer)}</div><div class="grade-buttons"><button class="btn danger" data-action="grade" data-grade="again">Não lembrei</button><button class="btn secondary" data-action="grade" data-grade="hard">Com dificuldade</button><button class="btn" data-action="grade" data-grade="good">Lembrei</button></div>` : `<button class="btn" data-action="reveal">Revelar resposta</button>`}`
        : '<div class="empty">Você está em dia. Crie um cartão abaixo ou volte quando houver revisões programadas.</div>'}
      </section>
      <section class="panel"><div class="panel-header"><h2>Meus cartões</h2><span class="pill gray">${state.cards.length} no total</span></div>
      ${state.cards.length ? `<div class="tasks">${state.cards.slice(-12).reverse().map(c=>`<div class="task"><div class="content"><div class="task-title">${sanitize(c.question)}</div><div class="task-step">${sanitize(c.topic||'Geral')} · Próxima revisão: ${shortDate(c.dueAt)}</div></div><button class="icon-button" data-action="delete-card" data-id="${sanitize(c.id)}">Excluir</button></div>`).join('')}</div>` : '<div class="empty">Nenhum cartão cadastrado.</div>'}
      </section>
    </div><div class="stack"><section class="panel"><h2>Novo cartão de memória</h2><div class="separator"></div>
      <form class="form" id="card-form"><div><label class="label" for="card-topic">Tema</label><input id="card-topic" name="topic" maxlength="80" class="field" placeholder="Ex.: CVSS / EPSS" /></div>
        <div><label class="label" for="card-question">Pergunta</label><textarea id="card-question" name="question" maxlength="800" class="field" placeholder="Quando o EPSS deve influenciar a priorização?" required></textarea></div>
        <div><label class="label" for="card-answer">Resposta esperada</label><textarea id="card-answer" name="answer" maxlength="1600" class="field" placeholder="Escreva a explicação em suas próprias palavras." required></textarea></div>
        <button type="submit" class="btn full">Criar cartão</button>
      </form></section>
      <section class="info-box"><strong>Como funcionam as revisões?</strong><p>Não lembrei: amanhã. Com dificuldade: em 2 dias. Lembrei: intervalos progressivos de 1, 3, 7, 14, 30 e 60 dias. É uma heurística inicial, ajustável em versões futuras.</p></section>
    </div></div>`);
}
function capturePage() {
  return frame('Entrada sem distrações','Tire da cabeça. Continue depois.','Registre ideias e pendências rapidamente. Você pode transformá-las em tarefas quando estiver pronto.', `
  <div class="columns"><div class="stack"><section class="panel"><div class="panel-header"><h2>Caixa de entrada</h2><span class="pill gray">${state.inbox.length} registros</span></div>
  ${state.inbox.length ? state.inbox.slice().reverse().map(n=>`<div class="capture-item"><p>${sanitize(n.text)}<br/><span class="small muted">${shortDate(n.createdAt)}</span></p><div class="inline-actions"><button class="icon-button" data-action="inbox-to-task" data-id="${sanitize(n.id)}">Criar tarefa</button><button class="icon-button" data-action="delete-note" data-id="${sanitize(n.id)}">Excluir</button></div></div>`).join('') : '<div class="empty">Seu espaço está livre. Registre algo quando precisar.</div>'}
  </section></div><div class="stack"><section class="panel"><h2>Captura rápida</h2><div class="separator"></div><form class="form" id="inbox-form"><label class="label" for="inbox-text">O que não quer esquecer?</label><textarea class="field" name="text" maxlength="1200" id="inbox-text" placeholder="Anote aqui sem precisar organizar agora..." required></textarea><button class="btn full" type="submit">Guardar anotação</button></form></section>
  <section class="info-box"><strong>Regra simples</strong><p>Capturar é diferente de executar. Guarde a ideia, volte para sua tarefa e processe a caixa de entrada em um momento escolhido.</p></section></div></div>`);
}
function dataPage() {
  return frame('Privacidade e continuidade','Seus dados, suas regras.','Nesta versão, tudo fica somente no armazenamento do navegador. Os dados não são sincronizados com outros dispositivos.', `
  <div class="columns"><div class="stack"><section class="panel"><h2>Backup manual</h2><div class="separator"></div><p class="muted">Exporte seus registros para JSON. Guarde o arquivo em local protegido, pois ele conterá tudo que você digitou.</p>
  <button class="btn secondary" data-action="export" class="mt14">Exportar meus dados</button>
  <div class="separator"></div><label class="label" for="import-file">Restaurar backup (substitui os dados atuais)</label><input class="field" type="file" id="import-file" accept=".json,application/json" /></section>
  <section class="panel"><h2>Limpar este dispositivo</h2><div class="separator"></div><p class="muted">Exclui as tarefas, sessões, cartões e anotações deste navegador. Faça um backup antes, se desejar.</p>
  <button class="btn danger" data-action="reset" class="mt14">Apagar todos os dados</button></section></div>
  <div class="stack"><section class="info-box"><strong>O que este MVP faz</strong><p>Funciona offline depois do primeiro acesso, salva dados em IndexedDB e não utiliza servidores externos, rastreamento ou IA.</p></section>
  <section class="info-box"><strong>Limitações importantes</strong><p>O armazenamento não tem criptografia própria, nem sincronização entre Windows e Android. Limpar dados do navegador pode apagar seus registros. Não insira segredos, credenciais ou informações corporativas restritas.</p></section>
  <section class="info-box"><strong>Próximas versões</strong><p>Sincronização autenticada via Tailscale e backend Ubuntu; agentes Hermes com acesso mínimo; notificações confiáveis por componente nativo quando necessário.</p></section></div></div>`);
}
function render() {
  const pages = {hoje:todayPage,foco:focusPage,memoria:memoryPage,captura:capturePage,dados:dataPage};
  app.innerHTML = (pages[page] || pages.hoje)();
  document.querySelectorAll('[data-page]').forEach(btn=>{
    btn.classList.toggle('selected',btn.dataset.page===page);
    if(btn.dataset.page===page) btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
  });
}
function focusPause() {
  if(state.focus.running) {
    state.focus.remainingSec = timerRemaining(state.focus);
    state.focus.running = false;
    state.focus.deadline = null;
  }
}
function focusCompleteIfNeeded() {
  if(state.focus.running && timerRemaining(state.focus)===0) {
    state.focus.running = false;
    state.focus.deadline = null;
    state.focus.remainingSec = state.focus.durationSec;
    state.focus.completed++;
    persist();
    notify('Bloco de foco concluído. Registre seu próximo passo ou finalize a tarefa.');
    render();
  }
}
function markDone(id) {
  const task=state.tasks.find(t=>t.id===id);
  if(!task) return;
  task.done=true;
  task.completedAt=new Date().toISOString();
  if(state.focusTaskId===id) {focusPause();state.focusTaskId=null;}
  for(const ids of Object.values(state.topThree)){const idx=ids.indexOf(id);if(idx>=0) ids.splice(idx,1);}
  persist();render();notify('Tarefa concluída.');
}
function handleAction(button) {
  const {action,id} = button.dataset;
  if(action==='navigate') return nav(button.dataset.target);
  if(action==='priority') {
    const result=selectTopThree(state,id);
    if(!result.ok) return notify(result.reason);
    state.topThree[localDateKey()]=result.selected;
    persist();return render();
  }
  if(action==='focus-task') {if(state.focusTaskId!==id) focusPause();state.focusTaskId=id; persist();return nav('foco');}
  if(action==='done') return markDone(id);
  if(action==='complete-focused' && getFocusTask()) return markDone(state.focusTaskId);
  if(action==='reopen') {const t=state.tasks.find(t=>t.id===id);if(t){t.done=false;t.completedAt=null;persist();render();}}
  if(action==='duration') {
    if(state.focus.running) return;
    state.focus.durationSec=Number(button.dataset.seconds);
    state.focus.remainingSec=state.focus.durationSec;
    persist();return render();
  }
  if(action==='timer-toggle') {
    if(!getFocusTask()) return notify('Selecione primeiro uma tarefa.');
    if(state.focus.running) focusPause();
    else {
      if(state.focus.remainingSec<=0)state.focus.remainingSec=state.focus.durationSec;
      state.focus.deadline=Date.now()+state.focus.remainingSec*1000;
      state.focus.running=true;
    }
    persist();return render();
  }
  if(action==='timer-reset'){state.focus.running=false;state.focus.deadline=null;state.focus.remainingSec=state.focus.durationSec;persist();return render();}
  if(action==='resume-context') {
    const snapshot=latestSnapshot(state.focusTaskId);
    const task=getFocusTask();
    if(snapshot&&task){task.nextStep=snapshot.next;persist();render();notify('Próximo passo recuperado. Você pode reiniciar seu foco.');}
  }
  if(action==='reveal'){revealed=true;return render();}
  if(action==='grade') {
    const card=dueCards(state.cards)[0];
    if(!card||!revealed) return;
    const idx=state.cards.findIndex(c=>c.id===card.id);
    state.cards[idx]=reviewCard(card,button.dataset.grade);
    revealed=false;persist();return render();
  }
  if(action==='delete-card') {if(confirm('Excluir este cartão de memória?')){state.cards=state.cards.filter(c=>c.id!==id);persist();render();}}
  if(action==='delete-note') {state.inbox=state.inbox.filter(n=>n.id!==id);persist();render();}
  if(action==='inbox-to-task') {
    const note=state.inbox.find(n=>n.id===id);
    if(note){state.tasks.unshift(createRecord('task',{title:note.text.slice(0,160),nextStep:''}));state.inbox=state.inbox.filter(n=>n.id!==id);persist();nav('hoje');notify('Registro transformado em tarefa.');}
  }
  if(action==='export') {
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`ancora-os-backup-${localDateKey()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('Backup preparado. Mantenha o arquivo protegido.');
  }
  if(action==='reset' && confirm('Tem certeza? Todos os dados deste navegador serão apagados. Essa ação não pode ser desfeita.')) {
    state=initialState();persist();nav('hoje');notify('Dados locais apagados.');
  }
}

document.addEventListener('click',event=>{
  const navButton=event.target.closest('[data-page]');
  if(navButton) return nav(navButton.dataset.page);
  const actionButton=event.target.closest('[data-action]');
  if(actionButton) handleAction(actionButton);
});
app.addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target;
  const fields=new FormData(form);
  if(form.id==='new-task-form') {
    const title=String(fields.get('title')||'').trim();if(!title)return;
    state.tasks.unshift(createRecord('task',{title,nextStep:fields.get('nextStep')}));persist();render();notify('Demanda adicionada.');
  }
  if(form.id==='card-form') {
    const question=String(fields.get('question')||'').trim(),answer=String(fields.get('answer')||'').trim();
    if(!question||!answer)return;
    state.cards.push(createRecord('card',{question,answer,topic:fields.get('topic')}));persist();render();notify('Cartão criado. Faça uma revisão agora.');
  }
  if(form.id==='inbox-form') {
    const text=String(fields.get('text')||'').trim();if(!text)return;
    state.inbox.push(createRecord('inbox',{text}));persist();render();notify('Anotação salva.');
  }
  if(form.id==='snapshot-form') {
    const task=getFocusTask();if(!task)return;
    const where=String(fields.get('where')||'').trim(),next=String(fields.get('next')||'').trim();
    if(!where||!next)return;
    state.snapshots.push(createRecord('snapshot',{taskId:task.id,where,next}));
    task.nextStep=next;
    focusPause();persist();render();notify('Contexto salvo. Você pode retomar depois.');
  }
});
app.addEventListener('change',async event=>{
  if(event.target.id==='focus-select') {
    const id=event.target.value;
    if(state.focusTaskId!==id)focusPause();
    state.focusTaskId=id||null;persist();return render();
  }
  if(event.target.id==='import-file') {
    const file=event.target.files?.[0];
    if(!file)return;
    if(file.size>3*1024*1024)return notify('O arquivo excede 3 MB.');
    try {
      const incoming=validateImport(JSON.parse(await file.text()));
      if(!confirm('Restaurar este backup e substituir TODOS os dados atuais?')) return;
      state=structuredClone(incoming);
      // Um temporizador importado nunca será retomado automaticamente.
      if(state.focus.running){state.focus.remainingSec=timerRemaining(state.focus);state.focus.running=false;state.focus.deadline=null;}
      persist();nav('hoje');notify('Backup restaurado.');
    } catch(error) {notify(`Falha na importação: ${error.message}`);}
  }
});

setInterval(()=>{
  focusCompleteIfNeeded();
  if(page==='foco'){
    const display=document.querySelector('#timer-display');
    if(display) display.textContent=clock(timerRemaining(state.focus));
  }
},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)focusCompleteIfNeeded();});

try {
  const stored=await loadState();
  if(stored)state=validateImport(stored);
  // Retoma o tempo real decorrido sem disparar alarmes em segundo plano.
  focusCompleteIfNeeded();
  render();
} catch(error) {
  app.innerHTML='<section class="panel"><h2>Não foi possível carregar o armazenamento local</h2><p class="muted">Verifique se o navegador permite IndexedDB e atualize a página. Nenhum dado foi enviado para um servidor.</p></section>';
  console.error('Falha ao inicializar Âncora OS', error);
}
if('serviceWorker' in navigator && ['http:','https:'].includes(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Offline indisponível:',error));
}
