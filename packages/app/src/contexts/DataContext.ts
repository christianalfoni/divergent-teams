import { createContext, useDerived, useLookup, useView } from "rask-ui";
import { FirebaseContext } from "./FirebaseContext";
import type {
  Mention,
  Todo,
  UserMention,
  TeamMention,
} from "@divergent-teams/shared";
import { AuthenticationContext } from "./AuthenticationContext";
import { useSyncQuery } from "../hooks/useSyncQuery";
import { query, where } from "firebase/firestore";

export const DataContext = createContext(() => {
  let lastMentionSyncDate = new Date(1900, 1, 1);
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const todos = useSyncQuery<Todo>(() => {
    if (!authentication.user) {
      return null;
    }

    const todosCollection = firebase.collections.todos(
      authentication.user.organizationId
    );

    return query(
      todosCollection,
      where("userId", "==", authentication.user.id)
    );
  });
  const mentions = useSyncQuery<Mention>(
    () => {
      if (!authentication.user) {
        return null;
      }

      const mentionsCollection = firebase.collections.mentions(
        authentication.user.organizationId
      );

      return query(
        mentionsCollection,
        where("updatedAt", ">", lastMentionSyncDate)
      );
    },
    (update) => {
      lastMentionSyncDate = update.data.updatedAt.toDate();
    }
  );

  const derived = useDerived({
    isLoading: () => todos.isLoading || mentions.isLoading,
    todos: () => todos.data,
    mentions: () =>
      mentions.data.reduce<{ users: UserMention[]; teams: TeamMention[] }>(
        (aggr, mention) => {
          if (mention.type === "user") {
            aggr.users.push(mention);
          } else if (mention.type === "team") {
            aggr.teams.push(mention);
          }
          return aggr;
        },
        {
          users: [],
          teams: [],
        }
      ),
  });
  const lookupUserMention = useLookup(() => derived.mentions.users, "userId");

  return useView(derived, { lookupUserMention });
});
