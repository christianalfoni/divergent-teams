import { createContext, useState, useView } from "rask-ui";
import type { Mention } from "../types";

export type OnSelectMention = (mention: Mention | null) => void;

export const MentionsContext = createContext(() => {
  const state = useState({
    isOpen: false,
    onSelect: null as OnSelectMention | null,
  });

  const open = (onSelect: OnSelectMention) => {
    state.isOpen = true;
    state.onSelect = (mention) => {
      state.isOpen = false;
      state.onSelect = null;
      onSelect(mention);
    };
  };

  return useView(state, { open });
});
