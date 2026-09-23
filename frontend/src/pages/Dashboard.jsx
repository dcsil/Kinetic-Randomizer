import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Dashboard() {
  const { groups, addGroup, updateGroup, deleteGroup } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Groups</h1>
          <p className="page-sub">{groups.length} groups loaded for this session</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add group
        </button>
      </div>

      {showAdd && (
        <GroupForm
          onCancel={() => setShowAdd(false)}
          onSave={(data) => {
            addGroup(data);
            setShowAdd(false);
          }}
        />
      )}

      <div className="group-list">
        {groups.map((g) =>
          editingId === g.id ? (
            <GroupForm
              key={g.id}
              initial={g}
              onCancel={() => setEditingId(null)}
              onSave={(data) => {
                updateGroup(g.id, data);
                setEditingId(null);
              }}
            />
          ) : (
            <div className="group-card" key={g.id}>
              <div>
                <h3>{g.name}</h3>
                <p className="group-members">{g.members}</p>
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
          <p className="empty-state">No groups yet — add one to get started.</p>
        )}
      </div>

      <Link to="/randomizer" className="btn btn-primary randomizer-cta">
        Go to Randomizer &rarr;
      </Link>
    </div>
  );
}

function GroupForm({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [members, setMembers] = useState(initial?.members || "");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), members: members.trim() });
  }

  return (
    <form className="group-form" onSubmit={handleSubmit}>
      <div className="group-form-fields">
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
          <label htmlFor="group-members">Members</label>
          <input
            id="group-members"
            type="text"
            placeholder="comma separated"
            value={members}
            onChange={(e) => setMembers(e.target.value)}
          />
        </div>
      </div>
      <div className="group-form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          Save
        </button>
      </div>
    </form>
  );
}
