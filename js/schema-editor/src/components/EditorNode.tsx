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
  }) => {
    const [entityName, setEntityName] = useState(nodeData.entitySchema.name);
    const [editingFieldName, setEditingFieldName] = useState<string | null>(null);
    const [editingIndexName, setEditingIndexName] = useState<string | null>(null);
    const fieldInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const indexInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const pendingCharRef = useRef<string | null>(null);

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
        if (e.key === "Enter") {
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

    const height1 =
      worldHeightField *
      (3 +
        (nodeData.entitySchema.fields.length +
          nodeData.entitySchema.indices.length));
    const borderHeight = 6;
    const separationBorderHeight = worldHeightField * 0.03;
    const separationBorderMargin = worldHeightField * 0.1;
    const numFields = nodeData.entitySchema.fields.length + 2; // +2 for entity name and new field input
    const numIndices = nodeData.entitySchema.indices.length + 2; // +1 for "Indices" header row, +1 for new index input
    const height =
      worldHeightField * (numFields + numIndices) +
      borderHeight +
      separationBorderHeight +
      separationBorderMargin;
    // Offset used when computing absolute connector-dot `top` values for index rows.
    // It is numFields (fields + entity name + new-field input) + 1 (Indices header row).
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
            onBlur={(e) => onCommitEntityName(e.target.value)}
            placeholder="EntityName"
            className=" text-center hover:bg-bg7 dark:hover:bg-bg7dark rounded-md focus:outline-dashed border-0 bg-transparent"
          ></input>
        </div>
        {nodeData.entitySchema.fields.map((f: any, i: number) => {
          const inputRef: any = React.createRef();
          const outputRef: any = createRef();
          return (
            <React.Fragment key={f.name}>
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
                  width: `${worldWidth - 4 - 2 * worldHeightField * 0.15}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  marginLeft: worldHeightField * 0.15,
                  marginRight: worldHeightField * 0.15,
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
              {(isDraggingEdge || true) && (
                <div
                  style={{
                    top:
                      worldHeightField * (i + 1) + (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    left: `-${worldHeightField / 6}px`,
                    backgroundColor: `${nodeData.color}`,
                  }}
                  ref={inputRef}
                  className="absolute  rounded-full
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
              {((selected && activeField?.name === f.name) || true) && (
                <div
                  style={{
                    top:
                      worldHeightField * (i + 1) + (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    right: `-${worldHeightField / 6}px`,
                    backgroundColor: nodeData.color,
                  }}
                  ref={outputRef}
                  className="absolute rounded-full
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseDown={(e) =>
                    handleMouseDownOutput(outputRef, e, f.name)
                  }
                ></div>
              )}
              {((selected && activeField?.name === f.name) || true) && (
                <>
                  {/* <div
                    style={{
                      top:
                        worldHeightField * (i + 1) + (1 / 3) * worldHeightField,
                    }}
                    ref={outputRef}
                    className="absolute -right-7 rounded-l-full 
                  cursor-pointer pointer-events-auto"
                    onMouseDown={(e) => moveFieldDown(f)}
                  >
                    <ChevrodnDownIcon
                      size={1.0}
                      strokeWidth={6}
                    ></ChevrodnDownIcon>
                  </div>
                  <div
                    style={{
                      top:
                        worldHeightField * (i + 1) + (1 / 3) * worldHeightField,
                    }}
                    ref={outputRef}
                    className="absolute -right-14 rounded-l-full 
                      cursor-pointer pointer-events-auto"
                    onMouseDown={(e) => moveFieldUp(f)}
                  >
                    <ChevrodnDownIcon
                      size={1.0}
                      strokeWidth={6}
                      rotate={180}
                    ></ChevrodnDownIcon>
                  </div> */}
                </>
              )}
            </React.Fragment>
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
