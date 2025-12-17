import { useState, useRef, useEffect } from "rask-ui";
import { SmartEditor, type SmartEditorApi, type RichText } from "./SmartEditor";

type CreateTeamModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateTeamModal(props: CreateTeamModalProps) {
  const state = useState({
    name: "",
    mission: { text: "", resources: [] } as RichText,
  });

  const nameInputRef = useRef<HTMLInputElement>();

  const missionEditorRef = useRef<SmartEditorApi>();

  // Focus name input when modal opens and reset fields
  useEffect(() => {
    if (props.isOpen && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 0);
      state.name = "";
      state.mission = { text: "", resources: [] };
    }
  });

  const handleCreate = () => {
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

  return () => {
    if (!props.isOpen) return null;

    return (
      <div class="relative z-10">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity dark:bg-gray-900/50" />
        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 dark:bg-gray-800">
                <div class="sm:flex sm:items-start">
                  <div class="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:size-10 dark:bg-indigo-500/10">
                    <svg
                      aria-hidden="true"
                      class="size-6 text-indigo-600 dark:text-indigo-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                      />
                    </svg>
                  </div>
                  <div class="mt-3 w-full sm:mt-0 sm:ml-4">
                    <div class="space-y-4">
                      {/* Team Name */}
                      <div>
                        <label
                          for="team-name"
                          class="block text-xs font-medium text-gray-900 dark:text-gray-200 mb-2"
                        >
                          Name
                        </label>
                        <input
                          ref={nameInputRef}
                          id="team-name"
                          name="team-name"
                          type="text"
                          value={state.name}
                          onInput={(e) => {
                            state.name = (e.target as HTMLInputElement).value;
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder="Engineering Team"
                          class="block w-full text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6 dark:text-white dark:placeholder:text-gray-500"
                        />
                      </div>

                      {/* Mission */}
                      <div>
                        <label
                          for="team-mission"
                          class="block text-xs font-medium text-gray-900 dark:text-gray-200 mb-2"
                        >
                          Mission
                        </label>
                        <SmartEditor
                          className="text-gray-900 sm:text-sm/6 dark:text-white"
                          apiRef={missionEditorRef}
                          initialValue={state.mission}
                          placeholder="Build and maintain our core platform..."
                          onKeyDown={handleKeyDown}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-700/25">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={state.name.trim() === ""}
                  class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 sm:ml-3 sm:w-auto dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={props.onClose}
                  class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/5 dark:hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}
