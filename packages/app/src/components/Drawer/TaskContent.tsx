import type { TaskMention, Todo, UserMention } from "@divergent-teams/shared";
import { DataContext } from "../../contexts/DataContext";
import { DrawerContext } from "../../contexts/DrawerContext";
import { useTask } from "../../hooks/useTask";
import { RichTextDisplay } from "../SmartEditor";
import { useState } from "rask-ui";
import TodoItem from "../TodoItem";
import { TodoConversation } from "../TodoConversation";
import { Timestamp } from "firebase/firestore";
import { useTaskTodos } from "../../hooks/useTaskTodos";
import { useCreateTodoForTask } from "../../hooks/useCreateTodoForTask";
import { SearchPaletteContext } from "../../contexts/SearchPaletteContext";
import { AuthenticationContext } from "../../contexts/AuthenticationContext";

type TaskContentProps = {
  task: TaskMention;
  onClose: () => void;
};

export function TaskContent(props: TaskContentProps) {
  let collapseResetTimeout: number | undefined;
  const data = DataContext.use();
  const drawer = DrawerContext.use();
  const authentication = AuthenticationContext.use();
  const searchPalette = SearchPaletteContext.use();
  const taskState = useTask(props.task.taskId);
  const createTodoForTask = useCreateTodoForTask();
  const state = useState({
    selectedTodo: null as Todo | null,
  });

  function handleTodoClick(todo: Todo) {
    // Toggle: if clicking the same todo, collapse it
    if (state.selectedTodo?.id === todo.id) {
      drawer.collapse();
      collapseResetTimeout = setTimeout(() => {
        state.selectedTodo = null;
      }, 250);
    } else {
      clearTimeout(collapseResetTimeout);
      drawer.expand();
      state.selectedTodo = todo;
    }
  }

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

  function handleCreateTodo() {
    if (!authentication.user) return;

    const richText = {
      text: "Work on [[0]]",
      resources: [{ type: "task" as const, taskId: props.task.taskId }],
    };

    createTodoForTask.create({
      userId: authentication.user.id,
      richText,
      date: new Date(),
      isGenerated: false,
    });
  }

  function handleAssignTodo() {
    searchPalette.open((mention) => {
      if (mention && mention.type === "user") {
        const userMention = mention as UserMention;
        const richText = {
          text: "Work on [[0]]",
          resources: [{ type: "task" as const, taskId: props.task.taskId }],
        };

        createTodoForTask.create({
          userId: userMention.userId,
          richText,
          date: new Date(),
          isGenerated: true,
        });
      }
    }, "user");
  }

  function renderDetails() {
    if (taskState.error) {
      return (
        <span class="text-red-600 dark:text-red-400">
          {String(taskState.error)}
        </span>
      );
    }

    if (taskState.isLoading) {
      return (
        <div class="animate-pulse space-y-2">
          <div class="h-4 w-full bg-(--color-skeleton) rounded"></div>
          <div class="h-4 w-3/4 bg-(--color-skeleton) rounded"></div>
        </div>
      );
    }

    if (!taskState.value.details) {
      return (
        <span class="text-gray-500 dark:text-gray-400 italic">
          No details provided
        </span>
      );
    }

    return (
      <RichTextDisplay
        value={taskState.value.details}
        onUserClick={handleUserClick}
        onTeamClick={handleTeamClick}
        onTaskClick={handleTaskClick}
      />
    );
  }

  function renderTeamName() {
    const team = data.mentions.teams.find((t) => t.id === props.task.teamId);
    return team ? team.name : "Unknown Team";
  }

  const todos = useTaskTodos(props.task.id);

  function hasCurrentUserTodoForTask() {
    if (!authentication.user) return false;

    return data.todos.some((todo) => {
      // Check if this todo belongs to the current user
      if (todo.userId !== authentication.user!.id) return false;

      // Check if this todo has a resource referencing the current task
      return todo.richText.resources.some(
        (resource) =>
          resource.type === "task" && resource.taskId === props.task.taskId
      );
    });
  }

  return () => {
    const currentUserHasTodo = hasCurrentUserTodoForTask();

    return (
    <div class="relative flex h-full bg-white shadow-xl dark:bg-gray-800 dark:after:absolute dark:after:inset-y-0 dark:after:left-0 dark:after:w-px dark:after:bg-white/10">
      {/* Main content area */}
      <div
        class="flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ width: "448px" }}
      >
        {/* Header */}
        <div class="bg-gray-50 px-4 py-6 sm:px-6 dark:bg-gray-800/50">
          <div class="flex items-start justify-between space-x-3">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-lg font-semibold">
                {props.task.title.charAt(0)}
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                  {props.task.title}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {renderTeamName()}
                </p>
              </div>
            </div>
            <div class="flex h-7 items-center">
              <button
                type="button"
                onClick={props.onClose}
                class="relative rounded-md text-gray-400 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:hover:text-white dark:focus-visible:outline-indigo-500"
              >
                <span class="absolute -inset-2.5" />
                <span class="sr-only">Close panel</span>
                <svg
                  aria-hidden="true"
                  class="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div class="flex-1">
          {/* Action Buttons */}
          <div class="px-6 pt-6 pb-3">
            <div class="flex gap-2">
              <button
                type="button"
                onClick={handleCreateTodo}
                disabled={currentUserHasTodo}
                class={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${
                  currentUserHasTodo
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 ring-gray-200 dark:ring-gray-700 cursor-not-allowed"
                    : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                }`}
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Create todo
              </button>
              <button
                type="button"
                onClick={handleAssignTodo}
                class="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                  />
                </svg>
                Assign todo
              </button>
            </div>
          </div>

          {/* Task Info */}
          <div class="p-6 space-y-4">
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Details
              </dt>
              <dd class="mt-2 text-sm text-gray-900 dark:text-white">
                {renderDetails()}
              </dd>
            </div>
          </div>

          {/* Todos */}
          <div class="px-6 pb-6">
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
              TODOS
            </h3>
            <div class="space-y-0">
              {todos.data.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleTodoComplete={() => {}}
                  onClick={() => handleTodoClick(todo)}
                  isActive={state.selectedTodo?.id === todo.id}
                  showMetadata={true}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TodoConversation panel - always present at full width */}
      <div class="shrink-0 flex flex-col" style={{ width: "672px" }}>
        {state.selectedTodo && (
          <TodoConversation width={672} todo={state.selectedTodo} />
        )}
      </div>
    </div>
    );
  };
}
