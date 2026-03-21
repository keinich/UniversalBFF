import React from "react";
import { Camera } from "../bl/Camera";
import { EdgeData } from "../bl/EdgeData";
import { NodeData } from "../bl/NodeData";
import { getViewPosFromWorldPos } from "../bl/BoardUtils";

/** Bounding box of a node in view (screen) space */
export interface NodeBounds {
  x: number; // left edge
  y: number; // top edge
  w: number; // width
  h: number; // height
}

// ─── Layout constants (must match EditorNode.tsx) ────────────────────────────

/** Fixed pixel width of every node card */
const NODE_WIDTH = 220;

/** Height of a single field/header row inside a node card */
const NODE_FIELD_HEIGHT = 30;

/** Border width applied via Tailwind `border-2` on the node div */
const NODE_BORDER = 2;

// ─── Node dimension helpers ───────────────────────────────────────────────────

/**
 * Calculate the view-space height of a node card, matching EditorNode.tsx
 * exactly.
 *
 * wh = camera.scale * NODE_FIELD_HEIGHT
 *   separationBorderHeight = wh * 0.03
 *   separationBorderMargin = wh * 0.1
 *   numFields = entitySchema.fields.length + 2 + inheritanceRowCount  (header + inheritance rows + own fields + new-field input)
 *   numIndices = entitySchema.indices.length + 2 (section header + new index input)
 *   height = wh * (numFields + numIndices) + 6 + separationBorderHeight + separationBorderMargin
 */
function calcNodeViewHeight(node: NodeData, wh: number): number {
  const borderHeight = 6;
  const separationBorderHeight = wh * 0.03;
  const separationBorderMargin = wh * 0.1;
  const inheritedCount = node.inheritedFieldCount ?? 0;
  const inheritanceRowCount = 1 + inheritedCount; // always 1 "extends" row + N inherited field rows
  const numFields = node.entitySchema.fields.length + 2 + inheritanceRowCount;
  const numIndices = node.entitySchema.indices.length + 2;
  return (
    wh * (numFields + numIndices) +
    borderHeight +
    separationBorderHeight +
    separationBorderMargin
  );
}

// ─── Handle-position helpers ──────────────────────────────────────────────────

/**
 * Compute the view-space Y centre of the connector handle for a given field or
 * index name on a node.
 *
 * Layout (from node border-box top, in view space):
 *   Row 0: entity name header
 *   Rows 1..(inheritanceRowCount): inheritance row + inherited field rows
 *   Rows (1+inheritanceRowCount)..(1+inheritanceRowCount+fields.length-1): own fields
 *   Row (1+inheritanceRowCount+fields.length): new-field input
 *   Then indices section header + index rows
 *
 *   Own field row handle Y:
 *     NODE_BORDER + wh * (fieldIndex + 1 + inheritanceRowCount) + wh / 2
 *   Index row handle Y:
 *     NODE_BORDER + wh * (numFieldRows + indexIndex) + sepH + sepM + wh / 2
 *   where numFieldRows = fields.length + 2 + inheritanceRowCount
 */
function calcHandleCenterY(
  node: NodeData,
  fieldName: string,
  nodeViewY: number,
  wh: number,
): number {
  const inheritedCount = node.inheritedFieldCount ?? 0;
  const inheritanceRowCount = 1 + inheritedCount;

  const fieldIdx = node.entitySchema.fields.findIndex(
    (f) => f.name === fieldName,
  );

  if (fieldIdx >= 0) {
    return nodeViewY + NODE_BORDER + wh * (fieldIdx + 1 + inheritanceRowCount) + wh / 2;
  }

  const indexIdx = node.entitySchema.indices.findIndex(
    (idx) => idx.name === fieldName,
  );
  const numFieldRows = node.entitySchema.fields.length + 2 + inheritanceRowCount;
  const sepH = wh * 0.03;
  const sepM = wh * 0.1;
  return (
    nodeViewY +
    NODE_BORDER +
    wh * (numFieldRows + indexIdx) +
    sepH +
    sepM +
    wh / 2
  );
}

/**
 * Derive the view-space start/end positions, exit side, and node bounding
 * boxes used by the router.
 *
 * When `endNode` is provided the end point is the exact handle centre on that
 * node (committed edge).  When it is absent the end point is
 * `edge.currentEndPosition` (world space), converted to view space — this is
 * the cursor position during a drag-to-connect gesture.  In that case a
 * zero-size bounding box is synthesised at the cursor so the router still
 * routes correctly (the 20 px MARGIN around a 0×0 box is harmless).
 *
 * Inheritance edges (edgeType === 'inheritance') connect from the top-centre
 * of the child node to the top-centre of the parent node rather than field
 * handles.
 */
function calcEdgeEndpoints(
  edge: EdgeData,
  startNode: NodeData,
  endNode: NodeData | undefined,
  camera: Camera,
): {
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  startSide: "left" | "right";
  startNodeBounds: NodeBounds;
  endNodeBounds: NodeBounds;
} {
  const wh = camera.scale * NODE_FIELD_HEIGHT;
  const ww = camera.scale * NODE_WIDTH;
  const isInheritance = edge.edgeType === 'inheritance';

  const startViewPos = getViewPosFromWorldPos(startNode.currentPosition, camera);
  const startNodeHeight = calcNodeViewHeight(startNode, wh);

  // ── Start position ────────────────────────────────────────────────────────
  // Inheritance edges exit from the top-centre of the child node.
  // Relation edges exit from the field handle on the left or right edge.
  const startCenterY = isInheritance
    ? startViewPos.y // top of node
    : calcHandleCenterY(startNode, edge.outputFieldName, startViewPos.y, wh);

  // ── End point ────────────────────────────────────────────────────────────
  let endCenterY: number;
  let endViewX: number;
  let endNodeBounds: NodeBounds;

  if (endNode) {
    // Committed edge: anchor to the exact handle on the end node.
    const endViewPos = getViewPosFromWorldPos(endNode.currentPosition, camera);
    const endNodeHeight = calcNodeViewHeight(endNode, wh);
    endCenterY = isInheritance
      ? endViewPos.y // top of parent node
      : calcHandleCenterY(endNode, edge.inputFieldName, endViewPos.y, wh);
    endViewX = endViewPos.x;
    endNodeBounds = {
      x: endViewPos.x,
      y: endViewPos.y,
      w: ww,
      h: endNodeHeight,
    };
  } else {
    // New-edge drag: use the cursor world position (currentEndPosition).
    const cursorView = getViewPosFromWorldPos(edge.currentEndPosition, camera);
    endCenterY = cursorView.y;
    // endViewX is used below only to determine startSide; treat the cursor as
    // a zero-width target so the side comparison is purely horizontal.
    endViewX = cursorView.x;
    // Zero-size bounds at the cursor — the router adds its own MARGIN clearance.
    endNodeBounds = { x: cursorView.x, y: cursorView.y, w: 0, h: 0 };
  }

  // ── Side selection ────────────────────────────────────────────────────────
  // For inheritance edges: use the top-centre of each node as anchor, and
  // route above (the path exits upward, routes horizontally, then descends).
  // We achieve this by treating the anchor as being on the "top" side, but
  // since the router only knows left/right we pick the side that produces the
  // shortest path and let the Y anchor do the work.
  let startSide: "left" | "right" = "right";
  let startCenterX: number;
  let endCenterX: number;

  if (isInheritance) {
    // For inheritance, connect via top-centre of both nodes.
    startCenterX = startViewPos.x + ww / 2;
    if (endNode) {
      const endViewPos = getViewPosFromWorldPos(endNode.currentPosition, camera);
      endCenterX = endViewPos.x + ww / 2;
    } else {
      endCenterX = endViewX;
    }
    // startSide is still "right"/"left" in the router, but since both Y values
    // are at the top of the nodes the path will naturally route above them.
    startSide = startCenterX <= endCenterX ? "right" : "left";
    if (startSide === "left") {
      startCenterX = startViewPos.x + ww / 2;
    }
  } else {
    startCenterX = startViewPos.x + ww - NODE_BORDER; // right content-box edge

    if (endNode) {
      endCenterX = endViewX + NODE_BORDER; // left content-box edge of end node
      if (startViewPos.x + ww / 2 > endViewX + ww / 2) {
        startSide = "left";
        startCenterX = startViewPos.x + NODE_BORDER;
        endCenterX = endViewX + ww - NODE_BORDER;
      }
    } else {
      // No end node: compare start-node centre against cursor X.
      endCenterX = endViewX;
      if (startViewPos.x + ww / 2 > endViewX) {
        startSide = "left";
        startCenterX = startViewPos.x + NODE_BORDER;
      }
    }
  }

  const startNodeBounds: NodeBounds = {
    x: startViewPos.x,
    y: startViewPos.y,
    w: ww,
    h: startNodeHeight,
  };

  return {
    startPos: { x: startCenterX, y: startCenterY },
    endPos: { x: endCenterX, y: endCenterY },
    startSide,
    startNodeBounds,
    endNodeBounds,
  };
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * Props for EditorEdge2.
 *
 * Both committed edges and in-progress drag edges use this single interface.
 *
 * Committed edge (endNode present):
 *   The component derives all view-space geometry from startNode, endNode,
 *   and the field names stored in edge.
 *
 * New-edge drag preview (endNode absent):
 *   The end point is taken from edge.currentEndPosition (world space), which
 *   SchemaEditor updates on every mouse-move event.  The routing logic is
 *   identical — the cursor is treated as a zero-size target node.
 */
interface EditorEdge2Props {
  edge: EdgeData;
  startNode: NodeData;
  /** Omit while the edge is still being drawn (cursor follows the mouse). */
  endNode?: NodeData;
  camera: Camera;
  selected: boolean;
  highlighted?: boolean;
  onMouseDownEdge: () => void;
  onClickDelete: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const EditorEdge2: React.FC<EditorEdge2Props> = ({
  edge,
  startNode,
  endNode,
  camera,
  selected,
  highlighted = false,
  onMouseDownEdge,
  onClickDelete,
}) => {
  const [hovering, setHovering] = React.useState(false);

  function handleMouseDownEdge(e: React.MouseEvent) {
    e.stopPropagation();
    onMouseDownEdge();
  }

  const isInheritance = edge.edgeType === 'inheritance';

  const { startPos, endPos, startSide, startNodeBounds, endNodeBounds } =
    calcEdgeEndpoints(edge, startNode, endNode, camera);

  const waypoints = computeWaypoints(
    startPos,
    endPos,
    startSide,
    startNodeBounds,
    endNodeBounds,
  );

  // SVG bounding box – encompasses every waypoint plus padding.
  const pad = 16;
  const allX = waypoints.map((p) => p.x);
  const allY = waypoints.map((p) => p.y);
  const minX = Math.min(...allX) - pad;
  const minY = Math.min(...allY) - pad;
  const maxX = Math.max(...allX) + pad;
  const maxY = Math.max(...allY) + pad;

  const pathD = buildRoundedPath(waypoints, 8, minX, minY);

  // Colour logic: inheritance edges use indigo; relation edges use grey/blue.
  let strokeColor: string;
  if (isInheritance) {
    strokeColor = selected ? "#a78bfa" : highlighted ? "#7c3aed" : "#6366f1";
  } else {
    strokeColor = highlighted ? "#3b82f6" : selected ? "#f59e42" : "#888";
  }

  // The arrowhead marker id must be unique per colour so SVG doesn't share them.
  const markerId = isInheritance ? "arrowhead-inherit" : "arrowhead-rel";

  // Compute the direction of the last segment to orient the arrowhead.
  // The hollow triangle tip should point at endPos (the parent node).
  const lastPt = waypoints[waypoints.length - 1];
  const prevPt = waypoints[waypoints.length - 2] ?? waypoints[0];
  const angle =
    Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x) * (180 / Math.PI);

  // Triangle size (in SVG local coords)
  const TRI_SIZE = 10;

  // End tip of the path (relative to SVG origin) — where the triangle points.
  const tipX = lastPt.x - minX;
  const tipY = lastPt.y - minY;

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
      <defs>
        {isInheritance ? (
          /* Hollow triangle arrowhead for inheritance edges */
          <marker
            id={markerId}
            markerWidth={TRI_SIZE}
            markerHeight={TRI_SIZE}
            refX={TRI_SIZE - 1}
            refY={TRI_SIZE / 2}
            orient="auto"
          >
            <polygon
              points={`0 0, ${TRI_SIZE} ${TRI_SIZE / 2}, 0 ${TRI_SIZE}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth={1.5}
            />
          </marker>
        ) : (
          /* Filled arrowhead for relation edges */
          <marker
            id={markerId}
            markerWidth={8}
            markerHeight={8}
            refX={7}
            refY={4}
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill={strokeColor} />
          </marker>
        )}
      </defs>

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
        strokeWidth={isInheritance ? 1.5 : 2}
        strokeDasharray={isInheritance ? "6 3" : undefined}
        fill="none"
        pointerEvents="stroke"
        markerEnd={`url(#${markerId})`}
      />

      {/* "inherits" label on inheritance edges */}
      {isInheritance && (() => {
        // Place the label at the midpoint of the path's waypoints.
        const mid = waypoints[Math.floor(waypoints.length / 2)];
        return (
          <text
            x={mid.x - minX}
            y={mid.y - minY - 5}
            textAnchor="middle"
            fontSize={10}
            fill={strokeColor}
            opacity={hovering ? 1 : 0.7}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            inherits
          </text>
        );
      })()}
    </svg>
  );
};

export default EditorEdge2;
