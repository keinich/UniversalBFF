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

const EditorEdge: React.FC<{
  selected: boolean;
  highlighted?: boolean;
  isNew: boolean;
  startNode?: NodeInfo;
  endNode?: NodeInfo;
  position?: { x0: number; y0: number; x1: number; y1: number };
  camera: Camera;
  onMouseDownEdge: () => void;
  onClickDelete: () => void;
}> = ({
  selected,
  highlighted = false,
  isNew,
  startNode,
  endNode,
  position,
  camera,
  onMouseDownEdge,
  onClickDelete,
}) => {
  function handleMouseDownEdge(e: any) {
    e.stopPropagation();

    onMouseDownEdge();
  }

  function calculateOffset(value: number): number {
    return value / 2;
  }

  let x0: number, y0: number, x1: number, y1: number;

  // If both nodes are provided, calculate dynamic connection points
  if (startNode && endNode) {
    const { startPoint, endPoint } = calculateNodeConnectionPoints(
      startNode.position,
      startNode.width,
      startNode.height,
      endNode.position,
      endNode.width,
      endNode.height,
    );

    // Convert world positions to view positions
    const startViewPos = getViewPosFromWorldPos(startPoint, camera);
    const endViewPos = getViewPosFromWorldPos(endPoint, camera);

    x0 = startViewPos.x;
    y0 = startViewPos.y;
    x1 = endViewPos.x;
    y1 = endViewPos.y;
  } else if (position) {
    // Fallback to direct position (used for new edges being drawn)
    x0 = camera.scale * position.x0 - camera.scale * camera.pos.x;
    x1 = camera.scale * position.x1 - camera.scale * camera.pos.x;
    y0 = camera.scale * position.y0 - camera.scale * camera.pos.y;
    y1 = camera.scale * position.y1 - camera.scale * camera.pos.y;
  } else {
    // Default fallback
    x0 = 0;
    y0 = 0;
    x1 = 0;
    y1 = 0;
  }

  // Determine edge color based on state
  let strokeColor = "stroke-pink-500";
  if (selected) {
    strokeColor = "stroke-orange-400";
  } else if (highlighted) {
    strokeColor = "stroke-blue-400";
  }

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none border-0">
      <path
        className={`pointer-events-auto stroke-2 fill-transparent cursor-pointer ${strokeColor}`}
        d={`M ${x0} ${y0} C ${x0 + calculateOffset(Math.abs(x1 - x0))} ${y0}, ${
          x1 - calculateOffset(Math.abs(x1 - x0))
        } ${y1}, ${x1} ${y1}`}
        onMouseDown={handleMouseDownEdge}
      />
    </svg>
  );
};

export default EditorEdge;
