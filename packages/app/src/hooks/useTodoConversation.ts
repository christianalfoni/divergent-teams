import { useAction } from "rask-ui";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { useSyncQuery } from "./useSyncQuery";
import type { Conversation, Message, Todo } from "@divergent-teams/shared";
import type { RichText } from "../components/SmartEditor";
import {
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

export function useTodoConversation(todo: Todo) {
  const authentication = AuthenticationContext.use();
  const firebase = FirebaseContext.use();
  const messages = useSyncQuery<Message>(() => {
    if (!authentication.user || !todo.conversationId) {
      return null;
    }

    const messagesCollection = firebase.collections.conversationMessages(
      authentication.user.organizationId,
      todo.conversationId
    );

    return query(messagesCollection, orderBy("createdAt", "asc"));
  });
  const [submitMessageState, submitMessage] = useAction(
    async (richText: RichText) => {
      if (!authentication.user) {
        throw new Error("You have to be authenticated to submit a message");
      }

      const conversationsCollection = firebase.collections.conversations(
        authentication.user.organizationId
      );
      const isFirstMessage = !todo.conversationId;

      // Create conversation if needed
      if (!todo.conversationId) {
        const todosCollection = firebase.collections.todos(
          authentication.user.organizationId
        );
        const conversationDoc = doc(conversationsCollection);
        const todoDoc = doc(todosCollection, todo.id);

        const conversation: Conversation = {
          id: conversationDoc.id,
          createdAt: Timestamp.now(),
          reference: {
            type: "todo",
            id: todo.id,
          },
        };

        const { id: _, ...conversationData } = conversation;
        todo.conversationId = conversation.id;

        await Promise.all([
          setDoc(conversationDoc, {
            ...conversationData,
            createdAt: serverTimestamp(),
          }),
          updateDoc(todoDoc, {
            conversationId: conversation.id,
          }),
        ]);
      }

      // Create the message
      const messagesCollection = firebase.collections.conversationMessages(
        authentication.user.organizationId,
        todo.conversationId
      );
      const messageDoc = doc(messagesCollection);
      const message: Message = {
        id: messageDoc.id,
        createdAt: Timestamp.now(),
        richText,
        userId: authentication.user.id,
        isFirstMessage,
      };

      messages.data.push(message);

      await setDoc(messageDoc, {
        userId: message.userId,
        richText: message.richText,
        isFirstMessage: message.isFirstMessage,
        createdAt: serverTimestamp(),
      });
    }
  );

  return {
    messages,
    submitMessage,
    submitMessageState,
  };
}
