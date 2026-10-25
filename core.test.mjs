import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, localDateKey, createRecord, selectTopThree, dueCards, reviewCard, timerRemaining, validateImport} from './core.mjs';

test('data local previsível',()=>assert.equal(localDateKey(new Date(2026,9,24,12)), '2026-10-24'));
test('seleciona no máximo três tarefas por dia',()=>{
 const s=initialState();s.tasks=['a','b','c','d'].map(title=>createRecord('task',{title}));
 for(const task of s.tasks.slice(0,3)){const r=selectTopThree(s,task.id,'2026-10-24');assert.equal(r.ok,true);s.topThree['2026-10-24']=r.selected;}
 assert.equal(selectTopThree(s,s.tasks[3].id,'2026-10-24').ok,false);
 assert.equal(selectTopThree(s,s.tasks[0].id,'2026-10-24').selected.length,2);
});
test('revisão espaçada acumula intervalos e reinicia após esquecimento',()=>{
 let c=createRecord('card',{question:'P?',answer:'R.'});let now=10_000_000;
 c=reviewCard(c,'good',now);assert.equal(c.dueAt,now+86400000);
 c=reviewCard(c,'good',now);assert.equal(c.dueAt,now+3*86400000);
 c=reviewCard(c,'again',now);assert.equal(c.dueAt,now+86400000);assert.equal(c.streak,0);
 assert.equal(dueCards([c],now).length,0);
});
test('temporizador funciona depois de suspensão de janela',()=>{
 const f={running:true,deadline:20_000,remainingSec:120};
 assert.equal(timerRemaining(f,10_000),10);
 assert.equal(timerRemaining(f,50_000),0);
});
test('backup requer esquema explícito',()=>{
 assert.doesNotThrow(()=>validateImport(initialState()));
 assert.throws(()=>validateImport({version:99}));
 const s=initialState();s.tasks.push({id:'x', title:'T', done:false, nextStep:''});
 assert.doesNotThrow(()=>validateImport(s));
 s.tasks[0].title={value:'bad'};assert.throws(()=>validateImport(s));
});
