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

    const height1 =
      worldHeightField *
      (3 +
        (nodeData.entitySchema.fields.length +
          nodeData.entitySchema.indices.length));
    const borderHeight = 6;
    const separationBorderHeight = worldHeightField * 0.03;
    const separationBorderMargin = worldHeightField * 0.1;
    const numFields = nodeData.entitySchema.fields.length + 2; // +2 for entity name and new field input
    const numIndices = nodeData.entitySchema.indices.length + 1; // +1 for new index input
    const height =
      worldHeightField * (numFields + numIndices) +
      borderHeight +
      separationBorderHeight +
      separationBorderMargin;

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
          setInputMode(false);
          // setActiveField('')
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
            console.log("double click entity name");
            e.preventDefault();
            e.stopPropagation();
            setInputMode(true);
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
            <
              // key={f.name}
              // className="relative border-0 bg-pink-400"
              // style={{
              //   height: `${worldHeightField}px`,
              // }}
            >
              <input
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  console.log("mouse down field");
                  if (f.name !== activeField?.name) {
                    setInputMode(false);
                  }
                  setActiveField(f);
                  onFieldClick(id, f);
                  setSelectedNode(id);
                  setSelectedEdge(null);
                  // onMouseDown(id, e);
                }}
                onFocus={() => setActiveField(f)}
                // readOnly={f.name != activeField?.name || !inputMode}
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
                  width: `${worldWidth - 4 - 2 * worldHeightField * 0.15}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  marginLeft: worldHeightField * 0.15,
                  marginRight: worldHeightField * 0.15,
                }}
                className={`text-center rounded-md outline-none cursor-default border-0 border-red-400 select-none                  
                  ${
                    highlightedFields.has(f.name)
                      ? "bg-blue-200 dark:bg-blue-800"
                      : selected && activeField?.name === f.name
                        ? "bg-blue-100 dark:bg-blue-700"
                        : nodeData.color
                          ? "select-none hover:bg-bg5 dark:hover:bg-bg5dark"
                          : "bg-bg6 dark:bg-bg6dark select-none"
                  }`}
              ></input>
              {(isDraggingEdge || true) && (
                <div
                  style={{
                    top:
                      worldHeightField * (i + 1) + (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    left: `-${worldHeightField * 0.15}px`,
                  }}
                  ref={inputRef}
                  className="absolute  rounded-full bg-green-300
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
                  }}
                  ref={outputRef}
                  className="absolute rounded-full bg-yellow-300
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
            </>
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
        {nodeData.entitySchema.indices.map((index: any, i: number) => {
          const inputRef: any = React.createRef();
          const outputRef: any = createRef();
          return (
            // <div key={index.name} className="relative">
            <>
              <input
                onMouseDown={(e: any) => {
                  e.stopPropagation();
                  if (index.name !== activeIndex?.name) {
                    setInputMode(false);
                  }
                  setSelectedNode(id);
                  setSelectedEdge(null);
                  setActiveIndex(index);
                }}
                onFocus={() => setActiveIndex(index)}
                defaultValue={index.name}
                onKeyDown={(e: any) => handleKeyDownInputIndex(index, e)}
                onBlur={(e) => {
                  e.preventDefault();
                  // e.stopPropagation();
                  handleCommitIndex(index, e.target.value);
                }}
                // readOnly={index.name != activeIndex?.name || !inputMode}
                placeholder="New Field"
                style={{
                  width: `${worldWidth - 4 - 2 * worldHeightField * 0.15}px`,
                  height: `${worldHeightField}px`,
                  fontSize: worldHeightField / 2.5,
                  marginLeft: worldHeightField * 0.15,
                  marginRight: worldHeightField * 0.15,
                }}
                className={`text-center rounded-md outline-none cursor-default border-0 border-red-400 select-none   
                  ${
                    highlightedFields.has(index.name)
                      ? "bg-blue-200 dark:bg-blue-800"
                      : selected && activeIndex?.name === index.name
                        ? "bg-blue-100 dark:bg-blue-700"
                        : nodeData.color
                          ? "select-none hover:bg-bg5 dark:hover:bg-bg5dark"
                          : "bg-bg6 dark:bg-bg6dark select-none"
                  }`}
              ></input>
              {isDraggingEdge && (
                <div
                  style={{
                    top:
                      worldHeightField * (numFields + i) +
                      (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    left: `-${worldHeightField * 0.15}px`,
                  }}
                  ref={inputRef}
                  className="absolute  rounded-full bg-green-300
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
                    top:
                      worldHeightField * (numFields + i) +
                      (1 / 3) * worldHeightField,
                    width: worldHeightField / 3,
                    height: worldHeightField / 3,
                    right: `-${worldHeightField * 0.15}px`,
                  }}
                  ref={outputRef}
                  className="absolute rounded-full bg-yellow-300
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
