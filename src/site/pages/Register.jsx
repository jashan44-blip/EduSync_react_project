import { Link, useNavigate } from "react-router-dom";
import { FlashStack } from "../../lib/flash.jsx";
import { siteFlashStore, flash } from "../flash.js";
import { APP, hashPassword, saveApp, uid } from "../core.js";
import { usePage } from "../SiteLayout.jsx";

export default function Register() {
  usePage("Create your account — EduSync");
  const navigate = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    const f = e.currentTarget.elements;
    const name = f.re_name.value.trim();
    const email = f.re_email.value.trim().toLowerCase();
    const course = f.re_course.value.trim();
    const semester = f.re_semester.value.trim();
    const password = f.re_password.value;
    const confirm = f.re_confirm.value;

    if (!name || !email) { flash("Please fill in your name and email.", "error", "registerFlash"); return; }
    if (password.length < 6) { flash("Password must be at least 6 characters.", "error", "registerFlash"); return; }
    if (password !== confirm) { flash("Passwords do not match.", "error", "registerFlash"); return; }
    if (APP.users.some(u => u.email === email)) { flash("An account with this email already exists.", "error", "registerFlash"); return; }

    const user = { id: uid(), fullName: name, email, course, semester, verified: true, passwordHash: hashPassword(password, email) };
    APP.users.push(user);
    APP.data[user.id] = { xp: 0, subjects: [], assignments: [], attendance: [] };
    APP.session.userId = user.id;
    saveApp();
    navigate("/dashboard.html");
  }

  return (
    <div className="bare-page">
      <div className="blob blob-1"></div><div className="blob blob-2"></div>
      <FlashStack store={siteFlashStore} target="registerFlash" className="flash-stack bare-flash" />
      <div className="auth-wrap" style={{ maxWidth: "480px" }}>
        <Link className="auth-back" to="/index.html">← Back</Link>
        <div className="auth-card tilt">
          <div className="auth-brand"><span className="brand-mark">ES</span><h1 style={{ fontSize: "20px" }}>Create your account</h1><p style={{ color: "var(--muted)", fontSize: "13.5px", marginTop: "4px" }}>Stored only on this device — no server involved.</p></div>
          <form id="registerForm" onSubmit={onSubmit}>
            <div className="form-group"><label htmlFor="re_name">Full name</label><input type="text" id="re_name" required /></div>
            <div className="form-group"><label htmlFor="re_email">Email</label><input type="email" id="re_email" required placeholder="you@example.com" /></div>
            <div className="grid grid-2" style={{ gap: "12px" }}>
              <div className="form-group"><label htmlFor="re_course">Course</label><input type="text" id="re_course" placeholder="B.E. CSE" /></div>
              <div className="form-group"><label htmlFor="re_semester">Semester</label><input type="number" id="re_semester" min="1" max="12" placeholder="3" /></div>
            </div>
            <div className="grid grid-2" style={{ gap: "12px" }}>
              <div className="form-group"><label htmlFor="re_password">Password</label><input type="password" id="re_password" required /></div>
              <div className="form-group"><label htmlFor="re_confirm">Confirm</label><input type="password" id="re_confirm" required /></div>
            </div>
            <button type="submit" className="btn btn-primary magnetic" style={{ width: "100%" }}>Create account</button>
          </form>
          <div className="auth-foot">Already have an account? <Link className="auth-link" to="/login.html">Log in</Link></div>
        </div>
      </div>
    </div>
  );
}
