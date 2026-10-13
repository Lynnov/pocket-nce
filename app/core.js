export const stages = ['understand', 'practice', 'memorize', 'recall'];
export const resultLabels = { forgot: '没背出', prompted: '需要提示', independent: '独立背出' };
export function initialState() {
  return { version: 1, settings: { minutes: 25, fontSize: 20, theme: 'light', rate: 1 }, progress: {}, words: {}, sessions: [], active: null };
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function scheduleReview(previous = {}, result, date = new Date()) {
  if (!resultLabels[result]) throw new Error('请选择背诵结果');
  const intervals = [1,3,7,14];
  const independent = result === 'independent';
  const streak = independent ? (previous.streak || 0) + 1 : 0;
  const days = independent ? intervals[Math.min(streak-1,3)] : 1;
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate()+days, 12);
  return { ...previous, status: 'practiced', lastResult: result, streak, dueDate: localDay(next), updatedAt: date.toISOString() };
}
export function finishSession(state, result, date = new Date()) {
  if (!state.active) throw new Error('还没有进行中的学习');
  const active = state.active;
  if (result === 'independent' && active.hintsUsed.length) throw new Error('这次使用过提示，请重新无提示串背，或记录为需要提示。');
  const next = structuredClone(state);
  next.progress[active.lessonId] = scheduleReview(next.progress[active.lessonId], result, date);
  next.sessions.push({ lessonId: active.lessonId, result, hintCount: active.hintsUsed.length, finishedAt: date.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  next.sessions = next.sessions.slice(-1000);
  next.active = null;
  return next;
}
export function dueLessons(state, date = new Date()) {
  const today = localDay(date);
  return Object.entries(state.progress).filter(([,p])=>p.dueDate && p.dueDate<=today).sort((a,b)=>a[1].dueDate.localeCompare(b[1].dueDate)).map(([id])=>Number(id));
}
export function makeBackup(state) {
  return JSON.stringify({ app: 'pocket-nce', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
}
const plain = x => !!x && typeof x === 'object' && !Array.isArray(x);
const integer = (x,min,max) => Number.isInteger(x) && x >= min && x <= max;
const number = (x,min,max) => Number.isFinite(x) && x >= min && x <= max;
const text = (x,max=300) => typeof x === 'string' && x.length <= max;
const lessonId = x => integer(x,1,3);
const iso = x => text(x,40) && Number.isFinite(Date.parse(x));
const calendarDay=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
function requireValid(condition, message) { if (!condition) throw new Error(message); }
export function parseBackup(raw) {
  requireValid(typeof raw === 'string' && raw.length < 4_000_000, '备份文件过大或格式不正确');
  let backup;
  try { backup = JSON.parse(raw, (key,value) => { if (['__proto__','constructor','prototype'].includes(key)) throw new Error(); return value; }); }
  catch { throw new Error('无法读取备份，请选择本应用导出的 JSON 文件'); }
  requireValid(backup?.app==='pocket-nce' && backup.version===1 && plain(backup.data), '不支持此备份版本');
  const d=backup.data,s=d.settings;
  requireValid(d.version===1 && plain(s), '设置格式不正确');
  requireValid([20,25,30].includes(s.minutes) && [18,20,22,24].includes(s.fontSize) && ['light','dark'].includes(s.theme) && [.75,1,1.25].includes(s.rate), '字号或其他设置超出范围');
  requireValid(plain(d.progress) && Object.keys(d.progress).length<=3, '课文进度格式不正确');
  for (const [id,p] of Object.entries(d.progress)) {
    requireValid(lessonId(Number(id)) && plain(p) && ['learning','practiced'].includes(p.status), '课文进度格式不正确');
    const hasReview=p.status==='practiced'||['lastResult','streak','dueDate','updatedAt'].some(key=>p[key]!==undefined);
    if(hasReview)requireValid(p.status==='practiced'&&typeof p.lastResult==='string'&&Object.hasOwn(resultLabels,p.lastResult)&&integer(p.streak,0,100000)&&calendarDay(p.dueDate)&&iso(p.updatedAt),'复习记录格式不正确');
    if (p.weak!==undefined) requireValid(Array.isArray(p.weak) && p.weak.length<200 && p.weak.every(x=>text(x,30)), '薄弱句格式不正确');
  }
  requireValid(plain(d.words) && Object.keys(d.words).length<=1000, '生词格式不正确');
  for (const [key,w] of Object.entries(d.words)) requireValid(text(key,100) && plain(w) && lessonId(w.lessonId) && text(w.word,70) && typeof w.familiar==='boolean' && key===`${w.lessonId}:${w.word}`, '生词或课文编号不正确');
  requireValid(Array.isArray(d.sessions) && d.sessions.length<=1000, '学习记录格式不正确');
  for (const session of d.sessions) requireValid(plain(session) && lessonId(session.lessonId) && !!resultLabels[session.result] && integer(session.hintCount,0,1000) && iso(session.finishedAt) && text(session.timezone,100), '学习记录格式不正确');
  if (d.active!==null) {
    const a=d.active;
    requireValid(plain(a) && lessonId(a.lessonId) && integer(a.index,0,199) && stages.includes(a.stage) && ['full','keywords','hidden'].includes(a.hint) && number(a.audioTime,0,3600) && number(a.scrollTop,0,1000000) && iso(a.startedAt), '进行中的学习格式不正确');
    requireValid(Array.isArray(a.hintsUsed) && a.hintsUsed.length<=1000 && a.hintsUsed.every(x=>text(x,100)), '提示记录格式不正确');
    if(a.audioMode!==undefined)requireValid(['sentence','all'].includes(a.audioMode),'播放位置格式不正确');
  }
  return structuredClone(d);
}
