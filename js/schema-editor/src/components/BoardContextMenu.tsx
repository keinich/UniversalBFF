import React, { useState } from "react";

/**
 * Context menu that appears when right-clicking the board canvas (empty space).
 *
 * Items:
 *   - "Create entity"                — creates a plain new entity
 *   - "Create inherited entity"  >   — hover to reveal submenu of entity names;
 *                                      clicking one creates a new entity that
 *                                      inherits from the chosen entity
 */
const BoardContextMenu: React.FC<{
  onNewEntity: () => void;
  allEntityNames: string[];
  onNewInheritedEntity: (parentName: string) => void;
}> = ({ onNewEntity, allEntityNames, onNewInheritedEntity }) => {
  const [submenuOpen, setSubmenuOpen] = useState(false);

  const menuItemClass =
    "relative px-3 py-1.5 text-left hover:bg-bg5 dark:hover:bg-bg5dark cursor-pointer select-none flex items-center justify-between gap-2 whitespace-nowrap";

  return (
    <div
      className="flex flex-col bg-bg3 dark:bg-bg3dark text-sm z-40 min-w-[160px]"
      // Prevent board mousedown from propagating and closing the menu
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Create entity */}
      <div
        className={menuItemClass}
        onMouseDown={(e) => {
          e.stopPropagation();
          onNewEntity();
        }}
      >
        Create entity
      </div>

      {/* Create inherited entity — shows submenu on hover */}
      {allEntityNames.length > 0 && (
        /*
         * The onMouseEnter/onMouseLeave are placed on this outer wrapper so
         * that they span both the trigger row and the absolutely-positioned
         * submenu panel.  If the handlers were on the inner row div only, the
         * mouse leaving the row area toward the submenu would fire onMouseLeave
         * and close the submenu before the user could click an item.
         */
        <div
          className="relative"
          onMouseEnter={() => setSubmenuOpen(true)}
          onMouseLeave={() => setSubmenuOpen(false)}
        >
          <div className={menuItemClass}>
            <span>Create inherited entity</span>
            {/* Right-arrow indicator */}
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ width: 10, height: 10, flexShrink: 0 }}
            >
              <path d="M6 3l5 5-5 5V3z" />
            </svg>
          </div>

          {/* Submenu — absolutely positioned to the right */}
          {submenuOpen && (
            <div
              className="absolute left-full top-0 bg-bg3 dark:bg-bg3dark border border-bg10 dark:border-bg8dark z-50 min-w-[140px]"
            >
              {allEntityNames.map((name) => (
                <div
                  key={name}
                  className="px-3 py-1.5 hover:bg-bg5 dark:hover:bg-bg5dark cursor-pointer select-none whitespace-nowrap"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onNewInheritedEntity(name);
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardContextMenu;
