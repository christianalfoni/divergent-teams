import { assignState, createContext, useEffect, useState } from "rask-ui";
import { FirebaseContext } from "./FirebaseContext";
import type { Todo } from "../types";
import { collection, onSnapshot } from "firebase/firestore";
import { AuthenticationContext } from "./AuthenticationContext";

export const DataContext = createContext(() => {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const state = useState({
    todos: [] as Todo[],
  });

  useEffect(() => {
    if (!authentication.user) {
      return;
    }

    const todosCollection = collection(
      firebase.firestore,
      "organizations",
      authentication.user.organizationId,
      "todos"
    );

    return onSnapshot(todosCollection, (snapshot) => {
      snapshot.docChanges().forEach((docChange) => {
        const todoData = docChange.doc.data() as Todo;

        switch (docChange.type) {
          case "added": {
            state.todos.push(todoData);
            break;
          }
          case "modified": {
            const todo = state.todos.find((todo) => todo.id === todoData.id);
            if (todo) {
              assignState(todo, todoData);
            } else {
              state.todos.push(todoData);
            }
            break;
          }
          case "removed": {
            const index = state.todos.findIndex(
              (todo) => todo.id === todoData.id
            );
            state.todos.splice(index, 1);
            break;
          }
        }
      });
    });
  });

  return state;
});
