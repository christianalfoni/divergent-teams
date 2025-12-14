import { useAction, useView } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import type { Todo } from "../types";
import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { DataContext } from "../contexts/DataContext";

export function useAddTodo() {
  const firebase = FirebaseContext.use();
  const authentication = AuthenticationContext.use();
  const data = DataContext.use();

  const [state, add] = useAction(
    async (params: { description: string; date: Date; position: string }) => {
      if (!authentication.user) {
        throw new Error("You are not authenticated");
      }

      const newTodoDoc = doc(
        firebase.collections.todos(authentication.user.organizationId)
      );
      const todo: Todo = {
        id: newTodoDoc.id,
        completed: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        date: Timestamp.fromDate(params.date),
        description: params.description,
        position: params.position,
        userId: authentication.user.id,
      };

      data.todos.push(todo);

      await setDoc(newTodoDoc, {
        ...todo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  );

  return useView(state, { add });
}
