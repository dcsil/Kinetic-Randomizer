import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { instructor, login, register } = useApp();
  const navigate = useNavigate();

  if (instructor) {
    return <Navigate to="/groups" replace />;
  }

  const isRegister = mode === "register";
  const canSubmit =
    username.trim() && password && (!isRegister || name.trim()) && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(name.trim(), username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
      navigate("/groups");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Kinetic Randomizer</h1>
        <p className="login-sub">Instructor's Command Center</p>
        {isRegister && (
          <>
            <label htmlFor="name">Display name</label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Atoosa Nasiri"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </>
        )}
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          placeholder="e.g. anasiri"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus={!isRegister}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          placeholder={isRegister ? "At least 8 characters" : ""}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </button>
        <button type="button" className="btn" onClick={switchMode}>
          {isRegister ? "Have an account? Sign in" : "New instructor? Create account"}
        </button>
      </form>
    </div>
  );
}
