import { createContext, useState, useView, useMountEffect } from "rask-ui";
import type { Mention } from "@divergent-teams/shared";

export type SearchPaletteMode = "drawer" | "mention";
export type OnSelectMention = (mention: Mention | null) => void;

export const SearchPaletteContext = createContext(() => {
  const state = useState({
    isOpen: false,
    mode: "drawer" as SearchPaletteMode,
    onSelectMention: null as OnSelectMention | null,
  });

  const openForDrawer = () => {
    state.isOpen = true;
    state.mode = "drawer";
    state.onSelectMention = null;
  };

  const openForMention = (onSelect: OnSelectMention) => {
    state.isOpen = true;
    state.mode = "mention";
    state.onSelectMention = (mention) => {
      state.isOpen = false;
      state.onSelectMention = null;
      onSelect(mention);
    };
  };

  const close = () => {
    state.isOpen = false;
    state.onSelectMention = null;
  };

  // Handle CMD + K / CTRL + K keyboard shortcut
  useMountEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (state.isOpen) {
          close();
        } else {
          openForDrawer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  return useView(state, { openForDrawer, openForMention, close });
});
