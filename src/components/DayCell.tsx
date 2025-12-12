import TodoItem, { type Todo } from "./TodoItem";
import { SmartEditor, type SmartEditorRef } from "./SmartEditor";
import { useRef, useState } from "rask-ui";

interface DayCellProps {
  date: Date;
  isToday: boolean;
}

export function DayCell({ date, isToday }: DayCellProps) {
  const state = useState({
    todos: [] as Todo[],
    newTodoHtml: "",
    isAddingTodo: false,
  });
  const editorRef = useRef<SmartEditorRef>();
  const scrollContainerRef = useRef<HTMLDivElement>();

  const dayNumber = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const availableTags = getAvailableTags();

  return () => (
    <div className="flex flex-col bg-[var(--color-bg-secondary)] py-2 group h-full overflow-hidden transition-all">
      <div className="flex justify-between items-start mb-2 px-3">
        <time
          dateTime={date.toISOString().split("T")[0]}
          className={`text-xs font-semibold w-fit shrink-0 ${
            isToday
              ? "text-[var(--color-accent-primary)]"
              : "text-[var(--color-text-primary)]"
          }`}
        >
          {`${month} ${dayNumber}`}
        </time>
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          {dayName}
        </span>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 pb-16"
      >
        {state.todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggleTodoComplete={handleToggleTodoComplete}
            onUpdateTodo={handleUpdateTodo}
            onDeleteTodo={handleDeleteTodo}
            availableTags={availableTags}
          />
        ))}
        {!state.isAddingTodo && (
          <button
            onClick={handleAddTodoClick}
            className="mt-2 px-3 flex items-center gap-3 text-xs/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors w-full"
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
            <span>Add focus</span>
          </button>
        )}
        {state.isAddingTodo && (
          <div className="mt-2 px-3">
            <div className="flex gap-3">
              <div className="flex h-5 shrink-0 items-center">
                <div className="group/checkbox grid size-4 grid-cols-1">
                  <input
                    disabled
                    id={`todo-${date.toISOString()}`}
                    name="todo"
                    type="checkbox"
                    className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)] disabled:checked:bg-[var(--color-bg-secondary)] forced-colors:appearance-auto"
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
                      className="opacity-0 group-has-checked/checkbox:opacity-100"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0 text-xs/5 text-[var(--color-text-primary)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--color-text-secondary)]">
                <SmartEditor
                  apiRef={editorRef}
                  html={state.newTodoHtml}
                  editing={true}
                  onChange={(html) => (state.newTodoHtml = html)}
                  placeholder="Description..."
                  autoFocus={true}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  availableTags={availableTags}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  function handleToggleTodoComplete(todoId: string) {
    const todo = state.todos.find((todo) => todoId === todo.id);

    if (!todo) {
      return;
    }

    todo.completed = !todo.completed;
  }

  function handleUpdateTodo(todoId: string, text: string) {
    const todo = state.todos.find((todo) => todoId === todo.id);

    if (!todo) {
      return;
    }

    todo.text = text;
  }

  function handleDeleteTodo(todoId: string) {
    const todoIndex = state.todos.findIndex((todo) => todoId === todo.id);

    if (todoIndex === -1) {
      return;
    }

    state.todos.splice(todoIndex, 1);
  }

  function handleAddTodoClick() {
    state.isAddingTodo = true;
    // Scroll to bottom after state update
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
      }
    }, 0);
  }

  function handleBlur() {
    editorRef.current?.clear();
    state.newTodoHtml = "";
    state.isAddingTodo = false;
  }

  function handleKeyDown(e: Rask.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      editorRef.current?.clear();
      state.newTodoHtml = "";
      state.isAddingTodo = false;
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Get the current HTML directly from the editor to include any just-converted pills/chips
      const currentHtml = editorRef.current?.getHtml() || "";
      // Check if there's actual text content (not just HTML tags or whitespace)
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = currentHtml;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      if (textContent.trim()) {
        // Add todo to local state
        const newTodo: Todo = {
          id: `todo-${Date.now()}`,
          text: currentHtml,
          completed: false,
        };
        state.todos.push(newTodo);
        editorRef.current?.clear();
        state.newTodoHtml = "";
        // Keep isAddingTodo true so user can quickly add another todo
      }
    }
  }

  function getAvailableTags() {
    return state.todos
      .flatMap((todo) => {
        const temp = document.createElement("div");
        temp.innerHTML = todo.text;
        const tagElements = temp.querySelectorAll("[data-tag]");
        return Array.from(tagElements).map(
          (el) => (el as HTMLElement).dataset.tag || ""
        );
      })
      .filter(Boolean);
  }
}
