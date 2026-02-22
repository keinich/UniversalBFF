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
import EditorEdge from "./EditorEdge";
import { Camera } from "../bl/Camera";
import BoardContextMenu from "./BoardContextMenu";
import {
  getBoardPosFromWindowPos,
  getBoardStateFromSchema,
  getSchemaFromBoardState,
  getViewPosFromWorldPos,
  getWorldPosFromViewPos,
} from "../bl/BoardUtils";
import { Position } from "../bl/Position";
import EditorToolbar from "./EditorToolbar";
import EditorProperties from "./EditorProperties";
import { BoardState } from "../bl/BoardState";
import EditorEdge2 from "./EditorEdge2";

// Constants for node sizing
const NODE_WIDTH = 220;
const NODE_FIELD_HEIGHT = 30;

/**
 * Calculate the dimensions of a node based on its content
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
    }
    saveToLocalStore();
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
    saveToLocalStore();
  }

  function handleDeleteField(nodeData: NodeData, fieldSchema: FieldSchema) {
    nodeData.entitySchema.fields = nodeData.entitySchema.fields.filter(
      (f: FieldSchema) => f.name !== fieldSchema.name,
    );
    saveToLocalStore();
  }
  function handleDeleteIndex(nodeData: NodeData, indexSchema: IndexSchema) {
    nodeData.entitySchema.indices = nodeData.entitySchema.indices.filter(
      (f: IndexSchema) => f.name !== indexSchema.name,
    );
    saveToLocalStore();
  }
  function handleCommitEntityName(nodeData: NodeData, entityName: string) {
    nodeData.entitySchema.name = entityName;
    saveToLocalStore();
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
        updateNodes(nodes.filter((n) => n.id != selectedNode));
        setSelectedNode(null);
      }
      if (selectedEdge) {
        updateEdges(edges.filter((e) => e.id != selectedEdge.id));
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
              className="relative w-full  h-full   border-4 border-green-400 overflow-hidden"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #b8b8b8bf 1px, rgba(0,0,0,0) 1px",
                backgroundPosition: `${backgroundWorldX}px ${backgroundWorldY}px`,
                backgroundSize: `${backgroundWorldWidth}px ${backgroundWorldHeight}px`,
                cursor: grabbingBoard ? "grab" : "default",
              }}
            >
              {nodes.map((n: NodeData) => (
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
                ></EditorNode>
              ))}
              {newEdge && (
                <EditorEdge
                  selected={false}
                  isNew={true}
                  position={{
                    x0: newEdge.currentStartPosition.x,
                    y0: newEdge.currentStartPosition.y,
                    x1: newEdge.currentEndPosition.x,
                    y1: newEdge.currentEndPosition.y,
                  }}
                  camera={camera}
                  onClickDelete={() => {}}
                  onMouseDownEdge={() => {}}
                ></EditorEdge>
              )}
              {edges.map((edge: EdgeData, i) => {
                const startNode = nodes.find((n) => n.id === edge.nodeStartId);
                const endNode = nodes.find((n) => n.id === edge.nodeEndId);

                if (!startNode || !endNode) return null;

                const startDimensions = calculateNodeDimensions(startNode);
                const endDimensions = calculateNodeDimensions(endNode);
                const indexOfStartField =
                  startNode.entitySchema.fields.findIndex(
                    (f) => f.name === edge.outputFieldName,
                  ) + 2;
                const indexOfEndField =
                  endNode.entitySchema.fields.findIndex(
                    (f) => f.name === edge.inputFieldName,
                  ) + 2;
                let startPos = {
                  x: startNode.currentPosition.x + startDimensions.width,
                  y:
                    startNode.currentPosition.y +
                    indexOfStartField * NODE_FIELD_HEIGHT -
                    (0.75 * NODE_FIELD_HEIGHT) / 2,
                };

                let endPos = {
                  x: endNode.currentPosition.x,
                  y:
                    endNode.currentPosition.y +
                    indexOfEndField * NODE_FIELD_HEIGHT,
                };
                // startPos = getViewPosFromWorldPos(
                //   startNode.currentPosition,
                //   camera,
                // );
                // endPos = getViewPosFromWorldPos(
                //   endNode.currentPosition,
                //   camera,
                // );
                console.log("Rendering edge with positions", {
                  startPos,
                  endPos,
                });
                return (
                  <EditorEdge2
                    key={i}
                    selected={selectedEdge ? selectedEdge.id == edge.id : false}
                    highlighted={highlightedEdges.has(edge.id)}
                    isNew={false}
                    // startNode={{
                    //   position: startNode.currentPosition,
                    //   width: startDimensions.width,
                    //   height: startDimensions.height,
                    // }}
                    // endNode={{
                    //   position: endNode.currentPosition,
                    //   width: endDimensions.width,
                    //   height: endDimensions.height,
                    // }}
                    camera={camera}
                    startPos={getViewPosFromWorldPos(startPos, camera)}
                    endPos={getViewPosFromWorldPos(endPos, camera)}
                    // startPos={startPos}
                    // endPos={endPos}
                    onMouseDownEdge={() => {
                      handleEdgeSelection(edge);
                    }}
                    onClickDelete={() => {}}
                  ></EditorEdge2>
                );
              })}
              {contextMenuPos && (
                <div
                  style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
                  className="absolute border rounded-md z-40 border-bg10 dark:border-bg8dark"
                >
                  <BoardContextMenu
                    onNewEntity={() => {
                      createNewEntity(contextMenuPos);
                    }}
                  ></BoardContextMenu>
                </div>
              )}
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
