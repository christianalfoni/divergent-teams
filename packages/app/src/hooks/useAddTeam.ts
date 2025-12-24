import { useAction, useView } from "rask-ui";
import { FirebaseContext } from "../contexts/FirebaseContext";
import type { RichText, Team } from "@divergent-teams/shared";
import { doc, setDoc } from "firebase/firestore";
import { AuthenticationContext } from "../contexts/AuthenticationContext";

export function useAddTeam() {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const [state, add] = useAction(
    async (params: { name: string; mission: RichText; members: string[] }) => {
      if (!authentication.user) {
        throw new Error("Can not create team without a user");
      }

      const teamDoc = doc(
        firebase.collections.teams(authentication.user.organizationId)
      );
      const team: Team = {
        id: teamDoc.id,
        name: params.name,
        mission: params.mission,
        members: params.members,
        createdBy: authentication.user.id,
      };
      const { id: _, ...teamData } = team;

      await setDoc(teamDoc, teamData);

      return { success: true };
    }
  );

  return useView(state, { add });
}
