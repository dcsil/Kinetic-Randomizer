import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import FontSizeControl from "./components/FontSizeControl";
import { AppProvider, COURSE_NAME, useApp } from "./context/AppContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Randomizer from "./pages/Randomizer";
import PresentationLive from "./pages/PresentationLive";

// CUJ Explorer for the A2 demo; loaded on demand so the main app is unaffected.
const Explorer = lazy(() => import("./presentation/Explorer"));
// A3 cloud architecture & deployment deck; also loaded on demand.
const DeckA3 = lazy(() => import("./presentation_a3/DeckA3"));

function RequireAuth({ children }) {
  const { instructor } = useApp();
  const location = useLocation();
  if (!instructor) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
}

function Shell({ children }) {
  const { instructor, logout } = useApp();
  const location = useLocation();
  const hideNav = location.pathname === "/" || location.pathname === "/live";

  return (
    <>
      <FontSizeControl />
      {!hideNav && instructor && (
        <nav className="topnav">
          <span className="topnav-brand">Kinetic Randomizer</span>
          <div className="topnav-links">
            <NavLink to="/groups" className="topnav-link">
              Groups
            </NavLink>
            <NavLink to="/randomizer" className="topnav-link">
              Randomizer
            </NavLink>
          </div>
          <div className="topnav-user">
            <span className="topnav-course">{COURSE_NAME}</span>
            <span>{instructor}</span>
            <button className="btn" onClick={logout}>
              Sign out
            </button>
          </div>
        </nav>
      )}
      <main className="main">{children}</main>
      <footer className="site-footer">Kinetic — Built by Azaria and Richard</footer>
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  if (location.pathname === "/presentation") {
    return (
      <Suspense fallback={null}>
        <Explorer />
      </Suspense>
    );
  }
  if (location.pathname === "/presentation_a3") {
    return (
      <Suspense fallback={null}>
        <DeckA3 />
      </Suspense>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/groups"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/randomizer"
          element={
            <RequireAuth>
              <Randomizer />
            </RequireAuth>
          }
        />
        <Route
          path="/live"
          element={
            <RequireAuth>
              <PresentationLive />
            </RequireAuth>
          }
        />
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
