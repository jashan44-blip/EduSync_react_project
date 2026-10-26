import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import siteCss from "../styles/site.css?raw";
import { initMotion } from "../lib/motion.js";
import { APP, currentUser, showFatalError } from "./core.js";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";

/* Wraps every page of the multi-page site: shared stylesheet + fonts
   (what each page's <head> linked), motion.js, and core.js's global
   error banner. Mounted only while one of these routes is showing, so the
   stylesheet never leaks into the single-file app. */
export function SiteLayout() {
  useEffect(() => {
    const motion = initMotion();
    const onError = (e) => showFatalError(e.error || e.message);
    window.addEventListener("error", onError);
    return () => { motion.destroy(); window.removeEventListener("error", onError); };
  }, []);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href={FONTS} rel="stylesheet" />
      <style>{siteCss}</style>
      <Outlet />
    </>
  );
}

/* Sets <title> and <body data-page="..."> like each original page did. */
export function usePage(title, dataPage) {
  useEffect(() => {
    document.title = title;
    if (dataPage) document.body.dataset.page = dataPage;
    return () => { delete document.body.dataset.page; };
  }, [title, dataPage]);
}

/* requireAuth() — protected pages bounce to login.html */
export function RequireAuth({ children }) {
  return currentUser() ? children : <Navigate to="/login.html" replace />;
}

/* redirectIfLoggedIn() — login/register bounce to dashboard.html */
export function GuestOnly({ children }) {
  return currentUser() ? <Navigate to="/dashboard.html" replace /> : children;
}

export { APP };
