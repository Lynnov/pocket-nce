import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons,contentVersion } from '../app/data/lessons.js';
test('all sample lessons have consistent source, sentence timing and vocabulary references',()=>{
 assert.deepEqual(lessons.map(l=>l.id),[1,2,3]);
 assert.equal(lessons.reduce((n,l)=>n+l.sentences.length,0),45);
 for(const lesson of lessons){
  assert.equal(lesson.contentVersion,contentVersion);assert.equal(lesson.alignmentStatus,'verified');
  const ids=new Set();let end=lesson.audioStart;
  for(const s of lesson.sentences){assert.ok(!ids.has(s.id));ids.add(s.id);assert.ok(s.text&&s.translation&&s.cue);assert.ok(s.start>=end&&s.end>s.start&&s.end<=lesson.duration);end=s.end;}
  assert.ok(end<=lesson.audioEnd);for(const word of lesson.vocabulary)assert.ok(ids.has(word.exampleSentenceId));
  let sectionEnd=0;for(const section of Object.values(lesson.audioSections)){assert.ok(section.start>=sectionEnd&&section.end>section.start&&section.end<=lesson.duration);sectionEnd=section.end;assert.equal(section.humanListening,false);}
 }
});
