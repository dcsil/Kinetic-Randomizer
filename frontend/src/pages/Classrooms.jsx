import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Classrooms() {
  const {
    classrooms,
    refreshClassrooms,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    selectClassroom,
  } = useApp();
  const navigate = useNavigate();
  const [editingClassroomId, setEditingClassroomId] = useState(null);
  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    selectClassroom(null);
    refreshClassrooms();
  }, []);

  async function handleOpen(id) {
    try {
      await selectClassroom(id);
      navigate(`/classrooms/${id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>Classrooms</h1>
          <p className="page-sub">Select a classroom to manage its groups.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddClassroom(true)}>
          + Add classroom
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {showAddClassroom && (
        <NameForm
          label="Classroom name"
          placeholder="e.g. CSC108 Morning"
          onCancel={() => setShowAddClassroom(false)}
          onSave={async (name) => {
            await addClassroom({ name });
            setShowAddClassroom(false);
          }}
          onError={setError}
        />
      )}

      <div className="classroom-list">
        {classrooms.map((classroom) =>
          editingClassroomId === classroom.id ? (
            <NameForm
              key={classroom.id}
              label="Classroom name"
              initial={classroom.name}
              onCancel={() => setEditingClassroomId(null)}
              onSave={async (name) => {
                await updateClassroom(classroom.id, { name });
                setEditingClassroomId(null);
              }}
              onError={setError}
            />
          ) : (
            <div className="classroom-card" key={classroom.id}>
              <button
                type="button"
                className="classroom-open"
                onClick={() => handleOpen(classroom.id)}
              >
                <h3>{classroom.name}</h3>
                <p className="classroom-meta">
                  {classroom.groupCount}{" "}
                  {classroom.groupCount === 1 ? "group" : "groups"}
                </p>
              </button>
              <div className="classroom-card-actions">
                <button
                  className="btn"
                  onClick={() => setEditingClassroomId(classroom.id)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteClassroom(classroom.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
        {classrooms.length === 0 && (
          <p className="empty-state">No classrooms yet — add one to get started.</p>
        )}
      </div>
    </div>
  );
}

function NameForm({ label, initial = "", placeholder, onCancel, onSave, onError }) {
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      onError?.("");
      await onSave(name.trim());
    } catch (err) {
      onError?.(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="group-form classroom-form" onSubmit={handleSubmit}>
      <div className="group-form-fields">
        <div>
          <label htmlFor="shared-name">{label}</label>
          <input
            id="shared-name"
            type="text"
            placeholder={placeholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="group-form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!name.trim() || saving}
        >
          Save
        </button>
      </div>
    </form>
  );
}
