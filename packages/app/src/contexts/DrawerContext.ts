import type { TeamMention, UserMention } from "@divergent-teams/shared";
import { assignState, createContext, useState, useView } from "rask-ui";
import { BackdropContext } from "./BackdropContext";

export type DrawerContent =
  | { type: "user"; user: UserMention }
  | { type: "team"; team: TeamMention }
  | { type: "createTeam" };

export const DrawerContext = createContext(() => {
  const backdrop = BackdropContext.use();
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
    backdrop.close();
    state.isOpen = false;
  }
});
