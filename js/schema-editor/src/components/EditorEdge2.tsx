import React from "react";
import { Camera } from "../bl/Camera";
import { Position } from "../bl/Position";
import {
  calculateNodeConnectionPoints,
  getViewPosFromWorldPos,
} from "../bl/BoardUtils";

interface NodeInfo {
  position: Position;
  width: number;
  height: number;
}

const EditorEdge2: React.FC<{
  selected: boolean;
  highlighted?: boolean;
  isNew: boolean;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  camera: Camera;
  onMouseDownEdge: () => void;
  onClickDelete: () => void;
  initialDirectionToRight?: boolean;
}> = ({
  selected,
  highlighted = false,
  isNew,
  startPos,
  endPos,
  camera,
  onMouseDownEdge,
  onClickDelete,
  initialDirectionToRight = true,
}) => {
  const [hovering, setHovering] = React.useState(false);
  function handleMouseDownEdge(e: any) {
    e.stopPropagation();

    onMouseDownEdge();
  }

  // Calculate the bounding box for the SVG

  // Always ensure width/height are at least 1, and handle negative direction
  const minX = Math.min(startPos.x, endPos.x);
  const minY = Math.min(startPos.y, endPos.y);
  const maxX = Math.max(startPos.x, endPos.x);
  const maxY = Math.max(startPos.y, endPos.y);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  // Use a cubic Bezier curve for a smooth drawSQL-like edge
  // Always bow horizontally away from the start point, regardless of direction
  const dx = endPos.x - startPos.x;
  const curve = Math.max(40, Math.abs(dx) * 0.5);
  let c1x, c2x;
  if (dx >= 0) {
    // End is to the right: bow right
    c1x = startPos.x - minX + curve;
    c2x = endPos.x - minX - curve;
  } else {
    // End is to the left: bow left
    c1x = startPos.x - minX - curve;
    c2x = endPos.x - minX + curve;
  }
  const c1y = startPos.y - minY;
  const c2y = endPos.y - minY;
  const pathD = `M ${startPos.x - minX} ${startPos.y - minY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endPos.x - minX} ${endPos.y - minY}`;

  let strokeColor = "stroke-pink-500";
  if (selected) {
    strokeColor = "stroke-orange-400";
  } else if (highlighted) {
    strokeColor = "stroke-blue-400";
  }
  return (
    <svg
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        pointerEvents: "none",
        overflow: "visible",
      }}
      width={width}
      height={height}
    >
      <path
        d={pathD}
        stroke="transparent"
        className="cursor-pointer"
        strokeWidth={20} // or any large value
        fill="none"
        pointerEvents="stroke"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseDown={handleMouseDownEdge}
      />
      <path
        className={`pointer-events-auto stroke-2 fill-transparent cursor-pointer 
          ${hovering ? "stroke-opacity-100" : "stroke-opacity-50"}`}
        d={pathD}
        stroke={highlighted ? "#3b82f6" : selected ? "#f59e42" : "#888"}
        // stroke={hovering ? "#3b82f6" : "#888"}
        strokeWidth={2}
        fill="none"
        pointerEvents="stroke"
      />
    </svg>
  );
};

export default EditorEdge2;
