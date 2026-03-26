import React, { useState } from "react";
import { RelationSchema } from "fusefx-modeldescription";

// ─── Shared constants ─────────────────────────────────────────────────────────

const INPUT_CLS =
  "text-sm rounded-sm bg-bg2 dark:bg-bg2dark w-full px-2 py-1.5 outline-none " +
  "border border-transparent focus:border-bg5 dark:focus:border-bg5dark transition-colors";

const INPUT_READONLY_CLS =
  "text-sm rounded-sm bg-bg2 dark:bg-bg2dark w-full px-2 py-1.5 outline-none " +
  "border border-transparent opacity-60 cursor-default select-all";

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

// ─── CheckboxField helper ─────────────────────────────────────────────────────

const CheckboxField: React.FC<{
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, label, hint, checked, onChange }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        className="w-4 h-4 rounded accent-blue-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label
        htmlFor={id}
        className="text-sm text-textone dark:text-textonedark cursor-pointer select-none"
      >
        {label}
      </label>
    </div>
    {hint && (
      <span className="text-xs opacity-50 ml-6">{hint}</span>
    )}
  </div>
);

// ─── RelationForm ─────────────────────────────────────────────────────────────

const RelationForm: React.FC<{
  relation: RelationSchema;
  onChange: () => void;
  onDelete?: () => void;
}> = ({ relation, onChange, onDelete }) => {
  const [_, setLocal] = useState(0);
  const forceUpdate = () => setLocal((n) => n + 1);
  const mutate = (fn: () => void) => {
    fn();
    forceUpdate();
    onChange();
  };

  const displayName =
    relation.name ||
    `${relation.primaryEntityName} → ${relation.foreignEntityName}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <span className="text-base font-semibold text-textone dark:text-textonedark">
          {displayName}
        </span>
        {onDelete && (
          <button
            title="Delete relation"
            onClick={() => { if (window.confirm(`Delete relation "${displayName}"?`)) onDelete(); }}
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
                placeholder="Auto-generated if blank"
                value={relation.name ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    relation.name = e.target.value;
                  })
                }
              />
            </FormField>
          </div>

          {/* ── Structure ─────────────────────────────────────────────────── */}
          <SectionHeader label="Structure" />
          <div className="flex flex-col gap-2">
            <FormField label="Primary Entity">
              <input
                type="text"
                readOnly
                className={INPUT_READONLY_CLS}
                value={relation.primaryEntityName}
              />
            </FormField>

            <FormField label="Foreign Entity">
              <input
                type="text"
                readOnly
                className={INPUT_READONLY_CLS}
                value={relation.foreignEntityName}
              />
            </FormField>

            <FormField label="Foreign Key Index">
              <input
                type="text"
                readOnly
                className={INPUT_READONLY_CLS}
                value={relation.foreignKeyIndexName}
              />
            </FormField>
          </div>

          {/* ── Behavior ─────────────────────────────────────────────────── */}
          <SectionHeader label="Behavior" />
          <div className="flex flex-col gap-2">
            <CheckboxField
              id="rel-lookup"
              label="Lookup Relation"
              hint="A navigational / reference relation (read-only side)"
              checked={relation.isLookupRelation ?? true}
              onChange={(v) => mutate(() => { relation.isLookupRelation = v; })}
            />

            <CheckboxField
              id="rel-multiple"
              label="Foreign Entity Is Multiple"
              hint="One primary → many foreign (one-to-many)"
              checked={relation.foreignEntityIsMultiple ?? true}
              onChange={(v) => mutate(() => { relation.foreignEntityIsMultiple = v; })}
            />

            <CheckboxField
              id="rel-optional"
              label="Primary Entity Is Optional"
              hint="Foreign key column allows NULL"
              checked={relation.primaryEntityIsOptional ?? false}
              onChange={(v) => mutate(() => { relation.primaryEntityIsOptional = v; })}
            />

            <CheckboxField
              id="rel-cascade"
              label="Cascade Delete"
              hint="Deleting the primary entity deletes all foreign dependents"
              checked={relation.cascadeDelete ?? false}
              onChange={(v) => mutate(() => { relation.cascadeDelete = v; })}
            />
          </div>

          {/* ── Navigation ───────────────────────────────────────────────── */}
          <SectionHeader label="Navigation" />
          <div className="flex flex-col gap-2">
            <FormField label="Primary Navigation Name">
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="e.g. Orders"
                value={relation.primaryNavigationName ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    relation.primaryNavigationName = e.target.value;
                  })
                }
              />
            </FormField>

            <FormField label="Primary Navigation Summary">
              <textarea
                rows={2}
                className={INPUT_CLS + " resize-none"}
                placeholder="Describe the primary-side navigation property…"
                value={relation.primaryNavigationSummary ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    relation.primaryNavigationSummary = e.target.value;
                  })
                }
              />
            </FormField>

            <FormField label="Foreign Navigation Name">
              <input
                type="text"
                className={INPUT_CLS}
                placeholder="e.g. Customer"
                value={relation.foreignNavigationName ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    relation.foreignNavigationName = e.target.value;
                  })
                }
              />
            </FormField>

            <FormField label="Foreign Navigation Summary">
              <textarea
                rows={2}
                className={INPUT_CLS + " resize-none"}
                placeholder="Describe the foreign-side navigation property…"
                value={relation.foreignNavigationSummary ?? ""}
                onChange={(e) =>
                  mutate(() => {
                    relation.foreignNavigationSummary = e.target.value;
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

export default RelationForm;
