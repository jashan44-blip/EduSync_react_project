import { useReducer } from "react";
import { Shell } from "../Shell.jsx";
import { usePage } from "../SiteLayout.jsx";
import { flash } from "../flash.js";
import { currentUserData, saveApp, subjectAttendance, uid } from "../core.js";
import { SubjectModal, readSubjectForm, useModal } from "../Modals.jsx";

export default function Subjects() {
  usePage("Subjects — EduSync", "subjects");
  const [renderKey, renderSubjects] = useReducer(k => k + 1, 0);
  const modal = useModal();

  const D = currentUserData();
  const subjects = D.subjects;
  const editSubject = modal.editId ? subjects.find(x => x.id === modal.editId) : null;

  function onSubmit(e) {
    e.preventDefault();
    const { id, payload } = readSubjectForm(e.currentTarget);
    if (id) { Object.assign(D.subjects.find(x => x.id === id), payload); flash("Subject updated.", "success"); }
    else { D.subjects.push({ id: uid(), ...payload }); flash("Subject added.", "success"); }
    saveApp();
    modal.close();
    renderSubjects();
  }

  function remove(id) {
    if (confirm("Remove this subject? Its assignments and attendance records will also be deleted.")) {
      D.subjects = D.subjects.filter(s => s.id !== id);
      D.assignments = D.assignments.filter(a => a.subjectId !== id);
      D.attendance = D.attendance.filter(a => a.subjectId !== id);
      saveApp();
      flash("Subject removed.", "success");
      renderSubjects();
    }
  }

  return (
    <>
      <Shell active="subjects" title="Subjects">
        <div id="pageRoot" key={renderKey}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <p style={{ color: "var(--muted)", margin: 0 }}>Everything you're tracking this semester.</p>
            <button className="btn btn-primary btn-sm magnetic" id="addSubjectBtn" onClick={() => modal.openWith()}>Add Subject</button>
          </div>
          {subjects.length ? (
            <div className="grid grid-3" id="subjectGrid">
              {subjects.map(s => {
                const { pct } = subjectAttendance(s.id);
                return (
                  <div className="card subject-card tilt" key={s.id} style={{ borderLeftColor: s.color }}>
                    <div className="subject-top">
                      <div className="subject-avatar" style={{ background: s.color }}>{s.code.replace(/[^A-Z0-9]/gi, "").slice(0, 2).toUpperCase()}</div>
                      <div><div className="subject-code">{s.code}</div><div className="subject-name">{s.name}</div></div>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--muted)" }}>{s.faculty || "Faculty TBD"} · {s.credits} credits</div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${pct ?? 0}%`, background: pct !== null && pct < 75 ? "var(--red)" : s.color }}></div></div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>{pct !== null ? pct + "% attendance" : "No attendance logged yet"}</div>
                    <div className="btn-row" style={{ marginTop: "12px" }}>
                      <button className="btn btn-ghost btn-sm magnetic" onClick={(e) => { e.stopPropagation(); modal.openWith(s.id); }}>Edit</button>
                      <button className="btn btn-danger btn-sm magnetic" onClick={(e) => { e.stopPropagation(); remove(s.id); }}>Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card empty-state"><div className="empty-glyph">📚</div>No subjects yet. Add your first subject to start tracking assignments and attendance.<div style={{ marginTop: "14px" }}><button className="btn btn-primary btn-sm magnetic" id="addSubjectBtn2" onClick={() => modal.openWith()}>Add Subject</button></div></div>
          )}
        </div>
      </Shell>

      <SubjectModal titleId="subjectModalTitle" open={modal.open} formKey={modal.key} editSubject={editSubject}
        title={modal.editId ? "Edit Subject" : "Add Subject"}
        onClose={modal.close} onSubmit={onSubmit} />
    </>
  );
}
