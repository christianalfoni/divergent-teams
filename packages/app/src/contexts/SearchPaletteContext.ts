import { createContext, useState, useView, assignState } from "rask-ui";
import type { Mention } from "@divergent-teams/shared";

export type SearchPaletteMode = "drawer" | "mention";
export type OnSelectMention = (mention: Mention | null) => void;

export const SearchPaletteContext = createContext(() => {
  const state = useState({
    isOpen: false,
    onSelectMention: null as OnSelectMention | null,
  });

  return useView(state, { open, close });

  function open(onSelect: OnSelectMention) {
    state.isOpen = true;
    state.onSelectMention = (mention) => {
      assignState(state, {
        isOpen: false,
        onSelectMention: null,
      });

      onSelect(mention);
    };
  }

  function close() {
    assignState(state, {
      isOpen: false,
      onSelectMention: null,
    });
  }
});
