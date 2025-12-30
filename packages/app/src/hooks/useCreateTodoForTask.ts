import { useAction, useView } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import type { Todo } from "@divergent-teams/shared";
import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { DataContext } from "../contexts/DataContext";
import type { RichText } from "../components/SmartEditor";

export function useCreateTodoForTask() {
  const firebase = FirebaseContext.use();
  const authentication = AuthenticationContext.use();
  const data = DataContext.use();

  const [state, create] = useAction(
    async (params: {
      userId: string;
      richText: RichText;
      date: Date;
      isGenerated: boolean;
    }) => {
      if (!authentication.user) {
        throw new Error("You are not authenticated");
      }

      const newTodoDoc = doc(
        firebase.collections.todos(authentication.user.organizationId)
      );

      await setDoc(newTodoDoc, {
        completed: false,
        isGenerated: params.isGenerated,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        date: Timestamp.fromDate(params.date),
        richText: params.richText,
        position: "a0", // Default position at the top
        userId: params.userId,
      });
    }
  );

  return useView(state, { create });
}
