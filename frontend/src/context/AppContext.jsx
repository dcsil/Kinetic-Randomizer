import { createContext, useContext, useEffect, useState } from "react";

const AppContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function AppProvider({ children }) {
  const [instructor, setInstructor] = useState(
    () => localStorage.getItem("kr_instructor") || ""
  );
  const [groups, setGroups] = useState([]);
  const [order, setOrder] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function load() {
      const [loadedGroups, presentation] = await Promise.all([
        api("/api/groups"),
        api("/api/presentation/current"),
      ]);
      setGroups(loadedGroups);
      setOrder(presentation.order);
      setCurrentIndex(presentation.currentIndex);
    }
    load();
  }, []);

  async function login(name) {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    localStorage.setItem("kr_instructor", data.instructor);
    setInstructor(data.instructor);
  }

  function logout() {
    localStorage.removeItem("kr_instructor");
    setInstructor("");
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
        instructor,
        login,
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
