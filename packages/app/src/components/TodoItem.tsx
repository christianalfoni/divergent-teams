import { useEffect, useRef, useState } from "rask-ui";
import {
  RichTextDisplay,
  SmartEditor,
  type SmartEditorApi,
  type RichText,
} from "./SmartEditor";
import type { Todo } from "@divergent-teams/shared";
import { DataContext } from "../contexts/DataContext";
import { DrawerContext } from "../contexts/DrawerContext";

interface TodoItemProps {
  todo: Todo;
  onToggleTodoComplete: (todoId: string) => void;
  onUpdateTodo?: (todoId: string, richText: RichText) => void;
  onDeleteTodo?: (todoId: string) => void;
  onClick?: () => void;
  availableTags?: string[];
  isActive?: boolean;
  showMetadata?: boolean;
}

// Helper function to check if RichText content is empty
function isRichTextEmpty(richText: RichText): boolean {
  return richText.text.trim() === "" && richText.resources.length === 0;
}

export default function TodoItem(props: TodoItemProps) {
  const data = DataContext.use();
  const drawer = DrawerContext.use();
  const state = useState({
    isEditing: false,
  });
  const containerRef = useRef<HTMLDivElement>();
  const editorRef = useRef<SmartEditorApi>();

  let originalRichTextRef = props.todo.richText;
  let lastClickTimeRef = 0;
  let clickTimeoutRef = null as ReturnType<typeof setTimeout> | null;

  function handleUserClick(userId: string) {
    const user = data.mentions.users.find((u) => u.userId === userId);
    if (user) {
      drawer.open({ type: "user", user });
    }
  }

  function handleTeamClick(teamId: string) {
    const team = data.mentions.teams.find((t) => t.id === teamId);
    if (team) {
      drawer.open({ type: "team", team });
    }
  }

  function handleTaskClick(taskId: string) {
    const task = data.mentions.tasks.find((t) => t.taskId === taskId);
    if (task) {
      drawer.open({ type: "task", task });
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle actual mouse clicks, not programmatic events or window focus changes
      if (
        state.isEditing &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        event.target instanceof Node // Ensure it's a real DOM event
      ) {
        const currentRichText = editorRef.current?.getValue();
        if (currentRichText) {
          if (!isRichTextEmpty(currentRichText)) {
            // Only update if content changed
            if (
              JSON.stringify(currentRichText) !==
              JSON.stringify(props.todo.richText)
            ) {
              props.onUpdateTodo?.(props.todo.id, currentRichText);
            }
          } else {
            // Delete todo if content is empty
            props.onDeleteTodo?.(props.todo.id);
          }
        }
        state.isEditing = false;
      }
    };

    if (state.isEditing) {
      // Use capture phase to ensure we catch the event before any stopPropagation
      document.addEventListener("mousedown", handleClickOutside, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  });

  const handleKeyDown = (e: Rask.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // Revert to original content
      editorRef.current?.setValue(originalRichTextRef);
      state.isEditing = false;
    }
    // Note: Enter key handling is done by SmartEditor's onSubmit
  };

  const handleDoubleClick = (e: Rask.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Cancel any pending single-click edit activation
    if (clickTimeoutRef) {
      clearTimeout(clickTimeoutRef);
      clickTimeoutRef = null;
    }
  };

  const handleMouseDown = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef;
    lastClickTimeRef = now;

    // If this is a potential double-click (within 300ms), track it
    if (timeSinceLastClick < 300) {
      return;
    }
  };

  const handleContainerClick = (e: Rask.MouseEvent) => {
    // If onClick is provided, call it instead of entering edit mode
    if (props.onClick) {
      e.stopPropagation();
      props.onClick();
      return;
    }

    // Delay edit mode activation to allow for double-click
    if (clickTimeoutRef) {
      clearTimeout(clickTimeoutRef);
    }

    clickTimeoutRef = setTimeout(() => {
      // Save original content when entering edit mode
      originalRichTextRef = props.todo.richText;
      state.isEditing = true;
      clickTimeoutRef = null;
    }, 250);
  };

  const handleSubmit = (richText: RichText) => {
    if (!isRichTextEmpty(richText)) {
      props.onUpdateTodo?.(props.todo.id, richText);
      state.isEditing = false;
    } else {
      // Delete todo if content is empty
      props.onDeleteTodo?.(props.todo.id);
    }
  };

  const handleBlur = () => {
    const currentRichText = editorRef.current?.getValue();
    if (currentRichText) {
      if (!isRichTextEmpty(currentRichText)) {
        // Only update if content changed
        if (
          JSON.stringify(currentRichText) !==
          JSON.stringify(props.todo.richText)
        ) {
          props.onUpdateTodo?.(props.todo.id, currentRichText);
        }
      } else {
        // Delete todo if content is empty
        props.onDeleteTodo?.(props.todo.id);
      }
    }
    state.isEditing = false;
  };

  return () => {
    if (state.isEditing) {
      return (
        <div className="px-3 py-2" ref={containerRef}>
          <div className="flex items-center gap-3">
            <div className="flex h-5 shrink-0 items-center">
              <div className="group/checkbox grid size-4 grid-cols-1">
                <input
                  disabled
                  type="checkbox"
                  checked={props.todo.completed}
                  readOnly
                  className="col-start-1 row-start-1 appearance-none rounded-sm border border-(--color-border-secondary) bg-(--color-bg-primary) checked:border-(--color-accent-primary) checked:bg-(--color-accent-primary) indeterminate:border-(--color-accent-primary) indeterminate:bg-(--color-accent-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-primary) disabled:border-(--color-border-secondary) disabled:bg-(--color-bg-secondary) disabled:checked:bg-(--color-bg-secondary) forced-colors:appearance-auto"
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-(--color-text-secondary)"
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
            <div className="flex-1 min-w-0 text-xs/5 text-(--color-text-primary)">
              <SmartEditor
                apiRef={editorRef}
                initialValue={props.todo.richText}
                onSubmit={handleSubmit}
                focus={true}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                availableTags={props.availableTags}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <div
          onClick={handleContainerClick}
          onDblClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          className={`group/todo relative flex gap-3 text-xs/5 transition-colors px-3 py-2 select-none focus:outline-none cursor-default bg-transparent ${
            props.isActive
              ? "dark:bg-gray-700/10"
              : "hover:bg-(--color-bg-hover)"
          } ${props.todo.completed ? "opacity-60" : ""}`}
        >
          <div
            className="flex h-5 shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
            onDblClick={(e) => e.stopPropagation()}
          >
            <div className="group/checkbox grid size-4 grid-cols-1">
              <input
                id={`todo-${props.todo.id}`}
                name="todo"
                type="checkbox"
                checked={props.todo.completed}
                onChange={() => props.onToggleTodoComplete(props.todo.id)}
                className="col-start-1 row-start-1 appearance-none rounded-sm border border-(--color-border-secondary) bg-(--color-bg-primary) checked:border-(--color-accent-primary) checked:bg-(--color-accent-primary) indeterminate:border-(--color-accent-primary) indeterminate:bg-(--color-accent-primary) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent-primary) disabled:border-(--color-border-secondary) disabled:bg-(--color-bg-secondary) disabled:checked:bg-(--color-bg-secondary) forced-colors:appearance-auto"
              />
              <svg
                fill="none"
                viewBox="0 0 14 14"
                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-(--color-text-secondary)"
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
          <div
            className={`flex-1 min-w-0 text-xs/5 select-none ${
              props.todo.completed
                ? "line-through text-(--color-text-secondary)"
                : "text-(--color-text-primary)"
            }`}
          >
            {props.showMetadata && (
              <div className="flex items-center gap-2 mb-1 text-[10px]">
                <span className="text-yellow-500">
                  {data.lookupUserMention(props.todo.userId)?.displayName ||
                    "Unknown"}
                </span>
                <span className="text-gray-500">
                  {props.todo.updatedAt.toDate().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            <RichTextDisplay
              value={props.todo.richText}
              onUserClick={handleUserClick}
              onTeamClick={handleTeamClick}
              onTaskClick={handleTaskClick}
            />
          </div>
        </div>
      </div>
    );
  };
}
