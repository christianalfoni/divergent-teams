import { useEffect, useRef, useState } from "rask-ui";
import {
  RichTextDisplay,
  SmartEditor,
  type SmartEditorRef,
} from "./SmartEditor";
import type { Todo } from "../types";

interface TodoItemProps {
  todo: Todo;
  onToggleTodoComplete: (todoId: string) => void;
  onUpdateTodo?: (todoId: string, text: string) => void;
  onDeleteTodo?: (todoId: string) => void;
  onClick?: () => void;
  availableTags?: string[];
  isActive?: boolean;
}

// Helper function to check if HTML content is empty
function isHtmlEmpty(html: string): boolean {
  // Create a temporary div to parse the HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;
  // Get the text content and check if it's empty after trimming
  return temp.textContent?.trim() === "";
}

export default function TodoItem(props: TodoItemProps) {
  const state = useState({
    isEditing: false,
    editingHtml: props.todo.text,
    isPressed: false,
  });
  const containerRef = useRef<HTMLDivElement>();
  const editorRef = useRef<SmartEditorRef>();

  let originalHtmlRef = props.todo.text;
  let lastClickTimeRef = 0;
  let clickTimeoutRef = null as ReturnType<typeof setTimeout> | null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle actual mouse clicks, not programmatic events or window focus changes
      if (
        state.isEditing &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        event.target instanceof Node // Ensure it's a real DOM event
      ) {
        if (!isHtmlEmpty(state.editingHtml)) {
          if (state.editingHtml !== props.todo.text) {
            props.onUpdateTodo?.(props.todo.id, state.editingHtml);
          }
        } else {
          // Delete todo if content is empty
          props.onDeleteTodo?.(props.todo.id);
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
      editorRef.current?.setHtml(originalHtmlRef);
      state.editingHtml = originalHtmlRef;
      state.isEditing = false;
    } else if (e.key === "Enter" && !e.shiftKey) {
      // Only save on Enter without Shift (SHIFT + ENTER allows newlines)
      e.preventDefault();
      // Get the latest HTML from the editor (includes any tag conversions that just happened)
      const currentHtml = editorRef.current?.getHtml() || state.editingHtml;
      if (!isHtmlEmpty(currentHtml)) {
        props.onUpdateTodo?.(props.todo.id, currentHtml);
        state.isEditing = false;
      } else {
        // Delete todo if content is empty
        props.onDeleteTodo?.(props.todo.id);
      }
    }
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

    state.isPressed = true;
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
      originalHtmlRef = props.todo.text;
      state.editingHtml = props.todo.text;
      state.isEditing = true;
      clickTimeoutRef = null;
    }, 250);
  };

  return () => {
    if (state.isEditing) {
      return (
        <div className="mt-2 px-3 py-1" ref={containerRef}>
          <div className="flex gap-3">
            <div className="flex h-5 shrink-0 items-center">
              <div className="group/checkbox grid size-4 grid-cols-1">
                <input
                  disabled
                  type="checkbox"
                  checked={props.todo.completed}
                  readOnly
                  className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)] disabled:checked:bg-[var(--color-bg-secondary)] forced-colors:appearance-auto"
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-[var(--color-text-secondary)]"
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
            <div className="flex-1 min-w-0 text-xs/5 text-[var(--color-text-primary)]">
              <SmartEditor
                apiRef={editorRef}
                initialValue={props.todo.richText}
                editing={true}
                onChange={(html) => (state.editingHtml = html)}
                autoFocus={true}
                onKeyDown={handleKeyDown}
                availableTags={props.availableTags}
              />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2 relative">
        <div
          onClick={handleContainerClick}
          onDblClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={() => (state.isPressed = false)}
          onMouseLeave={() => (state.isPressed = false)}
          className={`group/todo relative flex gap-3 text-xs/5 transition-colors px-3 py-1 select-none focus:outline-none cursor-default bg-transparent ${
            !props.isActive && !state.isPressed
              ? "hover:bg-[var(--color-bg-hover)]"
              : ""
          } ${
            state.isPressed
              ? "!bg-[var(--color-bg-active)]"
              : props.isActive
              ? "!bg-[var(--color-bg-hover)]"
              : ""
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
                className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)] disabled:checked:bg-[var(--color-bg-secondary)] forced-colors:appearance-auto"
              />
              <svg
                fill="none"
                viewBox="0 0 14 14"
                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-[var(--color-text-secondary)]"
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
                ? "line-through text-[var(--color-text-secondary)]"
                : "text-[var(--color-text-primary)]"
            }`}
          >
            <RichTextDisplay value={props.todo.richText} />
          </div>
        </div>
      </div>
    );
  };
}
