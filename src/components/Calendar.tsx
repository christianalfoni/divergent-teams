import { useEffect, useState, useRef } from "rask-ui";
import TodoItem from "./TodoItem";
import { getCurrentDayIndex, getWeekdays } from "../utils/calendar";
import { SmartEditor, type SmartEditorRef, type Resource } from "./SmartEditor";
import { MentionPalette } from "./MentionPalette";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { TodosLoadingPlaceholder } from "./TodosLoadingPlaceholder";
import { useAddTodo } from "../hooks/useAddTodo";
import { DataContext } from "../contexts/DataContext";

// Collapsed column width
const COLLAPSED_WIDTH = 100;

export function Calendar() {
  const authentication = AuthenticationContext.use();
  const data = DataContext.use();
  const weekdays = getWeekdays();
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const columnRefs = [] as any[];
  const editorRefs = weekdays.map(() => useRef<SmartEditorRef>());
  const currentDayIndex = getCurrentDayIndex();
  const addTodo = useAddTodo();

  const state = useState({
    ...calculateWidths(),
    isTransitioning: false,
    expandedTodo: null as any,
    addingTodoDayIndex: null as number | null,
    mentionPalette: {
      open: false,
      query: "",
      insertMention: null as
        | ((
            entity: Extract<Resource, { type: "user" | "project" | "issue" }>
          ) => void)
        | null,
    },
  });

  // Update widths on window resize
  useEffect(() => {
    const handleResize = () => {
      const { columnWidth, chatWidth } = calculateWidths();
      state.columnWidth = columnWidth;
      state.chatWidth = chatWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  // Helper to check if a day is expanded
  const isExpanded = (index: number) => state.expandedTodo?.dayIndex === index;

  return () => (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      {/* Mention Palette */}
      <MentionPalette
        open={state.mentionPalette.open}
        query={state.mentionPalette.query}
        onSelect={(entity) => {
          if (state.mentionPalette.insertMention) {
            state.mentionPalette.insertMention(entity);
          }
          state.mentionPalette.open = false;
          state.mentionPalette.insertMention = null;

          // Refocus the editor
          if (state.addingTodoDayIndex !== null) {
            setTimeout(() => {
              const editor = editorRefs[state.addingTodoDayIndex!].current;
              if (editor) {
                const el = (editor as any).ref?.current;
                if (el) el.focus();
              }
            }, 0);
          }
        }}
        onClose={() => {
          state.mentionPalette.open = false;
          state.mentionPalette.insertMention = null;
        }}
      />

      <div className="flex flex-1 min-h-0">
        {weekdays.map((date, index) => (
          <div
            key={index}
            ref={(el) => {
              columnRefs[index] = el;
            }}
            className="flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-primary)] last:border-r-0 overflow-hidden transition-all"
            style={getColumnStyle(index)}
            onClick={() => handleDayClick()}
          >
            {/* Day content area - always contains both todos and chat */}
            <div className="flex h-full">
              {/* Todo list with header - fixed initial column width */}
              <div
                className="flex-shrink-0 flex flex-col overflow-hidden"
                style={{
                  width: state.columnWidth ? `${state.columnWidth}px` : "auto",
                }}
              >
                {/* Day header */}
                <div className="p-4 flex-shrink-0">
                  <div
                    className={`flex items-center gap-2 text-sm font-medium ${
                      index === currentDayIndex
                        ? "text-[var(--color-accent-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <span>{dayNames[index]}</span>
                    <span>{date.getDate()}</span>
                  </div>
                </div>

                {/* Todos list */}
                <div className="flex-1 overflow-y-auto">
                  <div
                    className={
                      state.expandedTodo && !isExpanded(index)
                        ? "opacity-0"
                        : "opacity-100"
                    }
                    style={{
                      transition:
                        "opacity 350ms cubic-bezier(0.4, 0.0, 0.2, 1)",
                    }}
                  >
                    {authentication.isAuthenticating || data.isLoading ? (
                      <TodosLoadingPlaceholder />
                    ) : (
                      data.todos.map((todo) => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          onToggleTodoComplete={() => {}}
                          onClick={() => handleTodoClick(index, todo)}
                          isActive={state.expandedTodo?.todoId === todo.id}
                        />
                      ))
                    )}

                    {/* Add new todo button or editor */}
                    {authentication.user &&
                      state.addingTodoDayIndex !== index && (
                        <button
                          onClick={(e) => handleAddTodoClick(e, index)}
                          className="px-3 py-2 flex items-center gap-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors w-full"
                        >
                          <div className="flex h-5 w-4 shrink-0 items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                          </div>
                          <span className="text-sm">Add new todo...</span>
                        </button>
                      )}

                    {/* Editor mode */}
                    {state.addingTodoDayIndex === index && (
                      <div className="px-3 py-2">
                        <div className="flex gap-3">
                          <div className="flex h-5 shrink-0 items-center">
                            <div className="group/checkbox grid size-4 grid-cols-1">
                              <input
                                disabled
                                type="checkbox"
                                className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)]"
                              />
                              <svg
                                fill="none"
                                viewBox="0 0 14 14"
                                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-[var(--color-text-inverse)] group-has-disabled/checkbox:stroke-[var(--color-text-secondary)]"
                              >
                                <path
                                  d="M3 8L6 11L11 3.5"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="opacity-0"
                                />
                              </svg>
                            </div>
                          </div>
                          <div
                            className="flex-1 min-w-0 text-[var(--color-text-primary)]"
                            style={{ "font-size": "var(--todo-text-size)" }}
                          >
                            <SmartEditor
                              apiRef={editorRefs[index]}
                              initialValue={{ resources: [], text: "" }}
                              onSubmit={(richText) => {
                                // Clear and close editor
                                editorRefs[index].current?.clear();
                                state.addingTodoDayIndex = null;

                                if (richText.text) {
                                  addTodo.add({
                                    richText,
                                    date,
                                    position: "",
                                  });
                                }
                              }}
                              placeholder="Description..."
                              focus={true}
                              onKeyDown={(e) => handleEditorKeyDown(e, index)}
                              onBlur={() => handleEditorBlur(index)}
                              availableTags={[]}
                              onMention={(query, insertMention) => {
                                state.mentionPalette.open = true;
                                state.mentionPalette.query = query;
                                state.mentionPalette.insertMention =
                                  insertMention;
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat interface - shows when chat state exists */}
              {state.expandedTodo && (
                <div
                  className="flex-shrink-0 flex flex-col bg-[var(--color-bg-hover)] h-full"
                  style={{
                    width: state.chatWidth ? `${state.chatWidth}px` : "400px",
                  }}
                >
                  {/* Messages container */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {/* Messages will go here */}
                  </div>

                  {/* Message input - at bottom */}
                  <div className="p-3 pt-0">
                    <input
                      type="text"
                      placeholder={`Message...`}
                      className="w-full px-3 py-2 text-xs border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] placeholder:text-[var(--color-text-secondary)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Handle todo click
  function handleTodoClick(dayIndex: number, todo: any) {
    // If clicking the same todo, collapse it but keep chat state
    if (state.expandedTodo?.todoId === todo.id) {
      state.isTransitioning = true;
      state.expandedTodo = null;

      setTimeout(() => {
        state.isTransitioning = false;
      }, 350);
      return;
    }

    // Expand the clicked todo and set up chat state
    state.isTransitioning = true;
    state.expandedTodo = { dayIndex, todoId: todo.id, todo };

    setTimeout(() => {
      state.isTransitioning = false;
    }, 350);
  }

  // Handle day click (only when not in expanded mode)
  function handleDayClick() {
    if (!state.expandedTodo) {
      // Normal day expansion behavior could go here if needed
    }
  }

  // Handle add todo click
  function handleAddTodoClick(e: any, dayIndex: number) {
    e.stopPropagation();
    state.addingTodoDayIndex = dayIndex;
  }

  // Handle editor key down
  function handleEditorKeyDown(e: any, dayIndex: number) {
    if (e.key === "Escape") {
      editorRefs[dayIndex].current?.clear();
      state.addingTodoDayIndex = null;
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Get the current RichText from the editor
      const currentValue = editorRefs[dayIndex].current?.getValue();

      // Check if there's actual text content
      if (currentValue && currentValue.text.trim()) {
        // TODO: Implement add todo logic here
        console.log(
          "Add todo for day",
          dayIndex,
          weekdays[dayIndex],
          "with content:",
          currentValue
        );
        // Clear and close editor
        editorRefs[dayIndex].current?.clear();
        state.addingTodoDayIndex = null;
      }
    }
  }

  // Handle editor blur
  function handleEditorBlur(dayIndex: number) {
    // Don't close if mention palette is open
    if (state.mentionPalette.open) {
      return;
    }

    // Get the current RichText from the editor
    const currentValue = editorRefs[dayIndex].current?.getValue();

    if (currentValue && currentValue.text.trim()) {
      // TODO: Implement add todo logic here
      console.log(
        "Add todo for day",
        dayIndex,
        weekdays[dayIndex],
        "with content:",
        currentValue
      );
    }

    // Clear and close editor
    editorRefs[dayIndex].current?.clear();
    state.addingTodoDayIndex = null;
  }

  // Calculate widths based on window size
  function calculateWidths() {
    const containerWidth = window.innerWidth;
    const width = containerWidth / 5;
    // Chat width = remaining space after one column and 4 collapsed columns
    const chat = containerWidth - width - 4 * COLLAPSED_WIDTH;
    return { columnWidth: width, chatWidth: chat };
  }

  // Helper to get column style
  function getColumnStyle(index: number) {
    const baseStyle = {
      "flex-grow": 0,
      "flex-shrink": 0,
      transition: "flex-basis 350ms cubic-bezier(0.4, 0.0, 0.2, 1)",
    };

    if (!state.expandedTodo) {
      // When nothing is expanded, use explicit equal width
      return {
        ...baseStyle,
        "flex-basis": `${state.columnWidth}px`,
      };
    }

    if (isExpanded(index)) {
      // Expanded column gets todo width + chat width
      return {
        ...baseStyle,
        "flex-basis": `${state.columnWidth + state.chatWidth}px`,
      };
    }

    // Collapsed columns get fixed 100px
    return {
      ...baseStyle,
      "flex-basis": `${COLLAPSED_WIDTH}px`,
    };
  }
}
