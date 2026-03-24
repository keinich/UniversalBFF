import React, { createRef, useEffect, useRef, useState } from "react";
import { FieldSchema, IndexSchema } from "fusefx-modeldescription";
import { Camera } from "../bl/Camera";
import { NodeData } from "../bl/NodeData";
import { Position } from "../bl/Position";
import {
  getBoardPosFromWindowPos,
  getViewPosFromWorldPos,
  getWorldPosFromViewPos,
} from "../bl/BoardUtils";
import EditorNodeField from "./EditorNodeField";
import ChevrodnDownIcon from "ushell-common-components/dist/cjs/_Icons/ChevrodnDownIcon";
import { EdgeData } from "../bl/EdgeData";

const EditorNode: React.FC<{
  id: number;
  nodeData: NodeData;
  x: number;
  y: number;
  selected: boolean;
  camera: Camera;
  onMouseDown: (id: number, e: any) => void;
  setSelectedNode: (id: number | null) => void;
  setSelectedEdge: (edge: EdgeData | null) => void;
  onMouseDownOutput: (
    posX: number,
    posY: number,
    nodeId: number,
    fieldName: string,
  ) => void;
  onMouseEnterInput: (
    posX: number,
    posY: number,
    nodeId: number,
    fieldName: string,
  ) => void;
  onMouseLeaveInput: (nodeId: number, fieldName: string) => void;
  onCommitField: (f: FieldSchema, value: any) => void;
  onCommitIndex: (index: IndexSchema, value: any) => void;
  onCommitEntityName: (entityName: string) => void;
  onDeleteField: (f: FieldSchema) => void;
  onDeleteIndex: (index: IndexSchema) => void;
  numInputs: number;
  numOutputs: number;
  activeField: FieldSchema | null;
  activeIndex: IndexSchema | null;
  setActiveField: (f: FieldSchema | null) => void;
  setActiveIndex: (i: IndexSchema | null) => void;
  highlightedFields: Set<string>;
  onFieldClick: (nodeId: number, field: FieldSchema) => void;
  isDraggingEdge: boolean;
  /** Names of all other entities in the schema (for the inheritance dropdown). */
  allEntityNames: string[];
  /** Callback to set or clear the parent entity for this node. */
  onSetInherits: (parentName: string | null) => void;
  /** Fields inherited from the parent entity (read-only display). */
  inheritedFields: FieldSchema[];
  /** Right-click handler forwarded from the parent canvas. */
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Callback fired when the user drag-reorders fields. fromIndex and toIndex are positions within entitySchema.fields. */
  onReorderFields: (fromIndex: number, toIndex: number) => void;
}> = React.memo(
  ({
    id,
    nodeData,
    x,
    y,
    selected,
    camera,
    onMouseDown,
    setSelectedNode,
    setSelectedEdge,
    onMouseDownOutput,
    onMouseEnterInput,
    onMouseLeaveInput,
    onCommitField,
    onCommitIndex,
    onCommitEntityName,
    onDeleteField,
    onDeleteIndex,
    numInputs,
    numOutputs,
    activeField,
    activeIndex,
    setActiveField,
    setActiveIndex,
    highlightedFields,
    onFieldClick,
    isDraggingEdge,
    allEntityNames,
    onSetInherits,
    inheritedFields,
    onContextMenu,
    onReorderFields,
  }) => {
    const [entityName, setEntityName] = useState(nodeData.entitySchema.name);
    const [editingFieldName, setEditingFieldName] = useState<string | null>(null);
    const [editingIndexName, setEditingIndexName] = useState<string | null>(null);
    const fieldInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const indexInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const pendingCharRef = useRef<string | null>(null);

    // ── Drag-and-drop reordering state ──────────────────────────────────────
    // dragSourceIndex: the fields[] index being dragged
    // dragOverIndex:   the fields[] index currently being hovered (drop target)
    const dragSourceIndexRef = useRef<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isDraggingField, setIsDraggingField] = useState(false);

    useEffect(() => {
      if (!editingFieldName) return;
      const input = fieldInputRefs.current.get(editingFieldName);
      if (!input) return;
      input.focus();
      if (pendingCharRef.current !== null && pendingCharRef.current !== "") {
        input.value = pendingCharRef.current;
        input.setSelectionRange(1, 1);
      } else {
        input.setSelectionRange(input.value.length, input.value.length);
      }
      pendingCharRef.current = null;
    }, [editingFieldName]);

    useEffect(() => {
      if (!editingIndexName) return;
      const input = indexInputRefs.current.get(editingIndexName);
      if (!input) return;
      input.focus();
      if (pendingCharRef.current !== null && pendingCharRef.current !== "") {
        input.value = pendingCharRef.current;
        input.setSelectionRange(1, 1);
      } else {
        input.setSelectionRange(input.value.length, input.value.length);
      }
      pendingCharRef.current = null;
    }, [editingIndexName]);

    function handleCommitField(f: FieldSchema | null, value: any) {
      if (!value || value == "") return;
      if (!f) {
        f = new FieldSchema("", "");
        f.name = value;
        f.type = "String";
      }
      onCommitField(f, value);
    }

    function handleCommitIndex(index: IndexSchema | null, value: any) {
      if (!value || value == "") return;
      if (!index) {
        index = new IndexSchema();
        index.name = value;
        index.memberFieldNames = [];
      }
      onCommitIndex(index, value);
    }

    function handleCommitEntityName(value: any) {
      nodeData.entitySchema.name = value;
      onCommitEntityName(value);
    }

    function moveFieldUp(f: FieldSchema) {
      const index = nodeData.entitySchema.fields.indexOf(f);
      if (index > 0) {
        const temp = nodeData.entitySchema.fields[index - 1];
        nodeData.entitySchema.fields[index - 1] = f;
        nodeData.entitySchema.fields[index] = temp;
      }
    }

    function moveFieldDown(f: FieldSchema) {
      const index = nodeData.entitySchema.fields.indexOf(f);
      if (index < nodeData.entitySchema.fields.length - 1) {
        const temp = nodeData.entitySchema.fields[index + 1];
        nodeData.entitySchema.fields[index + 1] = f;
        nodeData.entitySchema.fields[index] = temp;
      }
    }

    function moveIndexUp(i: IndexSchema) {
      const index = nodeData.entitySchema.indices.indexOf(i);
      if (index > 0) {
        const temp = nodeData.entitySchema.indices[index - 1];
        nodeData.entitySchema.indices[index - 1] = i;
        nodeData.entitySchema.indices[index] = temp;
      }
    }

    function moveIndexDown(i: IndexSchema) {
      const index = nodeData.entitySchema.indices.indexOf(i);
      if (index < nodeData.entitySchema.indices.length - 1) {
        const temp = nodeData.entitySchema.indices[index + 1];
        nodeData.entitySchema.indices[index + 1] = i;
        nodeData.entitySchema.indices[index] = temp;
      }
    }

    // ── Field drag-and-drop handlers ────────────────────────────────────────

    /**
     * Called on the drag handle's mousedown. Prevents the node-level onMouseDown
     * from firing (which would start a node drag instead of a field reorder).
     */
    function handleDragHandleMouseDown(e: React.MouseEvent) {
      e.stopPropagation();
    }

    function handleFieldDragStart(index: number, e: React.DragEvent) {
      // Stop propagation so the canvas doesn't pick up a board-drag event.
      e.stopPropagation();
      dragSourceIndexRef.current = index;
      setIsDraggingField(true);
      // Minimal drag image so the default ghost doesn't obscure the list.
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }

    function handleFieldDragOver(index: number, e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    }

    function handleFieldDragLeave(e: React.DragEvent) {
      e.stopPropagation();
      // Only clear dragOverIndex when leaving the list entirely, not when
      // crossing between child elements of the row.
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
        setDragOverIndex(null);
      }
    }

    function handleFieldDrop(toIndex: number, e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      const fromIndex = dragSourceIndexRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        onReorderFields(fromIndex, toIndex);
      }
      dragSourceIndexRef.current = null;
      setDragOverIndex(null);
      setIsDraggingField(false);
    }

    function handleFieldDragEnd(e: React.DragEvent) {
      e.stopPropagation();
      dragSourceIndexRef.current = null;
      setDragOverIndex(null);
      setIsDraggingField(false);
    }

    function handleMouseDownOutput(ref: any, e: any, fieldName: string) {
      e.preventDefault();
      e.stopPropagation();
      if (!ref) return;
      console.log("output down e", e);
      e.stopPropagation();
      const el: any = ref.current;
      console.log("output down el", el.getBoundingClientRect());
      const centerX =
        el.getBoundingClientRect().left +
        Math.abs(
          el.getBoundingClientRect().right - el.getBoundingClientRect().left,
        ) /
          2;

      const centerY =
        el.getBoundingClientRect().top +
        Math.abs(
          el.getBoundingClientRect().bottom - el.getBoundingClientRect().top,
        ) /
          2;

      const windowPos: Position = { x: centerX, y: centerY };
      const viewPos = getBoardPosFromWindowPos(windowPos);
      const worldPos = getWorldPosFromViewPos(viewPos, camera);

      onMouseDownOutput(worldPos.x, worldPos.y, id, fieldName);
    }

    function handleMouseEnterInput(ref: any, e: any, fieldName: string) {
      e.preventDefault();
      e.stopPropagation();
      if (!ref) return;
      console.log("output down e", e);
      e.stopPropagation();
      const el: any = ref.current;
      console.log("output down el", el.getBoundingClientRect());
      const centerX =
        el.getBoundingClientRect().left +
        Math.abs(
          el.getBoundingClientRect().right - el.getBoundingClientRect().left,
        ) /
          2;

      const centerY =
        el.getBoundingClientRect().top +
        Math.abs(
          el.getBoundingClientRect().bottom - el.getBoundingClientRect().top,
        ) /
          2;

      const windowPos: Position = { x: centerX, y: centerY };
      const viewPos = getBoardPosFromWindowPos(windowPos);
      const worldPos = getWorldPosFromViewPos(viewPos, camera);

      onMouseEnterInput(worldPos.x, worldPos.y, id, fieldName);
    }

    function handleKeyDownInputField(field: FieldSchema | null, e: any) {
      e.stopPropagation();
      if (!field) {
        // "New Field" input — always editable
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          handleCommitField(null, e.target.value);
          const el = document.getElementById(nodeData.entitySchema.name + "_new") as HTMLInputElement;
          if (el) { el.value = ""; el.focus(); }
        }
        return;
      }
      const isEditing = editingFieldName === field.name;
      if (isEditing) {
        if (e.key === "Enter") {
          handleCommitField(field, e.target.value);
          setEditingFieldName(null);
        }
        if (e.key === "Escape") {
          setEditingFieldName(null);
        }
        // Delete in edit mode: let browser handle character deletion
      } else {
        // Selected but not editing
        if (e.key === "Delete") {
          onDeleteField(field);
          return;
        }
        if (e.key === "Enter" || e.key === "F2") {
          pendingCharRef.current = "";
          setEditingFieldName(field.name);
          e.preventDefault();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          pendingCharRef.current = e.key;
          setEditingFieldName(field.name);
          e.preventDefault();
          return;
        }
      }
    }

    function handleKeyDownInputIndex(index: IndexSchema | null, e: any) {
      e.stopPropagation();
      if (!index) {
        // "New Index" input — always editable
        if (e.key === "Enter") {
          handleCommitIndex(null, e.target.value);
          const el = document.getElementById(nodeData.entitySchema.name + "_newIndex") as HTMLInputElement;
          if (el) { el.value = ""; el.focus(); }
        }
        return;
      }
      const isEditing = editingIndexName === index.name;
      if (isEditing) {
        if (e.key === "Enter") {
          handleCommitIndex(index, e.target.value);
          setEditingIndexName(null);
        }
        if (e.key === "Escape") {
          setEditingIndexName(null);
        }
      } else {
        if (e.key === "Delete") {
          onDeleteIndex(index);
          return;
        }
        if (e.key === "Enter" || e.key === "F2") {
          pendingCharRef.current = "";
          setEditingIndexName(index.name);
          e.preventDefault();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          pendingCharRef.current = e.key;
          setEditingIndexName(index.name);
          e.preventDefault();
          return;
        }
      }
    }

    function handleKeyDownEntityName(e: any) {
      if (e.key == "Enter") {
        let el: any = document.getElementById(
          nodeData.entitySchema.name + "_new",
        );
        if (!el) {
          el = document.getElementById(e.target.value + "_new");
        }
        el.value = "";
        el.focus();
        onCommitEntityName(e.target.value);
      }
    }

    const viewPos: Position = getViewPosFromWorldPos({ x: x, y: y }, camera);
    const worldWidth: number = camera.scale * 220;
    const worldHeightField: number = camera.scale * 30;

    const borderHeight = 6;
    const separationBorderHeight = worldHeightField * 0.03;
    const separationBorderMargin = worldHeightField * 0.1;

    const parentName = nodeData.entitySchema.inheritedEntityName ?? null;
    const hasParent = !!parentName;

    // Inheritance rows only exist when a parent is set: 1 header row + N inherited field rows
    const inheritanceRowCount = hasParent ? 1 + inheritedFields.length : 0;
    const numFields = nodeData.entitySchema.fields.length + 2 + inheritanceRowCount; // entity name + inheritance row(s) + own fields + new field input
    const numIndices = nodeData.entitySchema.indices.length + 2; // +1 for "Indices" header row, +1 for new index input
    const height =
      worldHeightField * (numFields + numIndices) +
      borderHeight +
      separationBorderHeight +
      separationBorderMargin;
    // Offset used when computing absolute connector-dot `top` values for index rows.
    // It is numFields (all rows above indices section) + 1 (Indices header row).
    const indexRowTopOffset = numFields + 1;

    return (
      <div
        style={{
          width: `${worldWidth}px`,
          height: `${height}px`,
          transform: `translate(${viewPos.x}px, ${viewPos.y}px`,
          // top: `-${height / 2}px`,
          // left: `-${worldWidth / 2}px`,
          // borderTop: `${worldHeightField * 0.15 * 0}px solid`,
          // backgroundColor: nodeData.color || undefined,
        }}
        onMouseDown={(e: any) => {
          e.stopPropagation();

          onMouseDown(id, e);
        }}
        onContextMenu={onContextMenu}
        onBlur={() => {
          setEditingFieldName(null);
          setEditingIndexName(null);
        }}
        className={`flex flex-col absolute rounded-md cursor-grab border-2 gap-0 z-10
          bg-content dark:bg-contentDark
        shadow-md hover:shadow-2xl ${
          nodeData.color ? "" : "bg-bg6 dark:bg-bg6dark"
        } ${selected ? "border-orange-400 " : "border-transparent"}`}
      >
        <div
          id="test123"
          onMouseDown={(e: any) => {
            e.stopPropagation();

            onMouseDown(id, e);
          }}
          onDoubleClick={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e: any) => handleKeyDownEntityName(e)}
          style={{
            width: `${worldWidth - 4}px`,
            height: `${worldHeightField}px`,
            fontSize: worldHeightField / 2.5,
            borderTopLeftRadius: "0.25rem" /* 2px */,
            borderTopRightRadius: "0.25rem" /* 2px */,
            backgroundColor: nodeData.color || "undefined",
            // backgroundColor: "red",
            padding: worldHeightField * 0.15,
            // margin: worldHeightField * 0.15,
            borderBottomWidth: `${worldHeightField * 0.01}px`,
          }}
          className={` text-center border-0 
          cursor-grab outline-none rounded-t-sm flex align-middle justify-center`}
        >
          <input
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
            // readOnly={!(!activeField && inputMode)}
            // readOnly={!inputMode}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={(e) => onCommitEntityName(e.target.value)}
            placeholder="EntityName"
            className=" text-center hover:bg-bg7 dark:hover:bg-bg7dark rounded-md focus:outline-dashed border-0 bg-transparent"
          ></input>
        </div>

        {/* ── Inheritance row — only rendered when a parent is set ──────── */}
        {hasParent && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: `${worldWidth - 4}px`,
              height: `${worldHeightField}px`,
              fontSize: worldHeightField / 2.8,
              paddingLeft: worldHeightField * 0.25,
              paddingRight: worldHeightField * 0.2,
              gap: worldHeightField * 0.25,
            }}
            className="flex items-center
              text-zinc-500 dark:text-zinc-400
              bg-bg5 dark:bg-bg5dark
              border-b border-contentBorder dark:border-contentBorderDark
              select-none"
          >
            {/* Small "extends" label */}
            <span
              style={{ fontSize: worldHeightField / 3.2, flexShrink: 0 }}
              className="font-medium text-violet-500 dark:text-violet-400 tracking-wide"
            >
              extends
            </span>

            {/* Parent name pill + clear button */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span
                style={{ fontSize: worldHeightField / 2.8 }}
                className="truncate font-semibold text-violet-600 dark:text-violet-300"
              >
                {parentName}
              </span>
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSetInherits(null);
                }}
                style={{
                  fontSize: worldHeightField / 2.8,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                className="ml-auto text-zinc-400 hover:text-red-400 transition-colors"
                title="Remove inheritance"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* ── Inherited fields (read-only, with connectors) ───────────────── */}
        {hasParent && inheritedFields.map((f: FieldSchema, i: number) => {
          const inhInputRef: any = React.createRef();
          const inhOutputRef: any = React.createRef();
          return (
            <React.Fragment key={`inherited_${f.name}`}>
              <div
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  width: `${worldWidth - 4}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  paddingLeft: worldHeightField * 0.25,
                  paddingRight: worldHeightField * 0.25,
                }}
                className="flex items-center justify-between
                  text-zinc-400 dark:text-zinc-600
                  bg-bg5 dark:bg-bg5dark
                  border-b border-contentBorder dark:border-contentBorderDark
                  select-none italic"
                title={`Inherited from ${parentName}`}
              >
                <span className="truncate">{f.name}</span>
                <span
                  style={{ fontSize: worldHeightField / 3.2 }}
                  className="text-violet-400 dark:text-violet-600 ml-1 flex-shrink-0 not-italic"
                >
                  inherited
                </span>
              </div>
              {/* Left (input) connector dot */}
              <div
                style={{
                  top: worldHeightField * (i + 2) + (1 / 3) * worldHeightField,
                  width: worldHeightField / 3,
                  height: worldHeightField / 3,
                  left: `-${worldHeightField / 6}px`,
                  backgroundColor: nodeData.color,
                }}
                ref={inhInputRef}
                className="absolute rounded-full cursor-crosshair hover:bg-red-400 pointer-events-auto"
                onMouseEnter={(e) => handleMouseEnterInput(inhInputRef, e, f.name)}
                onMouseLeave={() => onMouseLeaveInput(id, f.name)}
                onMouseDown={(e) => handleMouseDownOutput(inhInputRef, e, f.name)}
              ></div>
              {/* Right (output) connector dot */}
              <div
                style={{
                  top: worldHeightField * (i + 2) + (1 / 3) * worldHeightField,
                  width: worldHeightField / 3,
                  height: worldHeightField / 3,
                  right: `-${worldHeightField / 6}px`,
                  backgroundColor: nodeData.color,
                }}
                ref={inhOutputRef}
                className="absolute rounded-full cursor-crosshair hover:bg-red-400 pointer-events-auto"
                onMouseEnter={(e) => handleMouseEnterInput(inhOutputRef, e, f.name)}
                onMouseLeave={() => onMouseLeaveInput(id, f.name)}
                onMouseDown={(e) => handleMouseDownOutput(inhOutputRef, e, f.name)}
              ></div>
            </React.Fragment>
          );
        })}

        {nodeData.entitySchema.fields.map((f: any, i: number) => {
          const inputRef: any = React.createRef();
          const outputRef: any = createRef();
          const isDropTarget = dragOverIndex === i;
          const isDragSource = isDraggingField && dragSourceIndexRef.current === i;
          return (
            // Draggable row wrapper — same height as a single field row so the
            // connector-dot absolute-top math (calculated from the node origin)
            // continues to be correct.
            <div
              key={f.name}
              draggable
              onDragStart={(e) => handleFieldDragStart(i, e)}
              onDragOver={(e) => handleFieldDragOver(i, e)}
              onDragLeave={handleFieldDragLeave}
              onDrop={(e) => handleFieldDrop(i, e)}
              onDragEnd={handleFieldDragEnd}
              style={{
                width: `${worldWidth - 4}px`,
                height: `${worldHeightField}px`,
                // Show a top border on the row that is being hovered over as a
                // drop indicator. Bottom border on the last row when dragging
                // below it is handled separately in the "New Field" input.
                borderTop: isDropTarget && dragSourceIndexRef.current !== null && dragSourceIndexRef.current > i
                  ? `2px solid #f97316`
                  : "2px solid transparent",
                borderBottom: isDropTarget && dragSourceIndexRef.current !== null && dragSourceIndexRef.current < i
                  ? `2px solid #f97316`
                  : "2px solid transparent",
                // Dim the row being dragged so the user sees it is "lifted".
                opacity: isDragSource ? 0.4 : 1,
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* ── Drag handle — absolutely positioned over the left padding area,
                  so it does not affect the input width or layout ─── */}
              <div
                onMouseDown={handleDragHandleMouseDown}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: worldHeightField * 0.55,
                  height: worldHeightField,
                  fontSize: worldHeightField / 2.8,
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "transparent",
                  zIndex: 1,
                }}
                className="field-drag-handle select-none"
                title="Drag to reorder"
              >
                {/* Six-dot grip icon (two columns of three dots) */}
                <svg
                  viewBox="0 0 8 14"
                  fill="currentColor"
                  style={{ width: worldHeightField * 0.32, height: worldHeightField * 0.5 }}
                >
                  <circle cx="2" cy="2"  r="1.2" />
                  <circle cx="6" cy="2"  r="1.2" />
                  <circle cx="2" cy="7"  r="1.2" />
                  <circle cx="6" cy="7"  r="1.2" />
                  <circle cx="2" cy="12" r="1.2" />
                  <circle cx="6" cy="12" r="1.2" />
                </svg>
              </div>

              <input
                ref={(el) => { if (el) fieldInputRefs.current.set(f.name, el); }}
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  if (f.name !== activeField?.name) {
                    setEditingFieldName(null);
                  }
                  setActiveField(f);
                  onFieldClick(id, f);
                  setSelectedNode(id);
                  setSelectedEdge(null);
                }}
                onDoubleClick={(e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pendingCharRef.current = "";
                  setEditingFieldName(f.name);
                }}
                readOnly={editingFieldName !== f.name}
                defaultValue={f.name}
                onKeyDown={(e: any) => handleKeyDownInputField(f, e)}
                onBlur={(e) => {
                  e.preventDefault();
                  handleCommitField(f, e.target.value);
                  setEditingFieldName(null);
                }}
                placeholder="New Field"
                style={{
                  width: `${worldWidth - 4}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  paddingLeft: worldHeightField * 0.25,
                  flexShrink: 0,
                }}
                className={`text-center rounded-md border-0
                  ${editingFieldName === f.name
                    ? "outline outline-1 outline-blue-400 bg-white dark:bg-zinc-800 cursor-text"
                    : highlightedFields.has(f.name)
                      ? "bg-blue-200 dark:bg-blue-800 outline-none cursor-default select-none"
                      : selected && activeField?.name === f.name
                        ? "bg-blue-100 dark:bg-blue-700 outline-none cursor-default select-none"
                        : nodeData.color
                          ? "outline-none cursor-default select-none hover:bg-bg5 dark:hover:bg-bg5dark"
                          : "bg-bg6 dark:bg-bg6dark outline-none cursor-default select-none"
                  }`}
              ></input>

              {/* Left (input) connector dot — absolutely positioned relative to
                  this row div. top=(1/3)*rowHeight centres a (1/3)-tall dot. */}
              {(isDraggingEdge || true) && (
                <div
                  style={{
                    top: (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    left: `-${worldHeightField / 6}px`,
                    backgroundColor: `${nodeData.color}`,
                  }}
                  ref={inputRef}
                  className="absolute rounded-full
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseEnter={(e) =>
                    handleMouseEnterInput(inputRef, e, f.name)
                  }
                  onMouseLeave={() => onMouseLeaveInput(id, f.name)}
                  onMouseDown={(e) =>
                    handleMouseDownOutput(inputRef, e, f.name)
                  }
                ></div>
              )}

              {/* Right (output) connector dot — absolutely positioned relative to this row div */}
              {((selected && activeField?.name === f.name) || true) && (
                <div
                  style={{
                    top: (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    right: `-${worldHeightField / 6}px`,
                    backgroundColor: nodeData.color,
                  }}
                  ref={outputRef}
                  className="absolute rounded-full
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseEnter={(e) =>
                    handleMouseEnterInput(outputRef, e, f.name)
                  }
                  onMouseLeave={() => onMouseLeaveInput(id, f.name)}
                  onMouseDown={(e) =>
                    handleMouseDownOutput(outputRef, e, f.name)
                  }
                ></div>
              )}
            </div>
          );
        })}
        <input
          id={nodeData.entitySchema.name + "_new"}
          onMouseDown={(e: any) => {
            e.stopPropagation();
            setSelectedNode(id);
            setSelectedEdge(null);
          }}
          onKeyDown={(e: any) => {
            handleKeyDownInputField(null, e);
          }}
          onBlur={(e) => {
            handleCommitField(null, e.target.value);
            e.target.value = "";
          }}
          placeholder="New Field"
          style={{
            width: `${worldWidth - 4}px`,
            height: `${worldHeightField}px`,
            fontSize: worldHeightField / 2.5,
          }}
          className={`${nodeData.color ? "" : "bbg-bg6 dark:bg-bg6dark"} text-center p-0 rounded-none outline-none`}
        ></input>
        <div
          style={{
            height: `${separationBorderHeight}px`,
            marginBottom: `${separationBorderMargin}px`,
          }}
          className="bg-contentBorder dark:bg-contentBorderDark"
        ></div>
        {/* Indices section header */}
        <div
          style={{
            width: `${worldWidth - 4}px`,
            height: `${worldHeightField}px`,
            fontSize: worldHeightField / 2.8,
            paddingLeft: worldHeightField * 0.3,
            paddingRight: worldHeightField * 0.15,
            gap: worldHeightField * 0.25,
          }}
          className="flex items-center font-semibold tracking-wide
            text-zinc-500 dark:text-zinc-400
            bg-bg5 dark:bg-bg5dark
            border-b border-contentBorder dark:border-contentBorderDark
            select-none pointer-events-none"
        >
          {/* Inline SVG index icon — a simple key/list shape */}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: worldHeightField * 0.45, height: worldHeightField * 0.45, flexShrink: 0 }}
          >
            <rect x="1" y="3" width="14" height="2.5" rx="0.5" />
            <rect x="1" y="7" width="9" height="2.5" rx="0.5" />
            <rect x="1" y="11" width="11" height="2.5" rx="0.5" />
          </svg>
          Indices
        </div>
        {nodeData.entitySchema.indices.map((index: any, i: number) => {
          const inputRef: any = React.createRef();
          const outputRef: any = createRef();
          return (
            // <div key={index.name} className="relative">
            <>
              <input
                ref={(el) => { if (el) indexInputRefs.current.set(index.name, el); }}
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  if (index.name !== activeIndex?.name) {
                    setEditingIndexName(null);
                  }
                  setSelectedNode(id);
                  setSelectedEdge(null);
                  setActiveIndex(index);
                }}
                onDoubleClick={(e: any) => {
                  e.preventDefault();
                  e.stopPropagation();
                  pendingCharRef.current = "";
                  setEditingIndexName(index.name);
                }}
                readOnly={editingIndexName !== index.name}
                defaultValue={index.name}
                onKeyDown={(e: any) => handleKeyDownInputIndex(index, e)}
                onBlur={(e) => {
                  e.preventDefault();
                  handleCommitIndex(index, e.target.value);
                  setEditingIndexName(null);
                }}
                placeholder="Index"
                style={{
                  width: `${worldWidth - 4 - 2 * worldHeightField * 0.15}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  marginLeft: worldHeightField * 0.15,
                  marginRight: worldHeightField * 0.15,
                }}
                className={`text-center rounded-md border-0
                  ${editingIndexName === index.name
                    ? "outline outline-1 outline-blue-400 bg-white dark:bg-zinc-800 cursor-text"
                    : highlightedFields.has(index.name)
                      ? "bg-blue-200 dark:bg-blue-800 outline-none cursor-default select-none"
                      : selected && activeIndex?.name === index.name
                        ? "bg-blue-100 dark:bg-blue-700 outline-none cursor-default select-none"
                        : nodeData.color
                          ? "outline-none cursor-default select-none hover:bg-bg5 dark:hover:bg-bg5dark"
                          : "bg-bg5 dark:bg-bg5dark outline-none cursor-default select-none"
                  }`}
              ></input>
              {(isDraggingEdge || true) && (
                <div
                  style={{
                    top:
                      worldHeightField * (indexRowTopOffset + i) +
                      separationBorderHeight +
                      separationBorderMargin +
                      (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    left: `-${worldHeightField / 6}px`,
                    backgroundColor: nodeData.color,
                  }}
                  ref={inputRef}
                  className="absolute  rounded-full
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseEnter={(e) =>
                    handleMouseEnterInput(inputRef, e, index.name)
                  }
                  onMouseLeave={() => onMouseLeaveInput(id, index.name)}
                ></div>
              )}
              {((selected && activeIndex?.name === index.name) || true) && (
                <div
                  style={{
                    top:
                      worldHeightField * (indexRowTopOffset + i) +
                      separationBorderHeight +
                      separationBorderMargin +
                      (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    right: `-${worldHeightField / 6}px`,
                    backgroundColor: nodeData.color,
                  }}
                  ref={outputRef}
                  className="absolute rounded-full
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseEnter={(e) =>
                    handleMouseEnterInput(outputRef, e, index.name)
                  }
                  onMouseLeave={() => onMouseLeaveInput(id, index.name)}
                  onMouseDown={(e) =>
                    handleMouseDownOutput(outputRef, e, index.name)
                  }
                ></div>
              )}
              {/* {selected && activeIndex?.name == index.name && (
                <>
                  <div
                    style={{
                      top: worldHeightField / 2 - worldHeightField / 6,
                    }}
                    ref={outputRef}
                    className="absolute -right-7 rounded-l-full
                    cursor-pointer pointer-events-auto"
                    onMouseDown={(e) => moveIndexDown(index)}
                  >
                    <ChevrodnDownIcon
                      size={1.0}
                      strokeWidth={6}
                    ></ChevrodnDownIcon>
                  </div>
                  <div
                    style={{
                      top: worldHeightField / 2 - worldHeightField / 6,
                    }}
                    ref={outputRef}
                    className="absolute -right-14 rounded-l-full
                    cursor-pointer pointer-events-auto"
                    onMouseDown={(e) => moveIndexUp(index)}
                  >
                    <ChevrodnDownIcon
                      size={1.0}
                      strokeWidth={6}
                      rotate={180}
                    ></ChevrodnDownIcon>
                  </div>
                </>
              )} */}
            </>
            // </div>
          );
        })}
        <input
          id={nodeData.entitySchema.name + "_newIndex"}
          onMouseDown={(e: any) => {
            e.stopPropagation();
            setSelectedNode(id);
            setSelectedEdge(null);
          }}
          onKeyDown={(e: any) => {
            handleKeyDownInputIndex(null, e);
          }}
          onBlur={(e) => {
            handleCommitIndex(null, e.target.value);
            e.target.value = "";
          }}
          placeholder="New Index"
          style={{
            width: `${worldWidth - 4}px`,
            height: `${worldHeightField}px`,
            fontSize: worldHeightField / 2.5,
            backgroundColor: nodeData.color ? "transparent" : undefined,
          }}
          className={`${nodeData.color ? "" : "bbg-bg6 dark:bg-bg6dark"} text-center p-1 rounded-none outline-none`}
        ></input>
      </div>
    );
  },
);

export default EditorNode;
