import { useState, useRef, useEffect } from "rask-ui";
import type { Resource } from "./SmartEditor";

type MentionItem = {
  id: string;
  type: "user" | "project" | "issue";
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  url?: string;
  imageUrl?: string;
  status?: string;
  assignee?: string;
  priority?: string;
};

type Props = {
  open: boolean;
  query: string;
  onSelect: (
    entity: Extract<Resource, { type: "user" | "project" | "issue" }>
  ) => void;
  onClose: () => void;
};

// Mock data with more details
const mockUsers: MentionItem[] = [
  {
    id: "user-1",
    type: "user",
    name: "Alice Johnson",
    description: "Product Manager",
    email: "alice.johnson@example.com",
    phone: "1-555-123-4567",
    url: "https://example.com/alice",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    id: "user-2",
    type: "user",
    name: "Bob Smith",
    description: "Software Engineer",
    email: "bob.smith@example.com",
    phone: "1-555-234-5678",
    url: "https://example.com/bob",
    imageUrl:
      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    id: "user-3",
    type: "user",
    name: "Carol Davis",
    description: "Designer",
    email: "carol.davis@example.com",
    phone: "1-555-345-6789",
    url: "https://example.com/carol",
    imageUrl:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    id: "user-4",
    type: "user",
    name: "David Martinez",
    description: "Engineering Manager",
    email: "david.martinez@example.com",
    phone: "1-555-456-7890",
    url: "https://example.com/david",
    imageUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
  {
    id: "user-5",
    type: "user",
    name: "Emily Chen",
    description: "UX Researcher",
    email: "emily.chen@example.com",
    phone: "1-555-567-8901",
    url: "https://example.com/emily",
    imageUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  },
];

const mockProjects: MentionItem[] = [
  {
    id: "project-1",
    type: "project",
    name: "Website Redesign",
    description: "Q1 2025 redesign project",
    status: "In Progress",
    url: "https://example.com/projects/website-redesign",
  },
  {
    id: "project-2",
    type: "project",
    name: "Mobile App",
    description: "iOS and Android app",
    status: "Planning",
    url: "https://example.com/projects/mobile-app",
  },
  {
    id: "project-3",
    type: "project",
    name: "API Migration",
    description: "Backend infrastructure upgrade",
    status: "Active",
    url: "https://example.com/projects/api-migration",
  },
  {
    id: "project-4",
    type: "project",
    name: "Design System",
    description: "Component library v2",
    status: "In Progress",
    url: "https://example.com/projects/design-system",
  },
];

const mockIssues: MentionItem[] = [
  {
    id: "issue-1",
    type: "issue",
    name: "Fix login bug",
    description: "#123",
    assignee: "Bob Smith",
    priority: "High",
    status: "In Progress",
  },
  {
    id: "issue-2",
    type: "issue",
    name: "Add dark mode",
    description: "#124",
    assignee: "Carol Davis",
    priority: "Medium",
    status: "To Do",
  },
  {
    id: "issue-3",
    type: "issue",
    name: "Performance improvements",
    description: "#125",
    assignee: "Alice Johnson",
    priority: "High",
    status: "In Review",
  },
  {
    id: "issue-4",
    type: "issue",
    name: "Update documentation",
    description: "#126",
    assignee: "David Martinez",
    priority: "Low",
    status: "To Do",
  },
];

const allItems = [...mockUsers, ...mockProjects, ...mockIssues];

// Recent searches (mock)
const recentItems = [allItems[2], allItems[5], allItems[0], allItems[8]];

export function MentionPalette(props: Props) {
  const state = useState({
    selectedIndex: 0,
    internalQuery: "",
    activeItem: null as MentionItem | null,
  });

  const inputRef = useRef<HTMLInputElement>();

  // Focus input when palette opens
  useEffect(() => {
    if (props.open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  });

  // Use internal query for search
  const searchQuery = state.internalQuery;

  // Filter items by query
  const filteredItems =
    searchQuery === ""
      ? recentItems
      : allItems.filter((item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

  // Update selected index when filtered items change
  if (state.selectedIndex >= filteredItems.length) {
    state.selectedIndex = Math.max(0, filteredItems.length - 1);
  }

  // Update active item based on selected index
  state.activeItem = filteredItems[state.selectedIndex] || null;

  const handleSelect = (item: MentionItem) => {
    let entity: Extract<Resource, { type: "user" | "project" | "issue" }>;

    switch (item.type) {
      case "user":
        entity = {
          type: "user",
          userId: item.id,
          display: item.name,
        };
        break;
      case "project":
        entity = {
          type: "project",
          projectId: item.id,
          display: item.name,
        };
        break;
      case "issue":
        entity = {
          type: "issue",
          issueId: item.id,
          display: item.name,
        };
        break;
    }

    props.onSelect(entity);
    props.onClose();
  };

  const handleInputKeyDown = (e: Rask.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.selectedIndex = Math.min(
        state.selectedIndex + 1,
        filteredItems.length - 1
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[state.selectedIndex]) {
        handleSelect(filteredItems[state.selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      props.onClose();
    }
  };

  const handleMouseEnter = (index: number) => {
    state.selectedIndex = index;
  };

  return () => {
    if (!props.open) {
      return null;
    }

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500/25 dark:bg-gray-900/50 z-50 transition-opacity"
          onClick={props.onClose}
        />

        {/* Palette */}
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] pointer-events-none p-4 sm:p-6">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl pointer-events-auto overflow-hidden divide-y divide-gray-100 dark:divide-white/10 ring-1 ring-black/5 dark:ring-white/10">
            {/* Search Input */}
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full h-12 pl-11 pr-4 text-base text-gray-900 dark:text-white bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Search..."
                value={state.internalQuery}
                onInput={(e) => {
                  state.internalQuery = (e.target as HTMLInputElement).value;
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
            {filteredItems.length > 0 ? (
              <div className="flex divide-x divide-gray-100 dark:divide-white/10">
                {/* Results List */}
                <div
                  className={`max-h-96 min-w-0 flex-auto overflow-y-auto px-6 py-4 ${
                    state.activeItem ? "sm:h-96" : ""
                  }`}
                >
                  {searchQuery === "" && (
                    <h2 className="mt-2 mb-4 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Recent searches
                    </h2>
                  )}
                  <div className="-mx-2 text-sm text-gray-700 dark:text-gray-300">
                    {filteredItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-center rounded-md p-2 cursor-pointer select-none ${
                          state.selectedIndex === index
                            ? "bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white"
                            : ""
                        }`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => handleMouseEnter(index)}
                      >
                        {item.type === "user" && item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-6 h-6 flex-none rounded-full bg-gray-100 dark:bg-gray-800"
                          />
                        ) : item.type === "user" ? (
                          <div className="w-6 h-6 flex-none rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-medium">
                            {item.name.charAt(0)}
                          </div>
                        ) : item.type === "project" ? (
                          <div className="w-6 h-6 flex-none rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-xs">
                            📁
                          </div>
                        ) : (
                          <div className="w-6 h-6 flex-none rounded-md bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs">
                            🐛
                          </div>
                        )}
                        <span className="ml-3 flex-auto truncate">
                          {item.name}
                        </span>
                        {state.selectedIndex === index && (
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
                    <div className="flex-none p-6 text-center">
                      {state.activeItem.type === "user" &&
                      state.activeItem.imageUrl ? (
                        <img
                          src={state.activeItem.imageUrl}
                          alt=""
                          className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800"
                        />
                      ) : state.activeItem.type === "user" ? (
                        <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-2xl">
                          {state.activeItem.name.charAt(0)}
                        </div>
                      ) : state.activeItem.type === "project" ? (
                        <div className="mx-auto w-16 h-16 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 text-3xl">
                          📁
                        </div>
                      ) : (
                        <div className="mx-auto w-16 h-16 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-3xl">
                          🐛
                        </div>
                      )}
                      <h2 className="mt-3 font-semibold text-gray-900 dark:text-white">
                        {state.activeItem.name}
                      </h2>
                      {state.activeItem.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {state.activeItem.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-auto flex-col justify-between p-6">
                      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm text-gray-700 dark:text-gray-300">
                        {state.activeItem.type === "user" && (
                          <>
                            {state.activeItem.email && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  Email
                                </dt>
                                <dd className="truncate">
                                  <a
                                    href={`mailto:${state.activeItem.email}`}
                                    className="text-indigo-600 dark:text-indigo-400 underline"
                                  >
                                    {state.activeItem.email}
                                  </a>
                                </dd>
                              </>
                            )}
                            {state.activeItem.phone && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  Phone
                                </dt>
                                <dd>{state.activeItem.phone}</dd>
                              </>
                            )}
                            {state.activeItem.url && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  URL
                                </dt>
                                <dd className="truncate">
                                  <a
                                    href={state.activeItem.url}
                                    className="text-indigo-600 dark:text-indigo-400 underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {state.activeItem.url}
                                  </a>
                                </dd>
                              </>
                            )}
                          </>
                        )}
                        {state.activeItem.type === "project" && (
                          <>
                            {state.activeItem.status && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  Status
                                </dt>
                                <dd>{state.activeItem.status}</dd>
                              </>
                            )}
                            {state.activeItem.url && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  URL
                                </dt>
                                <dd className="truncate">
                                  <a
                                    href={state.activeItem.url}
                                    className="text-indigo-600 dark:text-indigo-400 underline"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {state.activeItem.url}
                                  </a>
                                </dd>
                              </>
                            )}
                          </>
                        )}
                        {state.activeItem.type === "issue" && (
                          <>
                            {state.activeItem.status && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  Status
                                </dt>
                                <dd>{state.activeItem.status}</dd>
                              </>
                            )}
                            {state.activeItem.assignee && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  Assignee
                                </dt>
                                <dd>{state.activeItem.assignee}</dd>
                              </>
                            )}
                            {state.activeItem.priority && (
                              <>
                                <dt className="col-end-1 font-semibold text-gray-900 dark:text-white">
                                  Priority
                                </dt>
                                <dd>{state.activeItem.priority}</dd>
                              </>
                            )}
                          </>
                        )}
                      </dl>
                      <button
                        type="button"
                        className="mt-6 w-full rounded-md bg-indigo-600 dark:bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 dark:hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500"
                        onClick={() => handleSelect(state.activeItem!)}
                      >
                        Select
                      </button>
                    </div>
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
      </>
    );
  };
}
