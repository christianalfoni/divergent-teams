import { useState, useEffect } from "rask-ui";
import type { UserMention } from "@divergent-teams/shared";
import { useUser } from "../hooks/useUser";

type UserDrawerProps = {
  isOpen: boolean;
  user: UserMention | null;
  onClose: () => void;
};

export function UserDrawer(props: UserDrawerProps) {
  const userState = props.user ? useUser(props.user.userId) : null;
  const state = useState({
    isVisible: false,
    isAnimating: false,
  });

  // Handle opening animation
  useEffect(() => {
    if (props.isOpen && !state.isVisible) {
      state.isVisible = true;
      // Trigger animation after mount
      setTimeout(() => {
        state.isAnimating = true;
      }, 10);
    } else if (!props.isOpen && state.isVisible) {
      // Start closing animation
      state.isAnimating = false;
      // Remove from DOM after animation
      setTimeout(() => {
        state.isVisible = false;
      }, 500);
    }
  });

  function renderJoinedAt() {
    if (!userState) return null;

    if (userState.error) {
      return null;
    }

    if (userState.isLoading) {
      return (
        <div class="animate-pulse mt-2">
          <div class="h-4 w-32 bg-(--color-skeleton) rounded mx-auto"></div>
        </div>
      );
    }

    return (
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Joined {userState.value.createdAt.toDate().toLocaleDateString()}
      </p>
    );
  }

  function renderEmail() {
    if (!userState) return null;

    if (userState.error) {
      return (
        <span class="text-red-600 dark:text-red-400">
          {String(userState.error)}
        </span>
      );
    }

    if (userState.isLoading) {
      return (
        <div class="animate-pulse">
          <div class="h-4 w-48 bg-(--color-skeleton) rounded"></div>
        </div>
      );
    }

    return (
      <a
        href={`mailto:${userState.value.email}`}
        class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-mono"
      >
        {userState.value.email}
      </a>
    );
  }

  return () => {
    if (!state.isVisible || !props.user) return null;

    return (
      <div class="relative z-10">
        {/* Backdrop */}
        <div
          class={`fixed inset-0 bg-gray-500/75 transition-opacity duration-500 dark:bg-gray-900/50 ${
            state.isAnimating ? "opacity-100" : "opacity-0"
          }`}
          onClick={props.onClose}
        />

        <div class="fixed inset-0 overflow-hidden">
          <div class="absolute inset-0 overflow-hidden">
            <div class="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <div
                class={`pointer-events-auto w-screen max-w-md transform transition-transform duration-500 ease-in-out ${
                  state.isAnimating ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <div class="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl dark:bg-gray-800 dark:after:absolute dark:after:inset-y-0 dark:after:left-0 dark:after:w-px dark:after:bg-white/10">
                  {/* Header */}
                  <div class="bg-gray-50 px-4 py-6 sm:px-6 dark:bg-gray-800/50">
                    <div class="flex items-start justify-between space-x-3">
                      <div class="space-y-1">
                        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                          User Profile
                        </h3>
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
                  <div class="flex-1 p-6">
                    <div class="text-center">
                      <div class="mx-auto w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-2xl">
                        {props.user.displayName.charAt(0)}
                      </div>
                      <h2 class="mt-3 font-semibold text-gray-900 dark:text-white">
                        {props.user.displayName}
                      </h2>
                      {renderJoinedAt()}
                    </div>

                    {/* User Info */}
                    <div class="mt-8 space-y-4">
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Email
                        </dt>
                        <dd class="mt-2 text-sm text-gray-900 dark:text-white">
                          {renderEmail()}
                        </dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}
