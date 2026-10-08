import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AppContext = createContext(null);

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");

const TOKEN_KEY = "kr_token";
const INSTRUCTOR_KEY = "kr_instructor";

export const COURSE_NAME = "CSC491";

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [instructor, setInstructor] = useState(
    () => localStorage.getItem(INSTRUCTOR_KEY) || ""
  );
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [order, setOrder] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(INSTRUCTOR_KEY);
    setToken("");
    setInstructor("");
    setStudents([]);
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

  const refreshStudents = useCallback(async () => {
    const loaded = await api("/api/students");
    setStudents(loaded);
    return loaded;
  }, [api]);

  const refreshGroups = useCallback(async () => {
    const loaded = await api("/api/groups");
    setGroups(loaded);
    return loaded;
  }, [api]);

  const refreshPresentation = useCallback(async () => {
    const presentation = await api("/api/presentation/current");
    setOrder(presentation.order);
    setCurrentIndex(presentation.currentIndex);
    return presentation;
  }, [api]);

  useEffect(() => {
    if (!token) return;
    Promise.all([refreshStudents(), refreshGroups(), refreshPresentation()]).catch(
      (err) => console.error(err)
    );
  }, [token, refreshStudents, refreshGroups, refreshPresentation]);

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

  async function addStudent(payload) {
    const created = await api("/api/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStudents((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    return created;
  }

  async function updateStudent(id, updates) {
    const updated = await api(`/api/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    setStudents((prev) =>
      prev
        .map((student) => (student.id === id ? updated : student))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    await refreshGroups();
    return updated;
  }

  async function deleteStudent(id) {
    await api(`/api/students/${id}`, { method: "DELETE" });
    setStudents((prev) => prev.filter((student) => student.id !== id));
    setGroups((prev) =>
      prev.map((group) => {
        if (!group.studentIds.includes(id)) return group;
        const remaining = group.studentIds.filter((studentId) => studentId !== id);
        return {
          ...group,
          studentIds: remaining,
          members: remaining
            .map((studentId) => students.find((student) => student.id === studentId)?.name)
            .filter(Boolean)
            .join(", "),
        };
      })
    );
  }

  async function addGroup(group) {
    const created = await api("/api/groups", {
      method: "POST",
      body: JSON.stringify(group),
    });
    setGroups((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    return created;
  }

  async function updateGroup(id, updates) {
    const updated = await api(`/api/groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    setGroups((prev) =>
      prev
        .map((group) => (group.id === id ? updated : group))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }

  async function deleteGroup(id) {
    await api(`/api/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((group) => group.id !== id));
  }

  async function toggleReady(id) {
    const group = groups.find((item) => item.id === id);
    if (!group) return;
    await updateGroup(id, { ready: !group.ready });
  }

  async function randomize() {
    const data = await api("/api/randomizer/order", { method: "POST" });
    setOrder(data.order);
    setCurrentIndex(0);
    return data.order;
  }

  async function updatePresentation(updates) {
    const data = await api("/api/presentation/current", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    setOrder(data.order);
    setCurrentIndex(data.currentIndex);
    return data;
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
        students,
        refreshStudents,
        addStudent,
        updateStudent,
        deleteStudent,
        groups,
        refreshGroups,
        addGroup,
        updateGroup,
        deleteGroup,
        toggleReady,
        order,
        currentIndex,
        randomize,
        updatePresentation,
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
