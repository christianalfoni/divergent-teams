import { useState, useRef, useEffect, useDerived } from "rask-ui";
import { SearchPaletteContext } from "../contexts/SearchPaletteContext";
import { DataContext } from "../contexts/DataContext";
import type { Mention } from "@divergent-teams/shared";
import { UserGroupIcon } from "./icons/UserGroupIcon";
import { UserPreview } from "./UserPreview";
import { TeamPreview } from "./TeamPreview";

export function SearchPalette() {
  const searchPalette = SearchPaletteContext.use();
  const data = DataContext.use();
  const state = useState({
    selectedIndex: 0,
    query: "",
    activeItem: null as Mention | null,
  });
  const derived = useDerived({
    filteredMentions: () => {
      const allMentions = [...data.mentions.users, ...data.mentions.teams];
      if (state.query === "") {
        return allMentions;
      }
      return allMentions.filter((item) => {
        const searchTerm = state.query.toLowerCase();
        if (item.type === "user") {
          return item.displayName.toLowerCase().includes(searchTerm);
        } else if (item.type === "team") {
          return item.name.toLowerCase().includes(searchTerm);
        }
        return false;
      });
    },
  });

  const inputRef = useRef<HTMLInputElement>();

  // Focus input when palette opens
  useEffect(() => {
    if (searchPalette.isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
      state.query = "";
      state.selectedIndex = 0;
    }
  });

  const handleSelect = (mention: Mention | null) => {
    searchPalette.onSelectMention?.(mention);
    // Close palette immediately
    searchPalette.close();
    state.query = "";
  };

  const handleInputKeyDown = (e: Rask.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.selectedIndex = Math.min(
        state.selectedIndex + 1,
        derived.filteredMentions.length - 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (derived.filteredMentions[state.selectedIndex]) {
        handleSelect(derived.filteredMentions[state.selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleSelect(null);
    }
  };

  const handleMouseEnter = (index: number) => {
    state.selectedIndex = index;
  };

  return () => {
    const selectedIndex =
      state.selectedIndex >= derived.filteredMentions.length
        ? Math.max(0, derived.filteredMentions.length - 1)
        : state.selectedIndex;

    // Update active item based on selected index
    state.activeItem = derived.filteredMentions[selectedIndex] || null;

    return (
      <>
        {/* Search Palette - Only shown when open */}
        {searchPalette.isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none p-4 sm:p-6">
            <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl pointer-events-auto overflow-hidden divide-y divide-gray-100 dark:divide-white/10 ring-1 ring-black/5 dark:ring-white/10 transform transition-all">
              {/* Search Input */}
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full h-12 pl-11 pr-4 text-base text-gray-900 dark:text-white bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  placeholder="Search people & teams..."
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

              {/* Results and Preview */}
              {derived.filteredMentions.length > 0 ? (
                <div className="flex divide-x divide-gray-100 dark:divide-white/10">
                  {/* Results List */}
                  <div
                    className={`max-h-96 min-w-0 flex-auto overflow-y-auto px-6 py-4 ${
                      state.activeItem ? "sm:h-96" : ""
                    }`}
                  >
                    {state.query === "" && (
                      <h2 className="mt-2 mb-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        People & Teams
                      </h2>
                    )}
                    <div className="-mx-2 text-sm text-gray-700 dark:text-gray-300">
                      {derived.filteredMentions.map((item, index) => (
                        <div
                          key={item.id}
                          className={`flex items-center rounded-md p-2 cursor-pointer select-none ${
                            selectedIndex === index
                              ? "bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white"
                              : ""
                          }`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => handleMouseEnter(index)}
                        >
                          {item.type === "user" ? (
                            <div className="w-6 h-6 flex-none rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                              {item.displayName.charAt(0)}
                            </div>
                          ) : (
                            <div className="w-6 h-6 flex-none text-gray-600 dark:text-gray-400">
                              <UserGroupIcon />
                            </div>
                          )}
                          <span className="ml-3 flex-auto truncate">
                            {item.type === "user"
                              ? item.displayName
                              : item.name}
                          </span>
                          {selectedIndex === index && (
                            <svg
                              className="ml-3 w-5 h-5 flex-none text-gray-400 dark:text-gray-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                              />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview Panel */}
                  {state.activeItem && (
                    <div className="hidden sm:flex w-1/2 flex-none flex-col divide-y divide-gray-100 dark:divide-white/10 overflow-y-auto h-96">
                      {state.activeItem.type === "user" ? (
                        <UserPreview
                          key={state.activeItem.id}
                          user={state.activeItem}
                        />
                      ) : (
                        <TeamPreview
                          key={state.activeItem.id}
                          team={state.activeItem}
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-6 py-14 text-center text-sm">
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
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                  <p className="mt-4 font-semibold text-gray-900 dark:text-white">
                    No results found
                  </p>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    We couldn't find anything with that term. Please try again.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  };
}
