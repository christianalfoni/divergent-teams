import { useAction, useView } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import type { Task } from "@divergent-teams/shared";
import { doc, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import type { RichText } from "../components/SmartEditor";

export function useAddTask() {
  const firebase = FirebaseContext.use();
  const authentication = AuthenticationContext.use();

  const [state, add] = useAction(
    async (params: { teamId: string; title: string; details?: RichText }) => {
      if (!authentication.user) {
        throw new Error("You are not authenticated");
      }

      const newTaskDoc = doc(
        firebase.collections.tasks(authentication.user.organizationId)
      );
      const task: Task = {
        id: newTaskDoc.id,
        teamId: params.teamId,
        title: params.title,
        details: params.details,
        completedTodosCount: 0,
        totalTodosCount: 0,
        completed: false,
        createdBy: authentication.user.id,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const { id: _, ...taskData } = task;

      // Remove undefined details field if not provided
      const dataToSave: Record<string, any> = {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (params.details === undefined) {
        delete dataToSave.details;
      }

      await setDoc(newTaskDoc, dataToSave);

      return task;
    }
  );

  return useView(state, { add });
}
