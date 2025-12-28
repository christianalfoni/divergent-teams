import type { TaskMention, Todo } from "@divergent-teams/shared";
import { DataContext } from "../../contexts/DataContext";
import { DrawerContext } from "../../contexts/DrawerContext";
import { useTask } from "../../hooks/useTask";
import { RichTextDisplay } from "../SmartEditor";
import { useState } from "rask-ui";
import TodoItem from "../TodoItem";
import { TodoConversation } from "../TodoConversation";
import { Timestamp } from "firebase/firestore";

type TaskContentProps = {
  task: TaskMention;
  onClose: () => void;
};

export function TaskContent(props: TaskContentProps) {
  const data = DataContext.use();
  const drawer = DrawerContext.use();
  const taskState = useTask(props.task.taskId);

  const state = useState({});

  function handleTodoClick(taskId: string, todo: Todo) {
    // Toggle: if clicking the same todo, collapse it
    if (drawer.selectedTodo?.todo.id === todo.id) {
      drawer.setSelectedTodo(taskId, null);
    } else {
      drawer.setSelectedTodo(taskId, todo);
    }
  }

  // Mock todos for the task - in the future this will come from the backend
  function getMockTodosForTask(taskId: string): Todo[] {
    const now = Timestamp.now();
    return [
      {
        id: `${taskId}-todo-1`,
        userId: "mock-user-1",
        richText: {
          text: "Research best practices and patterns",
          resources: [],
        },
        completed: true,
        isAccepted: true,
        date: now,
        position: "0",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `${taskId}-todo-2`,
        userId: "mock-user-1",
        richText: { text: "Implement initial version", resources: [] },
        completed: false,
        isAccepted: true,
        date: now,
        position: "1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `${taskId}-todo-3`,
        userId: "mock-user-1",
        richText: { text: "Write unit tests", resources: [] },
        completed: false,
        isAccepted: true,
        date: now,
        position: "2",
        createdAt: now,
        updatedAt: now,
      },
    ];
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

    return <RichTextDisplay value={taskState.value.details} />;
  }

  function renderTeamName() {
    const team = data.mentions.teams.find((t) => t.id === props.task.teamId);
    return team ? team.name : "Unknown Team";
  }

  function handleBackToTeam() {
    const team = data.mentions.teams.find((t) => t.id === props.task.teamId);
    if (team) {
      drawer.open({ type: "team", team });
    }
  }

  const mockTodos = getMockTodosForTask(props.task.taskId);

  return () => (
    <div class="relative flex h-full bg-white shadow-xl dark:bg-gray-800 dark:after:absolute dark:after:inset-y-0 dark:after:left-0 dark:after:w-px dark:after:bg-white/10">
      {/* Main content area */}
      <div
        class="flex flex-col flex-shrink-0 overflow-y-auto"
        style={{ width: "448px" }}
      >
        {/* Breadcrumb */}
        <div class="bg-white px-4 py-3 border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <button
            onClick={handleBackToTeam}
            class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            <span>Back to {renderTeamName()}</span>
          </button>
        </div>

        {/* Header */}
        <div class="bg-gray-50 px-4 py-6 sm:px-6 dark:bg-gray-800/50">
          <div class="flex items-start justify-between space-x-3">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 flex-none rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <svg
                  class="w-7 h-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
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
              {mockTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggleTodoComplete={() => {}}
                  onClick={() => handleTodoClick(props.task.taskId, todo)}
                  isActive={drawer.selectedTodo?.todo.id === todo.id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TodoConversation panel - always present at full width */}
      <div class="shrink-0 flex flex-col" style={{ width: "672px" }}>
        {drawer.selectedTodo && (
          <TodoConversation width={672} todo={drawer.selectedTodo.todo} />
        )}
      </div>
    </div>
  );
}
