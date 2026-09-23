import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

export default function Randomizer() {
  const { groups, toggleReady, randomize } = useApp();
  const [order, setOrderPreview] = useState(null);
  const navigate = useNavigate();

  function handleRandomize() {
    const newOrder = randomize();
    setOrderPreview(newOrder);
  }

  const orderedGroups =
    order && order.map((id) => groups.find((g) => g.id === id)).filter(Boolean);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Randomizer</h1>
          <p className="page-sub">
            Uncheck a group to push it to the end of the presentation order.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleRandomize}>
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
            onClick={() => navigate("/live")}
          >
            Start presentations &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
