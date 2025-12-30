import { createContext, useState, useView, assignState } from "rask-ui";
import type { Mention } from "@divergent-teams/shared";

export type SearchPaletteMode = "drawer" | "mention";
export type OnSelectMention = (mention: Mention | null) => void;
export type MentionTypeFilter = "user" | "team" | "task" | null;

export const SearchPaletteContext = createContext(() => {
  const state = useState({
    isOpen: false,
    onSelectMention: null as OnSelectMention | null,
    filter: null as MentionTypeFilter,
  });

  return useView(state, { open, close });

  function open(onSelect: OnSelectMention, filter: MentionTypeFilter = null) {
    state.isOpen = true;
    state.filter = filter;
    state.onSelectMention = (mention) => {
      assignState(state, {
        isOpen: false,
        onSelectMention: null,
        filter: null,
      });

      onSelect(mention);
    };
  }

  function close() {
    assignState(state, {
      isOpen: false,
      onSelectMention: null,
      filter: null,
    });
  }
});
