import { dir } from "console";
import React from "react";
import ArrowLeftStartOnRectangle from "ushell-common-components/dist/cjs/_Icons/ArrowLeftStartOnRectangle";
import ArrowRightStartOnRectangle from "ushell-common-components/dist/cjs/_Icons/ArrowRightStartOnRectangle";
import FloppyDiskIcon from "ushell-common-components/dist/cjs/_Icons/FloppyDiskIcon";

const EditorToolbar: React.FC<{
  schemaName: string;
  setSchemaName: (v: string) => void;
  showProperties: boolean;
  setShowProperties: (v: boolean) => void;
  save: () => void;
  dirty: boolean;
}> = ({
  schemaName,
  setSchemaName,
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
      <div className="px-2 flex items-center align-middle gap-1">
        <input
          style={{ borderRadius: "0.25rem" }}
          className="bg-content dark:bg-contentDark outline-none p-1"
          value={schemaName}
          onChange={(e) => {
            setSchemaName(e.target.value);
          }}
        ></input>
        {dirty && (
          <button
            className="text-blue-400 p-1 hover:text-blue-500"
            onClick={() => {
              save();
            }}
          >
            <FloppyDiskIcon size={1.5}></FloppyDiskIcon>
          </button>
        )}
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
