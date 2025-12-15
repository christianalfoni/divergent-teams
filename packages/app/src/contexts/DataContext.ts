import { createContext, useAsync, useDerived, useEffect } from "rask-ui";
import { FirebaseContext } from "./FirebaseContext";
import type { Mention, Todo } from "@divergent-teams/shared";
import { AuthenticationContext } from "./AuthenticationContext";
import { useSyncQuery } from "../hooks/useSyncQuery";
import { query, where } from "firebase/firestore";

export const DataContext = createContext(() => {
  let lastMentionSyncDate = new Date(1900, 1, 1);
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
  const mentions = useSyncQuery<Mention>(
    () => {
      if (!authentication.user) {
        return null;
      }

      const mentionsCollection = firebase.collections.mentions(
        authentication.user.organizationId
      );

      return query(
        mentionsCollection,
        where("updatedAt", ">", lastMentionSyncDate)
      );
    },
    (update) => {
      lastMentionSyncDate = update.data.updatedAt.toDate();
    }
  );

  return useDerived({
    isLoading: () => todos.isLoading || mentions.isLoading,
    todos: () => todos.data,
    mentions: () => mentions.data,
  });
});
