import { useState } from "react";

/* Subject / assignment modals shared by Dashboard (add only),
   Subjects (add + edit) and Assignments (add + edit).
   The backdrop is always mounted and toggled with `.open`, as in the
   original markup; the form body remounts (via `formKey`) on each open so
   it starts from fresh values, like form.reset() + the manual fills did. */

export function SubjectModal({ open, editSubject, title, titleId, onClose, onSubmit, formKey }) {
  const s = editSubject;
  return (
    <div id="subjectModal" className={"modal-backdrop" + (open ? " open" : "")}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head"><h3 id={titleId} style={{ margin: 0 }}>{title}</h3><button className="close-x" onClick={onClose}>✕</button></div>
        <form id="subjectForm" key={formKey} onSubmit={onSubmit}>
          <input type="hidden" id="sub_id" defaultValue={s ? s.id : ""} />
          <div className="grid grid-2" style={{ gap: "12px" }}>
            <div className="form-group"><label>Subject code</label><input type="text" id="sub_code" required placeholder="CSE0301" defaultValue={s ? s.code : ""} /></div>
            <div className="form-group"><label>Credits</label><input type="number" id="sub_credits" min="1" max="10" defaultValue={s ? s.credits : 3} /></div>
          </div>
          <div className="form-group"><label>Subject name</label><input type="text" id="sub_name" required placeholder="Database Management Systems" defaultValue={s ? s.name : ""} /></div>
          <div className="grid grid-2" style={{ gap: "12px" }}>
            <div className="form-group"><label>Faculty</label><input type="text" id="sub_faculty" defaultValue={s ? s.faculty || "" : ""} /></div>
            <div className="form-group"><label>Target grade</label><input type="text" id="sub_grade" placeholder="A" defaultValue={s ? s.targetGrade || "" : ""} /></div>
          </div>
          <div className="grid grid-2" style={{ gap: "12px" }}>
            <div className="form-group"><label>Internal marks (optional)</label><input type="number" id="sub_marks" min="0" max="100" placeholder="e.g. 65" defaultValue={s ? s.marks ?? "" : ""} /></div>
            <div className="form-group"><label>Color</label><input type="color" id="sub_color" defaultValue={s ? s.color : "#FF5A36"} style={{ height: "44px", padding: "4px" }} /></div>
          </div>
          <div className="btn-row"><button type="submit" className="btn btn-primary magnetic">Save subject</button></div>
        </form>
      </div>
    </div>
  );
}

export function AssignmentModal({ open, editAssignment, subjects, title, titleId, onClose, onSubmit, formKey }) {
  const a = editAssignment;
  return (
    <div id="assignmentModal" className={"modal-backdrop" + (open ? " open" : "")}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head"><h3 id={titleId} style={{ margin: 0 }}>{title}</h3><button className="close-x" onClick={onClose}>✕</button></div>
        <form id="assignmentForm" key={formKey} onSubmit={onSubmit}>
          <input type="hidden" id="asg_id" defaultValue={a ? a.id : ""} />
          <div className="form-group"><label>Title</label><input type="text" id="asg_title" required defaultValue={a ? a.title : ""} /></div>
          <div className="form-group"><label>Subject</label>
            <select id="asg_subject" required defaultValue={a ? a.subjectId : undefined}>
              {formKey > 0 && subjects.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Description</label><textarea id="asg_desc" defaultValue={a ? a.description || "" : ""}></textarea></div>
          <div className="grid grid-2" style={{ gap: "12px" }}>
            <div className="form-group"><label>Deadline</label><input type="datetime-local" id="asg_deadline" required defaultValue={a ? a.deadline.slice(0, 16) : ""} /></div>
            <div className="form-group"><label>Priority</label>
              <select id="asg_priority" defaultValue={a ? a.priority : "medium"}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select>
            </div>
          </div>
          <div className="btn-row"><button type="submit" className="btn btn-primary magnetic">Save assignment</button></div>
        </form>
      </div>
    </div>
  );
}

/* Reads the subject form the way the original handlers did. */
export function readSubjectForm(form) {
  const f = form.elements;
  return {
    id: f.sub_id.value,
    payload: {
      code: f.sub_code.value.trim(),
      name: f.sub_name.value.trim(),
      faculty: f.sub_faculty.value.trim(),
      targetGrade: f.sub_grade.value.trim(),
      marks: f.sub_marks.value,
      credits: Number(f.sub_credits.value) || 3,
      color: f.sub_color.value
    }
  };
}

export function readAssignmentForm(form) {
  const f = form.elements;
  return {
    id: f.asg_id.value,
    payload: {
      title: f.asg_title.value.trim(),
      subjectId: f.asg_subject.value,
      description: f.asg_desc.value.trim(),
      deadline: new Date(f.asg_deadline.value).toISOString(),
      priority: f.asg_priority.value
    }
  };
}

/* Small hook: modal open/close + a key that bumps on each open. */
export function useModal() {
  const [state, setState] = useState({ open: false, editId: null, key: 0 });
  return {
    ...state,
    openWith: (editId = null) => setState(s => ({ open: true, editId, key: s.key + 1 })),
    close: () => setState(s => ({ ...s, open: false }))
  };
}
