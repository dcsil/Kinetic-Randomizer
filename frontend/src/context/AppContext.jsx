import { createContext, useContext, useEffect, useState } from "react";

const AppContext = createContext(null);

const SEED_GROUPS = [
  { id: "g1", name: "Team Nimbus", members: "Ava, Priya, Sam", ready: true },
  { id: "g2", name: "Group 4B", members: "Owen, Leah", ready: true },
  { id: "g3", name: "The Refactorers", members: "Marcus, Dana, Wei, Ivy", ready: false },
  { id: "g4", name: "Pixel Pioneers", members: "Noor, Theo", ready: true },
];

// NOTE: everything here is local/mock state. There is no backend yet -
// see GitHub issue #1 for the Express API this will eventually call.
export function AppProvider({ children }) {
  const [instructor, setInstructor] = useState(
    () => localStorage.getItem("kr_instructor") || ""
  );
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem("kr_groups");
    return saved ? JSON.parse(saved) : SEED_GROUPS;
  });
  const [order, setOrder] = useState(() => {
    const saved = localStorage.getItem("kr_order");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem("kr_groups", JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem("kr_order", JSON.stringify(order));
  }, [order]);

  function login(name) {
    localStorage.setItem("kr_instructor", name);
    setInstructor(name);
  }

  function logout() {
    localStorage.removeItem("kr_instructor");
    setInstructor("");
  }

  function addGroup(group) {
    setGroups((prev) => [
      ...prev,
      { id: crypto.randomUUID(), ready: true, ...group },
    ]);
  }

  function updateGroup(id, updates) {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  }

  function deleteGroup(id) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  function toggleReady(id) {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ready: !g.ready } : g))
    );
  }

  function randomize() {
    const ready = groups.filter((g) => g.ready);
    const notReady = groups.filter((g) => !g.ready);
    const shuffled = [...ready].sort(() => Math.random() - 0.5);
    const newOrder = [...shuffled, ...notReady].map((g) => g.id);
    setOrder(newOrder);
    setCurrentIndex(0);
    return newOrder;
  }

  function nextGroup() {
    setCurrentIndex((i) => Math.min(i + 1, order.length - 1));
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
