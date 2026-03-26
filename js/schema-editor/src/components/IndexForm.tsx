import React, { useState } from "react";
import { EntitySchema, IndexSchema } from "fusefx-modeldescription";

// ─── Shared constants ─────────────────────────────────────────────────────────

const INPUT_CLS =
  "text-sm rounded-sm bg-bg2 dark:bg-bg2dark w-full px-2 py-1.5 outline-none " +
  "border border-transparent focus:border-bg5 dark:focus:border-bg5dark transition-colors";

const SELECT_CLS = INPUT_CLS + " appearance-none pr-7 cursor-pointer";

// ─── SelectField helper ───────────────────────────────────────────────────────

const SelectField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, onChange, children }) => (
  <div className="relative">
    <select
      className={SELECT_CLS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
      <svg
        className="w-3.5 h-3.5 opacity-50"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  </div>
);

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

// ─── IndexForm ────────────────────────────────────────────────────────────────

const IndexForm: React.FC<{
  entitySchema: EntitySchema;
  index: IndexSchema;
  onChange: () => void;
  onDelete?: () => void;
}> = ({ entitySchema, index, onChange, onDelete }) => {
  const [_, setLocal] = useState(0);
  const forceUpdate = () => setLocal((n) => n + 1);
  const mutate = (fn: () => void) => {
    fn();
    forceUpdate();
    onChange();
  };

  const availableFields = entitySchema.fields.filter(
    (f) => !index.memberFieldNames.includes(f.name)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <span className="text-base font-semibold text-textone dark:text-textonedark">
          {index.name || <span className="opacity-40 italic">Unnamed Index</span>}
        </span>
        {onDelete && (
          <button
            title="Delete index"
            onClick={() => { if (window.confirm(`Delete index "${index.name}"?`)) onDelete(); }}
            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto px-3 py-3">
        <div className="flex flex-col">

          {/* ── Identity ─────────────────────────────────────────────────── */}
          <SectionHeader label="Identity" first />
          <div className="flex flex-col gap-2">
            <FormField label="Name">
              <input
                type="text"
                className={INPUT_CLS}
                value={index.name ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    index.name = e.target.value;
                  })
                }
              />
            </FormField>
          </div>

          {/* ── Behavior ─────────────────────────────────────────────────── */}
          <SectionHeader label="Behavior" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <input
                  id="index-unique"
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-500"
                  checked={index.unique ?? false}
                  onChange={(e) =>
                    mutate(() => {
                      index.unique = e.target.checked;
                    })
                  }
                />
                <label
                  htmlFor="index-unique"
                  className="text-sm text-textone dark:text-textonedark cursor-pointer select-none"
                >
                  Unique
                </label>
              </div>
              <span className="text-xs opacity-50 ml-6">
                Enforces uniqueness across member fields
              </span>
            </div>
          </div>

          {/* ── Member Fields ─────────────────────────────────────────────── */}
          <SectionHeader label="Member Fields" />
          <div className="flex flex-col gap-1.5">
            {index.memberFieldNames.length === 0 && (
              <span className="text-xs opacity-40 italic py-1">
                No fields added yet
              </span>
            )}
            {index.memberFieldNames.map((fieldName, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-bg2 dark:bg-bg2dark group"
              >
                {/* Drag handle / order indicator */}
                <span className="text-xs opacity-30 w-4 text-center select-none shrink-0">
                  {i + 1}
                </span>

                <span className="flex-1 text-sm text-textone dark:text-textonedark truncate">
                  {fieldName}
                </span>

                {/* Move up */}
                <button
                  title="Move up"
                  disabled={i === 0}
                  onClick={() =>
                    mutate(() => {
                      const arr = index.memberFieldNames;
                      [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                    })
                  }
                  className="opacity-0 group-hover:opacity-100 disabled:opacity-20 transition-opacity p-0.5 rounded hover:bg-bg3 dark:hover:bg-bg3dark"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 3a.75.75 0 01.53.22l5 5a.75.75 0 01-1.06 1.06L10 4.81 5.53 9.28a.75.75 0 01-1.06-1.06l5-5A.75.75 0 0110 3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Move down */}
                <button
                  title="Move down"
                  disabled={i === index.memberFieldNames.length - 1}
                  onClick={() =>
                    mutate(() => {
                      const arr = index.memberFieldNames;
                      [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                    })
                  }
                  className="opacity-0 group-hover:opacity-100 disabled:opacity-20 transition-opacity p-0.5 rounded hover:bg-bg3 dark:hover:bg-bg3dark"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 17a.75.75 0 01-.53-.22l-5-5a.75.75 0 011.06-1.06L10 15.19l4.47-4.47a.75.75 0 011.06 1.06l-5 5A.75.75 0 0110 17z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* Remove */}
                <button
                  title="Remove field"
                  onClick={() =>
                    mutate(() => {
                      index.memberFieldNames.splice(i, 1);
                    })
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-red-500/20 text-red-400"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add field dropdown */}
            {availableFields.length > 0 && (
              <div className="mt-1">
                <SelectField
                  value=""
                  onChange={(v) => {
                    if (!v) return;
                    mutate(() => {
                      index.memberFieldNames.push(v);
                    });
                  }}
                >
                  <option value="" disabled>
                    + Add field…
                  </option>
                  {availableFields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </SelectField>
              </div>
            )}

            {availableFields.length === 0 &&
              entitySchema.fields.length > 0 && (
                <span className="text-xs opacity-40 italic">
                  All fields are already members
                </span>
              )}

            {entitySchema.fields.length === 0 && (
              <span className="text-xs opacity-40 italic">
                No fields defined on this entity
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default IndexForm;
