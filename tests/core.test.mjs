import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, localDay, scheduleReview, finishSession, parseBackup, makeBackup, dueLessons } from '../app/core.js';

test('new state has no invented learning achievements', () => {
  const state = initialState();
  assert.deepEqual(state.progress, {});
  assert.equal(state.active, null);
  assert.equal(state.settings.minutes, 25);
});
test('review intervals use local calendar and cross month boundaries', () => {
  const result = scheduleReview({}, 'independent', new Date(2026, 9, 31, 23, 55));
  assert.equal(result.dueDate, '2026-11-01');
  assert.equal(result.streak, 1);
  assert.equal(localDay(new Date(2026, 9, 3)), '2026-10-03');
});
test('successful recall increases spacing while failed recall resets it', () => {
  const date = new Date(2026, 9, 13, 12);
  assert.equal(scheduleReview({ streak: 1 }, 'independent', date).dueDate, '2026-10-16');
  assert.equal(scheduleReview({ streak: 2 }, 'independent', date).dueDate, '2026-10-20');
  assert.equal(scheduleReview({ streak: 9 }, 'independent', date).dueDate, '2026-10-27');
  assert.equal(scheduleReview({ streak: 3 }, 'prompted', date).streak, 0);
  assert.equal(scheduleReview({ streak: 3 }, 'forgot', date).dueDate, '2026-10-14');
});
test('hinted recall cannot silently be recorded as independent', () => {
  const state = initialState();
  state.active = { lessonId: 1, index: 0, stage: 'recall', hint: 'hidden', hintsUsed: ['1-2'], audioTime: 0, scrollTop: 0, startedAt: new Date().toISOString() };
  assert.throws(() => finishSession(state, 'independent'), /提示/);
  assert.equal(state.sessions.length, 0);
  const next = finishSession(state, 'prompted', new Date(2026, 9, 13));
  assert.equal(next.active, null);
  assert.equal(next.sessions[0].hintCount, 1);
  assert.equal(next.progress[1].lastResult, 'prompted');
});
test('backup round trip retains active learning and word records', () => {
  const state = initialState();
  state.words['1:private'] = { lessonId: 1, word: 'private', familiar: false };
  assert.deepEqual(parseBackup(makeBackup(state)), state);
});
test('full-text reading accepts explicit self-assessment without a hidden-text exercise',()=>{
 const state=initialState();
 state.active={lessonId:1,stage:'recall',hintsUsed:['level:full']};
 const next=finishSession(state,'independent',new Date(2026,9,13),{selfReported:true});
 assert.equal(next.progress[1].lastResult,'independent');
 assert.equal(next.sessions[0].assessmentMode,'self-reported');
 assert.equal(next.sessions[0].hintCount,0);
});
test('malformed, unsupported and untrusted backups are rejected', () => {
  for (const text of ['no json', '{}', '{"version":999,"data":{}}', '{"version":1,"data":{"__proto__":{"polluted":true}}}']) {
    assert.throws(() => parseBackup(text));
  }
  const state = initialState();
  state.settings.fontSize = 999;
  assert.throws(() => parseBackup(makeBackup(state)), /字号|设置/);
});
test('backup must not allow an invalid lesson or unsafe word record', () => {
  const state = initialState();
  state.words['99:x'] = {lessonId:99,word:'x',familiar:false};
  assert.throws(() => parseBackup(makeBackup(state)), /生词|课文/);
});
test('due review queue is stable and excludes future or unstudied lessons', () => {
  const state=initialState();
  state.progress={1:{dueDate:'2026-10-12'},2:{dueDate:'2026-10-15'},3:{dueDate:'2026-10-10'}};
  assert.deepEqual(dueLessons(state,new Date(2026,9,13)),[3,1]);
});
test('malformed review dates and incomplete practiced states cannot replace a backup',()=>{
 for(const progress of [
  {1:{status:'learning',dueDate:['2000-01-01']},2:{status:'learning',dueDate:['2000-01-02']}},
  {1:{status:'practiced'}},
  {1:{status:'practiced',lastResult:'prompted',streak:0,dueDate:'2026-02-30',updatedAt:new Date().toISOString()}},
 ]){const state=initialState();state.progress=progress;assert.throws(()=>parseBackup(makeBackup(state)),/复习/);}
});
