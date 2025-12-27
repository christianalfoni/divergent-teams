import { FirebaseContext } from "../contexts/FirebaseContext";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import type { Task } from "@divergent-teams/shared";
import { query, where } from "firebase/firestore";
import { useSyncQuery } from "./useSyncQuery";

export function useTasks(teamId: string) {
  const firebase = FirebaseContext.use();
  const authentication = AuthenticationContext.use();

  return useSyncQuery<Task>(() => {
    if (!authentication.user) {
      return null;
    }

    const tasksCollection = firebase.collections.tasks(
      authentication.user.organizationId
    );

    return query(tasksCollection, where("teamId", "==", teamId));
  });
}
