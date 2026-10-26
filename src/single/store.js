/* EduSync single-file app — account data + business logic.
   Rendering is handled by React components (see SingleApp.jsx). Academic
   data is kept in a profile keyed by the signed-in account ID. */
export const STORE = 'edusync_evaluation_demo_v2', THRESHOLD = 75;
export const DEMO_USER_ID = 'edusync-demo-user';
export const ICONS = {dashboard:'▦',subjects:'▤',assignments:'✓',attendance:'◈',assistant:'✦'};
export const PAGES = [{id:'dashboard',label:'Dashboard'},{id:'subjects',label:'Subjects'},{id:'assignments',label:'Assignments'},{id:'attendance',label:'Attendance'},{id:'assistant',label:'AI Assistant',ai:true}];
export const APP_ROUTES = PAGES.map(item => item.id);
export const ALL_ROUTES = ['landing', 'login', 'register', ...APP_ROUTES];

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
export const uid = () => 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
export const iso = (days=0,hours=0) => { const d=new Date(); d.setDate(d.getDate()+days); d.setHours(d.getHours()+hours); return d.toISOString(); };
const dateOnly = (days) => { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };

export function seededState(){
  const attendance = [];
  const records = (subjectId, held, present) => { for(let i=0;i<held;i++) attendance.push({id:uid(),subjectId,date:dateOnly(i-held),status:i<present?'present':'absent'}); };
  records('algorithms',15,13); records('dbms',11,8); records('math',10,7); records('web',18,16);
  return {user:{name:'Riya Sharma',course:'B.Tech Computer Science · Semester 5'},xp:186,
    subjects:[
      {id:'algorithms',code:'CSE301',name:'Design & Analysis of Algorithms',faculty:'Dr. Mehta',credits:4,marks:68,targetGrade:'A',color:'#c6f135'},
      {id:'dbms',code:'CSE302',name:'Database Management Systems',faculty:'Prof. Iyer',credits:3,marks:72,targetGrade:'A',color:'#ffb020'},
      {id:'math',code:'MAT201',name:'Discrete Mathematics',faculty:'Dr. Kapoor',credits:3,marks:64,targetGrade:'B+',color:'#ff6b57'},
      {id:'web',code:'CSE303',name:'Web Technologies',faculty:'Ms. Bose',credits:3,marks:85,targetGrade:'A+',color:'#35d499'}
    ],assignments:[
      {id:'a1',title:'DBMS ER Diagram Revisions',subjectId:'dbms',description:'Correct keys and normalisation notes after review.',deadline:iso(-2),priority:'high',status:'pending'},
      {id:'a2',title:'Graph Algorithms Lab',subjectId:'algorithms',description:'Implement Dijkstra and attach complexity analysis.',deadline:iso(0,4),priority:'high',status:'pending'},
      {id:'a3',title:'Discrete Mathematics Problem Set',subjectId:'math',description:'Relations, induction and graph colouring.',deadline:iso(2),priority:'high',status:'pending'},
      {id:'a4',title:'Responsive Portfolio Draft',subjectId:'web',description:'First responsive layout for internal assessment.',deadline:iso(8),priority:'medium',status:'pending'},
      {id:'a5',title:'SQL Query Quiz',subjectId:'dbms',description:'Completed practice assessment.',deadline:iso(-5),priority:'medium',status:'completed'}
    ],attendance};
}
function load(){try{const saved=localStorage.getItem(STORE);return saved?JSON.parse(saved):seededState()}catch{return seededState()}}

export const db = { state: load() };

export function save(){try{localStorage.setItem(STORE,JSON.stringify(db.state))}catch(err){console.warn('EduSync: could not save local data.',err)}}
function emptyProfile(user){return {user:{name:user.fullName,course:user.course||'',semester:user.semester||''},xp:0,subjects:[],assignments:[],attendance:[]}}
export function currentData(){
  const userId=db.state.session?.userId;
  if(!userId)return db.state;
  if(!db.state.profiles[userId]){
    const user=db.state.users.find(account=>account.id===userId);
    db.state.profiles[userId]=emptyProfile(user||{fullName:'Student'});
  }
  return db.state.profiles[userId];
}
export function subject(id){return currentData().subjects.find(s=>s.id===id)}
export function attendanceStats(subjectId){const r=currentData().attendance.filter(x=>x.subjectId===subjectId),attended=r.filter(x=>x.status==='present').length,held=r.length;return {held,attended,pct:held?Math.round(attended/held*1000)/10:null}}
export function guardianStats(subjectId){const x=attendanceStats(subjectId);if(!x.held)return {...x,canMiss:0,mustAttend:0};const canMiss=Math.max(0,Math.floor(x.attended*100/THRESHOLD-x.held));let mustAttend=0;while(x.pct<THRESHOLD&&((x.attended+mustAttend)/(x.held+mustAttend))*100<THRESHOLD)mustAttend++;return {...x,canMiss,mustAttend}}
export function bucket(a){if(a.status==='completed')return 'completed';const now=Date.now(),d=new Date(a.deadline).getTime();if(d<now)return 'overdue';const end=new Date();end.setHours(23,59,59,999);if(d<=end)return 'due-today';if(d-now<3*86400000)return 'due-soon';return 'upcoming'}
export function fmtDate(when){const d=new Date(when),today=new Date(),tomorrow=new Date();tomorrow.setDate(today.getDate()+1);if(d.toDateString()===today.toDateString())return 'Today, '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});if(d.toDateString()===tomorrow.toDateString())return 'Tomorrow, '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});return d.toLocaleDateString([], {day:'2-digit',month:'short'})+' · '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
export function localInput(when){const d=new Date(when),pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`}
export function priorityScore(a){const s=subject(a.subjectId),hours=Math.max((new Date(a.deadline)-Date.now())/36e5,0),deadline=hours<=0?50:Math.max(0,50-hours/72*50),marks=Number(s?.marks??70),weak=Math.max(0,(75-marks)/75*25),{pct}=attendanceStats(a.subjectId),risk=pct!==null&&pct<75?Math.max(0,(75-pct)/75*15):0,bonus={high:10,medium:5,low:0}[a.priority]||0;return Math.round((deadline+weak+risk+bonus)*10)/10}
export function nextBestAction(){const state=currentData(),pending=state.assignments.filter(a=>a.status==='pending'&&subject(a.subjectId)).map(a=>({a,s:subject(a.subjectId),score:priorityScore(a)})).sort((a,b)=>b.score-a.score);if(!pending.length)return null;const top=pending[0],reasons=[];if(new Date(top.a.deadline)-Date.now()<864e5)reasons.push('the deadline is very close');if(attendanceStats(top.s.id).pct<75)reasons.push('attendance is at risk');if(top.a.priority==='high')reasons.push('it is marked high priority');if(!reasons.length)reasons.push('it is your next logical task');return {...top,duration:30+Math.round(Math.min(top.score,60)/60*30),reason:reasons.join(', ')}}
export function insights(){const state=currentData();const out=[],att=state.subjects.map(s=>({...s,...attendanceStats(s.id)})).filter(s=>s.pct!==null),sorted=[...att].sort((a,b)=>b.pct-a.pct);if(sorted.length>1&&sorted[0].pct-sorted.at(-1).pct>=10)out.push(`Attendance in <strong>${escapeHTML(sorted[0].name)}</strong> (${sorted[0].pct}%) is well ahead of <strong>${escapeHTML(sorted.at(-1).name)}</strong> (${sorted.at(-1).pct}%).`);const total=state.assignments.length,done=state.assignments.filter(a=>a.status==='completed').length;if(total>=3){const rate=Math.round(done/total*100);out.push(rate<40?`Only <strong>${rate}%</strong> of logged assignments are complete — clearing one this week will shift that quickly.`:`You have completed <strong>${rate}%</strong> of logged work — strong follow-through.`)}const overdue=state.assignments.filter(a=>bucket(a)==='overdue').length;if(overdue)out.push(`<strong>${overdue}</strong> assignment${overdue>1?'s are':' is'} overdue — resolve this first to reduce academic risk.`);const risk=att.filter(s=>s.pct<75).length;if(risk)out.push(`<strong>${risk}</strong> subject${risk>1?'s are':' is'} below the 75% attendance line — the Guardian calculates the recovery plan.`);return out.slice(0,4)}

function attendanceCommand(query){
  const match=query.trim().match(/^(?:please\s+)?(?:mark|record|log)\s+(?:my\s+)?(?:attendance\s+(?:for\s+)?|)(.+?)\s+(?:as\s+)?(present|absent)(?:\s+(?:for|on)\s+(\d{4}-\d{2}-\d{2}))?$/i);
  if(!match)return null;
  const [,requested,status,date]=match,state=currentData();
  const term=requested.trim().toLowerCase();
  const matches=state.subjects.filter(s=>s.name.toLowerCase()===term||s.code.toLowerCase()===term);
  if(matches.length!==1)return matches.length?`I found more than one match for “${escapeHTML(requested)}”. Please use the exact subject name or code.`:`I couldn't find a subject named “${escapeHTML(requested)}”. Check the Subjects page and try its exact name or code.`;
  if(date&&!isValidDate(date))return 'Please use a valid date in YYYY-MM-DD format.';
  const subject=matches[0],day=date||new Date().toISOString().slice(0,10);
  markAttendance(subject.id,status.toLowerCase(),day);
  return `Attendance updated: <strong>${escapeHTML(subject.name)}</strong> marked <strong>${status.toLowerCase()}</strong> for ${day}. Your attendance totals and XP have been recalculated.`;
}
function isValidDate(value){const date=new Date(`${value}T00:00:00Z`);return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value}
export function aiAnswer(q){
  const state=currentData(),text=q.toLowerCase(),first=state.user.name.split(' ')[0],action=attendanceCommand(q);
  if(action)return action;
  if(/\b(hi|hello|hey)\b/.test(text))return `Hi ${escapeHTML(first)}! I can recommend your next study task, check attendance, list overdue work, or explain your study patterns. To update attendance, say “mark [subject name] present” or “mark [subject name] absent”.`;
  if(/study|next|what should i/.test(text)){const r=nextBestAction();return r?`Focus on <strong>${escapeHTML(r.s.name)} — ${escapeHTML(r.a.title)}</strong> for about ${r.duration} minutes. The priority engine chose it because ${r.reason}.`:'You are all caught up — no pending work needs attention.'}
  if(/attend/.test(text)){const risk=state.subjects.map(s=>({...s,...attendanceStats(s.id)})).filter(s=>s.pct!==null&&s.pct<75);if(!state.attendance.length)return state.subjects.length?'You have not logged any attendance yet. You can record a class by saying “mark [subject name] present” or “mark [subject name] absent”.':'Add a subject first, then record attendance from the Attendance page or by asking me to mark a class.';return risk.length?`These subjects are below 75%: ${risk.map(s=>`<strong>${escapeHTML(s.name)}</strong> (${s.pct}%)`).join(', ')}. Open Attendance Guardian to see the exact recovery plan.`:'Your attendance is healthy across every subject.'}
  if(/overdue|late|behind/.test(text)){const over=state.assignments.filter(a=>bucket(a)==='overdue');return over.length?`You have ${over.length} overdue item${over.length>1?'s':''}: ${over.map(a=>`<strong>${escapeHTML(a.title)}</strong>`).join(', ')}.`:'Nothing is overdue right now — you are on track.'}
  if(/xp|level|point|score/.test(text))return `You have earned <strong>${state.xp} XP</strong>. Completing an assignment adds 20 XP; recording a present class adds 2 XP.`;
  if(/summary|pattern|insight|how am i doing/.test(text))return insights().map(i=>'• '+i).join('<br>');
  if(/subject/.test(text))return `You are tracking ${state.subjects.length} subjects: ${state.subjects.map(s=>escapeHTML(s.name)).join(', ')}.`;
  if(/motivat|stress|tired|overwhelm/.test(text))return `You have a clear next step, ${escapeHTML(first)}: start with five minutes on the highest-priority task. Small, deliberate progress beats waiting for the perfect study session.`;
  return 'I can help with your next study task, attendance, overdue assignments, XP, or a summary of patterns. To update attendance, say “mark [subject name] present” or “mark [subject name] absent”.';
}

/* ---------- Mutations used by the views (same bodies as the originals;
   the flash / closeModal / render calls are made by the caller) ---------- */
export function saveSubject(form, flash){const state=currentData();const f=new FormData(form),payload={code:f.get('code').trim(),name:f.get('name').trim(),faculty:f.get('faculty').trim(),credits:Number(f.get('credits'))||3,targetGrade:f.get('targetGrade').trim(),marks:f.get('marks'),color:f.get('color')};const id=f.get('id');if(id){Object.assign(subject(id),payload);flash('Subject updated.')}else{state.subjects.push({id:uid(),...payload});flash('Subject added.')}save()}
export function saveAssignment(form, flash){const state=currentData();const f=new FormData(form),payload={title:f.get('title').trim(),subjectId:f.get('subjectId'),description:f.get('description').trim(),deadline:new Date(f.get('deadline')).toISOString(),priority:f.get('priority')},id=f.get('id');if(id){Object.assign(state.assignments.find(a=>a.id===id),payload);flash('Assignment updated.')}else{state.assignments.push({id:uid(),...payload,status:'pending'});flash('Assignment added.')}save()}
export function completeAssignment(id, flash){const state=currentData();const a=state.assignments.find(x=>x.id===id);if(!a)return false;a.status='completed';state.xp+=20;save();flash(`“${a.title}” completed. +20 XP`);return true}
export function markAttendance(subjectId,status,dateValue){const state=currentData(),date=dateValue||new Date().toISOString().slice(0,10),existing=state.attendance.find(x=>x.subjectId===subjectId&&x.date===date);if(existing){if(existing.status!==status){state.xp+=status==='present'?2:-2;existing.status=status}}else{state.attendance.push({id:uid(),subjectId,date,status});if(status==='present')state.xp+=2}save()}

/* ---------- Auth layer (second script block) ---------- */
export function credentialHash(password, salt) {
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
  const text = salt + '::' + password;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = ((h1 ^ c) * 0x01000193) >>> 0;
    h2 = (h2 + c * 31) ^ (h2 << 7); h2 >>>= 0;
  }
  return h1.toString(16) + h2.toString(16);
}
export function demoAccount() {
  const email = 'demo@edusync.app';
  return { id: 'edusync-demo-user', fullName: 'Riya Sharma', email, course: 'B.Tech Computer Science', semester: '5', verified: true, passwordHash: credentialHash('EduSync@2026', email) };
}
export function ensureAuthModel() {
  const state = db.state;
  if (!Array.isArray(state.users)) state.users = [];
  if (!state.users.some(user => user.id === 'edusync-demo-user')) state.users.unshift(demoAccount());
  if (!state.session || typeof state.session !== 'object') state.session = { userId: null };
  delete state.pendingVerification;
  if (!state.profiles || typeof state.profiles !== 'object') {
    const legacyProfile = Array.isArray(state.subjects) ? {
      user: state.user || { name: 'Riya Sharma', course: 'B.Tech Computer Science · Semester 5' },
      xp: state.xp || 0, subjects: state.subjects, assignments: state.assignments || [], attendance: state.attendance || []
    } : seededState();
    state.profiles = { [DEMO_USER_ID]: legacyProfile };
    delete state.user; delete state.xp; delete state.subjects; delete state.assignments; delete state.attendance;
  }
  for (const user of state.users) {
    if (!state.profiles[user.id]) state.profiles[user.id] = emptyProfile(user);
  }
  save();
}
export function activeAccount() { return db.state.users.find(user => user.id === db.state.session?.userId) || null; }
export function makeCaptcha() {
  const first = Math.floor(Math.random() * 7) + 3, second = Math.floor(Math.random() * 7) + 2;
  return { question: `${first} + ${second}`, answer: first + second };
}
export function initials(name) { return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(); }
export function syncProfile() {
  const user = activeAccount();
  if (user) {
    currentData().user = { name: user.fullName, email: user.email, course: user.course, semester: user.semester };
    save();
  }
}
