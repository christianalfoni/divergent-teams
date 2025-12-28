import { useAsync } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { type Task } from "@divergent-teams/shared";

export function useTask(taskId: string) {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const [taskState] = useAsync(async () => {
    if (!authentication.user) {
      throw new Error("No user authenticated");
    }

    const taskDoc = doc(
      firebase.collections.tasks(authentication.user.organizationId),
      taskId
    );
    const task = await getDoc(taskDoc);
    const data = task.data();

    if (!data) {
      throw new Error("Task not found");
    }

    return data as Task;
  });

  return taskState;
}
