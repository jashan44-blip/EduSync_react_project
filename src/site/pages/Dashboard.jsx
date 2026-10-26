import { Link } from "react-router-dom";
import { useReducer } from "react";
import { Shell } from "../Shell.jsx";
import { usePage } from "../SiteLayout.jsx";
import { flash } from "../flash.js";
import {
  THRESHOLD, assignmentBucket, currentUser, currentUserData, fmtDateTime,
  generateInsights, nextBestAction, saveApp, subjectAttendance, uid
} from "../core.js";
import { AssignmentModal, SubjectModal, readAssignmentForm, readSubjectForm, useModal } from "../Modals.jsx";

export default function Dashboard() {
  usePage("Dashboard — EduSync", "dashboard");
  const [renderKey, renderDashboard] = useReducer(k => k + 1, 0);
  const subjectModal = useModal();
  const assignmentModal = useModal();

  const u = currentUser(); const D = currentUserData();
  const pending = D.assignments.filter(a => a.status === "pending");
  const overdue = pending.filter(a => assignmentBucket(a) === "overdue").length;
  const attendances = D.subjects.map(s => subjectAttendance(s.id).pct).filter(p => p !== null);
  const avgAttendance = attendances.length ? Math.round((attendances.reduce((a, b) => a + b, 0) / attendances.length) * 10) / 10 : null;

  const alerts = [];
  D.subjects.forEach(s => {
    const { pct } = subjectAttendance(s.id);
    if (pct !== null && pct < THRESHOLD) alerts.push(`🔴 ${s.name} attendance is ${pct}% — below the ${THRESHOLD}% requirement.`);
  });
  pending.forEach(a => {
    const deadline = new Date(a.deadline);
    if (deadline < new Date()) alerts.push(`⚠️ '${a.title}' is overdue.`);
    else if (deadline - new Date() < 1000 * 60 * 60 * 24) alerts.push(`🟠 '${a.title}' is due tomorrow.`);
  });

  const rec = nextBestAction();
  const insights = generateInsights();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const upcoming = [...pending].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 5);

  function openSubjectModal() { subjectModal.openWith(); }
  function openAssignmentModal() {
    if (!D.subjects.length) { flash("Add a subject first.", "error"); return; }
    assignmentModal.openWith();
  }

  function onSubjectSubmit(e) {
    e.preventDefault();
    const { payload } = readSubjectForm(e.currentTarget);
    D.subjects.push({ id: uid(), ...payload });
    saveApp();
    subjectModal.close();
    flash("Subject added.", "success");
    renderDashboard();
  }

  function onAssignmentSubmit(e) {
    e.preventDefault();
    const { payload } = readAssignmentForm(e.currentTarget);
    D.assignments.push({ id: uid(), status: "pending", completedAt: null, ...payload });
    saveApp();
    assignmentModal.close();
    flash("Assignment added.", "success");
    renderDashboard();
  }

  let recCard = null;
  if (rec) {
    const pct = Math.min(rec.score, 100);
    const circumference = 251.2;
    const offset = circumference * (1 - pct / 100);
    recCard = (
      <div className="card action-card tilt" style={{ marginBottom: "24px" }}>
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
          <circle cx="48" cy="48" r="40" fill="none" stroke="var(--primary)" strokeWidth="9" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} transform="rotate(-90 48 48)" />
          <text x="48" y="53" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="18" fontWeight="600" fill="var(--ink)">{Math.floor(rec.score)}</text>
        </svg>
        <div className="action-body">
          <div className="action-eyebrow">🎯 Your next best action</div>
          <div className="action-title">Study {rec.subject.name} — {rec.a.title} for {rec.duration} minutes</div>
          <div className="action-reason">Because {rec.reason}.</div>
          <Link className="btn btn-primary btn-sm magnetic" to="/assignments.html">View assignment</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Shell active="dashboard" title="Dashboard">
        <div id="pageRoot" key={renderKey}>
          <h1 style={{ fontSize: "24px", marginBottom: "2px" }}>{greeting}, {u.fullName.split(" ")[0]} 👋</h1>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>Here's where things stand today.</p>
          <div className="grid grid-4" style={{ marginBottom: "24px" }}>
            <div className="card metric-tile tilt"><div className="metric-top"><span className="metric-label">Avg. Attendance</span><span className="metric-icon" style={{ background: "var(--green-tint)" }}>🛡️</span></div><div className={"metric-value " + (avgAttendance !== null && avgAttendance < 75 ? "danger" : "good")}>{avgAttendance !== null ? avgAttendance + "%" : "—"}</div></div>
            <div className="card metric-tile tilt"><div className="metric-top"><span className="metric-label">Pending</span><span className="metric-icon" style={{ background: "var(--primary-tint)" }}>📋</span></div><div className="metric-value">{pending.length}</div></div>
            <div className="card metric-tile tilt"><div className="metric-top"><span className="metric-label">Overdue</span><span className="metric-icon" style={{ background: "var(--red-tint)" }}>⚠️</span></div><div className={"metric-value " + (overdue > 0 ? "danger" : "")}>{overdue}</div></div>
            <div className="card metric-tile tilt"><div className="metric-top"><span className="metric-label">XP</span><span className="metric-icon" style={{ background: "var(--amber-tint)" }}>⭐</span></div><div className="metric-value">{D.xp}</div></div>
          </div>
          {recCard}
          <div className="card insights-card tilt" style={{ marginBottom: "24px" }}>
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>✨ AI Insights <span className="badge badge-ai">local · rule-based</span></div>
            {insights.map((i, idx) => (
              <div className="insight-row" key={idx}><span className="insight-dot"></span><span dangerouslySetInnerHTML={{ __html: i }} /></div>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="card" style={{ marginBottom: "24px" }}>
              <div className="card-title">Academic alerts</div>
              {alerts.map((a, idx) => (
                <div key={idx} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "13.5px" }}>{a}</div>
              ))}
            </div>
          )}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div className="card-title">Upcoming</div>
            {upcoming.length ? upcoming.map(a => {
              const subject = D.subjects.find(s => s.id === a.subjectId);
              const bucket = assignmentBucket(a);
              const badgeClass = bucket === "overdue" ? "badge-danger" : (bucket === "due_today" || bucket === "due_soon") ? "badge-warn" : "badge-neutral";
              return (
                <div className="assignment-row" key={a.id}>
                  <div className="assignment-info">
                    <div className="assignment-title">{a.title}</div>
                    <div className="assignment-meta">{subject ? subject.name : ""} · <span className="mono">{fmtDateTime(a.deadline)}</span></div>
                  </div>
                  <span className={"badge " + badgeClass}>{bucket.replace("_", " ")}</span>
                </div>
              );
            }) : (
              <div className="empty-state"><div className="empty-glyph">🎯</div>You're all caught up. No pending assignments.</div>
            )}
          </div>
          <div className="card-title" style={{ marginBottom: "10px" }}>Quick actions</div>
          <div className="btn-row">
            <button className="btn btn-primary btn-sm magnetic" id="qaAddAssignment" onClick={openAssignmentModal}>Add Assignment</button>
            <button className="btn btn-ghost btn-sm magnetic" id="qaAddSubject" onClick={openSubjectModal}>Add Subject</button>
            <Link className="btn btn-ai btn-sm magnetic" to="/assistant.html">✨ Ask AI Assistant</Link>
          </div>
        </div>
      </Shell>

      <SubjectModal open={subjectModal.open} formKey={subjectModal.key} title="Add Subject"
        onClose={subjectModal.close} onSubmit={onSubjectSubmit} />
      <AssignmentModal open={assignmentModal.open} formKey={assignmentModal.key} title="Add Assignment"
        subjects={D.subjects} onClose={assignmentModal.close} onSubmit={onAssignmentSubmit} />
    </>
  );
}
