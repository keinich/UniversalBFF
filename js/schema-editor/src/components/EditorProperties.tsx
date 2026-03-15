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

// ─── shared constants ────────────────────────────────────────────────────────

const INPUT_CLS =
  "text-sm rounded-sm bg-bg2 dark:bg-bg2dark w-full px-2 py-1.5 outline-none " +
  "border border-transparent focus:border-bg5 dark:focus:border-bg5dark transition-colors";

const PRESET_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

// ─── FormField helper ─────────────────────────────────────────────────────────

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-textone dark:text-textonedark">
      {label}
    </label>
    {children}
  </div>
);

// ─── SectionHeader helper ─────────────────────────────────────────────────────

const SectionHeader: React.FC<{ label: string; first?: boolean }> = ({
  label,
  first,
}) => (
  <div
    className={`text-xs uppercase tracking-wide opacity-50 mb-1 ${
      first ? "mt-0" : "mt-4"
    }`}
  >
    {label}
  </div>
);

// ─── TabButton helper ─────────────────────────────────────────────────────────

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
        : "text-textone dark:text-textonedark hover:text-contentSelected dark:hover:text-contentSelectedDark"
    }`}
  >
    {label}
  </button>
);

// ─── DataTab ──────────────────────────────────────────────────────────────────

const DataTab: React.FC<{
  entity: EntitySchema;
  forceUpdate: () => void;
  onChange: () => void;
}> = ({ entity, forceUpdate, onChange }) => {
  const mutate = (fn: () => void) => {
    fn();
    forceUpdate();
    onChange();
  };

  const indexOptions = (entity.indices ?? []).map((idx: IndexSchema) => ({
    label: idx.name,
    value: idx.name,
  }));

  const primaryKeyOption = entity.primaryKeyIndexName
    ? { label: entity.primaryKeyIndexName, value: entity.primaryKeyIndexName }
    : null;

  return (
    <div className="flex flex-col">
      {/* Identity */}
      <SectionHeader label="Identity" first />
      <div className="flex flex-col gap-2">
        <FormField label="Name">
          <input
            type="text"
            className={INPUT_CLS}
            value={entity.name ?? ""}
            onChange={(e) =>
              mutate(() => {
                entity.name = e.target.value;
              })
            }
          />
        </FormField>
        <FormField label="Plural Name">
          <input
            type="text"
            className={INPUT_CLS}
            value={entity.namePlural ?? ""}
            onChange={(e) =>
              mutate(() => {
                entity.namePlural = e.target.value;
              })
            }
          />
        </FormField>
        <FormField label="Inherited Entity">
          <input
            type="text"
            className={INPUT_CLS}
            placeholder="None"
            value={entity.inheritedEntityName ?? ""}
            onChange={(e) =>
              mutate(() => {
                entity.inheritedEntityName = e.target.value || null;
              })
            }
          />
        </FormField>
      </div>

      {/* Description */}
      <SectionHeader label="Description" />
      <div className="flex flex-col gap-2">
        <FormField label="Summary">
          <textarea
            rows={3}
            className={INPUT_CLS + " resize-none"}
            placeholder="Describe this entity..."
            value={entity.summary ?? ""}
            onChange={(e) =>
              mutate(() => {
                entity.summary = e.target.value;
              })
            }
          />
        </FormField>
      </div>

      {/* Behavior */}
      <SectionHeader label="Behavior" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            id="bl-entrypoint"
            type="checkbox"
            className="w-4 h-4 rounded accent-blue-500"
            checked={entity.isBlEntrypoint ?? false}
            onChange={(e) =>
              mutate(() => {
                entity.isBlEntrypoint = e.target.checked;
              })
            }
          />
          <label
            htmlFor="bl-entrypoint"
            className="text-sm text-textone dark:text-textonedark cursor-pointer select-none"
          >
            Business Layer Entrypoint
          </label>
        </div>
      </div>

      {/* Primary Key */}
      <SectionHeader label="Primary Key" />
      <div className="flex flex-col gap-2">
        <FormField label="Primary Key Index">
          <div className="text-sm rounded-sm bg-bg2 dark:bg-bg2dark w-full outline-none">
            <DropdownSelect
              initialOption={primaryKeyOption}
              options={indexOptions}
              onOptionSet={(option: any) => {
                if (option) {
                  mutate(() => {
                    entity.primaryKeyIndexName = option.value;
                  });
                }
              }}
            />
          </div>
        </FormField>
      </div>
    </div>
  );
};

// ─── DesignerTab ──────────────────────────────────────────────────────────────

const DesignerTab: React.FC<{
  nodeData: NodeData;
  forceUpdate: () => void;
  onChange: () => void;
}> = ({ nodeData, forceUpdate, onChange }) => {
  const currentColor = nodeData.color ?? "#e0e0e0";

  const handleColorChange = (color: string) => {
    nodeData.color = color;
    forceUpdate();
    onChange();
  };

  return (
    <div className="flex flex-col">
      <SectionHeader label="Node Color" first />
      <div className="flex flex-col gap-3">
        {/* Picker + hex display */}
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-10 h-8 rounded border border-bg5 dark:border-bg5dark cursor-pointer bg-transparent p-0.5"
          />
          <span className="text-xs font-mono text-textone dark:text-textonedark">
            {currentColor}
          </span>
        </div>

        {/* Preset swatches */}
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              title={preset}
              onClick={() => handleColorChange(preset)}
              className="w-6 h-6 rounded-sm border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: preset,
                borderColor: currentColor === preset ? "white" : "transparent",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── EditorProperties ─────────────────────────────────────────────────────────

const EditorProperties: React.FC<{
  nodeData: NodeData | undefined;
  field: FieldSchema | null;
  relation: RelationSchema | undefined;
  index: IndexSchema | null;
  onChange: () => void;
}> = ({ nodeData, relation, field, index, onChange }) => {
  const [activeTab, setActiveTab] = useState<"data" | "designer">("data");
  // Lightweight forceUpdate so mutations to the object reference re-render this panel.
  const [_, setLocal] = useState(0);
  const forceUpdate = () => setLocal((n) => n + 1);

  const entity = nodeData?.entitySchema;
  const showEntityTabs = entity && !field && !relation && !index;

  return (
    <div className="flex flex-col gap-1 h-full">
      {showEntityTabs && (
        <div className="flex flex-col h-full">
          {/* Prominent entity name header */}
          <div className="px-3 pt-3 pb-2">
            <span className="text-base font-semibold text-textone dark:text-textonedark">
              {entity.name}
            </span>
          </div>

          {/* Tab strip */}
          <div className="flex border-b border-contentBorder dark:border-contentBorderDark px-1">
            <TabButton
              label="Data"
              active={activeTab === "data"}
              onClick={() => setActiveTab("data")}
            />
            <TabButton
              label="Designer"
              active={activeTab === "designer"}
              onClick={() => setActiveTab("designer")}
            />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto px-3 py-3">
            {activeTab === "data" && (
              <DataTab
                entity={entity}
                forceUpdate={forceUpdate}
                onChange={onChange}
              />
            )}
            {activeTab === "designer" && nodeData && (
              <DesignerTab
                nodeData={nodeData}
                forceUpdate={forceUpdate}
                onChange={onChange}
              />
            )}
          </div>
        </div>
      )}

      {field && <FieldForm field={field} onChange={onChange} />}
      {relation && <RelationForm relation={relation} onChange={onChange} />}
      {index && entity && (
        <IndexForm entitySchema={entity} index={index} onChange={onChange} />
      )}
    </div>
  );
};

export default EditorProperties;
