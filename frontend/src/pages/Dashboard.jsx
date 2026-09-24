import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Dashboard() {
  const { classroomId } = useParams();
  const { groups, students, addGroup, updateGroup, deleteGroup, addStudent } =
    useApp();
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Groups</h1>
          <p className="page-sub">
            {groups.length} {groups.length === 1 ? "group" : "groups"} in this
            classroom. Students come from the shared roster.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add group
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {showAdd && (
        <GroupForm
          students={students}
          groups={groups}
          onCancel={() => setShowAdd(false)}
          onAddStudent={addStudent}
          onSave={async (data) => {
            await addGroup(data);
            setShowAdd(false);
          }}
          onError={setError}
        />
      )}

      <div className="group-list">
        {groups.map((g) =>
          editingId === g.id ? (
            <GroupForm
              key={g.id}
              initial={g}
              students={students}
              groups={groups}
              onCancel={() => setEditingId(null)}
              onAddStudent={addStudent}
              onSave={async (data) => {
                await updateGroup(g.id, data);
                setEditingId(null);
              }}
              onError={setError}
            />
          ) : (
            <div className="group-card" key={g.id}>
              <div>
                <h3>{g.name}</h3>
                <p className="group-members">{g.members || "No students assigned"}</p>
              </div>
              <div className="group-card-actions">
                <span className={`badge ${g.ready ? "badge-ready" : "badge-pending"}`}>
                  {g.ready ? "Ready" : "Not ready"}
                </span>
                <button className="btn" onClick={() => setEditingId(g.id)}>
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteGroup(g.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
        {groups.length === 0 && (
          <p className="empty-state">No groups in this classroom yet — add one to get started.</p>
        )}
      </div>

      <Link to={`/classrooms/${classroomId}/randomizer`} className="btn btn-primary randomizer-cta">
        Go to Randomizer &rarr;
      </Link>
    </div>
  );
}

function GroupForm({
  initial,
  students,
  groups,
  onCancel,
  onSave,
  onAddStudent,
  onError,
}) {
  const [name, setName] = useState(initial?.name || "");
  const [studentIds, setStudentIds] = useState(initial?.studentIds || []);
  const [newStudent, setNewStudent] = useState("");
  const [saving, setSaving] = useState(false);

  const takenElsewhere = new Map();
  for (const group of groups) {
    if (group.id === initial?.id) continue;
    for (const studentId of group.studentIds) {
      takenElsewhere.set(studentId, group.name);
    }
  }

  function toggleStudent(id) {
    setStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!newStudent.trim()) return;
    try {
      onError("");
      const created = await onAddStudent({ name: newStudent.trim() });
      setStudentIds((prev) => [...prev, created.id]);
      setNewStudent("");
    } catch (err) {
      onError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      onError("");
      await onSave({ name: name.trim(), studentIds });
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="group-form" onSubmit={handleSubmit}>
      <div className="group-form-fields group-form-fields-stack">
        <div>
          <label htmlFor="group-name">Group name</label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label>Students</label>
          {students.length === 0 ? (
            <p className="field-hint">
              No students yet. Add one below or manage the shared roster from Classrooms.
            </p>
          ) : (
            <div className="student-picker">
              {students.map((student) => {
                const otherGroup = takenElsewhere.get(student.id);
                const checked = studentIds.includes(student.id);
                return (
                  <label
                    key={student.id}
                    className={`student-option ${otherGroup ? "student-option-taken" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={Boolean(otherGroup)}
                      onChange={() => toggleStudent(student.id)}
                    />
                    <span>{student.name}</span>
                    {otherGroup && (
                      <span className="student-taken">in {otherGroup}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <div className="inline-add">
            <input
              type="text"
              placeholder="Add a shared student"
              value={newStudent}
              onChange={(e) => setNewStudent(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={!newStudent.trim()}
              onClick={handleAddStudent}
            >
              Add
            </button>
          </div>
        </div>
      </div>
      <div className="group-form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving}>
          Save
        </button>
      </div>
    </form>
  );
}
