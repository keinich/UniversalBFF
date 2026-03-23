import {
  EntitySchema,
  RelationSchema,
  SchemaRoot,
} from "fusefx-modeldescription";
import { EdgeData } from "./EdgeData";
import { NodeData } from "./NodeData";
import { Camera } from "./Camera";
import { Position } from "./Position";
import { BoardState } from "./BoardState";

export function getBoardPosFromWindowPos(windowPos: Position): Position {
  const boardEl: HTMLElement | null = document.getElementById("board");
  const widthDiff: number = boardEl!.getBoundingClientRect().x;
  const heightDiff: number = boardEl!.getBoundingClientRect().y;

  return {
    x: windowPos.x - widthDiff,
    y: windowPos.y - heightDiff,
  };
}

export function getViewPosFromWorldPos(
  boardPos: Position,
  cam: Camera,
): Position {
  return {
    x: cam.scale * (boardPos.x - cam.pos.x),
    y: cam.scale * (boardPos.y - cam.pos.y),
  };
}

export function getWorldPosFromViewPos(
  boardPos: Position,
  cam: Camera,
): Position {
  return {
    x: boardPos.x / cam.scale + cam.pos.x,
    y: boardPos.y / cam.scale + cam.pos.y,
  };
}

/**
 * Generate a default BoardState from a SchemaRoot when no designerData is present.
 * Uses a BFS-based hierarchical layout: primary entities left, foreign/child entities right.
 */
function generateDefaultBoardState(schema: SchemaRoot): BoardState {
  const result = new BoardState();

  const entities: EntitySchema[] =
    schema.entities || (schema as any)["Entities"];
  const relations: RelationSchema[] =
    schema.relations || (schema as any)["Relations"];
  const NODE_WIDTH = 200;
  const NODE_HEADER_HEIGHT = 50;
  const FIELD_ROW_HEIGHT = 28;
  const H_GAP = 100;
  const V_GAP = 50;

  // Assign stable numeric ids
  let nextId = 1;
  const nameToId = new Map<string, number>();
  console.log("Schema", schema);
  entities.forEach((entity) => nameToId.set(entity.name, nextId++));

  // Build entity name → EntitySchema lookup
  const nameToEntity = new Map(entities.map((e) => [e.name, e]));

  // Create NodeData (positions set later)
  const nodeById = new Map<number, NodeData>();
  entities.forEach((entity) => {
    const id = nameToId.get(entity.name)!;
    const node: NodeData = {
      id,
      numInputs: 2,
      numOutputs: 2,
      currentPosition: { x: 0, y: 0 },
      previousPosition: { x: 0, y: 0 },
      inputEdgeIds: [],
      outputEdgeIds: [],
      entitySchema: entity,
    };
    nodeById.set(id, node);
    result.nodes.push(node);
  });

  // Build directed adjacency (primary → foreign, parent → child) for column assignment
  const outEdges = new Map<number, number[]>();
  result.nodes.forEach((n) => outEdges.set(n.id, []));

  relations.forEach((rel) => {
    const pId = nameToId.get(rel.primaryEntityName);
    const fId = nameToId.get(rel.foreignEntityName);
    if (pId !== undefined && fId !== undefined && pId !== fId) {
      outEdges.get(pId)!.push(fId);
    }
  });
  entities.forEach((e) => {
    if (e.inheritedEntityName) {
      const parentId = nameToId.get(e.inheritedEntityName);
      const childId = nameToId.get(e.name);
      if (parentId !== undefined && childId !== undefined) {
        outEdges.get(parentId)!.push(childId);
      }
    }
  });

  // Compute in-degrees
  const inDegree = new Map<number, number>();
  result.nodes.forEach((n) => inDegree.set(n.id, 0));
  outEdges.forEach((targets) =>
    targets.forEach((t) => inDegree.set(t, (inDegree.get(t) ?? 0) + 1)),
  );

  // BFS from root nodes (in-degree 0) to assign columns
  const nodeColumn = new Map<number, number>();
  const queue: number[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) {
      nodeColumn.set(id, 0);
      queue.push(id);
    }
  });
  // Handle cycles / disconnected nodes
  result.nodes.forEach((n) => {
    if (!nodeColumn.has(n.id)) {
      nodeColumn.set(n.id, 0);
      queue.push(n.id);
    }
  });

  let qi = 0;
  while (qi < queue.length) {
    const cur = queue[qi++];
    const col = nodeColumn.get(cur) ?? 0;
    outEdges.get(cur)?.forEach((target) => {
      const newCol = col + 1;
      if ((nodeColumn.get(target) ?? -1) < newCol) {
        nodeColumn.set(target, newCol);
        queue.push(target);
      }
    });
  }

  // Group nodes by column, sorted by name within column for stability
  const columns = new Map<number, NodeData[]>();
  result.nodes.forEach((n) => {
    const col = nodeColumn.get(n.id) ?? 0;
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col)!.push(n);
  });
  columns.forEach((nodes) =>
    nodes.sort((a, b) => {
      const esA: any = a.entitySchema || (a as any)["EntitySchema"];
      const esB: any = b.entitySchema || (b as any)["EntitySchema"];
      const nameA = esA["name"] || esA["Name"] || "";
      const nameB = esB["name"] || esB["Name"] || "";
      return nameA.localeCompare(nameB);
    }),
  );

  // Assign positions column by column
  const colKeys = Array.from(columns.keys()).sort((a, b) => a - b);
  let curX = 60;
  colKeys.forEach((col) => {
    const nodes = columns.get(col)!;
    let curY = 60;
    nodes.forEach((node) => {
      node.currentPosition = { x: curX, y: curY };
      node.previousPosition = { x: curX, y: curY };
      const entitySchema = node.entitySchema || (node as any)["EntitySchema"];
      const fields =
        entitySchema.fields || (entitySchema as any)["Fields"] || [];
      const nodeHeight = NODE_HEADER_HEIGHT + fields.length * FIELD_ROW_HEIGHT;
      curY += nodeHeight + V_GAP;
    });
    curX += NODE_WIDTH + H_GAP;
  });

  // Helper: resolve FK field name from an index name on an entity
  function resolveFkField(entityName: string, indexName: string): string {
    const entity = nameToEntity.get(entityName);
    if (!entity) return "";
    const idx = entity.indices.find((i) => i.name === indexName);
    return idx?.memberFieldNames[0] ?? "";
  }

  // Create EdgeData for each relation
  let nextEdgeNum = 1;
  relations.forEach((relation) => {
    const startId = nameToId.get(relation.primaryEntityName);
    const endId = nameToId.get(relation.foreignEntityName);
    if (startId === undefined || endId === undefined) return;

    const startNode = nodeById.get(startId)!;
    const endNode = nodeById.get(endId)!;
    const edgeId = `edge-${nextEdgeNum++}`;

    // Try to resolve PK field on primary entity and FK field on foreign entity
    const pkField = resolveFkField(
      relation.primaryEntityName,
      nameToEntity.get(relation.primaryEntityName)?.primaryKeyIndexName ?? "",
    );
    const fkField = resolveFkField(
      relation.foreignEntityName,
      relation.foreignKeyIndexName,
    );

    const edge: EdgeData = {
      id: edgeId,
      nodeStartId: startId,
      nodeEndId: endId,
      outputFieldName: pkField,
      inputFieldName: fkField,
      relation,
      previousStartPosition: { ...startNode.currentPosition },
      currentStartPosition: { ...startNode.currentPosition },
      previousEndPosition: { ...endNode.currentPosition },
      currentEndPosition: { ...endNode.currentPosition },
      edgeType: "relation",
    };

    startNode.outputEdgeIds.push(edgeId);
    endNode.inputEdgeIds.push(edgeId);
    result.edges.push(edge);
  });

  // Create inheritance EdgeData
  entities.forEach((entity) => {
    if (!entity.inheritedEntityName) return;
    const childId = nameToId.get(entity.name);
    const parentId = nameToId.get(entity.inheritedEntityName);
    if (childId === undefined || parentId === undefined) return;

    const childNode = nodeById.get(childId)!;
    const parentNode = nodeById.get(parentId)!;
    const edgeId = `edge-${nextEdgeNum++}`;

    const inheritRelation = new RelationSchema();
    inheritRelation.primaryEntityName = entity.inheritedEntityName;
    inheritRelation.foreignEntityName = entity.name;

    const edge: EdgeData = {
      id: edgeId,
      nodeStartId: childId,
      nodeEndId: parentId,
      outputFieldName: "",
      inputFieldName: "",
      relation: inheritRelation,
      previousStartPosition: { ...childNode.currentPosition },
      currentStartPosition: { ...childNode.currentPosition },
      previousEndPosition: { ...parentNode.currentPosition },
      currentEndPosition: { ...parentNode.currentPosition },
      edgeType: "inheritance",
    };

    childNode.outputEdgeIds.push(edgeId);
    parentNode.inputEdgeIds.push(edgeId);
    result.edges.push(edge);
  });
  console.log("Generated default board state from schema:", result);
  return result;
}

export function getBoardStateFromSchema(schema: SchemaRoot): BoardState {
  const result: BoardState = new BoardState();
  const boardStateString: string | null = schema.designerData;
  if (boardStateString && boardStateString != "") {
    const boardState: BoardState = JSON.parse(boardStateString);
    result.nodes = boardState.nodes;
    result.edges = boardState.edges;
    // Re-derive inheritedFieldCount for each node from saved inheritedEntityName.
    recomputeInheritedFieldCounts(result);
  } else {
    const generated = generateDefaultBoardState(schema);
    result.nodes = generated.nodes;
    result.edges = generated.edges;
  }
  console.log("Parsed board state from schema:", result);
  return result;
}

/**
 * After loading a BoardState from JSON, recompute `inheritedFieldCount` on
 * each node so that EditorEdge2 and EditorNode can compute correct geometry.
 */
export function recomputeInheritedFieldCounts(boardState: BoardState): void {
  const nameToNode = new Map<string, (typeof boardState.nodes)[number]>();
  boardState.nodes.forEach((n) => {
    nameToNode.set(n.entitySchema.name, n);
  });
  boardState.nodes.forEach((n) => {
    const parentName = n.entitySchema.inheritedEntityName ?? null;
    const parentNode = parentName ? nameToNode.get(parentName) : undefined;
    n.inheritedFieldCount = parentNode
      ? parentNode.entitySchema.fields.length
      : 0;
    n.inheritedFieldNames = parentNode
      ? parentNode.entitySchema.fields.map((f) => f.name)
      : [];
  });
}

export function getSchemaFromBoardState(boardState: BoardState): SchemaRoot {
  const schema: SchemaRoot = new SchemaRoot();
  schema.entities = [];
  schema.relations = [];
  boardState.nodes.forEach((node) => {
    schema.entities.push(node.entitySchema);
  });
  boardState.edges.forEach((edge) => {
    schema.relations.push(edge.relation);
  });

  schema.designerData = JSON.stringify(boardState);
  return schema;
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
  };
  const center2: Position = {
    x: node2Pos.x + node2Width / 2,
    y: node2Pos.y + node2Height / 2,
  };

  // Calculate the direction vector from node1 to node2
  const dx = center2.x - center1.x;
  const dy = center2.y - center1.y;

  // Calculate intersection point on node1's border
  const startPoint = calculateRectangleBorderIntersection(
    center1,
    dx,
    dy,
    node1Width,
    node1Height,
  );

  // Calculate intersection point on node2's border (from opposite direction)
  const endPoint = calculateRectangleBorderIntersection(
    center2,
    -dx,
    -dy,
    node2Width,
    node2Height,
  );

  return { startPoint, endPoint };
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
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  // Avoid division by zero
  if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
    return { x: center.x + halfWidth, y: center.y };
  }

  // Calculate the parametric t values for intersection with each border
  const tRight = dx > 0 ? halfWidth / dx : Infinity;
  const tLeft = dx < 0 ? -halfWidth / dx : Infinity;
  const tBottom = dy > 0 ? halfHeight / dy : Infinity;
  const tTop = dy < 0 ? -halfHeight / dy : Infinity;

  // Find the minimum t value (first intersection)
  const t = Math.min(tRight, tLeft, tBottom, tTop);

  return {
    x: center.x + t * dx,
    y: center.y + t * dy,
  };
}
