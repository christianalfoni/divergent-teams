import type { TeamMention, UserMention } from "@divergent-teams/shared";
import { assignState, createContext, useState, useView } from "rask-ui";

export type DrawerContent =
  | { type: "user"; user: UserMention }
  | { type: "team"; team: TeamMention }
  | { type: "createTeam" };

export const DrawerContext = createContext(() => {
  const state = useState({
    isOpen: false,
    content: null as DrawerContent | null,
  });

  return useView(state, { open, close });

  function open(content: DrawerContent) {
    assignState(state, {
      isOpen: true,
      content,
    });
  }

  function close() {
    state.isOpen = false;
  }
});
