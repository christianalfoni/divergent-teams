import { useAction, useView } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import type { Todo } from "@divergent-teams/shared";
import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { DataContext } from "../contexts/DataContext";
import type { RichText } from "../components/SmartEditor";

export function useAddTodo() {
  const firebase = FirebaseContext.use();
  const authentication = AuthenticationContext.use();
  const data = DataContext.use();

  const [state, add] = useAction(
    async (params: { richText: RichText; date: Date; position: string }) => {
      if (!authentication.user) {
        throw new Error("You are not authenticated");
      }

      const newTodoDoc = doc(
        firebase.collections.todos(authentication.user.organizationId)
      );
      const todo: Todo = {
        id: newTodoDoc.id,
        completed: false,
        isAccepted: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        date: Timestamp.fromDate(params.date),
        richText: params.richText,
        position: params.position,
        userId: authentication.user.id,
      };

      data.todos.push(todo);

      const { id: _, ...todoData } = todo;

      await setDoc(newTodoDoc, {
        ...todoData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  );

  return useView(state, { add });
}
