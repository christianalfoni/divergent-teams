import { useAction, useState } from "rask-ui";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { FirebaseContext } from "../contexts/FirebaseContext";
import { useSyncQuery } from "./useSyncQuery";
import type { Conversation, Message, Todo } from "@divergent-teams/shared";
import type { RichText } from "../components/SmartEditor";
import {
  doc,
  runTransaction,
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

    return firebase.collections.conversationMessages(
      authentication.user.organizationId,
      todo.conversationId
    );
  });
  const [submitMessageState, submitMessage] = useAction(
    async (richText: RichText) => {
      if (!authentication.user) {
        throw new Error("You have to be authenticated to submit a message");
      }

      let createConversation: (() => void) | undefined;

      if (!todo.conversationId) {
        const conversationsCollection = firebase.collections.conversations(
          authentication.user.organizationId
        );
        const todosCollection = firebase.collections.todos(
          authentication.user.organizationId
        );
        const conversationDoc = doc(conversationsCollection);
        const todoDoc = doc(todosCollection, todo.id);
        const conversation: Conversation = {
          id: conversationDoc.id,
          createdAt: Timestamp.now(),
          participantUserIds: [authentication.user.id],
        };
        const { id: _, ...conversationData } = conversation;
        todo.conversationId = conversation.id;
        createConversation = () =>
          Promise.all([
            setDoc(conversationDoc, {
              ...conversationData,
              createdAt: serverTimestamp(),
            }),
            updateDoc(todoDoc, {
              conversationId: conversation.id,
            }),
          ]);
      }

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
      };

      messages.data.push(message);

      await createConversation?.();

      await setDoc(messageDoc, {
        userId: message.userId,
        richText: message.richText,
        createdAt: serverTimestamp(),
      });
    }
  );

  return { messages, submitMessage, submitMessageState };
}
