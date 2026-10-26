import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FlashStack } from "../lib/flash.jsx";
import { siteFlashStore } from "./flash.js";
import { colorFor, currentUser, deleteAccount, initialsFor, logout } from "./core.js";

/* ============================================================
   Shared sidebar / topbar / bottom navigation (was shell.js).
   ============================================================ */

function Icon({ size, children }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const NAV_ITEMS = [
  {
    key: "dashboard", label: "Dashboard", href: "/dashboard.html",
    icon: (<>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </>)
  },
  {
    key: "subjects", label: "Subjects", href: "/subjects.html",
    icon: (<>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>)
  },
  {
    key: "assignments", label: "Assignments", href: "/assignments.html",
    icon: (<>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </>)
  },
  {
    key: "attendance", label: "Attendance", href: "/attendance.html",
    icon: (<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />)
  },
  {
    key: "timetable", label: "Timetable", href: "/timetable.html",
    icon: (<>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
      <path d="M8 18h2" />
      <path d="M14 18h2" />
    </>)
  },
  {
    key: "assistant", label: "AI Assistant", href: "/assistant.html",
    icon: (<>
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </>),
    ai: true
  }
];

function ProfileChip() {
  const u = currentUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  return (
    <div className="profile-chip" id="profileChip"
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
      <div className="avatar" style={{ background: colorFor(u.email) }}>
        {initialsFor(u.fullName)}
      </div>
      <span className="profile-name">{u.fullName.split(" ")[0]}</span>

      <div className={"profile-menu" + (open ? " open" : "")} id="profileMenu">
        <a id="logoutBtn" onClick={() => { logout(); navigate("/login.html"); }}>
          <Icon size={15}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </Icon>
          Log out
        </a>

        <a id="deleteBtn" style={{ color: "var(--red)" }}
          onClick={() => {
            if (confirm("Delete your account and all its EduSync data from this device? This can't be undone.")) {
              deleteAccount();
              navigate("/index.html");
            }
          }}>
          <Icon size={15}>
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </Icon>
          Delete my data
        </a>
      </div>
    </div>
  );
}

/* The page frame: sidebar, topbar (title + profile), flash stack, and
   the mobile bottom nav. Page content goes in as children. */
export function Shell({ active, title, children }) {
  return (
    <>
      <div className="shell">
        <aside className="sidebar" id="shell-sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark">ES</span>
            <span className="brand-name">EduSync</span>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <Link key={item.key} to={item.href}
                className={"nav-link " + (item.ai ? "ai-link " : "") + (item.key === active ? "active" : "")}>
                <Icon size={18}>{item.icon}</Icon>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <div className="main-column">
          <header className="topbar">
            <div className="topbar-title" id="topbarTitle">{title}</div>
            <ProfileChip />
          </header>
          <main className="content">
            <FlashStack store={siteFlashStore} target="flashStack" className="flash-stack" />
            {children}
          </main>
        </div>
      </div>

      <nav className="bottom-nav" id="shell-bottomnav">
        {NAV_ITEMS.map(item => (
          <Link key={item.key} to={item.href}
            className={(item.key === active ? "active " : "") + (item.ai ? "ai-link" : "")}>
            <Icon size={20}>{item.icon}</Icon>
            {item.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </>
  );
}
