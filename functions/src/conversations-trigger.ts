/**
 * Conversations trigger
 * Handles creation of todos for new participants when they are added to conversations
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { openaiApiKey, createOpenAIClient } from "./openai-client";

const db = admin.firestore();

/**
 * Determines which user IDs are new based on before/after snapshots
 * For new conversations: returns all participant IDs except the first (creator)
 * For updates: returns participant IDs that weren't in the previous snapshot
 */
function getNewParticipantUserIds(
  before: admin.firestore.DocumentSnapshot | undefined,
  after: admin.firestore.DocumentSnapshot
): string[] {
  const afterData = after.data();
  const participantUserIds: string[] = afterData?.participantUserIds || [];

  // If this is a new conversation (onCreate)
  if (!before || !before.exists) {
    // Skip the first user ID (creator), return the rest
    return participantUserIds.slice(1);
  }

  // If this is an update (onUpdate)
  const beforeData = before.data();
  const previousParticipantUserIds: string[] =
    beforeData?.participantUserIds || [];

  // Find user IDs that are in 'after' but not in 'before'
  return participantUserIds.filter(
    (userId) => !previousParticipantUserIds.includes(userId)
  );
}

/**
 * onDocumentWritten trigger for conversations
 * Creates todos for new participants added to conversations
 */
export const onConversationChange = onDocumentWritten(
  {
    document: "organizations/{orgId}/conversations/{conversationId}",
    region: "us-central1",
    secrets: [openaiApiKey], // Inject the OpenAI API key secret
  },
  async (event) => {
    // Guard clause for event data
    if (!event.data) {
      return;
    }

    // Capture the Org ID and Conversation ID from the path
    const orgId = event.params.orgId as string;
    const conversationId = event.params.conversationId as string;

    const before = event.data.before;
    const after = event.data.after;

    // Get the list of new participant user IDs
    const newParticipantUserIds = getNewParticipantUserIds(before, after);

    // If there are no new participants, exit early
    if (newParticipantUserIds.length === 0) {
      return;
    }

    console.log(
      `Processing ${newParticipantUserIds.length} new participants for conversation ${conversationId}`
    );

    // TODO: Use OpenAI to generate todo content if needed
    // const openai = createOpenAIClient();
    // const completion = await openai.chat.completions.create({
    //   model: "gpt-5-nano-2025-08-07",
    //   messages: [{ role: "user", content: "..." }],
    // });

    // Process each new participant
    for (const userId of newParticipantUserIds) {
      // TODO: Create a todo for this user
      // Use a composite document ID (userId_conversationId) for idempotency
      // This ensures retries don't create duplicate todos
      //
      // const todoId = `${userId}_${conversationId}`;
      // const todoRef = db
      //   .collection('organizations')
      //   .doc(orgId)
      //   .collection('todos')
      //   .doc(todoId);
      //
      // await todoRef.set({
      //   userId: userId,
      //   conversationId: conversationId,
      //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
      //   // ... other todo fields
      // }, { merge: true });

      console.log(
        `Would create todo for user ${userId} in conversation ${conversationId}`
      );
    }
  }
);
