import { Fragment, useReducer } from "react";
import { Shell } from "../Shell.jsx";
import { usePage } from "../SiteLayout.jsx";
import { flash } from "../flash.js";
import { assignmentBucket, currentUserData, fmtDateTime, saveApp, uid } from "../core.js";
import { AssignmentModal, readAssignmentForm, useModal } from "../Modals.jsx";

export default function Assignments() {
  usePage("Assignments — EduSync", "assignments");
  const [renderKey, renderAssignments] = useReducer(k => k + 1, 0);
  const modal = useModal();

  const D = currentUserData();
  const buckets = { overdue: [], due_today: [], due_soon: [], upcoming: [], completed: [] };
  D.assignments.slice().sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).forEach(a => buckets[assignmentBucket(a)].push(a));
  const labels = { overdue: "Overdue", due_today: "Due Today", due_soon: "Due Soon", upcoming: "Upcoming", completed: "Completed" };
  const anyItems = Object.values(buckets).some(arr => arr.length);
  const editAssignment = modal.editId ? D.assignments.find(x => x.id === modal.editId) : null;

  function openAssignmentModal(editId) {
    if (!D.subjects.length) { flash("Add a subject first.", "error"); return; }
    modal.openWith(editId);
  }

  function onSubmit(e) {
    e.preventDefault();
    const { id, payload } = readAssignmentForm(e.currentTarget);
    if (id) { Object.assign(D.assignments.find(x => x.id === id), payload); flash("Assignment updated.", "success"); }
    else { D.assignments.push({ id: uid(), status: "pending", completedAt: null, ...payload }); flash("Assignment added.", "success"); }
    saveApp();
    modal.close();
    renderAssignments();
  }

  function complete(id) {
    const a = D.assignments.find(x => x.id === id);
    a.status = "completed"; a.completedAt = new Date().toISOString();
    D.xp += 20;
    saveApp();
    flash(`Nice work — '${a.title}' marked complete. +20 XP`, "success");
    renderAssignments();
  }

  function remove(id) {
    const a = D.assignments.find(x => x.id === id);
    if (confirm(`Delete '${a.title}'? This can't be undone.`)) {
      D.assignments = D.assignments.filter(x => x.id !== a.id);
      saveApp();
      flash("Assignment deleted.", "success");
      renderAssignments();
    }
  }

  return (
    <>
      <Shell active="assignments" title="Assignments">
        <div id="pageRoot" key={renderKey}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <p style={{ color: "var(--muted)", margin: 0 }}>{D.subjects.length ? "Track and complete your work." : "Add a subject first to create assignments."}</p>
            <button className="btn btn-primary btn-sm magnetic" id="addAssignmentBtn" disabled={!D.subjects.length} onClick={() => openAssignmentModal()}>Add Assignment</button>
          </div>
          {!anyItems && <div className="card empty-state"><div className="empty-glyph">🎯</div>You're all caught up. No pending assignments.</div>}

          {Object.keys(labels).map(key => {
            if (!buckets[key].length) return null;
            return (
              <Fragment key={key}>
                <div className="bucket-heading">{labels[key]} ({buckets[key].length})</div>
                {buckets[key].map(a => {
                  const subject = D.subjects.find(s => s.id === a.subjectId);
                  return (
                    <div className="assignment-row" key={a.id}>
                      <div className="assignment-info">
                        <div className="assignment-title">{a.title}</div>
                        <div className="assignment-meta">{subject ? subject.code : "—"} · <span className="mono">{fmtDateTime(a.deadline)}</span> · {a.priority} priority</div>
                      </div>
                      <div className="btn-row">
                        {a.status === "pending" && (<>
                          <button className="btn btn-ghost btn-sm magnetic" onClick={() => complete(a.id)}>Mark done</button>
                          <button className="btn btn-ghost btn-sm magnetic" onClick={() => openAssignmentModal(a.id)}>Edit</button>
                        </>)}
                        <button className="btn btn-danger btn-sm magnetic" onClick={() => remove(a.id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </Shell>

      <AssignmentModal titleId="assignmentModalTitle" open={modal.open} formKey={modal.key} editAssignment={editAssignment}
        subjects={D.subjects} title={modal.editId ? "Edit Assignment" : "Add Assignment"}
        onClose={modal.close} onSubmit={onSubmit} />
    </>
  );
}
