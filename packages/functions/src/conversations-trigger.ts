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
// Note: Using z.union() instead of z.discriminatedUnion() because OpenAI's
// structured outputs support anyOf (from union) but not oneOf (from discriminatedUnion)
const ResourceSchema = z.union([
  z.object({
    type: z.literal("tag"),
    tag: z.string(),
  }),
  z.object({
    type: z.literal("user"),
    userId: z.string(),
  }),
  z.object({
    type: z.literal("team"),
    teamId: z.string(),
  }),
  z.object({
    type: z.literal("task"),
    taskId: z.string(),
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
          const prompt = `You are generating a todo item for a user based on what another user needs from them.

## Context

**Original Todo Creator:**
- User ID: ${ownerUserId}
- Display Name: "${ownerUserData.displayName}"

**Original Todo (what ${ownerUserData.displayName} needs to do):**
Text: ${originalRichText.text}
Resources: ${JSON.stringify(originalRichText.resources, null, 2)}

**Target User (who needs the new todo):**
- User ID: ${userId}
- Display Name: "${participantUser.displayName}"

## RichText Format

The RichText format uses:
- Placeholders like [[0]], [[1]], etc. in the text field
- These placeholders reference resources by their index in the resources array
- Resources can be tags, user mentions, projects, issues, or links

## Your Task

Generate a new RichText object for "${participantUser.displayName}" that ALWAYS follows this pattern:

**ALWAYS start with [[0]] referencing the original creator**, followed by what they need/want:
- "[[0]] would like to..."
- "[[0]] needs..."
- "[[0]] wants to..."
- "[[0]] is asking to..."

Where [[0]] is a user mention resource:
\`\`\`json
{
  "type": "user",
  "userId": "${ownerUserId}",
  "display": "${ownerUserData.displayName}"
}
\`\`\`

**Rules:**
1. ALWAYS put the original creator as [[0]] in the resources array
2. Start the text with "[[0]] would like to..." or similar pattern
3. Describe what the original creator wants/needs based on their original todo
4. If the original todo mentions the target user "${participantUser.displayName}" (ID: ${userId}), replace that mention with "you" or "your" - DO NOT include them as a resource
5. Keep any other relevant resources from the original (tags, projects, links, etc.) but shift their indices
6. Stay literal to the original todo - don't add extra context

## Examples

Original: "Review [[0]]'s PR for [[1]]" (where [[0]] is the target user)
Generated: "[[0]] would like to review your PR for [[1]]"
- Resources: [creator user mention, project from original]
- Note: Target user mention replaced with "your"

Original: "Schedule meeting with [[0]] about [[1]]" (where [[0]] is the target user)
Generated: "[[0]] needs to schedule a meeting with you about [[1]]"
- Resources: [creator user mention, tag from original]
- Note: Target user mention replaced with "you"

Original: "Send proposal to [[0]]" (where [[0]] is the target user)
Generated: "[[0]] is asking you to review their proposal"
- Resources: [creator user mention only]
- Note: Target user mention replaced with "you"

Original: "Review [[0]]'s code" (where [[0]] is the target user)
Generated: "[[0]] would like to review your code"
- Resources: [creator user mention only]
- Note: Target user mention replaced with "your"

Original: "Discuss [[0]] with [[1]]" (where [[1]] is the target user)
Generated: "[[0]] wants to discuss [[1]] with you"
- Resources: [creator user mention, project from original]
- Note: Target user mention replaced with "you"

Generate the RichText object now:`;

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
