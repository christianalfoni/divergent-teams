import { useAsync } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import type { User } from "@divergent-teams/shared";

export function useUser(userId: string) {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const [userState] = useAsync(async () => {
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
