import { useReducer, useState } from "react";
import { Shell } from "../Shell.jsx";
import { usePage } from "../SiteLayout.jsx";
import { flash } from "../flash.js";
import { currentUserData, saveApp, subjectAttendance } from "../core.js";

/* =========================================================
   STATE
   ========================================================= */

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

/* =========================================================
   HELPERS
   ========================================================= */

function getData() {
  const D = currentUserData();

  if (!D.timetable) {
    D.timetable = {
      preferences: {
        studyStart: "17:00",
        studyEnd: "22:30",
        sessionLength: 50,
        breakLength: 10,
        studyDays: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday"
        ],
        intensity: "balanced",
        gym: true,
        gymStart: "19:00",
        gymEnd: "20:30"
      },

      schedule: null
    };
  }

  return D.timetable;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(total) {
  total = total % (24 * 60);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function subjectInitials(name) {
  return String(name || "Subject")
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

/* =========================================================
   PRIORITY ENGINE
   ========================================================= */

function calculateSubjectPriority(subject) {
  const D = currentUserData();
  const attendance = subjectAttendance(subject.id);
  let score = 50;

  /* Weak marks */
  if (subject.marks !== null && subject.marks !== undefined && subject.marks !== "") {
    const marks = Number(subject.marks);
    if (marks < 50) score += 30;
    else if (marks < 60) score += 22;
    else if (marks < 70) score += 12;
    else if (marks < 80) score += 5;
  }

  /* Attendance risk */
  if (attendance.pct !== null) {
    if (attendance.pct < 60) score += 30;
    else if (attendance.pct < 65) score += 25;
    else if (attendance.pct < 70) score += 18;
    else if (attendance.pct < 75) score += 10;
  }

  /* Pending assignments */
  const pendingAssignments = D.assignments.filter(
    a => a.subjectId === subject.id && a.status === "pending"
  );
  score += Math.min(pendingAssignments.length * 5, 20);

  return score;
}

function getSubjectRanking() {
  const D = currentUserData();
  return [...D.subjects]
    .map(subject => ({ subject, score: calculateSubjectPriority(subject) }))
    .sort((a, b) => b.score - a.score);
}

/* =========================================================
   SCHEDULE SLOTS
   ========================================================= */

function Slot({ slot }) {
  if (slot.type === "gym") {
    return (
      <div className="schedule-slot gym-slot">
        <div className="slot-time">{slot.start} <span>—</span> {slot.end}</div>
        <div className="slot-main">
          <div className="slot-icon">{slot.icon}</div>
          <div>
            <div className="slot-title">{slot.title}</div>
            <div className="slot-meta">Personal routine</div>
          </div>
        </div>
      </div>
    );
  }

  if (slot.type === "break") {
    return (
      <div className="schedule-slot break-slot">
        <div className="slot-time">{slot.start} <span>—</span> {slot.end}</div>
        <div className="slot-main">
          <div className="slot-icon">☕</div>
          <div>
            <div className="slot-title">Short Break</div>
            <div className="slot-meta">Reset &amp; recharge</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="schedule-slot study-slot" style={{ borderLeftColor: slot.color }}>
      <div className="slot-time">{slot.start} <span>—</span> {slot.end}</div>
      <div className="slot-main">
        <div className="slot-avatar" style={{ background: slot.color }}>{subjectInitials(slot.title)}</div>
        <div>
          <div className="slot-title">{slot.title}</div>
          <div className="slot-meta">{slot.code || "Study"} · {slot.duration} min</div>
        </div>
      </div>
    </div>
  );
}

function Summary({ schedule }) {
  let studySessions = 0;
  let totalMinutes = 0;
  let gymSessions = 0;

  Object.values(schedule).forEach(day => {
    day.forEach(slot => {
      if (slot.type === "study") {
        studySessions++;
        totalMinutes += slot.duration || 0;
      }
      if (slot.type === "gym") {
        gymSessions++;
      }
    });
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <>
      <div className="summary-card">
        <div className="summary-icon">📚</div>
        <div>
          <div className="summary-value">{studySessions}</div>
          <div className="summary-label">Study sessions</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon">⏱️</div>
        <div>
          <div className="summary-value">{hours}h {mins ? mins + "m" : ""}</div>
          <div className="summary-label">Weekly study time</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon">🎯</div>
        <div>
          <div className="summary-value">{currentUserData().subjects.length}</div>
          <div className="summary-label">Subjects considered</div>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-icon">🏋️</div>
        <div>
          <div className="summary-value">{gymSessions}</div>
          <div className="summary-label">Personal blocks</div>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default function Timetable() {
  usePage("Timetable — EduSync", "timetable");
  const [, rerender] = useReducer(k => k + 1, 0);

  const D = currentUserData();
  const timetable = getData();
  const prefs = timetable.preferences;

  /* Form fields — initialised from the saved preferences */
  const [selectedDays, setSelectedDays] = useState(prefs.studyDays);
  const [studyStart, setStudyStart] = useState(prefs.studyStart);
  const [studyEnd, setStudyEnd] = useState(prefs.studyEnd);
  const [sessionLength, setSessionLength] = useState(String(prefs.sessionLength));
  const [breakLength, setBreakLength] = useState(String(prefs.breakLength));
  const [intensity, setIntensity] = useState(prefs.intensity);
  const [includeGym, setIncludeGym] = useState(prefs.gym);
  const [gymStart, setGymStart] = useState(prefs.gymStart);
  const [gymEnd, setGymEnd] = useState(prefs.gymEnd);

  function toggleDay(day) {
    // keep Monday→Sunday order, like reading the checkboxes in the DOM did
    setSelectedDays(cur => DAYS.filter(d => d === day ? !cur.includes(d) : cur.includes(d)));
  }

  /* =========================================================
     GENERATOR
     ========================================================= */

  function generateTimetable() {
    if (!D.subjects.length) {
      flash("Add at least one subject before generating your timetable.", "error");
      return;
    }

    if (!selectedDays.length) {
      flash("Select at least one study day.", "error");
      return;
    }

    const sessionLen = Number(sessionLength);
    const breakLen = Number(breakLength);

    if (timeToMinutes(studyEnd) <= timeToMinutes(studyStart)) {
      flash("Study end time must be after the start time.", "error");
      return;
    }

    /* Save preferences */
    timetable.preferences = {
      studyStart,
      studyEnd,
      sessionLength: sessionLen,
      breakLength: breakLen,
      studyDays: selectedDays,
      intensity,
      gym: includeGym,
      gymStart,
      gymEnd
    };

    /* SUBJECT ORDER */
    let ranking = getSubjectRanking();

    if (intensity === "weak") {
      ranking.sort((a, b) => b.score - a.score);
    }
    else if (intensity === "balanced") {
      /*
       * Keep priority but distribute subjects
       * more evenly.
       */
      ranking = ranking.sort((a, b) => b.score - a.score);
    }
    else if (intensity === "deadline") {
      ranking.sort((a, b) => {
        const aAssignments = D.assignments.filter(
          x => x.subjectId === a.subject.id && x.status === "pending"
        );
        const bAssignments = D.assignments.filter(
          x => x.subjectId === b.subject.id && x.status === "pending"
        );

        const aDeadline = aAssignments.length
          ? Math.min(...aAssignments.map(x => new Date(x.deadline).getTime()))
          : Infinity;

        const bDeadline = bAssignments.length
          ? Math.min(...bAssignments.map(x => new Date(x.deadline).getTime()))
          : Infinity;

        return aDeadline - bDeadline;
      });
    }

    /* BUILD SCHEDULE */
    const schedule = {};

    selectedDays.forEach((day, dayIndex) => {
      schedule[day] = [];

      let cursor = timeToMinutes(studyStart);
      const end = timeToMinutes(studyEnd);

      let subjectIndex = dayIndex % ranking.length;

      let safety = 0;

      while (cursor + sessionLen <= end && safety < 30) {
        safety++;

        /* Gym block */
        if (
          includeGym &&
          cursor < timeToMinutes(gymEnd) &&
          cursor + sessionLen > timeToMinutes(gymStart)
        ) {
          if (cursor < timeToMinutes(gymStart)) {
            cursor = timeToMinutes(gymEnd);
            continue;
          }
          else {
            schedule[day].push({
              type: "gym",
              start: gymStart,
              end: gymEnd,
              title: "Gym / Personal Time",
              icon: "🏋️"
            });

            cursor = timeToMinutes(gymEnd);
            continue;
          }
        }

        const selected = ranking[subjectIndex % ranking.length];
        const subject = selected.subject;

        const startMinutes = cursor;
        const endMinutes = cursor + sessionLen;

        schedule[day].push({
          type: "study",
          subjectId: subject.id,
          title: subject.name,
          code: subject.code,
          start: minutesToTime(startMinutes),
          end: minutesToTime(endMinutes),
          duration: sessionLen,
          score: selected.score,
          color: subject.color || "#FF5A36"
        });

        cursor = endMinutes;

        /* Break */
        if (cursor + breakLen <= end) {
          schedule[day].push({
            type: "break",
            start: minutesToTime(cursor),
            end: minutesToTime(cursor + breakLen),
            title: "Short Break",
            icon: "☕"
          });

          cursor += breakLen;
        }

        /*
         * Rotate subjects so one subject
         * doesn't dominate the whole day.
         */
        subjectIndex++;
      }
    });

    timetable.schedule = schedule;
    saveApp();
    rerender();
    flash("Your personalized timetable has been generated.", "success");
  }

  const schedule = timetable.schedule;
  const ranking = D.subjects.length ? getSubjectRanking().slice(0, 4) : null;

  return (
    <Shell active="timetable" title="Timetable">
      <div id="pageRoot">
        <div className="timetable-page">

          {/* HERO */}
          <div className="timetable-hero">
            <div>
              <div className="eyebrow">✦ EDUSYNC SMART PLANNER</div>
              <h1>Build a timetable <span>that fits you.</span></h1>
              <p>
                Create a personalized weekly study schedule
                using your subjects, academic priorities,
                preferred study hours and routine.
              </p>
            </div>

            <div className="smart-badge">
              <span className="smart-dot"></span>
              Local AI · Rule-based
            </div>
          </div>

          {/* CONFIGURATION */}
          <div className="timetable-builder">

            {/* LEFT */}
            <div className="builder-card">
              <div className="builder-heading">
                <div>
                  <div className="card-title">Customize your schedule</div>
                  <p>Tell EduSync how you like to study.</p>
                </div>
                <div className="builder-icon">⚙️</div>
              </div>

              {/* STUDY DAYS */}
              <div className="form-group">
                <label>Study days</label>
                <div className="day-selector">
                  {DAYS.map(day => (
                    <label className="day-option" key={day}>
                      <input type="checkbox" className="day-check" value={day}
                        checked={selectedDays.includes(day)} onChange={() => toggleDay(day)} />
                      <span>{day.substring(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* TIME */}
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Study starts</label>
                  <input type="time" id="studyStart" value={studyStart} onChange={e => setStudyStart(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Study ends</label>
                  <input type="time" id="studyEnd" value={studyEnd} onChange={e => setStudyEnd(e.target.value)} />
                </div>
              </div>

              {/* SESSION */}
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Session length</label>
                  <select id="sessionLength" value={sessionLength} onChange={e => setSessionLength(e.target.value)}>
                    <option value="25">25 minutes</option>
                    <option value="40">40 minutes</option>
                    <option value="50">50 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Break duration</label>
                  <select id="breakLength" value={breakLength} onChange={e => setBreakLength(e.target.value)}>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                  </select>
                </div>
              </div>

              {/* INTENSITY */}
              <div className="form-group">
                <label>What should EduSync prioritize?</label>
                <select id="intensity" value={intensity} onChange={e => setIntensity(e.target.value)}>
                  <option value="balanced">⚖️ Balanced across subjects</option>
                  <option value="weak">🎯 Weak subjects first</option>
                  <option value="deadline">🔥 Upcoming deadlines first</option>
                </select>
              </div>

              {/* GYM */}
              <div className="routine-box">
                <div className="routine-top">
                  <div>
                    <div className="routine-title">🏋️ Include personal routine</div>
                    <div className="routine-sub">Reserve time for gym or other activities.</div>
                  </div>
                  <label className="switch">
                    <input type="checkbox" id="includeGym" checked={includeGym} onChange={e => setIncludeGym(e.target.checked)} />
                    <span></span>
                  </label>
                </div>

                <div className="grid grid-2 routine-times" id="routineTimes"
                  style={{ opacity: includeGym ? "1" : ".45", pointerEvents: includeGym ? "auto" : "none" }}>
                  <div className="form-group">
                    <label>Start</label>
                    <input type="time" id="gymStart" value={gymStart} onChange={e => setGymStart(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>End</label>
                    <input type="time" id="gymEnd" value={gymEnd} onChange={e => setGymEnd(e.target.value)} />
                  </div>
                </div>
              </div>

              <button className="btn btn-primary timetable-generate-btn" id="generateBtn" onClick={generateTimetable}>
                ✨ Generate My Timetable
              </button>
            </div>

            {/* RIGHT */}
            <div className="builder-side">
              <div className="card priority-card">
                <div className="card-title">🎯 Smart Priority</div>
                <p className="priority-description">
                  EduSync considers your marks,
                  attendance risk and pending work
                  when deciding what deserves more study time.
                </p>

                <div id="priorityPreview">
                  {!ranking ? (
                    <div className="mini-empty">Add subjects to see priorities.</div>
                  ) : ranking.map((item, index) => {
                    const subject = item.subject;
                    const attendance = subjectAttendance(subject.id);
                    return (
                      <div className="priority-row" key={subject.id}>
                        <span className="priority-number">{index + 1}</span>
                        <div className="priority-color" style={{ background: subject.color || "#FF5A36" }}></div>
                        <div className="priority-info">
                          <div className="priority-name">{subject.name}</div>
                          <div className="priority-meta">
                            {attendance.pct !== null ? `Attendance ${attendance.pct}%` : "Attendance not logged"}
                          </div>
                        </div>
                        <span className="priority-score">{Math.round(item.score)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card how-card">
                <div className="card-title">How it works</div>

                <div className="how-step">
                  <span>01</span>
                  <div>
                    <strong>Understand</strong>
                    <p>Reads your subjects, attendance and assignments.</p>
                  </div>
                </div>

                <div className="how-step">
                  <span>02</span>
                  <div>
                    <strong>Prioritize</strong>
                    <p>Identifies subjects that need more attention.</p>
                  </div>
                </div>

                <div className="how-step">
                  <span>03</span>
                  <div>
                    <strong>Schedule</strong>
                    <p>Distributes focused study sessions across your week.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SCHEDULE */}
          <div className="card timetable-result-card" id="scheduleContainer">
            {!schedule ? (
              <div className="timetable-empty">
                <div className="timetable-empty-icon">✨</div>
                <h3>Your timetable is waiting</h3>
                <p>Configure your preferences on the left and generate your personalized study plan.</p>
              </div>
            ) : (<>
              <div className="schedule-header">
                <div>
                  <div className="eyebrow">✦ SMART SCHEDULE</div>
                  <h2>Your Weekly Plan</h2>
                  <p>Generated using your subjects, academic priorities and preferred study hours.</p>
                </div>

                <div className="schedule-actions">
                  <button className="btn btn-ghost btn-sm" id="regenerateBtn" onClick={generateTimetable}>↻ Regenerate</button>
                  <button className="btn btn-primary btn-sm" id="saveTimetableBtn"
                    onClick={() => { saveApp(); flash("Timetable saved to your EduSync account.", "success"); }}>✓ Save</button>
                </div>
              </div>

              <div className="timetable-grid">
                {timetable.preferences.studyDays.map(day => {
                  const entries = schedule[day] || [];
                  return (
                    <div className="day-column" key={day}>
                      <div className="day-header">
                        <span>{day}</span>
                        <span className="day-count">{entries.filter(e => e.type === "study").length} sessions</span>
                      </div>

                      <div className="day-slots">
                        {entries.length
                          ? entries.map((slot, i) => <Slot slot={slot} key={i} />)
                          : <div className="no-session">No study sessions</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="schedule-summary">
                <Summary schedule={schedule} />
              </div>
            </>)}
          </div>

        </div>
      </div>
    </Shell>
  );
}
