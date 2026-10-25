export const SCHEMA_VERSION = 1;

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function initialState() {
  return {
    version: SCHEMA_VERSION,
    tasks: [],
    cards: [],
    inbox: [],
    topThree: {},
    focusTaskId: null,
    snapshots: [],
    focus: {durationSec: 900, remainingSec: 900, deadline: null, running: false, completed: 0},
    createdAt: new Date().toISOString()
  };
}

export function createRecord(kind, values) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const base = {id, createdAt: new Date().toISOString()};
  if (kind === 'task') return {...base, title: String(values.title).trim(), nextStep: String(values.nextStep || '').trim(), done: false, completedAt: null};
  if (kind === 'card') return {...base, question: String(values.question).trim(), answer: String(values.answer).trim(), topic: String(values.topic || '').trim(), streak: 0, reviews: 0, dueAt: Date.now()};
  if (kind === 'inbox') return {...base, text: String(values.text).trim()};
  if (kind === 'snapshot') return {...base, taskId: values.taskId, where: String(values.where || '').trim(), next: String(values.next || '').trim()};
  throw new Error('Tipo de registro desconhecido');
}

export function selectTopThree(state, taskId, dateKey = localDateKey()) {
  const todays = state.topThree[dateKey] || [];
  const task = state.tasks.find(item => item.id === taskId && !item.done);
  if (!task) return {ok:false, reason:'Tarefa indisponível'};
  if (todays.includes(taskId)) return {ok:true, selected:todays.filter(id => id !== taskId)};
  if (todays.length >= 3) return {ok:false, reason:'Escolha no máximo três prioridades para hoje'};
  return {ok:true, selected:[...todays, taskId]};
}

export function dueCards(cards, now = Date.now()) {
  return cards.filter(card => Number.isFinite(card.dueAt) && card.dueAt <= now).sort((a,b) => a.dueAt - b.dueAt);
}

const RECALL_INTERVALS = [1, 3, 7, 14, 30, 60];
export function reviewCard(card, grade, now = Date.now()) {
  if (!['again', 'hard', 'good'].includes(grade)) throw new Error('Avaliação desconhecida');
  const streak = grade === 'again' ? 0 : grade === 'hard' ? Math.max(0, card.streak || 0) : (card.streak || 0) + 1;
  const days = grade === 'again' ? 1 : grade === 'hard' ? 2 : RECALL_INTERVALS[Math.min(streak - 1, RECALL_INTERVALS.length - 1)];
  return {...card, streak, reviews: (card.reviews || 0) + 1, lastGrade:grade, reviewedAt:now, dueAt: now + days * 86400000};
}

export function timerRemaining(focus, now = Date.now()) {
  return focus.running && focus.deadline !== null ? Math.max(0, Math.ceil((focus.deadline - now) / 1000)) : Math.max(0, Math.round(focus.remainingSec));
}

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.version !== SCHEMA_VERSION) throw new Error('Arquivo incompatível com este MVP');
  for (const key of ['tasks', 'cards', 'inbox', 'snapshots']) if (!Array.isArray(obj[key]) || obj[key].length > 20000) throw new Error(`Dados inválidos em ${key}`);
  if (!obj.topThree || typeof obj.topThree !== 'object' || Array.isArray(obj.topThree)) throw new Error('Prioridades inválidas');
  if (!obj.focus || typeof obj.focus !== 'object') throw new Error('Estado de foco inválido');
  const text = (x) => typeof x === 'string' && x.length <= 10000;
  const id = (x) => typeof x === 'string' && x.length < 150;
  if (obj.tasks.some(x => !x || !id(x.id) || !text(x.title) || !text(x.nextStep || '') || typeof x.done !== 'boolean')) throw new Error('Tarefas inválidas');
  if (obj.cards.some(x => !x || !id(x.id) || !text(x.question) || !text(x.answer) || !Number.isFinite(x.dueAt))) throw new Error('Cartões inválidos');
  if (obj.inbox.some(x => !x || !id(x.id) || !text(x.text))) throw new Error('Anotações inválidas');
  if (obj.snapshots.some(x => !x || !id(x.id) || !id(x.taskId) || !text(x.where || '') || !text(x.next || ''))) throw new Error('Retomadas inválidas');
  if (!Number.isFinite(obj.focus.remainingSec) || !Number.isFinite(obj.focus.durationSec) || obj.focus.remainingSec < 0 || obj.focus.durationSec > 86400) throw new Error('Temporizador inválido');
  for (const [key, ids] of Object.entries(obj.topThree)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(ids) || ids.length > 3 || ids.some(v=>!id(v))) throw new Error('Prioridades diárias inválidas');
  }
  return obj;
}
