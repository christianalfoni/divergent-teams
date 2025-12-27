import { FirebaseContext } from "../contexts/FirebaseContext";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import type { User } from "@divergent-teams/shared";
import { useCache } from "./useCache";

export function useUser(userId: string) {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const userState = useCache(userId, async () => {
    if (!authentication.user) {
      throw new Error("No user authenticated");
    }

    const teamDoc = doc(
      firebase.collections.users(authentication.user.organizationId),
      userId
    );
    const team = await getDoc(teamDoc);
    const data = team.data();

    if (!data) {
      throw new Error("User not found");
    }

    return data as User;
  });

  return userState;
}
