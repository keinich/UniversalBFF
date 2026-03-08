import React from "react";
import { Camera } from "../bl/Camera";

/** Bounding box of a node in view (screen) space */
export interface NodeBounds {
  x: number; // left edge
  y: number; // top edge
  w: number; // width
  h: number; // height
}

// ─── Routing helpers ─────────────────────────────────────────────────────────

/**
 * Build a smooth orthogonal SVG path through a list of axis-aligned waypoints.
 * Consecutive waypoints must share either the same X or the same Y.
 * Corners are softened with quadratic Bézier curves of radius `maxR`.
 * All coordinates in the returned string are relative to (ox, oy).
 */
function buildRoundedPath(
  pts: { x: number; y: number }[],
  maxR: number,
  ox: number,
  oy: number,
): string {
  if (pts.length < 2) return "";
  const lx = (x: number) => x - ox;
  const ly = (y: number) => y - oy;

  let d = `M ${lx(pts[0].x)} ${ly(pts[0].y)}`;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1] ?? null;

    if (!next) {
      // Last segment – go straight
      if (cur.y === prev.y) d += ` H ${lx(cur.x)}`;
      else d += ` V ${ly(cur.y)}`;
      continue;
    }

    const seg1 = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y);
    const seg2 = Math.abs(next.x - cur.x) + Math.abs(next.y - cur.y);
    const r = Math.min(maxR, seg1 * 0.45, seg2 * 0.45);

    if (r < 1) {
      // Sharp corner
      if (cur.y === prev.y) d += ` H ${lx(cur.x)}`;
      else d += ` V ${ly(cur.y)}`;
    } else if (cur.y === prev.y) {
      // Horizontal → vertical corner
      const sx = Math.sign(cur.x - prev.x);
      const sy = Math.sign(next.y - cur.y);
      d += ` H ${lx(cur.x - sx * r)}`;
      d += ` Q ${lx(cur.x)} ${ly(cur.y)} ${lx(cur.x)} ${ly(cur.y + sy * r)}`;
    } else {
      // Vertical → horizontal corner
      const sy = Math.sign(cur.y - prev.y);
      const sx = Math.sign(next.x - cur.x);
      d += ` V ${ly(cur.y - sy * r)}`;
      d += ` Q ${lx(cur.x)} ${ly(cur.y)} ${lx(cur.x + sx * r)} ${ly(cur.y)}`;
    }
  }

  return d;
}

/**
 * Compute an orthogonal path that never passes through either node.
 *
 * Two routing strategies:
 *  • Simple (L-shape)  – 3 segments, used when the nodes have a clear
 *    horizontal gap so the path can travel straight between them.
 *  • U-shape           – 5 segments, used when nodes overlap horizontally
 *    (or are in the same column). The path detours above or below both nodes.
 */
function computeWaypoints(
  startPos: { x: number; y: number },
  endPos: { x: number; y: number },
  startSide: "left" | "right",
  startBounds: NodeBounds,
  endBounds: NodeBounds,
): { x: number; y: number }[] {
  const MARGIN = 20; // clearance outside a node edge

  // Simple path: pivot X sits between the two facing handle edges.
  // For startSide='right': startPos.x is the right edge of start node,
  //   endPos.x is the left edge of end node – path flows left→right.
  // For startSide='left': mirrored.
  const canSimple =
    startSide === "right"
      ? startPos.x < endPos.x // gap exists on the right→left corridor
      : startPos.x > endPos.x; // gap exists on the left→right corridor

  if (canSimple) {
    const pivotX = (startPos.x + endPos.x) / 2;
    return [
      startPos,
      { x: pivotX, y: startPos.y },
      { x: pivotX, y: endPos.y },
      endPos,
    ];
  }

  // ── U-shape detour ──────────────────────────────────────────────────────
  // Vertical rails sit well outside both nodes' X ranges.
  const leftRail = Math.min(startBounds.x, endBounds.x) - MARGIN;
  const rightRail =
    Math.max(startBounds.x + startBounds.w, endBounds.x + endBounds.w) +
    MARGIN;

  // Choose routeY: prefer the vertical gap between the two nodes (if one
  // exists) so the path stays between them rather than looping all the way
  // above or below both.  Fall back to above/below only when the nodes
  // overlap in Y and there is no gap.
  const upperBottom = Math.min(
    startBounds.y + startBounds.h,
    endBounds.y + endBounds.h,
  );
  const lowerTop = Math.max(startBounds.y, endBounds.y);

  let routeY: number;
  if (upperBottom < lowerTop) {
    // Clear vertical gap between the nodes – thread through the middle.
    routeY = (upperBottom + lowerTop) / 2;
  } else {
    // Nodes overlap in Y – must go above or below both.
    const topRail = Math.min(startBounds.y, endBounds.y) - MARGIN;
    const bottomRail =
      Math.max(startBounds.y + startBounds.h, endBounds.y + endBounds.h) +
      MARGIN;
    const topCost =
      Math.abs(startPos.y - topRail) + Math.abs(endPos.y - topRail);
    const bottomCost =
      Math.abs(startPos.y - bottomRail) + Math.abs(endPos.y - bottomRail);
    routeY = topCost <= bottomCost ? topRail : bottomRail;
  }

  // The first vertical rail is on the exit side; the second is on the entry side.
  const firstRailX = startSide === "right" ? rightRail : leftRail;
  const secondRailX = startSide === "right" ? leftRail : rightRail;

  return [
    startPos,
    { x: firstRailX, y: startPos.y },
    { x: firstRailX, y: routeY },
    { x: secondRailX, y: routeY },
    { x: secondRailX, y: endPos.y },
    endPos,
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

const EditorEdge2: React.FC<{
  selected: boolean;
  highlighted?: boolean;
  isNew: boolean;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  /** Which side of the start node the edge exits from */
  startSide: "left" | "right";
  startNodeBounds: NodeBounds;
  endNodeBounds: NodeBounds;
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
  startNodeBounds,
  endNodeBounds,
  camera,
  onMouseDownEdge,
  onClickDelete,
}) => {
  const [hovering, setHovering] = React.useState(false);

  function handleMouseDownEdge(e: any) {
    e.stopPropagation();
    onMouseDownEdge();
  }

  const waypoints = computeWaypoints(
    startPos,
    endPos,
    startSide,
    startNodeBounds,
    endNodeBounds,
  );

  // SVG bounding box – encompasses every waypoint plus padding.
  const pad = 10;
  const allX = waypoints.map((p) => p.x);
  const allY = waypoints.map((p) => p.y);
  const minX = Math.min(...allX) - pad;
  const minY = Math.min(...allY) - pad;
  const maxX = Math.max(...allX) + pad;
  const maxY = Math.max(...allY) + pad;

  const pathD = buildRoundedPath(waypoints, 8, minX, minY);
  const strokeColor = highlighted ? "#3b82f6" : selected ? "#f59e42" : "#888";

  return (
    <svg
      style={{
        position: "absolute",
        left: minX,
        top: minY,
        pointerEvents: "none",
        overflow: "visible",
      }}
      width={Math.max(1, maxX - minX)}
      height={Math.max(1, maxY - minY)}
    >
      {/* Wide transparent stroke for easy click/hover hit-testing */}
      <path
        d={pathD}
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
        d={pathD}
        stroke={strokeColor}
        strokeWidth={2}
        fill="none"
        pointerEvents="stroke"
      />
    </svg>
  );
};

export default EditorEdge2;
