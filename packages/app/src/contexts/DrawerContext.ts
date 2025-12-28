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
    content: null as DrawerContent | null,
    selectedTodo: null as { taskId: string; todo: Todo } | null,
  });

  return useView(state, { open, close, setSelectedTodo });

  function open(content: DrawerContent) {
    assignState(state, {
      isOpen: true,
      content,
      selectedTodo: null,
    });
  }

  function close() {
    backdrop.close();
    state.isOpen = false;
    state.selectedTodo = null;
  }

  function setSelectedTodo(taskId: string, todo: Todo | null) {
    if (todo) {
      state.selectedTodo = { taskId, todo };
    } else {
      state.selectedTodo = null;
    }
  }
});
