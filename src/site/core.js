/* ============================================================
   EduSync — core
   Storage, auth, and business logic shared by every page.
   Academic data and accounts run locally in the browser (localStorage).

   Ported from core.js. The logic is unchanged; the three things
   that touched the page directly are handled by React instead:
     - flash()                → ./flash.js  (toast store + <FlashStack>)
     - logout()/deleteAccount → no longer set window.location; the
                                caller navigates with the router
     - requireAuth() /
       redirectIfLoggedIn()   → <RequireAuth> / <GuestOnly> in routes
   ============================================================ */

export const STORAGE_KEY = "edusync_site_v1";
export const THRESHOLD = 75;

/* ---------------- Safe storage layer ---------------- */
let storageAvailable = true;
let memoryStore = {};
try {
  const t = "__edusync_probe__";
  localStorage.setItem(t, "1"); localStorage.removeItem(t);
} catch (err) { storageAvailable = false; console.warn("EduSync: localStorage unavailable, using in-memory storage.", err); }

function loadApp() {
  try {
    const raw = storageAvailable ? localStorage.getItem(STORAGE_KEY) : memoryStore[STORAGE_KEY];
    if (!raw) return { users: [], session: { userId: null }, data: {} };
    const parsed = JSON.parse(raw);
    parsed.users = parsed.users || [];
    parsed.session = parsed.session || { userId: null };
    parsed.data = parsed.data || {};
    return parsed;
  } catch (err) { console.error("EduSync: failed to load data.", err); return { users: [], session: { userId: null }, data: {} }; }
}
export function saveApp() {
  const json = JSON.stringify(APP);
  memoryStore[STORAGE_KEY] = json;
  if (storageAvailable) {
    try { localStorage.setItem(STORAGE_KEY, json); }
    catch (err) { storageAvailable = false; console.warn("EduSync: switched to in-memory storage.", err); }
  }
}
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export function showFatalError(err) {
  console.error("EduSync fatal error:", err);
  const banner = document.createElement("div");
  banner.style.cssText = "position:fixed; top:0; left:0; right:0; background:#FF5A36; color:#0A0B0D; padding:12px 20px; font-family:sans-serif; font-size:13px; font-weight:600; z-index:999999; text-align:center;";
  banner.textContent = "Something went wrong: " + (err && err.message ? err.message : err) + " — check the console (F12) for details.";
  document.body.prepend(banner);
}

/* Lightweight client-side hash — NOT cryptographic security. There is no
   server here to protect a real secret against, so this only avoids
   storing raw plaintext passwords; it is not safe for anything sensitive. */
export function hashPassword(pw, salt) {
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
  const s = salt + "::" + pw;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = (h1 ^ c) * 0x01000193 >>> 0;
    h2 = (h2 + c * 31) ^ (h2 << 7); h2 = h2 >>> 0;
  }
  return h1.toString(16) + h2.toString(16);
}

export const APP = loadApp();

const AVATAR_COLORS = ["#FF5A36", "#35D499", "#FFB020", "#8C6BFF", "#FF6B57", "#2FB8C4"];
export function colorFor(str) { let sum = 0; for (let i = 0; i < str.length; i++) sum += str.charCodeAt(i); return AVATAR_COLORS[sum % AVATAR_COLORS.length]; }
export function initialsFor(name) { return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase(); }

/* ---------------- Auth ---------------- */
export function currentUser() { return APP.users.find(u => u.id === APP.session.userId) || null; }
export function currentUserData() {
  const u = currentUser();
  if (!u) return null;
  if (!APP.data[u.id]) APP.data[u.id] = { xp: 0, subjects: [], assignments: [], attendance: [] };
  return APP.data[u.id];
}
export function logout() { APP.session.userId = null; saveApp(); }
export function deleteAccount() {
  const u = currentUser();
  if (u) { APP.users = APP.users.filter(x => x.id !== u.id); delete APP.data[u.id]; APP.session.userId = null; saveApp(); }
}

/* ---------------- Derived helpers ---------------- */
export function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) + ", " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function subjectAttendance(subjectId) {
  const D = currentUserData();
  const records = D.attendance.filter(r => r.subjectId === subjectId);
  const held = records.length;
  const attended = records.filter(r => r.status === "present").length;
  const pct = held ? Math.round((attended / held) * 1000) / 10 : null;
  return { held, attended, pct };
}

export function guardianStats(subjectId) {
  const { held, attended, pct } = subjectAttendance(subjectId);
  if (held === 0) return { held, attended, pct: null, canMiss: null, mustAttend: null };
  let canMiss = Math.max(0, Math.floor((attended * 100 / THRESHOLD) - held));
  let mustAttend = 0;
  if (pct < THRESHOLD) {
    let k = 0;
    while (((attended + k) / (held + k)) * 100 < THRESHOLD && k < 10000) k++;
    mustAttend = k;
  }
  return { held, attended, pct, canMiss, mustAttend };
}

export function assignmentBucket(a) {
  if (a.status === "completed") return "completed";
  const now = new Date();
  const deadline = new Date(a.deadline);
  if (deadline < now) return "overdue";
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  if (deadline <= endOfToday) return "due_today";
  const days = (deadline - now) / (1000 * 60 * 60 * 24);
  if (days < 3) return "due_soon";
  return "upcoming";
}

/* Transparent rule-based priority score — explainable line-by-line for viva */
export function priorityScore(a, subject) {
  const now = new Date();
  const hoursLeft = Math.max((new Date(a.deadline) - now) / (1000 * 60 * 60), 0);
  const deadlineUrgency = hoursLeft <= 0 ? 50 : Math.max(0, 50 - (hoursLeft / 72) * 50);
  const marks = subject.marks !== null && subject.marks !== undefined && subject.marks !== "" ? Number(subject.marks) : 70;
  const weakSubjectScore = Math.max(0, (75 - marks) / 75 * 25);
  const { pct } = subjectAttendance(subject.id);
  const attendanceRisk = (pct !== null && pct < 75) ? Math.max(0, (75 - pct) / 75 * 15) : 0;
  const priorityBonus = { high: 10, medium: 5, low: 0 }[a.priority] || 0;
  return Math.round((deadlineUrgency + weakSubjectScore + attendanceRisk + priorityBonus) * 10) / 10;
}

export function nextBestAction() {
  const D = currentUserData();
  const pending = D.assignments.filter(a => a.status === "pending");
  if (!pending.length) return null;
  let scored = pending.map(a => {
    const subject = D.subjects.find(s => s.id === a.subjectId);
    if (!subject) return null;
    return { a, subject, score: priorityScore(a, subject) };
  }).filter(Boolean);
  if (!scored.length) return null;
  scored.sort((x, y) => y.score - x.score);
  const top = scored[0];
  const duration = 30 + Math.round(Math.min(top.score, 60) / 60 * 30);
  const reasons = [];
  const now = new Date();
  if ((new Date(top.a.deadline) - now) < 1000 * 60 * 60 * 24) reasons.push("deadline is very close");
  const { pct } = subjectAttendance(top.subject.id);
  if (pct !== null && pct < 75) reasons.push("attendance in this subject is at risk");
  if (top.a.priority === "high") reasons.push("marked high priority");
  if (!reasons.length) reasons.push("it's your next logical task");
  return { ...top, duration, reason: reasons.join(", ") };
}

/* ---------------- AI Insights engine ----------------
   Deterministic, explainable "AI" — a local pattern-analysis layer over
   the student's own data. No external model or network call is involved;
   it's rule-based, but framed as insights because that's what it produces:
   observations a plain metrics dashboard wouldn't surface on its own. */
export function generateInsights() {
  const D = currentUserData();
  const insights = [];

  const withAttendance = D.subjects.map(s => ({ ...s, ...subjectAttendance(s.id) })).filter(s => s.pct !== null);
  if (withAttendance.length >= 2) {
    const sorted = [...withAttendance].sort((a, b) => b.pct - a.pct);
    const best = sorted[0], worst = sorted[sorted.length - 1];
    if (best.id !== worst.id && best.pct - worst.pct >= 10) {
      insights.push(`Attendance in <strong>${best.name}</strong> (${best.pct}%) is well ahead of <strong>${worst.name}</strong> (${worst.pct}%) — worth noticing what's different about those two.`);
    }
  }

  const total = D.assignments.length;
  const completed = D.assignments.filter(a => a.status === "completed").length;
  if (total >= 3) {
    const rate = Math.round((completed / total) * 100);
    if (rate >= 80) insights.push(`You've completed <strong>${rate}%</strong> of everything you've logged — strong follow-through.`);
    else if (rate < 40) insights.push(`Only <strong>${rate}%</strong> of logged assignments are complete — clearing a couple this week would shift that fast.`);
  }

  const overdue = D.assignments.filter(a => assignmentBucket(a) === "overdue").length;
  if (overdue > 0) insights.push(`<strong>${overdue}</strong> assignment${overdue > 1 ? "s are" : " is"} overdue — these tend to cost the most stress the longer they sit.`);

  const highPriorityPending = D.assignments.filter(a => a.status === "pending" && a.priority === "high").length;
  if (highPriorityPending >= 2) insights.push(`You're carrying <strong>${highPriorityPending}</strong> high-priority tasks at once — consider whether any can move to medium.`);

  if (D.xp >= 100) insights.push(`You've earned <strong>${D.xp} XP</strong> from consistent logging — that consistency is the thing actually driving your other numbers.`);

  const atRisk = withAttendance.filter(s => s.pct < 75).length;
  if (atRisk > 0) insights.push(`<strong>${atRisk}</strong> subject${atRisk > 1 ? "s are" : " is"} below the 75% attendance line — check the Attendance Guardian for exactly how many classes to attend next.`);

  if (!insights.length) insights.push("Log a few more assignments and attendance entries and patterns will start showing up here.");
  return insights.slice(0, 4);
}

function escapeAssistantText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function validAttendanceDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function markAttendance(subjectId, status, dateValue) {
  const D = currentUserData();
  const date = dateValue || new Date().toISOString().slice(0, 10);
  const record = D.attendance.find(item => item.subjectId === subjectId && item.date === date);
  if (record) {
    if (record.status !== status) {
      D.xp += status === "present" ? 2 : -2;
      record.status = status;
    }
  } else {
    D.attendance.push({ id: uid(), subjectId, date, status });
    if (status === "present") D.xp += 2;
  }
  saveApp();
}

function applyAttendanceCommand(query) {
  const match = query.trim().match(/^(?:please\s+)?(?:mark|record|log)\s+(?:my\s+)?(?:attendance\s+(?:for\s+)?|)(.+?)\s+(?:as\s+)?(present|absent)(?:\s+(?:for|on)\s+(\d{4}-\d{2}-\d{2}))?$/i);
  if (!match) return null;
  const [, requested, status, date] = match;
  const D = currentUserData();
  const term = requested.trim().toLocaleLowerCase();
  const matches = D.subjects.filter(subject =>
    subject.name.toLocaleLowerCase() === term || subject.code.toLocaleLowerCase() === term
  );
  if (!matches.length) {
    return `I couldn't find a subject named “${escapeAssistantText(requested)}”. Check the Subjects page and try its exact name or code.`;
  }
  if (matches.length > 1) {
    return `I found more than one match for “${escapeAssistantText(requested)}”. Please use the exact subject name or code.`;
  }
  if (date && !validAttendanceDate(date)) return "Please use a valid date in YYYY-MM-DD format.";

  markAttendance(matches[0].id, status.toLowerCase(), date);
  return `Attendance updated: <strong>${escapeAssistantText(matches[0].name)}</strong> marked <strong>${status.toLowerCase()}</strong> for ${date || new Date().toISOString().slice(0, 10)}. Your attendance totals and XP have been recalculated.`;
}

/* ---------------- AI Study Assistant — intent matching ----------------
   A local, rule-based assistant: no external API, no network call, no
   API key. It answers by reasoning over the same data the dashboard
   uses. This is intentionally transparent rather than a hosted LLM. */
export function aiRespond(query) {
  const u = currentUser(); const D = currentUserData();
  const q = query.toLowerCase().trim();
  const firstName = u.fullName.split(" ")[0];
  const attendanceAction = applyAttendanceCommand(query);
  if (attendanceAction) return attendanceAction;

  if (/\b(hi|hello|hey)\b/.test(q)) {
    return `Hey ${firstName}! Ask me things like "what should I study today", "how's my attendance", or "what's overdue".`;
  }
  if (/study|next|what should i (do|study|work on)/.test(q)) {
    const rec = nextBestAction();
    if (!rec) return "You're all caught up — no pending assignments need attention right now. Nice work.";
    return `I'd focus on <strong>${rec.subject.name} — ${rec.a.title}</strong> for about ${rec.duration} minutes. Reason: ${rec.reason}. This comes from your priority score: deadline urgency + subject weakness + attendance risk + priority flag.`;
  }
  if (/attend/.test(q)) {
    const withAttendance = D.subjects.map(s => ({ ...s, ...subjectAttendance(s.id) })).filter(s => s.pct !== null);
    const low = withAttendance.filter(s => s.pct < 75);
    if (!withAttendance.length) return "You haven't logged any attendance yet — head to the Attendance page or say “mark [subject name] present” to record a class.";
    if (!low.length) return "Your attendance is healthy across every subject — nothing below 75% right now.";
    return "These subjects are below 75%: " + low.map(s => `<strong>${s.name}</strong> (${s.pct}%)`).join(", ") + ". Check the Attendance Guardian for exactly how many classes you need to attend to recover.";
  }
  if (/overdue|behind|late/.test(q)) {
    const overdue = D.assignments.filter(a => assignmentBucket(a) === "overdue");
    if (!overdue.length) return "Nothing is overdue right now — you're on track.";
    return `You have ${overdue.length} overdue: ` + overdue.map(a => `<strong>${a.title}</strong>`).join(", ") + ".";
  }
  if (/xp|level|score|point/.test(q)) {
    return `You've earned <strong>${D.xp} XP</strong> so far — from completing assignments (+20) and logging attendance (+2 per present class).`;
  }
  if (/motivat|encourage|tired|stressed|overwhelm/.test(q)) {
    const lines = [
      `You've got this, ${firstName}. Progress compounds — the sessions that feel small now are what add up.`,
      `One task at a time. Pick the single thing from your next-best-action and just start the first five minutes.`,
      `You're already ahead of where you'd be by doing nothing — that counts for more than it feels like right now.`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  if (/insight|pattern|how am i doing|summary/.test(q)) {
    const insights = generateInsights();
    return insights.map(i => "• " + i).join("<br>");
  }
  if (/subject/.test(q)) {
    if (!D.subjects.length) return "You haven't added any subjects yet — start on the Subjects page.";
    return `You're tracking ${D.subjects.length} subject${D.subjects.length > 1 ? "s" : ""}: ` + D.subjects.map(s => s.name).join(", ") + ".";
  }
  return "I can help with: what to study next, your attendance status, overdue work, your XP, or a summary of patterns in your data. Try asking one of those.";
}
