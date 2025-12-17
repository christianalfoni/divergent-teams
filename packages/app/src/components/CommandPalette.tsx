import { useState, useRef, useEffect, useDerived } from "rask-ui";
import { CommandPaletteContext } from "../contexts/CommandPaletteContext";

export function CommandPalette() {
  const commandPalette = CommandPaletteContext.use();
  const state = useState({
    selectedIndex: 0,
    query: "",
  });
  const derived = useDerived({
    filteredActions: () => {
      if (state.query === "") {
        return commandPalette.actions;
      }
      return commandPalette.actions.filter((action) =>
        action.name.toLowerCase().includes(state.query.toLowerCase())
      );
    },
    groupedActions: () => {
      const grouped: Record<string, typeof commandPalette.actions> = {};
      for (const action of derived.filteredActions) {
        const category = action.category || "Quick Actions";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(action);
      }
      return grouped;
    },
  });

  const inputRef = useRef<HTMLInputElement>();

  // Focus input when palette opens
  useEffect(() => {
    if (commandPalette.isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
      state.query = "";
      state.selectedIndex = 0;
    }
  });

  const handleSelect = (action: (typeof commandPalette.actions)[0]) => {
    action.onSelect();
    commandPalette.close();
    state.query = "";
  };

  const handleInputKeyDown = (e: Rask.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.selectedIndex = Math.min(
        state.selectedIndex + 1,
        derived.filteredActions.length - 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (derived.filteredActions[state.selectedIndex]) {
        handleSelect(derived.filteredActions[state.selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      commandPalette.close();
    }
  };

  const handleMouseEnter = (index: number) => {
    state.selectedIndex = index;
  };

  return () => {
    if (!commandPalette.isOpen) {
      return null;
    }

    const selectedIndex =
      state.selectedIndex >= derived.filteredActions.length
        ? Math.max(0, derived.filteredActions.length - 1)
        : state.selectedIndex;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500/25 dark:bg-gray-900/50 z-50 transition-opacity"
          onClick={() => commandPalette.close()}
        />

        {/* Palette */}
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none p-4 sm:p-6 md:p-20">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl pointer-events-auto overflow-hidden divide-y divide-gray-100 dark:divide-white/10 ring-1 ring-black/5 dark:ring-white/10 transform transition-all">
            {/* Search Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full h-12 pl-11 pr-4 text-base text-gray-900 dark:text-white bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Search..."
                value={state.query}
                onInput={(e) => {
                  state.query = (e.target as HTMLInputElement).value;
                  state.selectedIndex = 0;
                }}
                onKeyDown={handleInputKeyDown}
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>

            {/* Results */}
            {derived.filteredActions.length > 0 ? (
              <div className="max-h-80 overflow-y-auto py-2">
                {Object.entries(derived.groupedActions).map(
                  ([category, actions]) => (
                    <div key={category} className="px-2">
                      {state.query === "" && (
                        <h2 className="mt-2 mb-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {category}
                        </h2>
                      )}
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {actions.map((action) => {
                          const globalIndex =
                            derived.filteredActions.indexOf(action);
                          const isSelected = selectedIndex === globalIndex;

                          const Icon = action.icon;
                          return (
                            <div
                              key={action.id}
                              className={`flex items-center rounded-md px-3 py-2 cursor-pointer select-none group ${
                                isSelected
                                  ? "bg-indigo-600 text-white"
                                  : "hover:bg-gray-100 dark:hover:bg-white/5"
                              }`}
                              onClick={() => handleSelect(action)}
                              onMouseEnter={() => handleMouseEnter(globalIndex)}
                            >
                              {Icon && (
                                <Icon
                                  className={`w-6 h-6 flex-none ${
                                    isSelected
                                      ? "text-white"
                                      : "text-gray-400 dark:text-gray-500 group-data-focus:text-white"
                                  }`}
                                />
                              )}
                              <span className="ml-3 flex-auto truncate">
                                {action.name}
                              </span>
                              {action.shortcut && (
                                <span
                                  className={`ml-3 flex-none text-xs font-semibold ${
                                    isSelected
                                      ? "text-indigo-100"
                                      : "text-gray-400 group-hover:text-gray-500"
                                  }`}
                                >
                                  <kbd className="font-sans">⌘</kbd>
                                  <kbd className="font-sans">
                                    {action.shortcut}
                                  </kbd>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <svg
                  className="mx-auto w-6 h-6 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                  />
                </svg>
                <p className="mt-4 text-sm text-gray-900 dark:text-white">
                  No commands found
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  We couldn't find any commands with that term. Please try
                  again.
                </p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };
}
