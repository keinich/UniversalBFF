import React from "react";
import { Camera } from "../bl/Camera";

const EditorEdge2: React.FC<{
  selected: boolean;
  highlighted?: boolean;
  isNew: boolean;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  /** Which side of the start node the edge exits from */
  startSide: "left" | "right";
  camera: Camera;
  onMouseDownEdge: () => void;
  onClickDelete: () => void;
}> = ({
  selected,
  highlighted = false,
  isNew,
  startPos,
  endPos,
  startSide,
  camera,
  onMouseDownEdge,
  onClickDelete,
}) => {
  const [hovering, setHovering] = React.useState(false);

  function handleMouseDownEdge(e: any) {
    e.stopPropagation();
    onMouseDownEdge();
  }

  // --- Orthogonal (Manhattan) routing ---
  // The path exits the start node horizontally, turns 90° at a pivot X,
  // travels vertically to the end node's Y, turns 90° again, then enters
  // the end node horizontally.  This guarantees the path never passes
  // through the interior of either node.

  // Minimum length (px) for the first / last horizontal segment so the
  // path visibly exits the node before turning.
  const MIN_SEG = 30;

  let pivotX: number;
  if (startSide === "right") {
    // Exit rightward: pivot must be at least MIN_SEG to the right.
    pivotX = Math.max(startPos.x + MIN_SEG, (startPos.x + endPos.x) / 2);
  } else {
    // Exit leftward: pivot must be at least MIN_SEG to the left.
    pivotX = Math.min(startPos.x - MIN_SEG, (startPos.x + endPos.x) / 2);
  }

  // Build the SVG path with rounded corners (quadratic bezier at each turn)
  // so it looks polished rather than harsh.
  const dy = endPos.y - startPos.y;
  const seg1 = Math.abs(pivotX - startPos.x);
  const seg2 = Math.abs(endPos.x - pivotX);
  const segV = Math.abs(dy);
  // Corner radius – small enough never to exceed a segment's half-length.
  const r = Math.min(8, seg1 * 0.4, seg2 * 0.4, segV * 0.4);

  // SVG bounding box – the SVG is placed at (minX, minY) so all path
  // coordinates must be expressed relative to that origin.
  const pad = 2;
  const minX = Math.min(startPos.x, endPos.x, pivotX) - pad;
  const minY = Math.min(startPos.y, endPos.y) - pad;
  const maxX = Math.max(startPos.x, endPos.x, pivotX) + pad;
  const maxY = Math.max(startPos.y, endPos.y) + pad;

  // Translate all coordinates into SVG-local space.
  const ox = minX; // SVG origin X in screen space
  const oy = minY; // SVG origin Y in screen space

  const toLocal = (x: number, y: number) =>
    `${x - ox} ${y - oy}`;

  let pathDLocal: string;

  if (segV < 1) {
    pathDLocal = `M ${toLocal(startPos.x, startPos.y)} H ${endPos.x - ox}`;
  } else if (r < 1) {
    pathDLocal =
      `M ${toLocal(startPos.x, startPos.y)}` +
      ` H ${pivotX - ox}` +
      ` V ${endPos.y - oy}` +
      ` H ${endPos.x - ox}`;
  } else {
    const sign1X = pivotX >= startPos.x ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    const sign2X = endPos.x >= pivotX ? 1 : -1;

    pathDLocal = [
      `M ${toLocal(startPos.x, startPos.y)}`,
      `H ${pivotX - sign1X * r - ox}`,
      `Q ${pivotX - ox} ${startPos.y - oy} ${pivotX - ox} ${startPos.y + signY * r - oy}`,
      `V ${endPos.y - signY * r - oy}`,
      `Q ${pivotX - ox} ${endPos.y - oy} ${pivotX + sign2X * r - ox} ${endPos.y - oy}`,
      `H ${endPos.x - ox}`,
    ].join(" ");
  }

  const strokeColor = highlighted ? "#3b82f6" : selected ? "#f59e42" : "#888";

  return (
    <svg
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        pointerEvents: "none",
        overflow: "visible",
        // z-index 20 keeps edges above nodes (nodes use z-10 / z-index:10)
        zIndex: 20,
      }}
      width={Math.max(1, maxX - minX)}
      height={Math.max(1, maxY - minY)}
    >
      {/* Wide transparent path for easy click/hover hit-testing */}
      <path
        d={pathDLocal}
        stroke="transparent"
        className="cursor-pointer"
        strokeWidth={20}
        fill="none"
        pointerEvents="stroke"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseDown={handleMouseDownEdge}
      />
      {/* Visible path */}
      <path
        className={`pointer-events-auto fill-transparent cursor-pointer
          ${hovering ? "stroke-opacity-100" : "stroke-opacity-50"}`}
        d={pathDLocal}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        pointerEvents="stroke"
      />
    </svg>
  );
};

export default EditorEdge2;
