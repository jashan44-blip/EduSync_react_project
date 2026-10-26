import { Fragment, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import singleCss from "../styles/single.css?raw";
import { initMotion } from "../lib/motion.js";
import { FlashStack, createFlashStore } from "../lib/flash.jsx";
import {
  ALL_ROUTES, APP_ROUTES, ICONS, PAGES, THRESHOLD,
  activeAccount, aiAnswer, attendanceStats, bucket, completeAssignment, credentialHash,
  db, ensureAuthModel, escapeHTML, fmtDate, guardianStats, initials, insights, iso,
  currentData, DEMO_USER_ID, localInput, makeCaptcha, markAttendance, nextBestAction,
  save, saveAssignment, saveSubject, seededState, subject, syncProfile, uid
} from "./store.js";

/* ============================================================
   EduSync single-file evaluation demo (was index.html).
   Routes live in the URL hash: #landing #login #register
   #dashboard #subjects #assignments #attendance #assistant
   ============================================================ */

const flashStore = createFlashStore({ ttl: 3600, classFor: () => "flash" });
const flash = (message) => flashStore.flash(message, "success", "flashStack");

/* What index.html did at load: pick the first route from the hash. */
function resolveInitial() {
  const requested = window.location.hash.slice(1);
  let route = ALL_ROUTES.includes(requested) ? requested : (activeAccount() ? "dashboard" : "landing");
  if (APP_ROUTES.includes(route)) {
    if (!activeAccount()) route = "login"; else syncProfile();
  }
  const page = APP_ROUTES.includes(route) ? route : (APP_ROUTES.includes(requested) ? requested : "dashboard");
  return { route, page, decorated: APP_ROUTES.includes(route) };
}

/* ---------------- shared bits ---------------- */
function Intro({ title, subtitle, button }) {
  return (
    <div className="page-intro"><div><div className="eyebrow">EduSync — Your Academic Overview</div><h1>{title}</h1><p>{subtitle}</p></div>{button}</div>
  );
}

function Task({ a, controls }) {
  const s = subject(a.subjectId), b = bucket(a);
  return (
    <div className="task">
      <div className="task-copy">
        <div className="task-title">{a.title}</div>
        <div className="task-meta">{s?.code || "No subject"} · {fmtDate(a.deadline)} · {a.priority} priority</div>
      </div>
      <span className={"tag " + b}>{b.replace("-", " ")}</span>{controls}
    </div>
  );
}

/* ---------------- app views ---------------- */
function Dashboard({ ctx }) {
  const state = currentData();
  const { tr, mg } = ctx;
  const name = state.user?.name || activeAccount()?.fullName || "Student";
  const pending = state.assignments.filter(a => a.status === "pending"),
    overdue = pending.filter(a => bucket(a) === "overdue").length,
    percentages = state.subjects.map(s => attendanceStats(s.id).pct).filter(x => x !== null),
    avg = percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length * 10) / 10 : null,
    rec = nextBestAction(), alerts = [];
  state.subjects.forEach(s => {
    const x = attendanceStats(s.id);
    if (x.pct !== null && x.pct < THRESHOLD) alerts.push(`🔴 ${s.name} attendance is ${x.pct}% — below the 75% requirement.`);
  });
  pending.forEach(a => { if (bucket(a) === "overdue") alerts.push(`⚠️ “${a.title}” is overdue.`); });
  const upcoming = [...pending].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 4);

  return (<>
    <Intro title={`Good evening, ${name.split(" ")[0]} 👋`} subtitle="Your semester at a glance — track, plan, and stay ahead." />
    {activeAccount()?.id === DEMO_USER_ID && <div className="demo-note"><span>✦</span> Predefined evaluation data is active. Try a feature, then use “Reset demo” to restore this exact state.</div>}
    <div className="grid four" style={{ marginTop: "18px" }}>
      <div className={"card metric" + tr}><div className="metric-top">Average attendance <span className="metric-icon">◈</span></div><div className={"metric-value " + (avg !== null && avg < 75 ? "danger" : "good")}>{avg === null ? "—" : `${avg}%`}</div></div>
      <div className={"card metric" + tr}><div className="metric-top">Pending work <span className="metric-icon">▤</span></div><div className="metric-value">{pending.length}</div></div>
      <div className={"card metric" + tr}><div className="metric-top">Overdue <span className="metric-icon" style={{ background: "var(--redTint)" }}>!</span></div><div className={"metric-value " + (overdue ? "danger" : "")}>{overdue}</div></div>
      <div className={"card metric" + tr}><div className="metric-top">XP earned <span className="metric-icon" style={{ background: "var(--amberTint)" }}>★</span></div><div className="metric-value">{state.xp}</div></div>
    </div>
    {rec && (
      <div className={"card score-card" + tr}>
        <div className="score" style={{ "--score": `${Math.min(100, rec.score) * 3.6}deg` }}><b>{Math.floor(rec.score)}</b></div>
        <div className="score-copy">
          <div className="eyebrow">🎯 transparent priority engine</div>
          <h2>Study {rec.s.name} — {rec.a.title}</h2>
          <p>Focus for about {rec.duration} minutes because {rec.reason}. The score combines deadline urgency, marks, attendance risk, and priority.</p>
          <button className={"btn primary small" + mg} onClick={() => ctx.onPageButton("assignments")}>View assignment</button>
        </div>
      </div>
    )}
    <div className="grid two">
      <div className={"card" + tr}>
        <div className="section-title">✦ AI insights <span className="tag" style={{ background: "var(--aiTint)", color: "var(--ai)" }}>local · rule-based</span></div>
        {insights().map((i, k) => <div className="insight" key={k}><i className="dot"></i><span dangerouslySetInnerHTML={{ __html: i }} /></div>)}
      </div>
      <div className={"card" + tr}>
        <div className="section-title">Academic alerts</div>
        {alerts.length ? alerts.map((a, k) => <div className="alert" key={k}>{a}</div>) : <div className="muted">No academic alerts right now.</div>}
      </div>
    </div>
    <div className={"card" + tr} style={{ marginTop: "16px" }}>
      <div className="section-title">Upcoming work</div>
      <div className="task-list">{upcoming.map(a => <Task a={a} key={a.id} />)}</div>
      <div className="btn-row" style={{ marginTop: "15px" }}>
        <button className={"btn primary small" + mg} onClick={() => ctx.openAssignment()}>Add assignment</button>
        <button className={"btn ghost small" + mg} onClick={() => ctx.openSubject()}>Add subject</button>
        <button className={"btn ai small" + mg} onClick={() => ctx.onPageButton("assistant")}>✦ Ask AI Assistant</button>
      </div>
    </div>
  </>);
}

function Subjects({ ctx }) {
  const state = currentData();
  const { tr, mg } = ctx;
  return (<>
    <Intro title="Subjects" subtitle="Track performance, faculty details, target grade, and attendance in one view."
      button={<button className={"btn primary" + mg} onClick={() => ctx.openSubject()}>Add Subject</button>} />
    <div className="grid three">
      {state.subjects.map(s => {
        const x = attendanceStats(s.id);
        return (
          <article className={"card subject" + tr} key={s.id} style={{ "--subject": s.color }}>
            <div className="subject-head"><div className="subject-symbol">{s.code.slice(0, 2)}</div><div><div className="subject-code">{s.code}</div><div className="subject-name">{s.name}</div></div></div>
            <div className="subject-info">{s.faculty || "Faculty TBD"} · {s.credits} credits · Target {s.targetGrade || "—"}</div>
            <div className="progress" style={{ "--value": `${x.pct ?? 0}%` }}><span></span></div>
            <div className="subject-info">{x.pct === null ? "No attendance logged" : `${x.pct}% attendance · Internal marks ${s.marks || "—"}`}</div>
            <div className="btn-row">
              <button className={"btn ghost small" + mg} onClick={() => ctx.openSubject(s.id)}>Edit</button>
              <button className={"btn danger small" + mg} onClick={() => ctx.deleteSubject(s.id)}>Remove</button>
            </div>
          </article>
        );
      })}
    </div>
  </>);
}

function Assignments({ ctx }) {
  const state = currentData();
  const { mg } = ctx;
  const labels = { overdue: "Overdue", "due-today": "Due today", "due-soon": "Due soon", upcoming: "Upcoming", completed: "Completed" },
    groups = Object.fromEntries(Object.keys(labels).map(k => [k, []]));
  state.assignments.slice().sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).forEach(a => groups[bucket(a)].push(a));
  return (<>
    <Intro title="Assignments" subtitle="Priority buckets update automatically from each deadline."
      button={<button className={"btn primary" + mg} onClick={() => ctx.openAssignment()}>Add Assignment</button>} />
    {Object.entries(groups).map(([key, items]) => items.length ? (
      <Fragment key={key}>
        <div className="bucket">{labels[key]} · {items.length}</div>
        <div className="task-list">
          {items.map(a => (
            <Task key={a.id} a={a} controls={
              <div className="btn-row">
                {a.status === "pending" && (<>
                  <button className={"btn ghost small" + mg} onClick={() => ctx.complete(a.id)}>Mark done</button>
                  <button className={"btn ghost small" + mg} onClick={() => ctx.openAssignment(a.id)}>Edit</button>
                </>)}
                <button className={"btn danger small" + mg} onClick={() => ctx.deleteAssignment(a.id)}>Delete</button>
              </div>
            } />
          ))}
        </div>
      </Fragment>
    ) : null)}
  </>);
}

function Attendance({ ctx }) {
  const state = currentData();
  const { tr, mg } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const dates = useRef({});
  return (<>
    <Intro title="Attendance Guardian" subtitle="Minimum requirement: 75%. It explains exactly what each attendance percentage means." />
    <div className="demo-note"><span>◈</span> Present logs earn +2 XP. The Guardian recalculates instantly when you mark a class.</div>
    <div style={{ marginTop: "16px" }}>
      {!state.subjects.length ? (
        <div className={"card" + tr}>
          <div className="section-title">No subjects yet</div>
          <p className="muted">Add your first subject to start tracking attendance for your account.</p>
          <button className={"btn primary small" + mg} onClick={() => ctx.openSubject()}>Add subject</button>
        </div>
      ) : state.subjects.map(s => {
        const x = guardianStats(s.id);
        const tone = x.pct < THRESHOLD ? "danger" : "good";
        const message = x.pct === null ? "No attendance recorded yet."
          : x.pct < THRESHOLD ? (<>⚠️ Attend the next <strong>{x.mustAttend}</strong> class{x.mustAttend !== 1 ? "es" : ""} to return to 75%.</>)
          : (<>✓ You can miss <strong>{x.canMiss}</strong> more class{x.canMiss !== 1 ? "es" : ""} without falling below 75%.</>);
        return (
          <article className={"card guardian" + tr} key={s.id}>
            <div>
              <div className="subject-code">{s.code}</div>
              <div className="subject-name" style={{ marginTop: "2px" }}>{s.name}</div>
              <div className={"attendance-count " + tone}>{x.attended} / {x.held} · {x.pct ?? "—"}%</div>
              <div className={"guardian-message " + tone}>{message}</div>
            </div>
            <div className="guardian-actions">
              <div className="field date-field"><label>Class date</label><input type="date" defaultValue={today} ref={el => { dates.current[s.id] = el; }} /></div>
              <button className={"btn primary small" + mg} onClick={() => ctx.mark(s.id, "present", dates.current[s.id]?.value)}>Present</button>
              <button className={"btn danger small" + mg} onClick={() => ctx.mark(s.id, "absent", dates.current[s.id]?.value)}>Absent</button>
            </div>
          </article>
        );
      })}
    </div>
  </>);
}

function Assistant({ ctx }) {
  const { mg } = ctx;
  const state = currentData();
  const firstSubject = state.subjects[0];
  const chips = [
    ["What should I study today?", "What should I study today?"],
    ["How is my attendance?", "How is my attendance?"],
    ...(firstSubject ? [[`Mark ${firstSubject.name} present`, `Mark ${firstSubject.code} present`]] : []),
    ["What is overdue?", "What is overdue?"],
    ["Give me a summary of patterns", "Summary of patterns"],
    ["Motivate me", "Motivate me"]
  ];
  const log = useRef(null);
  const timers = useRef([]);
  const [messages, setMessages] = useState([{
    kind: "bot",
    text: `Hi ${escapeHTML(state.user?.name?.split(" ")[0] || "there")}! I can answer questions about your own subjects, assignments, attendance and XP. To update a class, say “mark [subject name] present” or “mark [subject name] absent”.`
  }]);
  const [input, setInput] = useState("");

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { log.current.scrollTop = log.current.scrollHeight; }, [messages]);

  function ask(q) {
    if (!q.trim()) return;
    setMessages(m => [...m, { kind: "user", text: q }]);
    timers.current.push(setTimeout(() => setMessages(m => [...m, { kind: "bot", text: aiAnswer(q) }]), 350));
  }

  return (<>
    <Intro title="AI Study Assistant" subtitle="Ask about the demo data. It is a transparent, local rule-based engine — no API key or network call." />
    <section className="chat">
      <div id="chatLog" className="chat-log" ref={log}>
        {messages.map((m, i) => m.kind === "bot" ? (
          <div className="message bot" key={i}><div className="ai-label">✦ EduSync AI · Local logic</div><div dangerouslySetInnerHTML={{ __html: m.text }} /></div>
        ) : (
          <div className="message user" key={i}>{m.text}</div>
        ))}
      </div>
      <div className="chips">
        {chips.map(([q, label]) => <button key={q} className={"chip" + mg} onClick={() => ask(q)}>{label}</button>)}
      </div>
      <form className="chat-form" id="chatForm" onSubmit={(e) => { e.preventDefault(); const q = input.trim(); if (q) { setInput(""); ask(q); } }}>
        <input id="chatInput" autoComplete="off" placeholder="Ask anything about your studies…" value={input} onChange={e => setInput(e.target.value)} />
        <button className={"btn ai" + mg} type="submit">Send</button>
      </form>
    </section>
  </>);
}

/* ---------------- auth views ---------------- */
const authFrame = (inner) => (
  <div className="bare-page"><div className="blob blob-1"></div><div className="blob blob-2"></div>{inner}</div>
);
const linkBtn = { border: 0, background: "transparent", padding: 0 };
const errStyle = (msg) => ({ display: msg ? "block" : "none", fontSize: "13px", margin: "-4px 0 12px" });

function Landing({ ctx }) {
  return authFrame(<>
    <nav className="landing-nav"><div className="brand"><span className="mark">ES</span>EduSync</div><div className="btn-row"><button className="btn ghost small magnetic" onClick={() => ctx.setRoute("login")}>Log in</button><button className="btn primary small magnetic" onClick={() => ctx.setRoute("register")}>Get started</button></div></nav>
    <section className="landing-hero reveal in"><div className="mark">ES</div><h1>Everything your studies need.</h1><p className="landing-sub">Plan, organize, track and improve your academic life — with a local AI Study Assistant and no server required for this evaluation demo.</p><div className="btn-row" style={{ justifyContent: "center" }}><button className="btn primary magnetic" onClick={() => ctx.setRoute("register")}>Create account</button><button className="btn ghost magnetic" onClick={ctx.useDemo}>Try the evaluation demo</button></div></section>
    <section className="landing-section"><h2>Why EduSync?</h2><div className="feature-grid"><article className="card feature-card tilt reveal"><div className="feature-icon" style={{ background: "var(--aiTint)", color: "var(--ai)" }}>✦</div><h3>AI Study Assistant</h3><p>Answers study, attendance and overdue-work questions from the student’s own data.</p></article><article className="card feature-card tilt reveal"><div className="feature-icon" style={{ background: "var(--primaryTint)", color: "var(--primary2)" }}>🎯</div><h3>One next step</h3><p>A transparent priority engine recommends the most useful task to complete now.</p></article><article className="card feature-card tilt reveal"><div className="feature-icon" style={{ background: "var(--greenTint)", color: "var(--green)" }}>◈</div><h3>Attendance Guardian</h3><p>Shows exactly how many classes can be missed or must be attended to stay above 75%.</p></article></div></section>
  </>);
}

function Login({ ctx }) {
  const [error, setError] = useState("");
  function onSubmit(e) {
    e.preventDefault();
    const values = new FormData(e.currentTarget), email = String(values.get("email")).trim().toLowerCase(), password = String(values.get("password"));
    const user = db.state.users.find(account => account.email === email);
    if (!user || user.passwordHash !== credentialHash(password, email)) return setError("That email or password does not look right.");
    user.verified = true;
    db.state.session.userId = user.id; save(); ctx.setRoute("dashboard");
  }
  return authFrame(
    <div className="auth-wrap"><button className="auth-back magnetic" onClick={() => ctx.setRoute("landing")}>← Back</button><div className="auth-card tilt reveal in"><div className="auth-brand"><span className="mark">ES</span><h1>Welcome back</h1><p className="muted" style={{ fontSize: "13.5px", marginTop: "4px" }}>Log in to continue your study plan.</p></div>
      <form id="fullLoginForm" onSubmit={onSubmit}><div className="form-group"><label>Email</label><input name="email" type="email" required placeholder="you@example.com" /></div><div className="form-group"><label>Password</label><input name="password" type="password" required placeholder="••••••••" /></div><p id="loginError" className="danger" style={errStyle(error)}>{error}</p><button className="btn primary magnetic" style={{ width: "100%" }} type="submit">Log in</button></form>
      <div className="demo-note" style={{ marginTop: "14px" }}><span>✦</span><div><strong>Evaluation demo</strong><br /><span style={{ fontWeight: 500 }}>demo@edusync.app · EduSync@2026</span></div><button className="btn ghost small magnetic" onClick={ctx.useDemo}>Use demo</button></div>
      <div className="auth-foot">New to EduSync? <button className="auth-link" style={linkBtn} onClick={() => ctx.setRoute("register")}>Create an account</button></div></div></div>
  );
}

function Register({ ctx }) {
  const [error, setError] = useState("");
  const captcha = ctx.captcha.current;
  function onSubmit(e) {
    e.preventDefault();
    const values = new FormData(e.currentTarget), fullName = String(values.get("name")).trim(), email = String(values.get("email")).trim().toLowerCase(), password = String(values.get("password")), confirm = String(values.get("confirm"));
    if (Number(values.get("captcha")) !== captcha.answer) return setError("CAPTCHA answer is incorrect. Please try again.");
    if (password.length < 6) return setError("Password must be at least six characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (db.state.users.some(account => account.email === email)) return setError("An account with this email already exists.");
    const user = { id: uid(), fullName, email, course: String(values.get("course")).trim(), semester: String(values.get("semester")).trim(), verified: true, passwordHash: credentialHash(password, email) };
    db.state.users.push(user);
    db.state.profiles[user.id] = { user: { name: fullName, course: user.course, semester: user.semester }, xp: 0, subjects: [], assignments: [], attendance: [] };
    db.state.session.userId = user.id;
    save();
    ctx.setRoute("dashboard");
  }
  return authFrame(
    <div className="auth-wrap" style={{ maxWidth: "490px" }}><button className="auth-back magnetic" onClick={() => ctx.setRoute("landing")}>← Back</button><div className="auth-card tilt reveal in"><div className="auth-brand"><span className="mark">ES</span><h1>Create your account</h1><p className="muted" style={{ fontSize: "13.5px", marginTop: "4px" }}>Your account and study profile are saved on this device.</p></div>
      <form id="fullRegisterForm" onSubmit={onSubmit}><div className="form-group"><label>Full name</label><input name="name" required /></div><div className="form-group"><label>Email</label><input name="email" type="email" required placeholder="you@example.com" /></div><div className="grid two" style={{ gap: "12px" }}><div className="form-group"><label>Course</label><input name="course" placeholder="B.E. CSE" /></div><div className="form-group"><label>Semester</label><input name="semester" type="number" min="1" max="12" placeholder="3" /></div></div><div className="grid two" style={{ gap: "12px" }}><div className="form-group"><label>Password</label><input name="password" type="password" required minLength="6" /></div><div className="form-group"><label>Confirm password</label><input name="confirm" type="password" required minLength="6" /></div></div>
        <div className="captcha-box"><div><div className="muted" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Local CAPTCHA</div><div className="captcha-question">{captcha.question} = ?</div></div><input aria-label="CAPTCHA answer" name="captcha" type="number" required placeholder="Answer" /></div>
        <p id="registerError" className="danger" style={errStyle(error)}>{error}</p><button className="btn primary magnetic" style={{ width: "100%" }} type="submit">Create account</button></form>
      <div className="auth-foot">Already have an account? <button className="auth-link" style={linkBtn} onClick={() => ctx.setRoute("login")}>Log in</button></div></div></div>
  );
}

/* ---------------- modals ---------------- */
function SubjectForm({ modal, onSubmit, onClose }) {
  const s = modal.s;
  return (<>
    <div className="modal-head"><h2>{modal.id ? "Edit" : "Add"} Subject</h2><button className="close" onClick={onClose}>×</button></div>
    <form id="subjectForm" onSubmit={onSubmit}>
      <input type="hidden" name="id" defaultValue={modal.id || ""} />
      <div className="form-grid"><div className="field"><label>Subject code</label><input required name="code" defaultValue={s.code} placeholder="CSE304" /></div><div className="field"><label>Credits</label><input required type="number" min="1" max="10" name="credits" defaultValue={s.credits} /></div></div>
      <div className="field"><label>Subject name</label><input required name="name" defaultValue={s.name} placeholder="Computer Networks" /></div>
      <div className="form-grid"><div className="field"><label>Faculty</label><input name="faculty" defaultValue={s.faculty || ""} /></div><div className="field"><label>Target grade</label><input name="targetGrade" defaultValue={s.targetGrade || ""} placeholder="A" /></div></div>
      <div className="form-grid"><div className="field"><label>Internal marks</label><input type="number" min="0" max="100" name="marks" defaultValue={s.marks ?? ""} /></div><div className="field"><label>Subject colour</label><input style={{ height: "42px", padding: "5px" }} type="color" name="color" defaultValue={s.color} /></div></div>
      <button className="btn primary" type="submit">Save subject</button>
    </form>
  </>);
}

function AssignmentForm({ modal, onSubmit, onClose }) {
  const a = modal.a;
  return (<>
    <div className="modal-head"><h2>{modal.id ? "Edit" : "Add"} Assignment</h2><button className="close" onClick={onClose}>×</button></div>
    <form id="assignmentForm" onSubmit={onSubmit}>
      <input type="hidden" name="id" defaultValue={modal.id || ""} />
      <div className="field"><label>Title</label><input required name="title" defaultValue={a.title} placeholder="Assignment title" /></div>
      <div className="field"><label>Subject</label><select required name="subjectId" defaultValue={a.subjectId}>{currentData().subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}</select></div>
      <div className="field"><label>Description</label><textarea name="description" placeholder="What needs to be submitted?" defaultValue={a.description || ""}></textarea></div>
      <div className="form-grid"><div className="field"><label>Deadline</label><input required type="datetime-local" name="deadline" defaultValue={localInput(a.deadline)} /></div><div className="field"><label>Priority</label><select name="priority" defaultValue={a.priority}>{["low", "medium", "high"].map(x => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select></div></div>
      <button className="btn primary" type="submit">Save assignment</button>
    </form>
  </>);
}

/* ---------------- the app ---------------- */
export default function SingleApp() {
  const [viewKey, bumpView] = useReducer(k => k + 1, 0);
  const init = useRef(null);
  if (!init.current) { ensureAuthModel(); init.current = resolveInitial(); }

  const [route, setRouteState] = useState(init.current.route);
  const [page, setPage] = useState(init.current.page);
  const [decorated, setDecorated] = useState(init.current.decorated);
  const [modal, setModal] = useState(null);
  const captcha = useRef(makeCaptcha());
  const motion = useRef(null);

  const isApp = APP_ROUTES.includes(route);

  /* ---- routing (the IIFE's setRoute) ---- */
  function setRoute(next, replace = false) {
    if (!ALL_ROUTES.includes(next)) next = "landing";
    const method = replace ? "replaceState" : "pushState";
    if (APP_ROUTES.includes(next)) {
      if (!activeAccount()) return setRoute("login", true);
      setPage(next);
      syncProfile();
      window.history[method](null, "", `#${next}`);
      setRouteState(next); setDecorated(true); bumpView();
      return;
    }
    window.history[method](null, "", `#${next}`);
    if (next === "register") captcha.current = makeCaptcha();
    setRouteState(next); bumpView();
  }
  const setRouteRef = useRef(setRoute);
  setRouteRef.current = setRoute;

  /* navigate(): page-to-page inside the app */
  function navigate(to) {
    if (!PAGES.some(p => p.id === to)) return;
    setPage(to); setRouteState(to);
    if (window.location.hash !== `#${to}`) window.history.pushState(null, "", `#${to}`);
    bumpView();
  }
  /* any button[data-page] */
  function onPageButton(to) {
    if (!activeAccount()) { setRoute("login"); return; }
    navigate(to);
    setDecorated(true);
  }

  /* render() after a data change: redraws the view without re-decorating */
  function render() { setDecorated(false); bumpView(); }

  function closeModal() { setModal(null); }
  function openSubject(id) {
    const s = id ? subject(id) : { code: "", name: "", faculty: "", credits: 3, targetGrade: "A", marks: "", color: "#ff5a36" };
    setModal({ type: "subject", id: id || "", s });
  }
  function openAssignment(id) {
    const data = currentData();
    const a = id ? data.assignments.find(x => x.id === id) : { title: "", subjectId: data.subjects[0]?.id || "", description: "", deadline: iso(2), priority: "medium" };
    setModal({ type: "assignment", id: id || "", a });
  }

  function useDemo() { db.state.session.userId = "edusync-demo-user"; save(); setRoute("dashboard"); }
  function resetDemo() {
    if (!confirm("Restore the predefined evaluation data? Your current demo changes will be replaced.")) return;
    db.state.profiles[DEMO_USER_ID] = seededState(); db.state.session.userId = DEMO_USER_ID; save(); setRoute("dashboard");
  }
  function logout() { db.state.session.userId = null; save(); setRoute("login"); }

  const ctx = {
    tr: decorated ? " tilt reveal" : "",
    mg: decorated ? " magnetic" : "",
    captcha, setRoute, useDemo, onPageButton, openSubject, openAssignment,
    deleteSubject(id) {
      const s = subject(id);
      if (s && confirm(`Remove ${s.name} and its linked data?`)) {
        const data = currentData();
        data.subjects = data.subjects.filter(x => x.id !== s.id);
        data.assignments = data.assignments.filter(a => a.subjectId !== s.id);
        data.attendance = data.attendance.filter(a => a.subjectId !== s.id);
        save(); flash("Subject and linked data removed."); render();
      }
    },
    deleteAssignment(id) {
      const data = currentData();
      const a = data.assignments.find(x => x.id === id);
      if (a && confirm(`Delete “${a.title}”?`)) {
        data.assignments = data.assignments.filter(x => x.id !== a.id);
        save(); flash("Assignment deleted."); render();
      }
    },
    complete(id) { if (completeAssignment(id, flash)) render(); },
    mark(subjectId, status, dateValue) { markAttendance(subjectId, status, dateValue); flash("Attendance updated."); render(); }
  };

  /* ---- effects ---- */
  useLayoutEffect(() => {
    // index.html replaced the URL hash with the resolved first route on load
    window.history.replaceState(null, "", `#${init.current.route}`);
  }, []);

  useEffect(() => { document.title = "EduSync — Your Academic Overview"; }, []);

  useEffect(() => {
    document.body.classList.toggle("auth-mode", !isApp);
    return () => document.body.classList.remove("auth-mode");
  }, [isApp]);

  useEffect(() => {
    const onHash = () => { const r = window.location.hash.slice(1); if (ALL_ROUTES.includes(r)) setRouteRef.current(r, true); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    motion.current = initMotion();
    return () => motion.current.destroy();
  }, []);
  useEffect(() => { motion.current?.refresh(); });   // pick up new .reveal nodes after every render

  const account = activeAccount();
  const pageLabel = PAGES.find(p => p.id === page).label;
  const views = { dashboard: Dashboard, subjects: Subjects, assignments: Assignments, attendance: Attendance, assistant: Assistant };
  const authViews = { landing: Landing, login: Login, register: Register };
  const View = isApp ? views[route] : authViews[route];

  return (
    <>
      <style>{singleCss}</style>
      <div className="shell">
        <aside className="sidebar"><div className="brand"><span className="mark">ES</span>EduSync</div>
          <nav className="nav" id="sideNav">
            {PAGES.map(p => (
              <button key={p.id} className={(page === p.id ? "active" : "") + " " + (p.ai ? "ai" : "")} onClick={() => onPageButton(p.id)}><span>{ICONS[p.id]}</span> {p.label}</button>
            ))}
          </nav>
        </aside>
        <section className="main">
          <header className="topbar">
            <div className="top-title" id="topTitle">{pageLabel === "Attendance" ? "Attendance Guardian" : pageLabel}</div>
            <div className="profile" id="topProfile">
              {account && (
                <div className="app-profile"><span className="avatar">{initials(account.fullName)}</span><span className="profile-label">{account.fullName.split(" ")[0]}</span><div className="profile-actions">{account.id === DEMO_USER_ID && <button className="btn ghost small magnetic" onClick={resetDemo}>↻ Reset demo</button>}<button className="btn ghost small magnetic" onClick={logout}>Log out</button></div></div>
              )}
            </div>
          </header>
          <main className="content">
            <FlashStack store={flashStore} target="flashStack" className="flash-stack" />
            <div id="view"><Fragment key={viewKey}><View ctx={ctx} /></Fragment></div>
          </main>
        </section>
      </div>
      <nav className="mobile-nav" id="mobileNav">
        {PAGES.map(p => (
          <button key={p.id} className={page === p.id ? "active" : ""} onClick={() => onPageButton(p.id)}>{ICONS[p.id]}<br />{p.label.replace("AI ", "")}</button>
        ))}
      </nav>
      <div className={"modal-layer" + (modal ? " open" : "")} id="modalLayer" aria-hidden={modal ? "false" : "true"}
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        {modal && (
          <div className="modal">
            {modal.type === "subject"
              ? <SubjectForm key={modal.id + "s"} modal={modal} onClose={closeModal} onSubmit={(e) => { e.preventDefault(); saveSubject(e.currentTarget, flash); closeModal(); render(); }} />
              : <AssignmentForm key={modal.id + "a"} modal={modal} onClose={closeModal} onSubmit={(e) => { e.preventDefault(); saveAssignment(e.currentTarget, flash); closeModal(); render(); }} />}
          </div>
        )}
      </div>
    </>
  );
}
