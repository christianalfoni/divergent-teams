import type { Todo } from "@divergent-teams/shared";
import { query, where } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { useSyncQuery } from "./useSyncQuery";

export function useTaskTodos(taskId: string) {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();

  return useSyncQuery<Todo>(() => {
    if (!authentication.user) {
      return null;
    }
    const todosCollection = firebase.collections.todos(
      authentication.user.organizationId
    );

    // Query for todos that contain a task resource with the matching taskId
    // This uses exact object matching with array-contains
    return query(
      todosCollection,
      where("richText.resources", "array-contains", {
        type: "task",
        taskId: taskId,
      })
    );
  });
}
