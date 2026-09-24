import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Randomizer() {
  const { classroomId } = useParams();
  const { classrooms, groups, toggleReady, randomize } = useApp();
  const [order, setOrderPreview] = useState(null);
  const navigate = useNavigate();
  const classroom = classrooms.find((item) => item.id === classroomId);

  async function handleRandomize() {
    const newOrder = await randomize();
    setOrderPreview(newOrder);
  }

  const orderedGroups =
    order && order.map((id) => groups.find((g) => g.id === id)).filter(Boolean);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="page-kicker">
            <Link to="/classrooms">Classrooms</Link>
            <span> / {classroom?.name || "Classroom"}</span>
          </p>
          <h1>Randomizer</h1>
          <p className="page-sub">
            Uncheck a group to push it to the end of this classroom's presentation order.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleRandomize} disabled={groups.length === 0}>
          Randomize order
        </button>
      </div>

      <div className="checklist">
        {groups.map((g) => (
          <label className="checklist-row" key={g.id}>
            <input
              type="checkbox"
              checked={g.ready}
              onChange={() => toggleReady(g.id)}
            />
            <span className="checklist-name">{g.name}</span>
            <span className={`badge ${g.ready ? "badge-ready" : "badge-pending"}`}>
              {g.ready ? "Ready" : "Not ready"}
            </span>
          </label>
        ))}
        {groups.length === 0 && (
          <p className="empty-state">No groups in this classroom yet.</p>
        )}
      </div>

      {orderedGroups && orderedGroups.length > 0 && (
        <div className="order-result">
          <h2>Presentation order</h2>
          <ol>
            {orderedGroups.map((g) => (
              <li key={g.id} className={!g.ready ? "order-item-pending" : ""}>
                {g.name}
              </li>
            ))}
          </ol>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/classrooms/${classroomId}/live`)}
          >
            Start presentations &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
