import { createContext, useState, useView, useMountEffect } from "rask-ui";

export type CommandAction = {
  id: string;
  name: string;
  icon?: Rask.Component<{ className?: string }>;
  shortcut?: string;
  category?: string;
  onSelect: () => void;
};

export const CommandPaletteContext = createContext(() => {
  const state = useState({
    isOpen: false,
    actions: [] as CommandAction[],
  });

  const open = () => {
    state.isOpen = true;
  };

  const close = () => {
    state.isOpen = false;
  };

  const registerAction = (action: CommandAction) => {
    state.actions = [...state.actions, action];
  };

  const unregisterAction = (actionId: string) => {
    state.actions = state.actions.filter((a) => a.id !== actionId);
  };

  // Handle CMD + K / CTRL + K keyboard shortcut
  useMountEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (state.isOpen) {
          close();
        } else {
          open();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return useView(state, { open, close, registerAction, unregisterAction });
});
