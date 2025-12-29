import type { TeamMention } from "@divergent-teams/shared";
import { DataContext } from "../../contexts/DataContext";
import { DrawerContext } from "../../contexts/DrawerContext";
import { useTeam } from "../../hooks/useTeam";
import { useTasks } from "../../hooks/useTasks";
import { useAddTask } from "../../hooks/useAddTask";
import { useState, useRef } from "rask-ui";

type TeamContentProps = {
  team: TeamMention;
  onClose: () => void;
};

export function TeamContent(props: TeamContentProps) {
  const data = DataContext.use();
  const drawer = DrawerContext.use();
  const teamState = useTeam(props.team.id);
  const tasksState = useTasks(props.team.id);
  const addTask = useAddTask();
  const inputRef = useRef<HTMLInputElement>();

  const state = useState({
    isAddingTask: false,
    newTaskTitle: "",
  });

  return () => (
    <div
      class="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl dark:bg-gray-800 dark:after:absolute dark:after:inset-y-0 dark:after:left-0 dark:after:w-px dark:after:bg-white/10"
      style={{ width: "448px" }}
    >
      {/* Main content area */}
      <div class="flex flex-col flex-1">
        {/* Header */}
        <div class="bg-gray-50 px-4 py-6 sm:px-6 dark:bg-gray-800/50">
          <div class="flex items-start justify-between space-x-3">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-lg font-semibold">
                {props.team.name.charAt(0)}
              </div>
              <div>
                <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                  {props.team.name}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {props.team.members.length} member
                  {props.team.members.length !== 1 ? "s" : ""}
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
          {/* Team Info */}
          <div class="p-6 space-y-4">
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Mission
              </dt>
              <dd class="mt-2 text-sm text-gray-900 dark:text-white">
                {renderMission()}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created By
              </dt>
              <dd class="mt-2 text-sm text-gray-900 dark:text-white">
                {renderCreatedBy()}
              </dd>
            </div>
          </div>

          <div class="px-6 pb-6">
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
              MEMBERS
            </h3>
            <div class="space-y-2">
              {props.team.members.map((userId) => {
                const user = data.lookupUserMention(userId);
                if (!user) return null;

                return (
                  <div
                    key={userId}
                    class="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-(--color-bg-hover) px-3 py-2 transition-colors"
                    onClick={() => {
                      const userMention = data.lookupUserMention(userId);
                      if (userMention) {
                        drawer.open({ type: "user", user: userMention });
                      }
                    }}
                  >
                    <div class="w-6 h-6 flex-none rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-700 dark:text-yellow-400 text-xs font-semibold">
                      {user.displayName.charAt(0)}
                    </div>
                    <span class="ml-3 flex-auto truncate">
                      {user.displayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div class="px-6 pb-6">
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
              TASKS
            </h3>
            <div class="space-y-2">
              {tasksState.isLoading ? (
                <div class="animate-pulse space-y-2">
                  <div class="h-4 w-full bg-(--color-skeleton) rounded"></div>
                  <div class="h-4 w-3/4 bg-(--color-skeleton) rounded"></div>
                </div>
              ) : (
                <>
                  {tasksState.data.map((task) => {
                    return (
                      <div
                        key={task.id}
                        class="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-(--color-bg-hover) px-3 py-2 transition-colors"
                        onClick={() => handleTaskClick(task.id)}
                      >
                        <div class="w-6 h-6 flex-none rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs font-semibold">
                          {task.title.charAt(0)}
                        </div>
                        <span class="ml-3 flex-auto truncate">
                          {task.title}
                        </span>
                        <span class="ml-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          {task.completedTodosCount}/{task.totalTodosCount}
                        </span>
                      </div>
                    );
                  })}

                  {!state.isAddingTask && (
                    <button
                      onClick={handleAddTaskClick}
                      class="px-2 py-2 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        class="w-4 h-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                      <span class="text-sm">Add task...</span>
                    </button>
                  )}

                  {state.isAddingTask && (
                    <div class="px-2 py-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={state.newTaskTitle}
                        onInput={(e) => {
                          state.newTaskTitle = e.currentTarget.value;
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        placeholder="Task title..."
                        class="w-full px-2 py-1 text-sm border border-(--color-border-secondary) rounded bg-(--color-bg-primary) text-(--color-text-primary) placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function renderMission() {
    if (teamState.error) {
      return (
        <span class="text-red-600 dark:text-red-400">
          {String(teamState.error)}
        </span>
      );
    }

    if (teamState.isLoading) {
      return (
        <div class="animate-pulse space-y-2">
          <div class="h-4 w-full bg-(--color-skeleton) rounded"></div>
          <div class="h-4 w-3/4 bg-(--color-skeleton) rounded"></div>
        </div>
      );
    }

    return teamState.value.mission.text || "No mission statement";
  }

  function renderCreatedBy() {
    if (teamState.error) {
      return null;
    }

    if (teamState.isLoading) {
      return (
        <div class="animate-pulse">
          <div class="h-4 w-32 bg-(--color-skeleton) rounded"></div>
        </div>
      );
    }

    const creator = data.lookupUserMention(teamState.value.createdBy);
    return creator ? creator.displayName : "Unknown";
  }

  function handleAddTaskClick(e: Rask.MouseEvent) {
    e.stopPropagation();
    state.isAddingTask = true;
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleKeyDown(e: Rask.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && state.newTaskTitle.trim()) {
      const title = state.newTaskTitle.trim();
      state.newTaskTitle = "";
      state.isAddingTask = false;

      addTask.add({
        teamId: props.team.id,
        title: title,
      });
    } else if (e.key === "Escape") {
      state.newTaskTitle = "";
      state.isAddingTask = false;
    }
  }

  function handleBlur() {
    const title = state.newTaskTitle.trim();
    state.newTaskTitle = "";
    state.isAddingTask = false;

    if (title) {
      addTask.add({
        teamId: props.team.id,
        title: title,
      });
    }
  }

  function handleTaskClick(taskId: string) {
    const taskMention = data.mentions.tasks.find((t) => t.taskId === taskId);
    if (taskMention) {
      drawer.open({ type: "task", task: taskMention });
    }
  }
}
