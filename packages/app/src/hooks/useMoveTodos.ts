import { useAction, useView } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { doc, serverTimestamp, updateDoc, Timestamp } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { DataContext } from "../contexts/DataContext";

export function useMoveTodos() {
  const firebase = FirebaseContext.use();
  const authentication = AuthenticationContext.use();
  const data = DataContext.use();

  const [state, moveToDate] = useAction(
    async (params: { todoIds: string[]; targetDate: Date }) => {
      if (!authentication.user) {
        throw new Error("You are not authenticated");
      }

      const { todoIds, targetDate } = params;

      // Update todos in parallel
      const updatePromises = todoIds.map(async (todoId) => {
        const todoRef = doc(
          firebase.collections.todos(authentication.user!.organizationId),
          todoId
        );

        // Update local data first for optimistic UI
        const todo = data.todos.find((t) => t.id === todoId);
        if (todo) {
          todo.date = Timestamp.fromDate(targetDate);
          todo.moveCount = (todo.moveCount || 0) + 1;
        }

        // Update Firebase
        await updateDoc(todoRef, {
          date: Timestamp.fromDate(targetDate),
          moveCount: (todo?.moveCount || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      });

      await Promise.all(updatePromises);
    }
  );

  return useView(state, { moveToDate });
}
