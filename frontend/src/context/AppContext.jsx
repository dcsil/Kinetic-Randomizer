import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AppContext = createContext(null);

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

const TOKEN_KEY = "kr_token";
const INSTRUCTOR_KEY = "kr_instructor";

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [instructor, setInstructor] = useState(
    () => localStorage.getItem(INSTRUCTOR_KEY) || ""
  );
  const [groups, setGroups] = useState([]);
  const [order, setOrder] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(INSTRUCTOR_KEY);
    setToken("");
    setInstructor("");
    setGroups([]);
    setOrder([]);
    setCurrentIndex(0);
  }, []);

  const api = useCallback(
    async (path, options = {}, authToken = token) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...options.headers,
        },
      });
      if (res.status === 401 && authToken) {
        logout();
      }
      if (res.status === 204) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      return data;
    },
    [token, logout]
  );

  useEffect(() => {
    if (!token) return;
    async function load() {
      const [loadedGroups, presentation] = await Promise.all([
        api("/api/groups"),
        api("/api/presentation/current"),
      ]);
      setGroups(loadedGroups);
      setOrder(presentation.order);
      setCurrentIndex(presentation.currentIndex);
    }
    load().catch((err) => console.error(err));
  }, [token, api]);

  function startSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(INSTRUCTOR_KEY, data.instructor.name);
    setToken(data.token);
    setInstructor(data.instructor.name);
  }

  async function login(username, password) {
    const data = await api(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
      ""
    );
    startSession(data);
  }

  async function register(name, username, password) {
    const data = await api(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ name, username, password }) },
      ""
    );
    startSession(data);
  }

  async function addGroup(group) {
    const created = await api("/api/groups", {
      method: "POST",
      body: JSON.stringify(group),
    });
    setGroups((prev) => [...prev, created]);
  }

  async function updateGroup(id, updates) {
    const updated = await api(`/api/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
  }

  async function deleteGroup(id) {
    await api(`/api/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  async function toggleReady(id) {
    const group = groups.find((g) => g.id === id);
    if (!group) return;
    await updateGroup(id, { ready: !group.ready });
  }

  async function randomize() {
    const data = await api("/api/randomizer/order", { method: "POST" });
    setOrder(data.order);
    setCurrentIndex(0);
    return data.order;
  }

  async function nextGroup() {
    const data = await api("/api/presentation/next", { method: "POST" });
    setOrder(data.order);
    setCurrentIndex(data.currentIndex);
  }

  return (
    <AppContext.Provider
      value={{
        instructor: token ? instructor : "",
        login,
        register,
        logout,
        groups,
        addGroup,
        updateGroup,
        deleteGroup,
        toggleReady,
        order,
        currentIndex,
        randomize,
        nextGroup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
