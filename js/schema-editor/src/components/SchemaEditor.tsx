import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NodeData } from "../bl/NodeData";
import {
  EntitySchema,
  FieldSchema,
  IndexSchema,
  RelationSchema,
  SchemaRoot,
} from "fusefx-modeldescription";
import EditorNode from "./EditorNode";
import { EdgeData } from "../bl/EdgeData";
import { Camera } from "../bl/Camera";
import BoardContextMenu from "./BoardContextMenu";
import {
  getBoardPosFromWindowPos,
  getBoardStateFromSchema,
  getSchemaFromBoardState,
  getWorldPosFromViewPos,
  recomputeInheritedFieldCounts,
} from "../bl/BoardUtils";
import { Position } from "../bl/Position";
import EditorToolbar from "./EditorToolbar";
import EditorProperties from "./EditorProperties";
import { BoardState } from "../bl/BoardState";
import EditorEdge2 from "./EditorEdge2";

// NODE_WIDTH is still needed here to compute node center for new-edge start position.
const NODE_WIDTH = 220;
const NODE_FIELD_HEIGHT = 30;

/**
 * Calculate the approximate dimensions of a node (world space).
 * Used only when creating a new edge to compute the starting anchor point.
 */
function calculateNodeDimensions(nodeData: NodeData): {
  width: number;
  height: number;
} {
  const width = NODE_WIDTH;
  const numRows =
    3 +
    nodeData.entitySchema.fields.length +
    nodeData.entitySchema.indices.length;
  const height = NODE_FIELD_HEIGHT * numRows;
  return { width, height };
}

const SchemaEditor: React.FC<{
  schemaName: string;
  schema: SchemaRoot | null;
  onChangeSchemaName: (newName: string) => void;
  onChangeSchema: (newSchema: SchemaRoot) => void;
}> = ({ schemaName, schema, onChangeSchemaName, onChangeSchema }) => {
  const boardElement = document.getElementById("board");

  const [dirty, setDirty] = useState(false);

  const [showProperties, setShowProperties] = useState(true);

  const [currentId, setCurrentId] = useState(1);
  const [grabbingBoard, setGrabbingBoard] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [camera, setCamera] = useState(new Camera());
  const [clickedPosition, setClickedPosition] = useState<any>({ x: -1, y: -1 });
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedField, setSelectedField] = useState<FieldSchema | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<IndexSchema | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeData | null>(null);

  // Track which fields should be highlighted (nodeId -> fieldName)
  const [highlightedFields, setHighlightedFields] = useState<
    Map<number, Set<string>>
  >(new Map());
  // Track which edges should be highlighted
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(
    new Set(),
  );

  const [newEdge, setNewEdge] = useState<EdgeData | null>(null);
  const [inInput, setInInput] = useState<{
    nodeId: number;
    fieldName: string;
    posX: number;
    posY: number;
  } | null>(null);

  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  /**
   * When non-null, the context menu was opened by right-clicking on this node id
   * rather than on the empty board canvas.
   */
  const [contextMenuNodeId, setContextMenuNodeId] = useState<number | null>(
    null,
  );

  /** Which submenu item is currently expanded (identified by item label). */
  const [contextSubmenuOpen, setContextSubmenuOpen] = useState<string | null>(
    null,
  );

  // Panel resizing state
  const [panelWidth, setPanelWidth] = useState<number>(256); // Default 256px (w-64)
  const [isResizingPanel, setIsResizingPanel] = useState<boolean>(false);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);

  useEffect(() => {
    console.log("schema changed", { schema });
    const pd = (e: any) => e.preventDefault();
    document.addEventListener("contextmenu", pd);

    const boardState: BoardState = schema
      ? getBoardStateFromSchema(schema)
      : loadFromLocalStore();
    console.log("Loaded board state:", boardState);

    setNodes(boardState.nodes);
    setEdges(boardState.edges);
    let maxId: number = 0;
    boardState.nodes.forEach((n: NodeData) => {
      if (n.id > maxId) {
        maxId = n.id;
      }
    });
    setCurrentId(maxId + 1);
    return () => {
      document.removeEventListener("contextmenu", pd);
    };
  }, [schema]);

  useEffect(() => {
    saveToLocalStore();
  }, [nodes, edges]);

  function loadFromLocalStore(): BoardState {
    console.log("Loading board state from localStore...");
    const boardStateString = localStorage.getItem("boardState");
    if (boardStateString) {
      try {
        const boardState = JSON.parse(boardStateString);
        // Recompute inheritedFieldCount after deserialization so geometry is correct.
        recomputeInheritedFieldCounts(boardState);
        return boardState;
      } catch (e) {
        console.error("Failed to parse board state from localStorage:", e);
        return { nodes: [], edges: [] };
      }
    } else {
      return { nodes: [], edges: [] };
    }
  }

  function saveToLocalStore() {
    console.log("Saving board state to localStore...", { nodes, edges });
    const boardState: any = {
      nodes: nodes,
      edges: edges,
    };
    localStorage.setItem("boardState", JSON.stringify(boardState));
  }

  function updateNodes(updatedNodes: NodeData[]) {
    console.log("Updating nodes...");
    setNodes(updatedNodes);
    setDirty(true);
  }

  function updateEdges(updatedEdges: EdgeData[]) {
    console.log("Updating edges...");
    setEdges(updatedEdges);
    setDirty(true);
  }

  function saveSchema() {
    const newEntitySchema: SchemaRoot = getSchemaFromBoardState({
      nodes: nodes,
      edges: edges,
    });
    onChangeSchema(newEntitySchema);
  }

  /**
   * Highlight fields when an edge is selected
   */
  function handleEdgeSelection(edge: EdgeData | null) {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setSelectedField(null);
    setSelectedIndex(null);

    if (!edge) {
      setHighlightedFields(new Map());
      setHighlightedEdges(new Set());
      return;
    }

    const newHighlightedFields = new Map<number, Set<string>>();

    // Highlight the output field on the start node
    const startNodeFields =
      newHighlightedFields.get(edge.nodeStartId) || new Set<string>();
    startNodeFields.add(edge.outputFieldName);
    newHighlightedFields.set(edge.nodeStartId, startNodeFields);

    // Highlight the input field on the end node
    const endNodeFields =
      newHighlightedFields.get(edge.nodeEndId) || new Set<string>();
    endNodeFields.add(edge.inputFieldName);
    newHighlightedFields.set(edge.nodeEndId, endNodeFields);

    setHighlightedFields(newHighlightedFields);
    setHighlightedEdges(new Set());
  }

  /**
   * Highlight edges and connected fields when a field is selected
   */
  function handleFieldSelection(nodeId: number, field: FieldSchema | null) {
    setSelectedField(field);
    setSelectedIndex(null);

    if (!field) {
      setHighlightedFields(new Map());
      setHighlightedEdges(new Set());
      return;
    }

    const newHighlightedFields = new Map<number, Set<string>>();
    const newHighlightedEdges = new Set<string>();

    // Find all edges connected to this field
    edges.forEach((edge) => {
      let isConnected = false;

      // Check if this field is the output field
      if (edge.nodeStartId === nodeId && edge.outputFieldName === field.name) {
        isConnected = true;
        // Highlight the input field on the other end
        const endNodeFields =
          newHighlightedFields.get(edge.nodeEndId) || new Set<string>();
        endNodeFields.add(edge.inputFieldName);
        newHighlightedFields.set(edge.nodeEndId, endNodeFields);
      }

      // Check if this field is the input field
      if (edge.nodeEndId === nodeId && edge.inputFieldName === field.name) {
        isConnected = true;
        // Highlight the output field on the other end
        const startNodeFields =
          newHighlightedFields.get(edge.nodeStartId) || new Set<string>();
        startNodeFields.add(edge.outputFieldName);
        newHighlightedFields.set(edge.nodeStartId, startNodeFields);
      }

      if (isConnected) {
        newHighlightedEdges.add(edge.id);
      }
    });

    // Also highlight the selected field itself
    const selectedNodeFields =
      newHighlightedFields.get(nodeId) || new Set<string>();
    selectedNodeFields.add(field.name);
    newHighlightedFields.set(nodeId, selectedNodeFields);

    setHighlightedFields(newHighlightedFields);
    setHighlightedEdges(newHighlightedEdges);
  }

  function createNewEntity(pos: Position): void {
    setContextMenuPos(null);
    const worldPos = getWorldPosFromViewPos(pos, camera);
    const entitySchema = new EntitySchema();
    entitySchema.name = "Entity " + currentId;
    const result: NodeData = {
      id: currentId,
      numInputs: 2,
      numOutputs: 2,
      currentPosition: { x: worldPos.x, y: worldPos.y },
      previousPosition: { x: worldPos.x, y: worldPos.y },
      inputEdgeIds: [],
      outputEdgeIds: [],
      entitySchema: entitySchema,
    };
    setCurrentId((i) => i + 1);
    updateNodes([...nodes, result]);
  }

  /**
   * Creates a new entity that immediately inherits from `parentName`,
   * positioned near the context menu click, and creates the inheritance edge.
   */
  function createNewInheritedEntity(parentName: string): void {
    setContextMenuPos(null);
    setContextMenuNodeId(null);
    const worldPos = getWorldPosFromViewPos(contextMenuPos!, camera);
    const entitySchema = new EntitySchema();
    entitySchema.name = "Entity " + currentId;
    entitySchema.inheritedEntityName = parentName;

    const parentNode = nodes.find((n) => n.entitySchema.name === parentName);
    const inheritedFieldCount = parentNode
      ? parentNode.entitySchema.fields.length
      : 0;
    const inheritedFieldNames = parentNode
      ? parentNode.entitySchema.fields.map((f) => f.name)
      : [];

    const newNode: NodeData = {
      id: currentId,
      numInputs: 2,
      numOutputs: 2,
      currentPosition: { x: worldPos.x, y: worldPos.y },
      previousPosition: { x: worldPos.x, y: worldPos.y },
      inputEdgeIds: [],
      outputEdgeIds: [],
      entitySchema: entitySchema,
      inheritedFieldCount,
      inheritedFieldNames,
    };

    const inheritEdgeId = `inherit_${currentId}`;
    const childCenter = {
      x: worldPos.x + NODE_WIDTH / 2,
      y: worldPos.y + NODE_FIELD_HEIGHT / 2,
    };

    const relation = new RelationSchema();
    relation.foreignEntityName = entitySchema.name;
    relation.primaryEntityName = parentName;

    const newEdgeData: EdgeData = {
      id: inheritEdgeId,
      nodeStartId: currentId,
      nodeEndId: parentNode ? parentNode.id : 0,
      outputFieldName: "",
      inputFieldName: "",
      relation,
      previousStartPosition: childCenter,
      previousEndPosition: childCenter,
      currentStartPosition: childCenter,
      currentEndPosition: childCenter,
      edgeType: "inheritance",
    };

    setCurrentId((i) => i + 1);
    updateNodes([...nodes, newNode]);
    if (parentNode) {
      updateEdges([...edges, newEdgeData]);
    }
  }

  function handleCommitField(
    nodeData: NodeData,
    fieldSchema: FieldSchema,
    value: any,
  ) {
    const existingF: FieldSchema | undefined =
      nodeData.entitySchema.fields.find(
        (f: FieldSchema) => f.name == fieldSchema.name,
      );
    if (existingF) {
      existingF.name = value;
    } else {
      nodeData.entitySchema.fields.push(fieldSchema);

      // Auto-create a "PK" index when the first field named "Id" or "Uid"
      // (case-insensitive) is added and no primary key index is set yet.
      const nameLower = fieldSchema.name.toLowerCase();
      const isPkCandidate = nameLower === "id" || nameLower === "uid";
      const hasPrimaryKey = !!nodeData.entitySchema.primaryKeyIndexName;
      if (isPkCandidate && !hasPrimaryKey) {
        const pkIndex = new IndexSchema();
        pkIndex.name = "PK";
        pkIndex.unique = true;
        pkIndex.memberFieldNames = [fieldSchema.name];
        nodeData.entitySchema.indices.push(pkIndex);
        nodeData.entitySchema.primaryKeyIndexName = "PK";
      }
    }
    // Update inheritedFieldCount/inheritedFieldNames on any child nodes that
    // inherit from this entity, so their height and EditorEdge2 geometry stay correct.
    const parentName = nodeData.entitySchema.name;
    nodes.forEach((n) => {
      if (n.entitySchema.inheritedEntityName === parentName) {
        n.inheritedFieldCount = nodeData.entitySchema.fields.length;
        n.inheritedFieldNames = nodeData.entitySchema.fields.map((f) => f.name);
      }
    });
    // Spread nodes to produce a new array reference so React re-renders
    // all EditorNode instances and the updated field list becomes visible
    // immediately — without waiting for an unrelated state change.
    updateNodes([...nodes]);
  }

  function handleCommitIndex(
    nodeData: NodeData,
    indexSchema: IndexSchema,
    value: any,
  ) {
    const existingI: IndexSchema | undefined =
      nodeData.entitySchema.indices.find(
        (i: IndexSchema) => i.name == indexSchema.name,
      );
    if (existingI) {
      existingI.name = value;
    } else {
      nodeData.entitySchema.indices.push(indexSchema);
    }
    updateNodes([...nodes]);
  }

  function handleDeleteField(nodeData: NodeData, fieldSchema: FieldSchema) {
    nodeData.entitySchema.fields = nodeData.entitySchema.fields.filter(
      (f: FieldSchema) => f.name !== fieldSchema.name,
    );
    // Keep child nodes' inheritedFieldCount/inheritedFieldNames in sync.
    const parentName = nodeData.entitySchema.name;
    nodes.forEach((n) => {
      if (n.entitySchema.inheritedEntityName === parentName) {
        n.inheritedFieldCount = nodeData.entitySchema.fields.length;
        n.inheritedFieldNames = nodeData.entitySchema.fields.map((f) => f.name);
      }
    });
    updateNodes([...nodes]);
  }
  function handleDeleteIndex(nodeData: NodeData, indexSchema: IndexSchema) {
    nodeData.entitySchema.indices = nodeData.entitySchema.indices.filter(
      (f: IndexSchema) => f.name !== indexSchema.name,
    );
    updateNodes([...nodes]);
  }

  /**
   * Reorder fields within a node by moving the field at fromIndex to toIndex.
   * Mutates entitySchema.fields in-place (consistent with all other field
   * mutations in this file) then spreads nodes to trigger a re-render.
   * Also keeps child nodes' inheritedFieldNames in sync so edges stay correct.
   */
  function handleReorderFields(
    nodeData: NodeData,
    fromIndex: number,
    toIndex: number,
  ) {
    const fields = nodeData.entitySchema.fields;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= fields.length ||
      toIndex >= fields.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    // Remove the dragged item and splice it in at the target position.
    const [moved] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, moved);

    // Keep inherited field metadata on child nodes in sync.
    const parentName = nodeData.entitySchema.name;
    nodes.forEach((n) => {
      if (n.entitySchema.inheritedEntityName === parentName) {
        n.inheritedFieldCount = fields.length;
        n.inheritedFieldNames = fields.map((f) => f.name);
      }
    });

    updateNodes([...nodes]);
  }
  function handleCommitEntityName(nodeData: NodeData, entityName: string) {
    const oldName = nodeData.entitySchema.name;
    nodeData.entitySchema.name = entityName;

    // Update any child nodes that inherit from this entity's old name.
    nodes.forEach((n) => {
      if (n.entitySchema.inheritedEntityName === oldName) {
        n.entitySchema.inheritedEntityName = entityName;
      }
    });

    updateNodes([...nodes]);
  }

  /**
   * Set or clear the parent entity for a given node.
   * Updates `entitySchema.inheritedEntityName`, `NodeData.inheritedFieldCount`,
   * and creates/removes the corresponding inheritance edge.
   */
  function handleSetInherits(nodeData: NodeData, parentName: string | null) {
    nodeData.entitySchema.inheritedEntityName = parentName;

    // Recompute inheritedFieldCount for this node.
    const parentNode = parentName
      ? nodes.find((n) => n.entitySchema.name === parentName)
      : null;
    nodeData.inheritedFieldCount = parentNode
      ? parentNode.entitySchema.fields.length
      : 0;
    nodeData.inheritedFieldNames = parentNode
      ? parentNode.entitySchema.fields.map((f) => f.name)
      : [];

    // Remove any existing inheritance edge originating from this node.
    const inheritEdgeId = `inherit_${nodeData.id}`;
    let updatedEdges = edges.filter((e) => e.id !== inheritEdgeId);

    if (parentName && parentNode) {
      // Add the inheritance edge: child → parent
      const relation = new RelationSchema();
      relation.foreignEntityName = nodeData.entitySchema.name;
      relation.primaryEntityName = parentName;

      const childCenter = {
        x: nodeData.currentPosition.x + NODE_WIDTH / 2,
        y: nodeData.currentPosition.y + NODE_FIELD_HEIGHT / 2,
      };
      updatedEdges = [
        ...updatedEdges,
        {
          id: inheritEdgeId,
          nodeStartId: nodeData.id,
          nodeEndId: parentNode.id,
          outputFieldName: "",
          inputFieldName: "",
          relation,
          previousStartPosition: childCenter,
          previousEndPosition: childCenter,
          currentStartPosition: childCenter,
          currentEndPosition: childCenter,
          edgeType: "inheritance",
        },
      ];
    }

    updateEdges(updatedEdges);
    updateNodes([...nodes]);
  }

  function applyScale(e: any) {
    if (!boardElement) return;
    const currentScale = camera.scale;
    let newScale = currentScale + e.deltaY * -0.0005;
    if (newScale > 3) newScale = 3;
    if (newScale < 0.5) newScale = 0.5;

    const mouseWindowPos = { x: e.clientX, y: e.clientY };
    const mouseBoardPos = getBoardPosFromWindowPos(mouseWindowPos);

    const cam2X =
      mouseBoardPos.x / camera.scale +
      camera.pos.x -
      mouseBoardPos.x / newScale;
    const cam2Y =
      mouseBoardPos.y / camera.scale +
      camera.pos.y -
      mouseBoardPos.y / newScale;

    setCamera({ ...camera, scale: newScale, pos: { x: cam2X, y: cam2Y } });
  }

  function handleMouseDown(e: any) {
    e.preventDefault();
    e.stopPropagation();

    if (e.button == 0) {
      setClickedPosition({ x: e.clientX, y: e.clientY });
      setContextMenuPos(null);
      setGrabbingBoard(true);
    }
    if (e.button == 2) {
      setContextMenuPos(
        getBoardPosFromWindowPos({ x: e.clientX, y: e.clientY }),
      );
      // Right-click on the board canvas (not on a node)
      setContextMenuNodeId(null);
      setContextSubmenuOpen(null);
    }
  }

  function handleMouseUp(e: any) {
    e.preventDefault();
    setGrabbingBoard(false);
    setIsDraggingNode(false);
    setClickedPosition({ x: -1, y: -1 });

    if (newEdge && inInput === null) {
      setNewEdge(null);
    }
    if (newEdge && inInput !== null) {
      const nodeStartId = newEdge.nodeStartId;
      const nodeEndId = inInput.nodeId;

      const nodeStart = nodes.find((n) => n.id === nodeStartId);
      const nodeEnd = nodes.find((n) => n.id === nodeEndId);

      const boardWrapperEl = document.getElementById("boardWrapper");

      if (nodeStart && nodeEnd && boardWrapperEl) {
        const edgeId: string = `edge_${nodeStart.id}_${newEdge.outputFieldName}_${nodeEnd.id}_${inInput.fieldName}`;
        nodeStart.outputEdgeIds = [...nodeStart.outputEdgeIds, edgeId];
        nodeEnd.inputEdgeIds = [...nodeEnd.inputEdgeIds, edgeId];

        newEdge.relation.primaryEntityName = nodeEnd.entitySchema.name;
        updateEdges([
          ...edges,
          {
            ...newEdge,
            id: edgeId,
            nodeEndId: nodeEnd.id,
            inputFieldName: inInput.fieldName,
            // Position fields are kept for backward compatibility but not used for rendering
            previousStartPosition: newEdge.previousStartPosition,
            previousEndPosition: newEdge.previousEndPosition,
            currentStartPosition: newEdge.currentStartPosition,
            currentEndPosition: { x: inInput.posX, y: inInput.posY },
          },
        ]);
        setNewEdge(null);
      }
    }
  }

  function handleMouseMove(e: any) {
    if (newEdge) {
      const windowPos: Position = { x: e.clientX, y: e.clientY };
      const boardPos: Position = getBoardPosFromWindowPos(windowPos);
      const worldPos: Position = getWorldPosFromViewPos(boardPos, camera);
      newEdge.currentEndPosition = { x: worldPos.x, y: worldPos.y };
      setNewEdge({ ...newEdge });
    }

    if (!(clickedPosition.x >= 0 && clickedPosition.y >= 0)) return;
    const deltaX = (e.clientX - clickedPosition.x) / camera.scale;
    const deltaY = (e.clientY - clickedPosition.y) / camera.scale;
    if (isDraggingNode && selectedNode) {
      const node: NodeData | undefined = nodes.find(
        (n) => n.id === selectedNode,
      );
      if (node) {
        // Update node position
        node.currentPosition = {
          x: node.previousPosition.x + deltaX,
          y: node.previousPosition.y + deltaY,
        };
        updateNodes([...nodes]);
        // Edges will automatically update their positions based on node positions
      }
    } else {
      const boardWrapperElement = document.getElementById("boardWrapper");
      if (!boardWrapperElement) return;
      // boardWrapperElement.scrollBy(-deltaX, -deltaY)
      setClickedPosition({ x: e.clientX, y: e.clientY });
      camera.pos.x = camera.pos.x - deltaX;
      camera.pos.y = camera.pos.y - deltaY;
      setCamera({ ...camera });
    }
  }

  const handleMouseDownNode = useCallback(
    (id: number, e: any) => {
      setSelectedNode(id);
      setSelectedEdge(null);
      setSelectedField(null);
      setSelectedIndex(null);
      setHighlightedFields(new Map());
      setHighlightedEdges(new Set());
      setIsDraggingNode(true);

      setClickedPosition({ x: e.clientX, y: e.clientY });

      const node = nodes.find((n) => n.id === id);
      if (node) {
        node.previousPosition = {
          x: node.currentPosition.x,
          y: node.currentPosition.y,
        };
        // Edges will automatically update their positions based on node positions
      }
    },
    [nodes, edges],
  );

  const handleMouseEnterInput = useCallback(
    (posX: number, posY: number, nodeId: number, fieldName: string) => {
      setInInput({ nodeId, fieldName, posX: posX, posY: posY });
    },
    [],
  );

  const handleMouseDownOutput = useCallback(
    (posX: number, posY: number, nodeId: number, fieldName: string) => {
      const node: NodeData | undefined = nodes.find((n) => n.id == nodeId);
      if (!node) throw `No Node with id ${nodeId}`;

      // Use node center as starting point for new edge
      const nodeDimensions = calculateNodeDimensions(node);
      const nodeCenter = {
        x: node.currentPosition.x + nodeDimensions.width / 2,
        y: node.currentPosition.y + nodeDimensions.height / 2,
      };

      const relation: RelationSchema = new RelationSchema();
      relation.foreignEntityName = node.entitySchema.name;
      relation.foreignKeyIndexName = fieldName;
      setNewEdge({
        id: "",
        nodeStartId: nodeId,
        outputFieldName: fieldName,
        nodeEndId: 0,
        inputFieldName: "",
        previousStartPosition: nodeCenter,
        previousEndPosition: nodeCenter,
        currentStartPosition: nodeCenter,
        currentEndPosition: nodeCenter,
        relation: relation,
      });
    },
    [nodes],
  );

  const handleMouseLeaveInput = useCallback(
    (nodeId: number, fieldName: string) => {
      if (inInput?.nodeId === nodeId && inInput.fieldName === fieldName) {
        setInInput(null);
      }
    },
    [],
  );

  const handleKeyDown = (e: any) => {
    if (e.key == "Delete") {
      if (selectedNode) {
        const deletedNode = nodes.find((n) => n.id === selectedNode);
        if (deletedNode) {
          const deletedName = deletedNode.entitySchema.name;
          // Clear inheritance on any child nodes that reference this entity.
          const updatedNodes = nodes
            .filter((n) => n.id !== selectedNode)
            .map((n) => {
              if (n.entitySchema.inheritedEntityName === deletedName) {
                n.entitySchema.inheritedEntityName = null;
                n.inheritedFieldCount = 0;
                n.inheritedFieldNames = [];
              }
              return n;
            });
          // Remove inheritance edges associated with the deleted node.
          const updatedEdges = edges.filter(
            (edge) =>
              edge.nodeStartId !== selectedNode &&
              edge.nodeEndId !== selectedNode,
          );
          updateEdges(updatedEdges);
          updateNodes(updatedNodes);
        }
        setSelectedNode(null);
      }
      if (selectedEdge) {
        // If this is an inheritance edge, also clear the child's inheritedEntityName.
        if (selectedEdge.edgeType === "inheritance") {
          const childNode = nodes.find(
            (n) => n.id === selectedEdge.nodeStartId,
          );
          if (childNode) {
            childNode.entitySchema.inheritedEntityName = null;
            childNode.inheritedFieldCount = 0;
            childNode.inheritedFieldNames = [];
            updateNodes([...nodes]);
          }
        }
        updateEdges(edges.filter((e) => e.id !== selectedEdge.id));
      }
    }
  };

  // Panel resize handlers
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingPanel(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(panelWidth);
  };

  useEffect(() => {
    if (!isResizingPanel) return;

    const handleResizeMouseMove = (e: MouseEvent) => {
      const deltaX = resizeStartX - e.clientX; // Inverted because panel is on right
      const newWidth = Math.max(200, Math.min(600, resizeStartWidth + deltaX));
      setPanelWidth(newWidth);
    };

    const handleResizeMouseUp = () => {
      setIsResizingPanel(false);
    };

    document.addEventListener("mousemove", handleResizeMouseMove);
    document.addEventListener("mouseup", handleResizeMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleResizeMouseMove);
      document.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [isResizingPanel, resizeStartX, resizeStartWidth]);

  const backgroundWorldX: number = -camera.scale * camera.pos.x;
  const backgroundWorldY: number = -camera.scale * camera.pos.y;
  const backgroundWorldWidth: number = camera.scale * 30;
  const backgroundWorldHeight: number = camera.scale * 30;

  // Build a stable map of entityName → fields for inherited-field lookup.
  const entityFieldsMap = useMemo(() => {
    const map = new Map<string, FieldSchema[]>();
    nodes.forEach((n) => map.set(n.entitySchema.name, n.entitySchema.fields));
    return map;
  }, [nodes]);

  return (
    <div
      className="flex flex-col w-full h-full overflow-hidden border-0 border-green-400
     bg-content dark:bg-contentDark text-textone dark:text-textonedark"
    >
      <EditorToolbar
        showProperties={showProperties}
        setShowProperties={setShowProperties}
        schemaName={schemaName}
        setSchemaName={onChangeSchemaName}
        save={() => saveSchema()}
        dirty={dirty}
      ></EditorToolbar>
      <div className="flex w-full h-full overflow-hidden border-0 border-red-400">
        <div className="relative flex-1 h-full overflow-hidden border-0 border-red-400">
          <div
            id="boardWrapper"
            className="absolute w-full h-full overflow-hidden top-0 left-0 border-0 border-blue-400"
          >
            <div
              id="board"
              tabIndex={0}
              onWheel={applyScale}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={(e) => {
                e.preventDefault();
                setGrabbingBoard(false);
              }}
              onKeyDown={(e) => handleKeyDown(e)}
              className="relative w-full  h-full   border-0 border-green-400 overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #b8b8b8bf 1px, rgba(0,0,0,0) 1px",
                backgroundPosition: `${backgroundWorldX}px ${backgroundWorldY}px`,
                backgroundSize: `${backgroundWorldWidth}px ${backgroundWorldHeight}px`,
                cursor: isDraggingNode
                  ? "grabbing"
                  : grabbingBoard
                    ? "grab"
                    : "default",
                userSelect:
                  isDraggingNode || grabbingBoard ? "none" : undefined,
              }}
            >
              {nodes.map((n: NodeData) => {
                // Names of all entities except this one, for the inheritance dropdown.
                const allEntityNames = nodes
                  .filter((other) => other.id !== n.id)
                  .map((other) => other.entitySchema.name);

                // Inherited fields: look up parent's fields by name.
                const parentEntityName =
                  n.entitySchema.inheritedEntityName ?? null;
                const inheritedFields: FieldSchema[] = parentEntityName
                  ? (entityFieldsMap.get(parentEntityName) ?? [])
                  : [];

                return (
                  <EditorNode
                    key={n.id}
                    id={n.id}
                    nodeData={n}
                    x={n.currentPosition.x}
                    y={n.currentPosition.y}
                    numInputs={n.numInputs}
                    numOutputs={n.numOutputs}
                    selected={selectedNode ? selectedNode == n.id : false}
                    camera={camera}
                    onMouseDown={handleMouseDownNode}
                    setSelectedNode={setSelectedNode}
                    setSelectedEdge={setSelectedEdge}
                    onMouseEnterInput={handleMouseEnterInput}
                    onMouseDownOutput={handleMouseDownOutput}
                    onMouseLeaveInput={handleMouseLeaveInput}
                    onCommitField={(f: FieldSchema, v: any) =>
                      handleCommitField(n, f, v)
                    }
                    onCommitIndex={(index: IndexSchema, v: any) =>
                      handleCommitIndex(n, index, v)
                    }
                    onCommitEntityName={(entityName: string) =>
                      handleCommitEntityName(n, entityName)
                    }
                    onDeleteField={(f) => handleDeleteField(n, f)}
                    onDeleteIndex={(i) => handleDeleteIndex(n, i)}
                    onReorderFields={(from, to) => handleReorderFields(n, from, to)}
                    activeField={selectedField}
                    activeIndex={selectedIndex}
                    setActiveField={(f) => {
                      setSelectedField(f);
                      setSelectedIndex(null);
                    }}
                    setActiveIndex={(i) => {
                      setSelectedIndex(i);
                      setSelectedField(null);
                    }}
                    highlightedFields={
                      highlightedFields.get(n.id) || new Set<string>()
                    }
                    onFieldClick={handleFieldSelection}
                    isDraggingEdge={newEdge !== null}
                    allEntityNames={allEntityNames}
                    onSetInherits={(parentName) =>
                      handleSetInherits(n, parentName)
                    }
                    inheritedFields={inheritedFields}
                    onContextMenu={(e: React.MouseEvent) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setContextMenuPos(
                        getBoardPosFromWindowPos({
                          x: e.clientX,
                          y: e.clientY,
                        }),
                      );
                      setContextMenuNodeId(n.id);
                      setContextSubmenuOpen(null);
                    }}
                  />
                );
              })}
              {newEdge &&
                (() => {
                  const newEdgeStartNode = nodes.find(
                    (n) => n.id === newEdge.nodeStartId,
                  );
                  if (!newEdgeStartNode) return null;
                  return (
                    <EditorEdge2
                      selected={false}
                      camera={camera}
                      edge={newEdge}
                      startNode={newEdgeStartNode}
                      // endNode intentionally absent: cursor position is read
                      // from edge.currentEndPosition inside EditorEdge2
                      onClickDelete={() => {}}
                      onMouseDownEdge={() => {}}
                    />
                  );
                })()}
              {edges.map((edge: EdgeData, i) => {
                const startNode = nodes.find((n) => n.id === edge.nodeStartId);
                const endNode = nodes.find((n) => n.id === edge.nodeEndId);

                if (!startNode || !endNode) return null;

                return (
                  <EditorEdge2
                    key={i}
                    selected={
                      selectedEdge ? selectedEdge.id === edge.id : false
                    }
                    highlighted={highlightedEdges.has(edge.id)}
                    camera={camera}
                    edge={edge}
                    startNode={startNode}
                    endNode={endNode}
                    onMouseDownEdge={() => {
                      handleEdgeSelection(edge);
                    }}
                    onClickDelete={() => {}}
                  />
                );
              })}
              {isDraggingNode && (
                <div
                  className="absolute inset-0 z-20"
                  style={{ cursor: "grabbing" }}
                />
              )}
              {contextMenuPos &&
                (() => {
                  const ctxNode = contextMenuNodeId
                    ? (nodes.find((n) => n.id === contextMenuNodeId) ?? null)
                    : null;
                  const ctxHasParent =
                    !!ctxNode?.entitySchema.inheritedEntityName;
                  // Other entity names (excluding the clicked node itself)
                  const otherEntityNames = nodes
                    .filter((n) => n.id !== contextMenuNodeId)
                    .map((n) => n.entitySchema.name);

                  const menuItemClass =
                    "relative px-3 py-1.5 text-left text-sm hover:bg-bg5 dark:hover:bg-bg5dark cursor-pointer select-none flex items-center justify-between gap-2 whitespace-nowrap";

                  return (
                    <div
                      style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                      className="absolute border rounded-md z-40 border-bg10 dark:border-bg8dark overflow-visible"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {ctxNode ? (
                        /* ── Node context menu ─────────────────────────────── */
                        <div className="flex flex-col bg-bg3 dark:bg-bg3dark min-w-[160px]">
                          {ctxHasParent ? (
                            /* Remove inheritance */
                            <div
                              className={menuItemClass}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleSetInherits(ctxNode, null);
                                setContextMenuPos(null);
                                setContextMenuNodeId(null);
                              }}
                            >
                              Remove inheritance
                            </div>
                          ) : (
                            /*
                             * Add inheritance → submenu of other entity names.
                             * The onMouseEnter/onMouseLeave live on the outer
                             * wrapper div so they cover both the trigger row and
                             * the absolutely-positioned submenu panel.  Putting
                             * them only on the inner row caused onMouseLeave to
                             * fire as soon as the cursor moved onto the submenu,
                             * closing it before the user could click.
                             */
                            <div
                              className="relative"
                              onMouseEnter={() =>
                                setContextSubmenuOpen("addInheritance")
                              }
                              onMouseLeave={() => setContextSubmenuOpen(null)}
                            >
                              <div className={menuItemClass}>
                                <span>Add inheritance</span>
                                <svg
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                  style={{ width: 10, height: 10, flexShrink: 0 }}
                                >
                                  <path d="M6 3l5 5-5 5V3z" />
                                </svg>
                              </div>
                              {contextSubmenuOpen === "addInheritance" && (
                                <div
                                  className="absolute left-full top-0 bg-bg3 dark:bg-bg3dark border border-bg10 dark:border-bg8dark z-50 min-w-[140px]"
                                >
                                  {otherEntityNames.length === 0 ? (
                                    <div className="px-3 py-1.5 text-sm text-zinc-400 select-none">
                                      No other entities
                                    </div>
                                  ) : (
                                    otherEntityNames.map((name) => (
                                      <div
                                        key={name}
                                        className="px-3 py-1.5 text-sm hover:bg-bg5 dark:hover:bg-bg5dark cursor-pointer select-none whitespace-nowrap"
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleSetInherits(ctxNode, name);
                                          setContextMenuPos(null);
                                          setContextMenuNodeId(null);
                                          setContextSubmenuOpen(null);
                                        }}
                                      >
                                        {name}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ── Board context menu ────────────────────────────── */
                        <BoardContextMenu
                          onNewEntity={() => createNewEntity(contextMenuPos)}
                          allEntityNames={nodes.map((n) => n.entitySchema.name)}
                          onNewInheritedEntity={(parentName) =>
                            createNewInheritedEntity(parentName)
                          }
                        />
                      )}
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
        <div
          className={`relative text-sm py-2 border-navigationBorder dark:border-navigationBorderDark bg-navigation dark:bg-navigationDark
             z-0 ${showProperties ? "h-full border-l px-2" : "w-0 h-full"}`}
          style={{ width: showProperties ? `${panelWidth}px` : "0px" }}
        >
          {showProperties && (
            <div
              onMouseDown={handleResizeMouseDown}
              className="absolute left-0 top-0 w-2 h-full cursor-col-resize z-30 hover:bg-blue-500/20"
              style={{ marginLeft: "-4px" }}
            ></div>
          )}
          <EditorProperties
            nodeData={nodes.find((n) => n.id == selectedNode)}
            field={selectedField}
            relation={selectedEdge?.relation}
            index={selectedIndex}
            onChange={() => {
              updateNodes([...nodes]); // Force re-render
            }}
          ></EditorProperties>
        </div>
      </div>
    </div>
  );
};

export default SchemaEditor;
