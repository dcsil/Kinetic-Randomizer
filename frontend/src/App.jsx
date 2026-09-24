import { useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useParams } from "react-router-dom";
import "./App.css";
import { AppProvider, useApp } from "./context/AppContext";
import Login from "./pages/Login";
import Classrooms from "./pages/Classrooms";
import Dashboard from "./pages/Dashboard";
import Randomizer from "./pages/Randomizer";
import PresentationLive from "./pages/PresentationLive";

function RequireAuth({ children }) {
  const { instructor } = useApp();
  const location = useLocation();
  if (!instructor) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
}

function ClassroomGate({ children }) {
  const { classroomId } = useParams();
  const { classrooms, selectClassroom } = useApp();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        await selectClassroom(classroomId);
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("missing");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  if (status === "loading" && classrooms.length === 0) {
    return <p className="empty-state">Loading classroom…</p>;
  }

  const exists = classrooms.some((classroom) => classroom.id === classroomId);
  if (status === "missing" || (classrooms.length > 0 && !exists)) {
    return <Navigate to="/classrooms" replace />;
  }

  return children;
}

function Shell({ children }) {
  const { instructor, logout, classrooms } = useApp();
  const location = useLocation();
  const classroomMatch = location.pathname.match(/^\/classrooms\/([^/]+)/);
  const classroomId = classroomMatch?.[1];
  const classroom = classrooms.find((item) => item.id === classroomId);
  const hideNav = location.pathname === "/" || location.pathname.endsWith("/live");

  return (
    <>
      {!hideNav && instructor && (
        <nav className="topnav">
          <span className="topnav-brand">Kinetic Randomizer</span>
          <div className="topnav-links">
            <NavLink to="/classrooms" end className="topnav-link">
              Classrooms
            </NavLink>
            {classroomId && (
              <>
                <NavLink to={`/classrooms/${classroomId}`} end className="topnav-link">
                  Groups
                </NavLink>
                <NavLink
                  to={`/classrooms/${classroomId}/randomizer`}
                  className="topnav-link"
                >
                  Randomizer
                </NavLink>
              </>
            )}
          </div>
          <div className="topnav-user">
            {classroom && <span className="topnav-classroom">{classroom.name}</span>}
            <span>{instructor}</span>
            <button className="btn" onClick={logout}>
              Sign out
            </button>
          </div>
        </nav>
      )}
      <main className="main">{children}</main>
    </>
  );
}

function AppRoutes() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/classrooms"
          element={
            <RequireAuth>
              <Classrooms />
            </RequireAuth>
          }
        />
        <Route
          path="/classrooms/:classroomId"
          element={
            <RequireAuth>
              <ClassroomGate>
                <Dashboard />
              </ClassroomGate>
            </RequireAuth>
          }
        />
        <Route
          path="/classrooms/:classroomId/randomizer"
          element={
            <RequireAuth>
              <ClassroomGate>
                <Randomizer />
              </ClassroomGate>
            </RequireAuth>
          }
        />
        <Route
          path="/classrooms/:classroomId/live"
          element={
            <RequireAuth>
              <ClassroomGate>
                <PresentationLive />
              </ClassroomGate>
            </RequireAuth>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/classrooms" replace />} />
        <Route path="/randomizer" element={<Navigate to="/classrooms" replace />} />
        <Route path="/live" element={<Navigate to="/classrooms" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
