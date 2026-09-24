import { useState } from "react";

// Ordered list whose items can be reordered by drag and drop, or from the
// keyboard with Alt+Arrow keys on a focused item. Pass `horizontal` to lay the
// items out in a row (drop indicator and arrow keys follow the axis).
export default function DraggableList({
  items,
  onReorder,
  renderItem,
  getItemClassName,
  className = "",
  label,
  horizontal = false,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  function move(from, to) {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  }

  function reset() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <ol
      className={`drag-list ${horizontal ? "drag-list-horizontal" : ""} ${className}`}
      aria-label={label}
    >
      {items.map((id, index) => {
        const classes = ["drag-item"];
        if (dragIndex === index) classes.push("drag-item-dragging");
        if (dragIndex !== null && overIndex === index && dragIndex !== index) {
          classes.push(dragIndex < index ? "drag-item-over-after" : "drag-item-over-before");
        }
        const extra = getItemClassName?.(id, index);
        if (extra) classes.push(extra);

        return (
          <li
            key={id}
            className={classes.join(" ")}
            draggable
            tabIndex={0}
            title={`Drag to reorder (or Alt+${horizontal ? "←/→" : "↑/↓"})`}
            onDragStart={(e) => {
              setDragIndex(index);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", id);
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overIndex !== index) setOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, index);
              reset();
            }}
            onDragEnd={reset}
            onKeyDown={(e) => {
              if (!e.altKey) return;
              const back = horizontal ? "ArrowLeft" : "ArrowUp";
              const forward = horizontal ? "ArrowRight" : "ArrowDown";
              if (e.key === back && index > 0) {
                e.preventDefault();
                move(index, index - 1);
              } else if (e.key === forward && index < items.length - 1) {
                e.preventDefault();
                move(index, index + 1);
              }
            }}
          >
            <span className="drag-handle" aria-hidden="true">
              ⠿
            </span>
            {renderItem(id, index)}
          </li>
        );
      })}
    </ol>
  );
}
