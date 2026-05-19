import React from "react";
import ArrowLeftStartOnRectangle from "ushell-common-components/dist/cjs/_Icons/ArrowLeftStartOnRectangle";
import ArrowRightStartOnRectangle from "ushell-common-components/dist/cjs/_Icons/ArrowRightStartOnRectangle";
import FloppyDiskIcon from "ushell-common-components/dist/cjs/_Icons/FloppyDiskIcon";

const EditorToolbar: React.FC<{
  schemaName: string;
  showProperties: boolean;
  setShowProperties: (v: boolean) => void;
  save: () => void;
  dirty: boolean;
}> = ({
  schemaName,
  showProperties,
  setShowProperties,
  save,
  dirty,
}) => {
  return (
    <div
      className="bg-toolbar dark:bg-toolbarDark w-full relative flex justify-between
      items-center border-b border-toolbarBorder dark:border-toolbarBorderDark p-2"
    >
      <div className="px-2 flex items-center align-middle gap-2">
        {/* Read-only schema name label */}
        <span
          className="text-base font-semibold tracking-tight text-textone dark:text-textonedark
            select-none px-2 py-1 rounded-sm"
          title="Schema name — edit in the properties panel"
        >
          {schemaName || "Untitled Schema"}
        </span>
        <button
          className={`p-1 rounded-sm transition-colors ${
            dirty
              ? "text-blue-400 hover:text-blue-500 cursor-pointer"
              : "text-gray-300 dark:text-gray-600 cursor-default"
          }`}
          onClick={() => { if (dirty) save(); }}
          title={dirty ? "Save" : "No unsaved changes"}
        >
          <FloppyDiskIcon size={1.5}></FloppyDiskIcon>
        </button>
      </div>
      <button
        className="p-1 rounded-sm mx-2 hover:bg-bg4 dark:hover:bg-bg4dark"
        onClick={() => setShowProperties(!showProperties)}
      >
        {!showProperties ? (
          <ArrowLeftStartOnRectangle></ArrowLeftStartOnRectangle>
        ) : (
          <ArrowRightStartOnRectangle></ArrowRightStartOnRectangle>
        )}
      </button>
    </div>
  );
};

export default EditorToolbar;
