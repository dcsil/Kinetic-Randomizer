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
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [order, setOrder] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classroomId, setClassroomId] = useState(null);

  async function refreshClassrooms() {
    const loaded = await api("/api/classrooms");
    setClassrooms(loaded);
    return loaded;
  }

  async function refreshStudents() {
    const loaded = await api("/api/students");
    setStudents(loaded);
    return loaded;
  }

  useEffect(() => {
    async function loadShared() {
      await Promise.all([refreshClassrooms(), refreshStudents()]);
    }
    loadShared();
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
    setClassroomId(null);
    setGroups([]);
    setOrder([]);
    setCurrentIndex(0);
  }

  async function addClassroom(payload) {
    const created = await api("/api/classrooms", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setClassrooms((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    return created;
  }

  async function updateClassroom(id, updates) {
    const updated = await api(`/api/classrooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    setClassrooms((prev) =>
      prev
        .map((classroom) => (classroom.id === id ? updated : classroom))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }

  async function deleteClassroom(id) {
    await api(`/api/classrooms/${id}`, { method: "DELETE" });
    setClassrooms((prev) => prev.filter((classroom) => classroom.id !== id));
    if (classroomId === id) {
      setClassroomId(null);
      setGroups([]);
      setOrder([]);
      setCurrentIndex(0);
    }
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
    if (classroomId) {
      const loadedGroups = await api(`/api/classrooms/${classroomId}/groups`);
      setGroups(loadedGroups);
    }
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

  async function selectClassroom(id) {
    if (!id) {
      setClassroomId(null);
      setGroups([]);
      setOrder([]);
      setCurrentIndex(0);
      return null;
    }

    const [loadedGroups, presentation] = await Promise.all([
      api(`/api/classrooms/${id}/groups`),
      api(`/api/classrooms/${id}/presentation/current`),
    ]);
    setClassroomId(id);
    setGroups(loadedGroups);
    setOrder(presentation.order);
    setCurrentIndex(presentation.currentIndex);
    return loadedGroups;
  }

  async function addGroup(group) {
    const created = await api(`/api/classrooms/${classroomId}/groups`, {
      method: "POST",
      body: JSON.stringify(group),
    });
    setGroups((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    setClassrooms((prev) =>
      prev.map((classroom) =>
        classroom.id === classroomId
          ? { ...classroom, groupCount: classroom.groupCount + 1 }
          : classroom
      )
    );
    return created;
  }

  async function updateGroup(id, updates) {
    const updated = await api(`/api/classrooms/${classroomId}/groups/${id}`, {
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
    await api(`/api/classrooms/${classroomId}/groups/${id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((group) => group.id !== id));
    setClassrooms((prev) =>
      prev.map((classroom) =>
        classroom.id === classroomId
          ? { ...classroom, groupCount: Math.max(0, classroom.groupCount - 1) }
          : classroom
      )
    );
  }

  async function toggleReady(id) {
    const group = groups.find((item) => item.id === id);
    if (!group) return;
    await updateGroup(id, { ready: !group.ready });
  }

  async function randomize() {
    const data = await api(`/api/classrooms/${classroomId}/randomizer/order`, {
      method: "POST",
    });
    setOrder(data.order);
    setCurrentIndex(0);
    return data.order;
  }

  async function nextGroup() {
    const data = await api(`/api/classrooms/${classroomId}/presentation/next`, {
      method: "POST",
    });
    setOrder(data.order);
    setCurrentIndex(data.currentIndex);
  }

  return (
    <AppContext.Provider
      value={{
        instructor,
        login,
        logout,
        classrooms,
        refreshClassrooms,
        addClassroom,
        updateClassroom,
        deleteClassroom,
        students,
        refreshStudents,
        addStudent,
        updateStudent,
        deleteStudent,
        classroomId,
        selectClassroom,
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
