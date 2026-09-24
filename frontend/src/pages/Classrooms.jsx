import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Classrooms() {
  const {
    classrooms,
    students,
    refreshClassrooms,
    refreshStudents,
    addClassroom,
    updateClassroom,
    deleteClassroom,
    addStudent,
    updateStudent,
    deleteStudent,
    selectClassroom,
  } = useApp();
  const navigate = useNavigate();
  const [editingClassroomId, setEditingClassroomId] = useState(null);
  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    selectClassroom(null);
    refreshClassrooms();
    refreshStudents();
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
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Classrooms</h1>
          <p className="page-sub">
            Select a classroom to manage its groups. Students stay shared.
          </p>
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

      <div className="group-list">
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
            <div className="group-card classroom-card" key={classroom.id}>
              <button
                type="button"
                className="classroom-open"
                onClick={() => handleOpen(classroom.id)}
              >
                <h3>{classroom.name}</h3>
                <p className="group-members">
                  {classroom.groupCount}{" "}
                  {classroom.groupCount === 1 ? "group" : "groups"}
                </p>
              </button>
              <div className="group-card-actions">
                <button className="btn" onClick={() => handleOpen(classroom.id)}>
                  Open
                </button>
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

      <section className="roster">
        <div className="page-header">
          <div>
            <h2>Students</h2>
            <p className="page-sub">
              One shared roster. Assign these students to groups inside each classroom.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>
            + Add student
          </button>
        </div>

        {showAddStudent && (
          <NameForm
            label="Student name"
            placeholder="e.g. Ada Lovelace"
            onCancel={() => setShowAddStudent(false)}
            onSave={async (name) => {
              await addStudent({ name });
              setShowAddStudent(false);
            }}
            onError={setError}
          />
        )}

        <div className="group-list">
          {students.map((student) =>
            editingStudentId === student.id ? (
              <NameForm
                key={student.id}
                label="Student name"
                initial={student.name}
                onCancel={() => setEditingStudentId(null)}
                onSave={async (name) => {
                  await updateStudent(student.id, { name });
                  setEditingStudentId(null);
                }}
                onError={setError}
              />
            ) : (
              <div className="group-card" key={student.id}>
                <div>
                  <h3>{student.name}</h3>
                </div>
                <div className="group-card-actions">
                  <button className="btn" onClick={() => setEditingStudentId(student.id)}>
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteStudent(student.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
          {students.length === 0 && (
            <p className="empty-state">
              No students yet — add them here, then assign them to classroom groups.
            </p>
          )}
        </div>
      </section>
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
    <form className="group-form" onSubmit={handleSubmit}>
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
