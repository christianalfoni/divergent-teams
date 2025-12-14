import { createContext, useDerived } from "rask-ui";
import { FirebaseContext } from "./FirebaseContext";
import type { Todo } from "../types";
import { AuthenticationContext } from "./AuthenticationContext";
import { useSyncQuery } from "../hooks/useSyncQuery";
import { query, where } from "firebase/firestore";

export const DataContext = createContext(() => {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const todos = useSyncQuery<Todo>(() => {
    if (!authentication.user) {
      return null;
    }

    const todosCollection = firebase.collections.todos(
      authentication.user.organizationId
    );

    return query(
      todosCollection,
      where("userId", "==", authentication.user.id)
    );
  });

  return useDerived({
    isLoading: () => todos.isLoading,
    todos: () => todos.data,
  });
});
