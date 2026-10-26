import { useReducer, useRef } from "react";
import { Shell } from "../Shell.jsx";
import { usePage } from "../SiteLayout.jsx";
import { flash } from "../flash.js";
import { THRESHOLD, currentUserData, guardianStats, markAttendance } from "../core.js";

export default function Attendance() {
  usePage("Attendance — EduSync", "attendance");
  const [renderKey, renderAttendance] = useReducer(k => k + 1, 0);
  const dateInputs = useRef({});

  const D = currentUserData();
  const today = new Date().toISOString().slice(0, 10);

  function mark(subjectId, status) {
    const dateInput = dateInputs.current[subjectId];
    const classDate = dateInput.value || today;
    markAttendance(subjectId, status, classDate);
    flash("Attendance updated.", "success");
    renderAttendance();
  }

  return (
    <Shell active="attendance" title="Attendance Guardian">
      <div id="pageRoot" key={renderKey}>
        {!D.subjects.length ? (
          <div className="card empty-state"><div className="empty-glyph">🛡️</div>Add a subject first to start tracking attendance.</div>
        ) : (<>
          <p style={{ color: "var(--muted)", marginBottom: "18px" }}>Required minimum: {THRESHOLD}%. Mark today's classes below.</p>
          {D.subjects.map(s => {
            const stats = guardianStats(s.id);
            return (
              <div className="card tilt" key={s.id} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div className="subject-code">{s.code}</div>
                    <div className="subject-name" style={{ margin: "2px 0 8px" }}>{s.name}</div>
                    {stats.pct !== null ? (<>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 600 }} className={stats.pct < THRESHOLD ? "metric-value danger" : "metric-value good"}>{stats.attended} / {stats.held} classes · {stats.pct}%</div>
                      {stats.pct < THRESHOLD
                        ? <p style={{ color: "var(--red)", fontSize: "13.5px", marginTop: "8px" }}>⚠️ You need to attend the next {stats.mustAttend} class{stats.mustAttend !== 1 ? "es" : ""} to reach {THRESHOLD}%.</p>
                        : <p style={{ color: "var(--green)", fontSize: "13.5px", marginTop: "8px" }}>✅ You can miss {stats.canMiss} more class{stats.canMiss !== 1 ? "es" : ""} without falling below {THRESHOLD}%.</p>}
                    </>) : (
                      <p style={{ color: "var(--muted)", fontSize: "13.5px" }}>No attendance logged yet for this subject.</p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label>Date</label><input type="date" ref={el => { dateInputs.current[s.id] = el; }} defaultValue={today} style={{ width: "150px" }} /></div>
                    <button className="btn btn-primary btn-sm magnetic" onClick={() => mark(s.id, "present")}>Present</button>
                    <button className="btn btn-danger btn-sm magnetic" onClick={() => mark(s.id, "absent")}>Absent</button>
                  </div>
                </div>
              </div>
            );
          })}
        </>)}
      </div>
    </Shell>
  );
}
