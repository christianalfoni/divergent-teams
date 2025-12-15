/**
 * Conversations trigger
 * Handles creation of todos for new participants when they are added to conversations
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { createOpenAIClient, openaiApiKey } from "./openai-client";
import type { Conversation, Todo, User } from "@divergent-teams/shared";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

// Define the RichText Zod schema
const ResourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tag"),
    tag: z.string(),
  }),
  z.object({
    type: z.literal("user"),
    userId: z.string(),
    display: z.string(),
  }),
  z.object({
    type: z.literal("project"),
    projectId: z.string(),
    display: z.string(),
  }),
  z.object({
    type: z.literal("issue"),
    issueId: z.string(),
    display: z.string(),
  }),
  z.object({
    type: z.literal("link"),
    url: z.string(),
    display: z.string(),
  }),
]);

const RichTextSchema = z.object({
  text: z
    .string()
    .describe(
      "Text with placeholders like [[0]], [[1]] that reference resources by index"
    ),
  resources: z
    .array(ResourceSchema)
    .describe("Array of resources referenced in the text"),
});

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

    // Capture the Conversation ID from the path
    const conversationId = event.params.conversationId;
    const orgId = event.params.orgId;

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

    // Type check: ensure after.data() matches Conversation type
    const conversationData = after.data() as Conversation;
    const ownerUserId = conversationData.participantUserIds[0];
    console.log(
      `Conversation reference type: ${conversationData.reference.type}`
    );
    const db = admin.firestore();

    if (conversationData.reference.type === "todo") {
      const [todo, owner] = await Promise.all([
        db
          .collection("organizations")
          .doc(orgId)
          .collection("todos")
          .doc(conversationData.reference.id)
          .get(),
        db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(ownerUserId)
          .get(),
      ]);
      const todoData = todo.data() as Todo;
      const ownerUserData = owner.data() as User;
      const openai = createOpenAIClient();

      // Process each new participant
      await Promise.all(
        newParticipantUserIds.map(async (userId) => {
          // Fetch the participant user details
          const participantUserDoc = await db
            .collection("organizations")
            .doc(orgId)
            .collection("users")
            .doc(userId)
            .get();
          const participantUser = participantUserDoc.data() as User;

          // Build the prompt for OpenAI
          const originalRichText = todoData.richText;
          const prompt = `You are helping to create a personalized todo item for a user named "${
            participantUser.displayName
          }" (ID: ${userId}).

The original todo was created by "${
            ownerUserData.displayName
          }" and contains the following:

Text: ${originalRichText.text}
Resources: ${JSON.stringify(originalRichText.resources, null, 2)}

The RichText format uses placeholders like [[0]], [[1]], etc. in the text field, which correspond to resources in the resources array by index.

Your task:
1. Analyze the original todo and identify if the user "${
            participantUser.displayName
          }" (ID: ${userId}) is mentioned
2. Rewrite the todo from the perspective of "${
            participantUser.displayName
          }", describing what THEY need to do
3. Keep any relevant mentions, links, or tags from the original
4. Return a valid RichText object with the same format (text with placeholders [[0]], [[1]], etc., and a resources array)

Generate a new RichText object that describes the original intention but from "${
            participantUser.displayName
          }"'s perspective.`;

          // Call OpenAI with structured output using Zod schema
          const completion = await openai.chat.completions.parse({
            model: "gpt-5-nano-2025-08-07",
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant that generates structured RichText objects for todo items.",
              },
              { role: "user", content: prompt },
            ],
            response_format: zodResponseFormat(
              RichTextSchema,
              "RichTextResponse"
            ),
          });

          // Get the parsed RichText (already validated by Zod)
          const generatedRichText = completion.choices[0].message.parsed;

          if (!generatedRichText) {
            throw new Error("Not able to generate todo rich text");
          }

          // Create the new todo document reference
          const newTodoRef = db
            .collection("organizations")
            .doc(orgId)
            .collection("todos")
            .doc();

          const newTodo: Omit<Todo, "id"> = {
            userId: userId,
            richText: generatedRichText,
            completed: false,
            isAccepted: false,
            date: todoData.date,
            position: "a0", // Default position at the top
            conversationId: conversationId,
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
          };

          // Insert into Firestore
          await newTodoRef.set(newTodo);

          console.log(
            `Created todo ${newTodoRef.id} for user ${userId} from conversation ${conversationId}`
          );
        })
      );
    }
  }
);

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
