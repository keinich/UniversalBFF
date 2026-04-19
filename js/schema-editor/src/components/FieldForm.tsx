import React, { useState } from "react";
import { FieldSchema } from "fusefx-modeldescription";

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
    {/* Custom chevron arrow */}
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

// ─── FieldForm ─────────────────────────────────────────────────────────────────

const FieldForm: React.FC<{
  field: FieldSchema;
  onChange: () => void;
  onDelete?: () => void;
}> = ({ field, onChange, onDelete }) => {
  const [_, setLocal] = useState(0);
  const forceUpdate = () => setLocal((n) => n + 1);
  const mutate = (fn: () => void) => {
    fn();
    forceUpdate();
    onChange();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <span className="text-base font-semibold text-textone dark:text-textonedark">
          {field.name}
        </span>
        {onDelete && (
          <button
            title="Delete field"
            onClick={() => {
              if (window.confirm(`Delete field "${field.name}"?`)) onDelete();
            }}
            className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
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
                value={field.name ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    field.name = e.target.value;
                  })
                }
              />
            </FormField>

            <FormField label="Type">
              <SelectField
                value={field.type}
                onChange={(v) =>
                  mutate(() => {
                    field.type = v;
                  })
                }
              >
                <option value="String">String</option>
                <option value="Date">Date</option>
                <option value="int">Int</option>
                <option value="Int32">Int32</option>
                <option value="Int64">Int64</option>
                <option value="Boolean">Boolean</option>
                <option value="Decimal">Decimal</option>
                <option value="Guid">Guid</option>
              </SelectField>
            </FormField>

            <FormField label="Max Length">
              <input
                type="number"
                min={0}
                className={INPUT_CLS}
                value={field.maxLength ?? 0}
                onChange={(e) =>
                  mutate(() => {
                    field.maxLength = parseInt(e.target.value, 10) || 0;
                  })
                }
              />
            </FormField>
          </div>

          {/* ── Description ──────────────────────────────────────────────── */}
          <SectionHeader label="Description" />
          <div className="flex flex-col gap-2">
            <FormField label="Summary">
              <textarea
                rows={3}
                className={INPUT_CLS + " resize-none"}
                placeholder="Describe this field..."
                value={field.summary ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    field.summary = e.target.value;
                  })
                }
              />
            </FormField>
          </div>

          {/* ── Behavior ─────────────────────────────────────────────────── */}
          <SectionHeader label="Behavior" />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                id="field-required"
                type="checkbox"
                className="w-4 h-4 rounded accent-blue-500"
                checked={field.required ?? false}
                onChange={(e) =>
                  mutate(() => {
                    field.required = e.target.checked;
                  })
                }
              />
              <label
                htmlFor="field-required"
                className="text-sm text-textone dark:text-textonedark cursor-pointer select-none"
              >
                Required
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="field-db-generated"
                type="checkbox"
                className="w-4 h-4 rounded accent-blue-500"
                checked={field.dbGeneratedIdentity ?? false}
                onChange={(e) =>
                  mutate(() => {
                    field.dbGeneratedIdentity = e.target.checked;
                  })
                }
              />
              <label
                htmlFor="field-db-generated"
                className="text-sm text-textone dark:text-textonedark cursor-pointer select-none"
              >
                DB Generated Identity
              </label>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <input
                  id="field-identity-label"
                  type="checkbox"
                  className="w-4 h-4 rounded accent-blue-500"
                  checked={field.identityLabel ?? false}
                  onChange={(e) =>
                    mutate(() => {
                      field.identityLabel = e.target.checked;
                    })
                  }
                />
                <label
                  htmlFor="field-identity-label"
                  className="text-sm text-textone dark:text-textonedark cursor-pointer select-none"
                >
                  Identity Label
                </label>
              </div>
              <span className="text-xs opacity-50 ml-6">
                Human-readable natural key
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="field-system-internal"
                type="checkbox"
                className="w-4 h-4 rounded accent-blue-500"
                checked={field.systemInternal ?? false}
                onChange={(e) =>
                  mutate(() => {
                    field.systemInternal = e.target.checked;
                  })
                }
              />
              <label
                htmlFor="field-system-internal"
                className="text-sm text-textone dark:text-textonedark cursor-pointer select-none"
              >
                System Internal
              </label>
            </div>
          </div>

          {/* ── Setability ───────────────────────────────────────────────── */}
          <SectionHeader label="Setability" />
          <div className="flex flex-col gap-2">
            <FormField label="Setability Flags">
              <SelectField
                value={String(field.setabilityFlags)}
                onChange={(v) =>
                  mutate(() => {
                    field.setabilityFlags = parseInt(v, 10);
                  })
                }
              >
                <option value="0">Never</option>
                <option value="1">On Creation</option>
                <option value="2">On Single Update</option>
                <option value="4">On Batch Update</option>
                <option value="6">After Creation</option>
                <option value="7">Always</option>
              </SelectField>
            </FormField>
          </div>

          {/* ── Filtering ────────────────────────────────────────────────── */}
          <SectionHeader label="Filtering" />
          <div className="flex flex-col gap-2">
            <FormField label="Filterable">
              <SelectField
                value={String(field.filterable)}
                onChange={(v) =>
                  mutate(() => {
                    field.filterable = parseInt(v, 10);
                  })
                }
              >
                <option value="0">None</option>
                <option value="1">Exact Match</option>
                <option value="2">Substring</option>
              </SelectField>
            </FormField>
          </div>

          {/* ── Advanced ─────────────────────────────────────────────────── */}
          <SectionHeader label="Advanced" />
          <div className="flex flex-col gap-2">
            <FormField label="Default Value">
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="None"
                value={field.defaultValue ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    field.defaultValue = e.target.value || null;
                  })
                }
              />
            </FormField>

            <FormField label="Content Concern">
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="None"
                value={field.contentConcern ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    field.contentConcern = e.target.value || null;
                  })
                }
              />
            </FormField>

            <FormField label="Known Value Range">
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="None"
                value={field.knownValueRangeName ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    field.knownValueRangeName = e.target.value || null;
                  })
                }
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldForm;
