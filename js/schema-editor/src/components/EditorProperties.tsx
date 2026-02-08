import React, { useState } from "react";
import {
  EntitySchema,
  RelationSchema,
  FieldSchema,
  IndexSchema,
} from "fusefx-modeldescription";
import RelationForm from "./RelationForm";
import FieldForm from "./FieldForm";
import IndexForm from "./IndexForm";
import { NodeData } from "../bl/NodeData";
import DropdownSelect from "ushell-common-components/dist/cjs/_Atoms/DropdownSelect";

const EditorProperties: React.FC<{
  nodeData: NodeData | undefined;
  field: FieldSchema | null;
  relation: RelationSchema | undefined;
  index: IndexSchema | null;
  onChange: () => void;
}> = ({ nodeData, relation, field, index, onChange }) => {
  const [activeTab, setActiveTab] = useState<"layout" | "data">("layout");

  const entity = nodeData?.entitySchema;
  const showEntityTabs = entity && !field && !relation && !index;

  const handleColorChange = (color: string) => {
    if (nodeData) {
      nodeData.color = color;
      onChange();
    }
  };

  const handleNamePluralChange = (namePlural: string) => {
    if (entity) {
      entity.namePlural = namePlural;
      onChange();
    }
  };

  const handlePrimaryKeyIndexChange = (indexName: string) => {
    if (entity) {
      entity.primaryKeyIndexName = indexName;
      onChange();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 h-full">
      {showEntityTabs && (
        <div className="flex flex-col gap-2 h-full">
          <div className="font-bold">{entity.name}</div>

          {/* Tab buttons */}
          <div className="flex border-b border-contentBorder dark:border-contentBorderDark">
            <button
              onClick={() => setActiveTab("layout")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "layout"
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-content dark:text-contentDark hover:text-contentSelected dark:hover:text-contentSelectedDark"
              }`}
            >
              Layout
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "data"
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-content dark:text-contentDark hover:text-contentSelected dark:hover:text-contentSelectedDark"
              }`}
            >
              Data
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {activeTab === "layout" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={nodeData?.color || "#e0e0e0"}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-12 h-8 rounded border border-contentBorder dark:border-contentBorderDark cursor-pointer"
                    />
                    <span className="text-xs text-content dark:text-contentDark">
                      {nodeData?.color || "#e0e0e0"}
                    </span>
                  </div>
                </div>
                {/* More layout properties will go here */}
              </div>
            )}
            {activeTab === "data" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Plural Name</label>
                  <input
                    type="text"
                    value={entity?.namePlural || ""}
                    onChange={(e) => handleNamePluralChange(e.target.value)}
                    placeholder="Enter plural name"
                    className="px-3 py-2 rounded border border-contentBorder dark:border-contentBorderDark bg-contentBg dark:bg-contentBgDark text-content dark:text-contentDark"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    Primary Key Index
                  </label>
                  <DropdownSelect
                    initialOption={
                      entity?.primaryKeyIndexName
                        ? {
                            label: entity.primaryKeyIndexName,
                            value: entity.primaryKeyIndexName,
                          }
                        : null
                    }
                    options={
                      entity?.indices?.map((idx: any) => ({
                        label: idx.name,
                        value: idx.name,
                      })) || []
                    }
                    onOptionSet={(option: any) => {
                      if (option) {
                        handlePrimaryKeyIndexChange(option.value);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {field && <FieldForm field={field} onChange={onChange}></FieldForm>}
      {relation && (
        <RelationForm relation={relation} onChange={onChange}></RelationForm>
      )}
      {index && entity && (
        <IndexForm
          entitySchema={entity}
          index={index}
          onChange={onChange}
        ></IndexForm>
      )}
    </div>
  );
};

export default EditorProperties;
