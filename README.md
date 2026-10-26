# EduSync — React version

A 1:1 React (Vite + React Router) port of the original HTML/CSS/JS project.
Same look, same data, same `localStorage` keys, same URLs.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview
```


## Routes (same as the original files)

| URL | Original file |
|---|---|
| `/` or `/index.html` | `index.html` — the single-file app (landing, login, register, dashboard, subjects, assignments, attendance, assistant via `#hash`) |
| `/login.html`, `/register.html` | auth pages of the multi-page site |
| `/dashboard.html`, `/subjects.html`, `/assignments.html`, `/attendance.html`, `/assistant.html`, `/timetable.html` | multi-page site |

The two apps keep separate storage (`edusync_evaluation_demo_v2` and
`edusync_site_v1`). The single-file app stores academic records per account;
new accounts start with an empty study profile, while the evaluation demo keeps
its sample data under the demo account.

Both study assistants run locally without an API key. They can answer questions
from the signed-in account's data and update attendance with commands such as
`mark CSE301 present`, `mark Algorithms absent`, or `mark Algorithms present on
2026-10-26`. A hosted AI API should only be added behind a server-side endpoint;
never put a provider secret in browser code.

## Layout

```
src/
  styles/site.css, single.css   original CSS, verbatim (each is only mounted while its app is on screen)
  lib/motion.js                 cursor glow, magnetic buttons, tilt, scroll-reveal
  lib/flash.jsx                 toast store + <FlashStack>
  site/                         multi-page site: core.js (logic), Shell.jsx, Modals.jsx, pages/*
  single/                       index.html app: store.js (logic), SingleApp.jsx
```

Business logic includes priority scoring, the attendance guardian, insights, local
assistant actions, timetable generation, and hashing; rendering uses React components.
