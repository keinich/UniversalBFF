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

type Side = 'top' | 'bottom' | 'left' | 'right';

function getAnchorPoint(bounds: NodeBounds, side: Side): { x: number; y: number } {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  switch (side) {
    case 'top':    return { x: cx, y: bounds.y };
    case 'bottom': return { x: cx, y: bounds.y + bounds.h };
    case 'left':   return { x: bounds.x, y: cy };
    case 'right':  return { x: bounds.x + bounds.w, y: cy };
  }
}

function isInsideBounds(pt: { x: number; y: number }, b: NodeBounds, margin = 4): boolean {
  return pt.x > b.x - margin && pt.x < b.x + b.w + margin &&
         pt.y > b.y - margin && pt.y < b.y + b.h + margin;
}

function chooseBestSides(
  startBounds: NodeBounds,
  endBounds: NodeBounds,
): { startSide: Side; endSide: Side } {
  const SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
  const CLIP_PENALTY = 10000;
  // Left/right sides are only allowed when one node lies completely to the
  // left of the other (right edge of leftmost < left edge of rightmost).
  // If they overlap horizontally at all, forbid horizontal sides entirely.
  const noHorizontalOverlap =
    startBounds.x + startBounds.w < endBounds.x ||
    endBounds.x + endBounds.w < startBounds.x;
  const H_SIDE_FORBIDDEN = !noHorizontalOverlap;
  let bestCost = Infinity;
  let bestStart: Side = 'top';
  let bestEnd: Side = 'bottom';

  for (const ss of SIDES) {
    for (const es of SIDES) {
      const sa = getAnchorPoint(startBounds, ss);
      const ea = getAnchorPoint(endBounds, es);
      let cost = Math.abs(sa.x - ea.x) + Math.abs(sa.y - ea.y);

      // Forbid left/right when nodes overlap horizontally
      if (H_SIDE_FORBIDDEN && (ss === 'left' || ss === 'right')) cost += CLIP_PENALTY;
      if (H_SIDE_FORBIDDEN && (es === 'left' || es === 'right')) cost += CLIP_PENALTY;

      // Determine the L-shape corner for this pair
      const isHStart = ss === 'left' || ss === 'right';
      const corner = isHStart
        ? { x: ea.x, y: sa.y }  // horizontal-first: corner aligns with ea.x
        : { x: sa.x, y: ea.y }; // vertical-first: corner aligns with sa.x

      if (isInsideBounds(corner, startBounds) || isInsideBounds(corner, endBounds)) {
        cost += CLIP_PENALTY;
      }

      if (cost < bestCost) {
        bestCost = cost;
        bestStart = ss;
        bestEnd = es;
      }
    }
  }

  return { startSide: bestStart, endSide: bestEnd };
}

// ─── Layout constants (must match EditorNode.tsx) ────────────────────────────

/** Fixed pixel width of every node card */
const NODE_WIDTH = 220;

/** Height of a single field/header row inside a node card */
const NODE_FIELD_HEIGHT = 30;

/** Border width applied via Tailwind `border-2` on the node div */
const NODE_BORDER = 2;

/**
 * After the field drag-and-drop refactor, each own-field row is wrapped in a
 * `<div>` that carries a `borderTop: 2px solid transparent` (and matching
 * borderBottom) as a DnD drop-indicator.  With CSS `box-sizing: border-box`
 * the row height stays at wh, but the row's *padding edge* (the reference
 * point for absolutely-positioned children like the connector dot) is 2 px
 * inside the row's outer edge.  The connector dot uses `top: (1/3)*wh` which
 * is measured from the padding edge, so the dot's outer-top is actually
 * `ROW_WRAPPER_BORDER_TOP + (1/3)*wh`.  We must add this offset here so the
 * computed edge start Y matches the rendered dot centre.
 */
const ROW_WRAPPER_BORDER_TOP = 2;

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
  // Mirror EditorNode exactly: inheritance rows only exist when the node has a parent.
  const hasParent = !!node.entitySchema.inheritedEntityName;
  const inheritanceRowCount = hasParent ? 1 + inheritedCount : 0;
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
 *     NODE_BORDER + wh * (fieldIndex + 1 + inheritanceRowCount) + ROW_WRAPPER_BORDER_TOP + wh / 2
 *     (ROW_WRAPPER_BORDER_TOP = 2 px, from the DnD row wrapper's transparent borderTop)
 *   Index row handle Y:
 *     NODE_BORDER + wh * (numFieldRows + 1 + indexIndex) + sepH + sepM + wh / 2
 *   where numFieldRows = fields.length + 2 + inheritanceRowCount
 *   The +1 accounts for the "Indices" section header row that sits between the
 *   field rows and the first index row.
 */
function calcHandleCenterY(
  node: NodeData,
  fieldName: string,
  nodeViewY: number,
  wh: number,
): number {
  const inheritedCount = node.inheritedFieldCount ?? 0;
  const hasParent = !!node.entitySchema.inheritedEntityName;
  const inheritanceRowCount = hasParent ? 1 + inheritedCount : 0;

  const fieldIdx = node.entitySchema.fields.findIndex(
    (f) => f.name === fieldName,
  );

  if (fieldIdx >= 0) {
    // ROW_WRAPPER_BORDER_TOP: the field row wrapper has `borderTop: 2px solid transparent`
    // (for DnD drop indicators).  With border-box sizing the wrapper height stays wh,
    // but the padding edge — where `top: (1/3)*wh` on the connector dot is anchored —
    // sits 2 px inside the wrapper's outer edge.  Adding ROW_WRAPPER_BORDER_TOP corrects
    // this offset so the edge line starts at the visual dot centre.
    return (
      nodeViewY +
      NODE_BORDER +
      wh * (fieldIdx + 1 + inheritanceRowCount) +
      ROW_WRAPPER_BORDER_TOP +
      wh / 2
    );
  }

  // Check if fieldName belongs to an inherited field row.
  // Inherited field at index inh is at:
  //   Row 0: entity name header
  //   Row 1: "extends" header row
  //   Row inh+2: inh-th inherited field
  const inhIdx = node.inheritedFieldNames
    ? node.inheritedFieldNames.indexOf(fieldName)
    : -1;
  if (inhIdx >= 0) {
    return nodeViewY + NODE_BORDER + wh * (inhIdx + 2) + wh / 2;
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
    wh * (numFieldRows + 1 + indexIdx) +
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
  inheritStartSide?: Side;
  inheritEndSide?: Side;
  startNodeBounds: NodeBounds;
  endNodeBounds: NodeBounds;
} {
  const wh = camera.scale * NODE_FIELD_HEIGHT;
  const ww = camera.scale * NODE_WIDTH;
  const isInheritance = edge.edgeType === 'inheritance';

  const startViewPos = getViewPosFromWorldPos(startNode.currentPosition, camera);
  const startNodeHeight = calcNodeViewHeight(startNode, wh);

  // ── Inheritance edges: dynamic side selection ────────────────────────────
  // Evaluate all 16 side-pair combinations and pick the one that yields the
  // shortest path without the L-shape corner clipping through either node.
  if (isInheritance) {
    const startNodeBounds: NodeBounds = {
      x: startViewPos.x, y: startViewPos.y, w: ww, h: startNodeHeight,
    };

    if (endNode) {
      const endViewPos = getViewPosFromWorldPos(endNode.currentPosition, camera);
      const endNodeHeight = calcNodeViewHeight(endNode, wh);
      const endNodeBounds: NodeBounds = {
        x: endViewPos.x, y: endViewPos.y, w: ww, h: endNodeHeight,
      };
      const { startSide: ss, endSide: es } = chooseBestSides(startNodeBounds, endNodeBounds);
      return {
        startPos: getAnchorPoint(startNodeBounds, ss),
        endPos:   getAnchorPoint(endNodeBounds,   es),
        startSide: 'right' as const,
        inheritStartSide: ss,
        inheritEndSide:   es,
        startNodeBounds,
        endNodeBounds,
      };
    } else {
      // Drag preview: synthesise a tiny bounds at the cursor
      const cursorView = getViewPosFromWorldPos(edge.currentEndPosition, camera);
      const cursorBounds: NodeBounds = { x: cursorView.x, y: cursorView.y, w: 0, h: 0 };
      const { startSide: ss } = chooseBestSides(startNodeBounds, cursorBounds);
      return {
        startPos: getAnchorPoint(startNodeBounds, ss),
        endPos:   cursorView,
        startSide: 'right' as const,
        inheritStartSide: ss,
        inheritEndSide:   'left' as const,
        startNodeBounds,
        endNodeBounds: cursorBounds,
      };
    }
  }

  // ── Relation edges ────────────────────────────────────────────────────────
  const startHandleY = calcHandleCenterY(startNode, edge.outputFieldName, startViewPos.y, wh);

  let endCenterY: number;
  let endViewX: number;
  let endNodeBounds: NodeBounds;

  if (endNode) {
    // Committed edge: anchor to the exact handle on the end node.
    const endViewPos = getViewPosFromWorldPos(endNode.currentPosition, camera);
    const endNodeHeight = calcNodeViewHeight(endNode, wh);
    endCenterY = calcHandleCenterY(endNode, edge.inputFieldName, endViewPos.y, wh);
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
    endViewX = cursorView.x;
    endNodeBounds = { x: cursorView.x, y: cursorView.y, w: 0, h: 0 };
  }

  // ── Side selection ────────────────────────────────────────────────────────
  let startSide: "left" | "right" = "right";
  let startCenterX: number;
  let endCenterX: number;

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

  const startNodeBounds: NodeBounds = {
    x: startViewPos.x,
    y: startViewPos.y,
    w: ww,
    h: startNodeHeight,
  };

  return {
    startPos: { x: startCenterX, y: startHandleY },
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

/**
 * Compute waypoints for an inheritance edge.
 * Routes orthogonally with the fewest turns, respecting the exit/entry sides.
 *
 * Side direction:
 *   left/right → horizontal first segment
 *   top/bottom → vertical first segment
 */
function computeInheritanceEdgePath(
  sa: { x: number; y: number },
  startSide: Side,
  ea: { x: number; y: number },
  endSide: Side,
  startBounds: NodeBounds,
  endBounds: NodeBounds,
): { x: number; y: number }[] {
  const MARGIN = 20;
  const isHStart = startSide === 'left' || startSide === 'right';
  const isHEnd   = endSide   === 'left' || endSide   === 'right';

  // ── Both vertical ────────────────────────────────────────────────────────────
  if (!isHStart && !isHEnd) {
    if (startSide !== endSide) {
      // Facing pair (bottom→top or top→bottom): midY sits in the gap.
      const goingDown = startSide === 'bottom';
      if ((goingDown && sa.y < ea.y) || (!goingDown && sa.y > ea.y)) {
        const midY = (sa.y + ea.y) / 2;
        if (Math.abs(sa.x - ea.x) < 1) return [sa, ea];
        return [sa, { x: sa.x, y: midY }, { x: ea.x, y: midY }, ea];
      }
      // Gap closed (nodes overlap in Y) — fall through to rail.
    }
    // Same-direction (top→top / bottom→bottom) or overlap fallback:
    // use a rail completely outside both nodes.
    const railY = startSide === 'top'
      ? Math.min(startBounds.y, endBounds.y) - MARGIN
      : Math.max(startBounds.y + startBounds.h, endBounds.y + endBounds.h) + MARGIN;
    if (Math.abs(sa.x - ea.x) < 1) return [sa, { x: sa.x, y: railY }, ea];
    return [sa, { x: sa.x, y: railY }, { x: ea.x, y: railY }, ea];
  }

  // ── Both horizontal ──────────────────────────────────────────────────────────
  if (isHStart && isHEnd) {
    if (startSide !== endSide) {
      // Facing pair (right→left or left→right): midX sits in the gap.
      const goingRight = startSide === 'right';
      if ((goingRight && sa.x < ea.x) || (!goingRight && sa.x > ea.x)) {
        const midX = (sa.x + ea.x) / 2;
        if (Math.abs(sa.y - ea.y) < 1) return [sa, ea];
        return [sa, { x: midX, y: sa.y }, { x: midX, y: ea.y }, ea];
      }
      // No gap — fall through to rail.
    }
    // Same-direction or no-gap fallback: rail outside both nodes.
    const railX = startSide === 'right'
      ? Math.max(startBounds.x + startBounds.w, endBounds.x + endBounds.w) + MARGIN
      : Math.min(startBounds.x, endBounds.x) - MARGIN;
    if (Math.abs(sa.y - ea.y) < 1) return [sa, { x: railX, y: sa.y }, ea];
    return [sa, { x: railX, y: sa.y }, { x: railX, y: ea.y }, ea];
  }

  // ── Mixed: H→V or V→H (single L-shape turn) ─────────────────────────────────
  if (isHStart) {
    // Horizontal start → vertical end: corner at (ea.x, sa.y)
    const corner = { x: ea.x, y: sa.y };
    if (Math.abs(corner.x - sa.x) < 1 || Math.abs(corner.y - ea.y) < 1) return [sa, ea];
    return [sa, corner, ea];
  }
  // Vertical start → horizontal end: corner at (sa.x, ea.y)
  const corner = { x: sa.x, y: ea.y };
  if (Math.abs(corner.x - ea.x) < 1 || Math.abs(corner.y - sa.y) < 1) return [sa, ea];
  return [sa, corner, ea];
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

  const { startPos, endPos, startSide, inheritStartSide, inheritEndSide, startNodeBounds, endNodeBounds } =
    calcEdgeEndpoints(edge, startNode, endNode, camera);

  const waypoints = isInheritance
    ? [startPos, endPos]
    : computeWaypoints(startPos, endPos, startSide, startNodeBounds, endNodeBounds);

  // SVG bounding box – encompasses every waypoint plus padding.
  const pad = 16;
  const allX = waypoints.map((p) => p.x);
  const allY = waypoints.map((p) => p.y);
  const minX = Math.min(...allX) - pad;
  const minY = Math.min(...allY) - pad;
  const maxX = Math.max(...allX) + pad;
  const maxY = Math.max(...allY) + pad;

  // Inheritance edges are a plain straight line; relation edges use the
  // orthogonal rounded router (which only handles axis-aligned segments).
  const pathD = isInheritance
    ? `M ${startPos.x - minX} ${startPos.y - minY} L ${endPos.x - minX} ${endPos.y - minY}`
    : buildRoundedPath(waypoints, 8, minX, minY);

  // Colour logic: inheritance edges use indigo; relation edges use grey/blue.
  let strokeColor: string;
  if (isInheritance) {
    strokeColor = selected ? "#a78bfa" : highlighted ? "#7c3aed" : "#6366f1";
  } else {
    strokeColor = highlighted ? "#3b82f6" : selected ? "#f59e42" : "#888";
  }

  // Marker IDs must be unique per edge instance — shared IDs across SVG elements
  // cause the browser to reuse the wrong definition, making arrows invisible.
  const markerId = isInheritance
    ? `arrowhead-inherit-${edge.id}`
    : `arrowhead-rel-${edge.id}`;

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
            refX={TRI_SIZE}
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
