import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DraggableList from "../components/DraggableList";
import { useApp } from "../context/AppContext";

// Distinct tile hues; a group keeps its colour while being dragged around.
const TILE_HUES = [276, 25, 150, 230, 330, 85, 190, 300, 55, 120];

export default function Randomizer() {
  const { classroomId } = useParams();
  const { groups, toggleReady, randomize, updatePresentation } = useApp();
  const [order, setOrderPreview] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleRandomize() {
    setError("");
    const newOrder = await randomize();
    setOrderPreview(newOrder);
  }

  async function handleReorder(nextOrder) {
    const previous = order;
    setOrderPreview(nextOrder);
    setError("");
    try {
      await updatePresentation({ order: nextOrder, currentIndex: 0 });
    } catch (err) {
      setOrderPreview(previous);
      setError(err.message);
    }
  }

  const orderedIds = order ? order.filter((id) => groups.some((g) => g.id === id)) : [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
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

      {orderedIds.length > 0 && (
        <div className="order-result">
          <h2>Presentation order</h2>
          <p className="field-hint">Drag the tiles to adjust the order manually.</p>
          <DraggableList
            items={orderedIds}
            onReorder={handleReorder}
            label="Presentation order"
            horizontal
            className="order-tiles"
            getItemClassName={(id) =>
              groups.find((g) => g.id === id)?.ready ? "order-tile" : "order-tile order-tile-pending"
            }
            renderItem={(id, index) => {
              const groupIndex = groups.findIndex((g) => g.id === id);
              const group = groups[groupIndex];
              const hue = TILE_HUES[groupIndex % TILE_HUES.length];
              return (
                <span className="order-tile-body" style={{ "--tile-hue": hue }}>
                  <span className="order-tile-index">{index + 1}</span>
                  <span className="order-tile-name">{group?.name}</span>
                  {!group?.ready && <span className="order-tile-status">Not ready</span>}
                </span>
              );
            }}
          />
          {error && <p className="form-error">{error}</p>}
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
