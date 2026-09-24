import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Login() {
  const [name, setName] = useState("");
  const { instructor, login } = useApp();
  const navigate = useNavigate();

  if (instructor) {
    return <Navigate to="/classrooms" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await login(name.trim());
    navigate("/classrooms");
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Kinetic Randomizer</h1>
        <p className="login-sub">Instructor's Command Center</p>
        <label htmlFor="name">Instructor name</label>
        <input
          id="name"
          type="text"
          placeholder="e.g. A. Kelman"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          Sign in
        </button>
      </form>
    </div>
  );
}
