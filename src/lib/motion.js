/* ============================================================
   EduSync — motion
   Custom cursor, magnetic buttons, 3D card tilt, scroll-reveal.
   Delegated so it works on content rendered after load too.
   Skipped (apart from scroll-reveal) on touch devices.

   Ported from motion.js — same maths and selectors; wrapped so it
   can be started on mount and torn down on unmount, with a
   refresh() hook to observe `.reveal` elements rendered later.
   ============================================================ */
export function initMotion() {
  const canHover = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); } });
  }, { threshold: 0.15 });
  const refresh = () => document.querySelectorAll(".reveal:not(.in)").forEach(el => io.observe(el));

  if (!canHover) {
    refresh();
    return { refresh, destroy() { io.disconnect(); } };
  }

  const dot = document.createElement("div"); dot.id = "cursorDot";
  const ring = document.createElement("div"); ring.id = "cursorRing";
  const glow = document.createElement("div"); glow.id = "cursorGlow";
  document.body.append(glow, ring, dot);

  let mx = 0, my = 0, rx = 0, ry = 0, gx = 0, gy = 0, active = false, raf = 0, dead = false;

  const onMove = (e) => {
    mx = e.clientX; my = e.clientY;
    if (!active) { active = true; document.body.classList.add("cursor-active"); }
    dot.style.left = mx + "px"; dot.style.top = my + "px";

    const hoverTarget = e.target.closest("a, button, input, select, textarea, .card, .nav-link, .subject-card, .chip");
    ring.classList.toggle("hovering", !!hoverTarget);

    document.querySelectorAll(".magnetic").forEach(el => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = mx - cx, dy = my - cy;
      const dist = Math.hypot(dx, dy);
      const radius = 90;
      if (dist < radius) {
        const strength = (1 - dist / radius) * 12;
        el.style.transform = `translate(${(dx / (dist || 1)) * strength}px, ${(dy / (dist || 1)) * strength}px)`;
      } else {
        el.style.transform = "";
      }
    });

    const tiltCard = e.target.closest(".tilt");
    document.querySelectorAll(".tilt").forEach(el => { if (el !== tiltCard) el.style.transform = ""; });
    if (tiltCard) {
      const r = tiltCard.getBoundingClientRect();
      const px = (mx - r.left) / r.width - 0.5;
      const py = (my - r.top) / r.height - 0.5;
      const max = 5;
      tiltCard.style.transform = `perspective(800px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
    }
  };

  const onLeave = () => {
    document.body.classList.remove("cursor-active");
    document.querySelectorAll(".tilt, .magnetic").forEach(el => el.style.transform = "");
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseleave", onLeave);

  (function loop() {
    if (dead) return;
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    gx += (mx - gx) * 0.09; gy += (my - gy) * 0.09;
    ring.style.left = rx + "px"; ring.style.top = ry + "px";
    glow.style.left = gx + "px"; glow.style.top = gy + "px";
    glow.style.opacity = active ? "1" : "0";
    raf = requestAnimationFrame(loop);
  })();

  refresh();

  return {
    refresh,
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      io.disconnect();
      dot.remove(); ring.remove(); glow.remove();
      document.body.classList.remove("cursor-active");
    }
  };
}
