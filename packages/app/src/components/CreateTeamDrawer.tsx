import { useState, useRef, useEffect } from "rask-ui";
import { SmartEditor, type SmartEditorApi, type RichText } from "./SmartEditor";
import { MentionsPaletteContext } from "../contexts/MentionsPaletteContext";
import type { UserMention } from "@divergent-teams/shared";

type CreateTeamDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TeamMember = {
  userId: string;
  displayName: string;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function CreateTeamDrawer(props: CreateTeamDrawerProps) {
  const mentionsPalette = MentionsPaletteContext.use();

  const state = useState({
    name: "",
    mission: { text: "", resources: [] } as RichText,
    isVisible: false,
    isAnimating: false,
    teamMembers: [] as TeamMember[],
  });

  const nameInputRef = useRef<HTMLInputElement>();
  const missionEditorRef = useRef<SmartEditorApi>();

  // Handle opening animation
  useEffect(() => {
    if (props.isOpen && !state.isVisible) {
      state.isVisible = true;
      // Trigger animation after mount
      setTimeout(() => {
        state.isAnimating = true;
      }, 10);
      // Focus input after animation starts
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      // Reset form
      state.name = "";
      state.mission = { text: "", resources: [] };
      state.teamMembers = [];
    } else if (!props.isOpen && state.isVisible) {
      // Start closing animation
      state.isAnimating = false;
      // Remove from DOM after animation
      setTimeout(() => {
        state.isVisible = false;
      }, 500);
    }
  });

  const handleCreate = (e: Rask.FormEvent) => {
    e.preventDefault();
    if (state.name.trim() === "") {
      return;
    }
    // Get the latest mission value from the editor
    const missionValue = missionEditorRef.current?.getValue() || state.mission;
    // TODO: Implement team creation logic
    console.log("Create team:", { name: state.name, mission: missionValue });
    props.onClose();
  };

  const handleKeyDown = (e: Rask.KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onClose();
    }
  };

  const handleAddTeamMember = () => {
    mentionsPalette.open((mention) => {
      if (mention && mention.type === "user") {
        // Check if user is already added
        const alreadyAdded = state.teamMembers.some(
          (m) => m.userId === mention.userId
        );
        if (!alreadyAdded) {
          state.teamMembers = [
            ...state.teamMembers,
            {
              userId: mention.userId,
              displayName: mention.displayName,
            },
          ];
        }
      }
    });
  };

  const handleRemoveTeamMember = (userId: string) => {
    state.teamMembers = state.teamMembers.filter((m) => m.userId !== userId);
  };

  return () => {
    if (!state.isVisible) return null;

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
                class={`pointer-events-auto w-screen max-w-2xl transform transition-transform duration-500 ease-in-out ${
                  state.isAnimating ? "translate-x-0" : "translate-x-full"
                }`}
              >
                <form
                  onSubmit={handleCreate}
                  class="relative flex h-full flex-col overflow-y-auto bg-white shadow-xl dark:bg-gray-800 dark:after:absolute dark:after:inset-y-0 dark:after:left-0 dark:after:w-px dark:after:bg-white/10"
                >
                  <div class="flex-1">
                    {/* Header */}
                    <div class="bg-gray-50 px-4 py-6 sm:px-6 dark:bg-gray-800/50">
                      <div class="flex items-start justify-between space-x-3">
                        <div class="space-y-1">
                          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                            New team
                          </h3>
                          <p class="text-sm text-gray-500 dark:text-gray-400">
                            Get started by filling in the information below to
                            create your new team.
                          </p>
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

                    {/* Divider container */}
                    <div class="space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0 dark:sm:divide-white/10">
                      {/* Team name */}
                      <div class="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            for="team-name"
                            class="block text-sm/6 font-medium text-gray-900 sm:mt-1.5 dark:text-white"
                          >
                            Team name
                          </label>
                        </div>
                        <div class="sm:col-span-2">
                          <input
                            ref={nameInputRef}
                            id="team-name"
                            name="team-name"
                            type="text"
                            value={state.name}
                            onInput={(e) => {
                              state.name = (
                                e.target as HTMLInputElement
                              ).value;
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Engineering Team"
                            class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Mission */}
                      <div class="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <label
                            for="team-mission"
                            class="block text-sm/6 font-medium text-gray-900 sm:mt-1.5 dark:text-white"
                          >
                            Mission
                          </label>
                        </div>
                        <div class="sm:col-span-2">
                          <div class="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus-within:outline-indigo-500 min-h-[4.5rem]">
                            <SmartEditor
                              apiRef={missionEditorRef}
                              initialValue={state.mission}
                              placeholder="Build and maintain our core platform..."
                              onKeyDown={handleKeyDown}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Team members */}
                      <div class="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:items-center sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
                        <div>
                          <h3 class="text-sm/6 font-medium text-gray-900 dark:text-white">
                            Team Members
                          </h3>
                        </div>
                        <div class="sm:col-span-2">
                          <div class="flex flex-wrap gap-2">
                            {state.teamMembers.map((member) => (
                              <div
                                key={member.userId}
                                class="relative group"
                              >
                                <div
                                  class="inline-flex size-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium outline -outline-offset-1 outline-black/5 dark:bg-indigo-500/20 dark:text-indigo-400 dark:outline-white/10"
                                  title={member.displayName}
                                >
                                  {getInitials(member.displayName)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTeamMember(member.userId)}
                                  class="absolute -top-1 -right-1 size-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={handleAddTeamMember}
                              class="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-white/20 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-white/30 dark:hover:text-gray-200 dark:focus-visible:outline-indigo-500"
                            >
                              <span class="absolute -inset-2" />
                              <span class="sr-only">Add team member</span>
                              <svg
                                aria-hidden="true"
                                class="size-5"
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
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div class="shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6 dark:border-white/10">
                    <div class="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={props.onClose}
                        class="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-gray-100 dark:shadow-none dark:ring-white/5 dark:hover:bg-white/20"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={state.name.trim() === ""}
                        class="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}
