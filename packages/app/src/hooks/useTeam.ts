import { useAsync } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { doc, getDoc } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { type Team } from "@divergent-teams/shared";

export function useTeam(teamId: string) {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const [teamState] = useAsync(async () => {
    if (!authentication.user) {
      throw new Error("No user authenticated");
    }

    const teamDoc = doc(
      firebase.collections.teams(authentication.user.organizationId),
      teamId
    );
    const team = await getDoc(teamDoc);
    const data = team.data();

    if (!data) {
      throw new Error("Team not found");
    }

    return data as Team;
  });

  return teamState;
}
