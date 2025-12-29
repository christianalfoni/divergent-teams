import type {
  TeamMention,
  UserMention,
  TaskMention,
  Todo,
} from "@divergent-teams/shared";
import { assignState, createContext, useState, useView } from "rask-ui";
import { BackdropContext } from "./BackdropContext";

export type DrawerContent =
  | { type: "user"; user: UserMention }
  | { type: "team"; team: TeamMention }
  | { type: "task"; task: TaskMention }
  | { type: "createTeam" };

export const DrawerContext = createContext(() => {
  const backdrop = BackdropContext.use();
  const state = useState({
    isOpen: false,
    isExpanded: false,
    content: null as DrawerContent | null,
  });

  return useView(state, { open, close, expand, collapse });

  function open(content: DrawerContent) {
    assignState(state, {
      isOpen: true,
      isExpanded: false,
      content,
    });
  }

  function close() {
    backdrop.close();
    state.isOpen = false;
    state.isExpanded = false;
  }

  function expand() {
    state.isExpanded = true;
  }

  function collapse() {
    state.isExpanded = false;
  }
});
