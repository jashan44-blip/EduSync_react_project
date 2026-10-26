import { Navigate, Route, Routes } from "react-router-dom";
import { GuestOnly, RequireAuth, SiteLayout } from "./site/SiteLayout.jsx";
import Login from "./site/pages/Login.jsx";
import Register from "./site/pages/Register.jsx";
import Dashboard from "./site/pages/Dashboard.jsx";
import Subjects from "./site/pages/Subjects.jsx";
import Assignments from "./site/pages/Assignments.jsx";
import Attendance from "./site/pages/Attendance.jsx";
import Assistant from "./site/pages/Assistant.jsx";
import Timetable from "./site/pages/Timetable.jsx";
import SingleApp from "./single/SingleApp.jsx";

/* Same URLs as the original files:
     /  and  /index.html          the single-file app (hash routes inside)
     /login.html … /timetable.html  the multi-page site                  */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SingleApp />} />
      <Route path="/index.html" element={<SingleApp />} />

      <Route element={<SiteLayout />}>
        <Route path="/login.html" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register.html" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/dashboard.html" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/subjects.html" element={<RequireAuth><Subjects /></RequireAuth>} />
        <Route path="/assignments.html" element={<RequireAuth><Assignments /></RequireAuth>} />
        <Route path="/attendance.html" element={<RequireAuth><Attendance /></RequireAuth>} />
        <Route path="/assistant.html" element={<RequireAuth><Assistant /></RequireAuth>} />
        <Route path="/timetable.html" element={<RequireAuth><Timetable /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
