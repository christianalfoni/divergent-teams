import { useAction, useView } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { doc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { DataContext } from "../contexts/DataContext";

export function useToggleTodo() {
  const firebase = FirebaseContext.use();
  const authentication = AuthenticationContext.use();
  const data = DataContext.use();

  const [state, toggle] = useAction(
    async (params: { todoId: string; completed: boolean }) => {
      if (!authentication.user) {
        throw new Error("You are not authenticated");
      }

      const { todoId, completed } = params;

      // Update local data first for optimistic UI
      const todo = data.todos.find((t) => t.id === todoId);
      if (todo) {
        todo.completed = completed;
        todo.updatedAt = Timestamp.now();

        if (completed) {
          todo.completedAt = Timestamp.now();
        } else {
          delete todo.completedAt;
          delete todo.completedWithTimeBox;
        }
      }

      // Update Firebase
      const todoRef = doc(
        firebase.collections.todos(authentication.user.organizationId),
        todoId
      );

      const updateData: Record<string, any> = {
        completed,
        updatedAt: serverTimestamp(),
      };

      if (completed) {
        updateData.completedAt = serverTimestamp();
      } else {
        updateData.completedAt = null;
        updateData.completedWithTimeBox = null;
      }

      await updateDoc(todoRef, updateData);
    }
  );

  return useView(state, { toggle });
}
