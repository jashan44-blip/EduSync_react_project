import { Link, useNavigate } from "react-router-dom";
import { FlashStack } from "../../lib/flash.jsx";
import { siteFlashStore, flash } from "../flash.js";
import { APP, hashPassword, saveApp } from "../core.js";
import { usePage } from "../SiteLayout.jsx";

export default function Login() {
  usePage("Log in — EduSync");
  const navigate = useNavigate();

  function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = form.elements.li_email.value.trim().toLowerCase();
    const password = form.elements.li_password.value;
    const user = APP.users.find(u => u.email === email);
    if (!user || user.passwordHash !== hashPassword(password, email)) {
      flash("That email or password doesn't look right.", "error", "loginFlash");
      return;
    }
    user.verified = true;
    APP.session.userId = user.id;
    saveApp();
    navigate("/dashboard.html");
  }

  return (
    <div className="bare-page">
      <div className="blob blob-1"></div><div className="blob blob-2"></div>
      <FlashStack store={siteFlashStore} target="loginFlash" className="flash-stack bare-flash" />
      <div className="auth-wrap">
        <Link className="auth-back" to="/index.html">← Back</Link>
        <div className="auth-card tilt">
          <div className="auth-brand"><span className="brand-mark">ES</span><h1 style={{ fontSize: "20px" }}>Welcome back</h1></div>
          <form id="loginForm" onSubmit={onSubmit}>
            <div className="form-group"><label htmlFor="li_email">Email</label><input type="email" id="li_email" required placeholder="you@example.com" /></div>
            <div className="form-group"><label htmlFor="li_password">Password</label><input type="password" id="li_password" required placeholder="••••••••" /></div>
            <button type="submit" className="btn btn-primary magnetic" style={{ width: "100%" }}>Log in</button>
          </form>
          <div className="auth-foot">New to EduSync? <Link className="auth-link" to="/register.html">Create an account</Link></div>
        </div>
      </div>
    </div>
  );
}
