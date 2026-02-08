import React, { createRef, useEffect, useState } from "react";
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

const EditorNode: React.FC<{
  id: number;
  nodeData: NodeData;
  x: number;
  y: number;
  selected: boolean;
  camera: Camera;
  onMouseDown: (id: number, e: any) => void;
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
    // const [activeField, setActiveField] = useState('')
    const [inputMode, setInputMode] = useState(false);

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

      // onMouseDownOutput(centerX, el.getBoundingClientRect().bottom, id, index)
      // onMouseDownOutput(centerX + camera.pos.x, centerY + camera.pos.y, id, index)
      onMouseDownOutput(worldPos.x, worldPos.y, id, fieldName);
      // onMouseDownOutput(e.clientX, e.clientY - 100, id, index)
      // onMouseDownOutput(e.clientX, ref.current.clientY, id, index)
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
      if (e.key == "Enter") {
        handleCommitField(field, e.target.value);
        const el: any = document.getElementById(
          nodeData.entitySchema.name + "_new",
        );
        if (el) {
          el.value = "";
          el.focus();
        }
        if (!field) {
          setInputMode((i) => !i);
        }
      }
      if (e.key == "Delete" && field) {
        onDeleteField(field);
        // nodeData.entitySchema.fields = nodeData.entitySchema.fields.filter(
        //   (f) => f.name != field.name,
        // )
      }
      if (!inputMode && field) {
        setInputMode(true);
      }
    }

    function handleKeyDownInputIndex(index: IndexSchema | null, e: any) {
      e.stopPropagation();
      if (e.key == "Enter") {
        handleCommitIndex(index, e.target.value);
        const el: any = document.getElementById(
          nodeData.entitySchema.name + "_newIndex",
        );
        if (el) {
          el.value = "";
          el.focus();
        }
        if (!index) {
          setInputMode((i) => !i);
        }
      }
      if (e.key == "Delete" && index) {
        onDeleteIndex(index);
        // nodeData.entitySchema.fields = nodeData.entitySchema.fields.filter(
        //   (f) => f.name != field.name,
        // )
      }
      if (!inputMode && index) {
        setInputMode(true);
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
        setInputMode((i) => !i);
        onCommitEntityName(e.target.value);
      }
      if (!inputMode) {
        setInputMode(true);
      }
    }

    const viewPos: Position = getViewPosFromWorldPos({ x: x, y: y }, camera);
    const worldWidth: number = camera.scale * 220;
    const worldHeightField: number = camera.scale * 30;

    return (
      <div
        style={{
          width: `${worldWidth}px`,
          height: `${
            worldHeightField *
            (3 +
              (nodeData.entitySchema.fields.length +
                nodeData.entitySchema.indices.length))
          }px`,
          transform: `translate(${viewPos.x}px, ${viewPos.y}px`,
          backgroundColor: nodeData.color || undefined,
        }}
        onMouseDown={(e: any) => {
          e.stopPropagation();

          onMouseDown(id, e);
        }}
        onBlur={() => {
          setInputMode(false);
          // setActiveField('')
        }}
        className={`flex flex-col absolute rounded-md cursor-grab border-2 z-10
        shadow-md hover:shadow-2xl ${
          nodeData.color ? "" : "bg-bg6 dark:bg-bg6dark"
        } ${selected ? "border-orange-400" : "border-bg9 dark:border-bg9dark"}`}
      >
        <input
          id="test123"
          value={entityName}
          onChange={(e) => setEntityName(e.target.value)}
          onMouseDown={(e: any) => {
            e.stopPropagation();

            onMouseDown(id, e);
          }}
          onKeyDown={(e: any) => handleKeyDownEntityName(e)}
          readOnly={!(!activeField && inputMode)}
          onBlur={(e) => onCommitEntityName(e.target.value)}
          placeholder="EntityName"
          style={{
            width: `${worldWidth - 4}px`,
            height: `${worldHeightField}px`,
            fontSize: worldHeightField / 2.5,
            backgroundColor: nodeData.color ? "transparent" : undefined,
          }}
          className={`${nodeData.color ? "" : "bg-contentSelected dark:bg-contentSelectedDark"} text-center p-1 border-0 cursor-grab border-b-2 border-bg9 dark:border-bg9dark outline-none rounded-t-md`}
        ></input>
        {nodeData.entitySchema.fields.map((f: any) => {
          const inputRef: any = React.createRef();
          const outputRef: any = createRef();
          return (
            <div key={f.name} className="relative">
              <input
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  console.log("mouse down field");
                  if (f.name != activeField?.name) {
                    setInputMode(false);
                  }
                  setActiveField(f);
                  onFieldClick(id, f);
                  onMouseDown(id, e);
                }}
                onFocus={() => setActiveField(f)}
                readOnly={f.name != activeField?.name || !inputMode}
                defaultValue={f.name}
                onKeyDown={(e: any) => handleKeyDownInputField(f, e)}
                onBlur={(e) => {
                  console.log("blur field");
                  e.preventDefault();
                  // e.stopPropagation()
                  handleCommitField(f, e.target.value);
                }}
                placeholder="New Field"
                style={{
                  width: `${worldWidth - 4}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  backgroundColor: highlightedFields.has(f.name)
                    ? undefined
                    : nodeData.color
                      ? "transparent"
                      : undefined,
                }}
                className={` text-center p-1 rounded-none outline-none cursor-default ${
                  highlightedFields.has(f.name)
                    ? "bg-blue-200 dark:bg-blue-800"
                    : selected && activeField?.name == f.name
                      ? nodeData.color
                        ? "bg-black/10 dark:bg-white/10"
                        : "bg-bg9 dark:bg-bg9dark"
                      : nodeData.color
                        ? "select-none"
                        : "bbg-bg6 dark:bg-bg6dark select-none"
                }`}
              ></input>
              {isDraggingEdge && (
                <div
                  style={{
                    top: worldHeightField / 2 - worldHeightField / 6,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                  }}
                  ref={inputRef}
                  className="absolute left-0 rounded-r-full bg-green-300
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseEnter={(e) =>
                    handleMouseEnterInput(inputRef, e, f.name)
                  }
                  onMouseLeave={() => onMouseLeaveInput(id, f.name)}
                ></div>
              )}
              {selected && activeField?.name === f.name && (
                <div
                  style={{
                    top: worldHeightField / 2 - worldHeightField / 6,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                  }}
                  ref={outputRef}
                  className="absolute right-0 rounded-l-full bg-yellow-300
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseDown={(e) =>
                    handleMouseDownOutput(outputRef, e, f.name)
                  }
                ></div>
              )}
              {selected && activeField?.name == f.name && (
                <>
                  <div
                    style={{
                      top: worldHeightField / 2 - worldHeightField / 6,
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
                      top: worldHeightField / 2 - worldHeightField / 6,
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
                  </div>
                </>
              )}
            </div>
          );
        })}
        <input
          id={nodeData.entitySchema.name + "_new"}
          onMouseDown={(e: any) => {
            e.stopPropagation();

            onMouseDown(id, e);
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
            backgroundColor: nodeData.color ? "transparent" : undefined,
          }}
          className={`${nodeData.color ? "" : "bbg-bg6 dark:bg-bg6dark"} text-center p-1 rounded-none outline-none`}
        ></input>
        <div className="h-0.5  border-b border-contentBorder dark:border-contentBorderDark"></div>
        {nodeData.entitySchema.indices.map((index: any) => {
          const inputRef: any = React.createRef();
          const outputRef: any = createRef();
          return (
            <div key={index.name} className="relative">
              <input
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  console.log("mouse down field");
                  if (index.name != activeIndex?.name) {
                    setInputMode(false);
                  }
                  // onFieldSelected(f)
                  setActiveIndex(index);
                  onMouseDown(id, e);
                }}
                onFocus={() => setActiveIndex(index)}
                readOnly={index.name != activeIndex?.name || !inputMode}
                defaultValue={index.name}
                onKeyDown={(e: any) => handleKeyDownInputIndex(index, e)}
                onBlur={(e) => {
                  console.log("blur field");
                  e.preventDefault();
                  e.stopPropagation();
                  handleCommitIndex(index, e.target.value);
                }}
                placeholder="New Field"
                style={{
                  width: `${worldWidth - 4}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  backgroundColor: highlightedFields.has(index.name)
                    ? undefined
                    : nodeData.color
                      ? "transparent"
                      : undefined,
                }}
                className={` text-center p-1 rounded-none outline-none cursor-default ${
                  highlightedFields.has(index.name)
                    ? "bg-blue-200 dark:bg-blue-800"
                    : selected && activeIndex?.name == index.name
                      ? nodeData.color
                        ? "bg-black/10 dark:bg-white/10"
                        : "bg-bg9 dark:bg-bg9dark"
                      : nodeData.color
                        ? "select-none"
                        : "bbg-bg6 dark:bg-bg6dark select-none"
                }`}
              ></input>
              {isDraggingEdge && (
                <div
                  style={{
                    top: worldHeightField / 2 - worldHeightField / 6,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                  }}
                  ref={inputRef}
                  className="absolute left-0 rounded-r-full bg-green-300
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseEnter={(e) =>
                    handleMouseEnterInput(inputRef, e, index.name)
                  }
                  onMouseLeave={() => onMouseLeaveInput(id, index.name)}
                ></div>
              )}
              {selected && activeIndex?.name === index.name && (
                <div
                  style={{
                    top: worldHeightField / 2 - worldHeightField / 6,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                  }}
                  ref={outputRef}
                  className="absolute right-0 rounded-l-full bg-yellow-300
                    cursor-crosshair hover:bg-red-400 pointer-events-auto"
                  onMouseDown={(e) =>
                    handleMouseDownOutput(outputRef, e, index.name)
                  }
                ></div>
              )}
              {selected && activeIndex?.name == index.name && (
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
              )}
            </div>
          );
        })}
        <input
          id={nodeData.entitySchema.name + "_newIndex"}
          onMouseDown={(e: any) => {
            e.stopPropagation();

            onMouseDown(id, e);
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
