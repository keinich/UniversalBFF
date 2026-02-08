import { SchemaRoot } from 'fusefx-modeldescription'
import { Camera } from './Camera'
import { Position } from './Position'
import { BoardState } from './BoardState'

export function getBoardPosFromWindowPos(windowPos: Position): Position {
  const boardEl: HTMLElement | null = document.getElementById('board')
  const widthDiff: number = boardEl!.getBoundingClientRect().x
  const heightDiff: number = boardEl!.getBoundingClientRect().y

  return {
    x: windowPos.x - widthDiff,
    y: windowPos.y - heightDiff,
  }
}

export function getViewPosFromWorldPos(boardPos: Position, cam: Camera): Position {
  return {
    x: cam.scale * (boardPos.x - cam.pos.x),
    y: cam.scale * (boardPos.y - cam.pos.y),
  }
}

export function getWorldPosFromViewPos(boardPos: Position, cam: Camera): Position {
  return {
    x: boardPos.x / cam.scale + cam.pos.x,
    y: boardPos.y / cam.scale + cam.pos.y,
  }
}

export function getBoardStateFromSchema(schema: SchemaRoot): BoardState {
  const result: BoardState = new BoardState()
  const boardStateString: string | null = schema.designerData
  if (boardStateString && boardStateString != '') {
    const boardState: any = JSON.parse(boardStateString)
    result.nodes = boardState.nodes
    result.edges = boardState.edges
  }
  return result
}

export function getSchemaFromBoardState(boardState: BoardState): SchemaRoot {
  const schema: SchemaRoot = new SchemaRoot()
  schema.entities = []
  schema.relations = []
  boardState.nodes.forEach((node) => {
    schema.entities.push(node.entitySchema)
  })
  boardState.edges.forEach((edge) => {
    schema.relations.push(edge.relation)
  })

  schema.designerData = JSON.stringify(boardState)
  return schema
}

/**
 * Calculate the optimal connection points on the borders of two rectangular nodes
 * @param node1Pos Position of the first node (top-left corner)
 * @param node1Width Width of the first node
 * @param node1Height Height of the first node
 * @param node2Pos Position of the second node (top-left corner)
 * @param node2Width Width of the second node
 * @param node2Height Height of the second node
 * @returns Object with startPoint (on node1 border) and endPoint (on node2 border)
 */
export function calculateNodeConnectionPoints(
  node1Pos: Position,
  node1Width: number,
  node1Height: number,
  node2Pos: Position,
  node2Width: number,
  node2Height: number,
): { startPoint: Position; endPoint: Position } {
  // Calculate centers of both nodes
  const center1: Position = {
    x: node1Pos.x + node1Width / 2,
    y: node1Pos.y + node1Height / 2,
  }
  const center2: Position = {
    x: node2Pos.x + node2Width / 2,
    y: node2Pos.y + node2Height / 2,
  }

  // Calculate the direction vector from node1 to node2
  const dx = center2.x - center1.x
  const dy = center2.y - center1.y

  // Calculate intersection point on node1's border
  const startPoint = calculateRectangleBorderIntersection(
    center1,
    dx,
    dy,
    node1Width,
    node1Height,
  )

  // Calculate intersection point on node2's border (from opposite direction)
  const endPoint = calculateRectangleBorderIntersection(center2, -dx, -dy, node2Width, node2Height)

  return { startPoint, endPoint }
}

/**
 * Calculate where a ray from the center of a rectangle intersects its border
 * @param center Center point of the rectangle
 * @param dx X component of the direction vector
 * @param dy Y component of the direction vector
 * @param width Width of the rectangle
 * @param height Height of the rectangle
 * @returns The point on the rectangle border
 */
function calculateRectangleBorderIntersection(
  center: Position,
  dx: number,
  dy: number,
  width: number,
  height: number,
): Position {
  const halfWidth = width / 2
  const halfHeight = height / 2

  // Avoid division by zero
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
    return { x: center.x + halfWidth, y: center.y }
  }

  // Calculate the parametric t values for intersection with each border
  const tRight = dx > 0 ? halfWidth / dx : Infinity
  const tLeft = dx < 0 ? -halfWidth / dx : Infinity
  const tBottom = dy > 0 ? halfHeight / dy : Infinity
  const tTop = dy < 0 ? -halfHeight / dy : Infinity

  // Find the minimum t value (first intersection)
  const t = Math.min(tRight, tLeft, tBottom, tTop)

  return {
    x: center.x + t * dx,
    y: center.y + t * dy,
  }
}
