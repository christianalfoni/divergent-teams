/**
 * Messages trigger
 * Handles creation of todos for mentioned users when messages are created
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { createOpenAIClient, openaiApiKey } from "./openai-client";
import type { Conversation, Message, Todo, User } from "@divergent-teams/shared";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

// Define the RichText Zod schema
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
 * onDocumentCreated trigger for messages
 * Creates todos for mentioned users in messages
 */
export const onMessageCreated = onDocumentCreated(
  {
    document: "organizations/{orgId}/conversations/{conversationId}/messages/{messageId}",
    region: "us-central1",
    secrets: [openaiApiKey],
  },
  async (event) => {
    if (!event.data) {
      return;
    }

    const messageId = event.params.messageId;
    const conversationId = event.params.conversationId;
    const orgId = event.params.orgId;
    const db = admin.firestore();

    const messageData = event.data.data() as Message;

    console.log(`Processing message ${messageId} in conversation ${conversationId}`);

    // Extract mentions from message
    let userMentions = messageData.richText.resources
      .filter((resource: any) => resource.type === "user")
      .map((resource: any) => resource.userId);

    let teamMentions = messageData.richText.resources
      .filter((resource: any) => resource.type === "team")
      .map((resource: any) => resource.teamId);

    // Get conversation to access the referenced todo
    const conversationDoc = await db
      .collection("organizations")
      .doc(orgId)
      .collection("conversations")
      .doc(conversationId)
      .get();

    if (!conversationDoc.exists) {
      console.error(`Conversation ${conversationId} not found`);
      return;
    }

    const conversationData = conversationDoc.data() as Conversation;

    // Get the referenced todo
    const todoDoc = await db
      .collection("organizations")
      .doc(orgId)
      .collection("todos")
      .doc(conversationData.reference.id)
      .get();

    if (!todoDoc.exists) {
      console.error(`Referenced todo ${conversationData.reference.id} not found`);
      return;
    }

    const todoData = todoDoc.data() as Todo;

    // If this is the first message, also extract mentions from the todo
    if (messageData.isFirstMessage) {
      console.log("First message - also extracting mentions from todo");

      const todoUserMentions = todoData.richText.resources
        .filter((resource: any) => resource.type === "user")
        .map((resource: any) => resource.userId);

      const todoTeamMentions = todoData.richText.resources
        .filter((resource: any) => resource.type === "team")
        .map((resource: any) => resource.teamId);

      userMentions = [...userMentions, ...todoUserMentions];
      teamMentions = [...teamMentions, ...todoTeamMentions];
    }

    // Remove duplicates
    userMentions = [...new Set(userMentions)];
    teamMentions = [...new Set(teamMentions)];

    console.log(`Found ${userMentions.length} user mentions and ${teamMentions.length} team mentions`);

    // If no mentions, exit early
    if (userMentions.length === 0 && teamMentions.length === 0) {
      console.log("No mentions found, exiting");
      return;
    }

    // Fetch team members for all team mentions
    const teamMemberIds = await Promise.all(
      teamMentions.map(async (teamId: string) => {
        const teamDoc = await db
          .collection("organizations")
          .doc(orgId)
          .collection("teams")
          .doc(teamId)
          .get();
        const teamData = teamDoc.data();
        return (teamData?.members || []) as string[];
      })
    ).then((memberArrays) => memberArrays.flat());

    // Combine user mentions and team members
    const allMentionedUserIds = [...new Set([...userMentions, ...teamMemberIds])];

    console.log(`Total ${allMentionedUserIds.length} users mentioned (after resolving teams)`);

    // Get the todo creator
    const ownerUserId = todoData.userId;
    const ownerUserDoc = await db
      .collection("organizations")
      .doc(orgId)
      .collection("users")
      .doc(ownerUserId)
      .get();
    const ownerUserData = ownerUserDoc.data() as User;

    // Filter out the owner - don't create a todo for yourself
    const mentionedUsersExcludingOwner = allMentionedUserIds.filter(
      (userId) => userId !== ownerUserId
    );

    if (mentionedUsersExcludingOwner.length === 0) {
      console.log("No users to create todos for after excluding owner");
      return;
    }

    const openai = createOpenAIClient();

    // If multiple users were mentioned at once, generate one shared message
    let sharedGeneratedRichText: z.infer<typeof RichTextSchema> | null = null;

    if (mentionedUsersExcludingOwner.length > 1) {
      console.log(
        `Generating shared message for ${mentionedUsersExcludingOwner.length} users`
      );

      const originalRichText = todoData.richText;
      const messageRichText = messageData.richText;

      const prompt = `You are generating a todo item for multiple users based on what another user needs from them.

## Context

**Original Todo Creator:**
- User ID: ${ownerUserId}
- Display Name: "${ownerUserData.displayName}"

**Original Todo (what ${ownerUserData.displayName} needs to do):**
Text: ${originalRichText.text}
Resources: ${JSON.stringify(originalRichText.resources, null, 2)}

**Message that triggered this (additional context):**
Text: ${messageRichText.text}
Resources: ${JSON.stringify(messageRichText.resources, null, 2)}

## RichText Format

The RichText format uses:
- Placeholders like [[0]], [[1]], etc. in the text field
- These placeholders reference resources by their index in the resources array
- Resources can be tags, user mentions, teams, tasks, or links

## Your Task

Generate a new RichText object for the mentioned users that ALWAYS follows this pattern:

**ALWAYS start with [[0]] referencing the original creator**, followed by what they need/want:
- "[[0]] would like to..."
- "[[0]] needs..."
- "[[0]] wants..."
- "[[0]] is asking to..."

Where [[0]] is a user mention resource:
\`\`\`json
{
  "type": "user",
  "userId": "${ownerUserId}"
}
\`\`\`

**Rules:**
1. ALWAYS put the original creator as [[0]] in the resources array
2. Start the text with "[[0]] would like to..." or similar pattern
3. Use BOTH the original todo and the message context to understand what the creator wants
4. Describe what the original creator wants/needs based on their original todo AND the message
5. Make the message generic (don't personalize to specific users)
6. Keep any other relevant resources from the original (tags, tasks, links, etc.) but shift their indices appropriately
7. Stay literal to the original todo and message - don't add extra context

Generate the RichText object now:`;

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

      sharedGeneratedRichText = completion.choices[0].message.parsed;

      if (!sharedGeneratedRichText) {
        throw new Error("Not able to generate shared todo rich text");
      }

      console.log(
        `Generated shared message: ${sharedGeneratedRichText.text}`
      );
    }

    // Process each mentioned user
    await Promise.all(
      mentionedUsersExcludingOwner.map(async (userId) => {
        // Check if user already has an incomplete todo for this conversation
        const existingTodosSnapshot = await db
          .collection("organizations")
          .doc(orgId)
          .collection("todos")
          .where("userId", "==", userId)
          .where("conversationId", "==", conversationId)
          .where("completed", "==", false)
          .limit(1)
          .get();

        if (!existingTodosSnapshot.empty) {
          console.log(
            `User ${userId} already has an incomplete todo for this conversation, skipping`
          );
          return;
        }

        // Fetch the participant user details
        const participantUserDoc = await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(userId)
          .get();
        const participantUser = participantUserDoc.data() as User;

        let generatedRichText: z.infer<typeof RichTextSchema>;

        // If we have a shared message, use it
        if (sharedGeneratedRichText) {
          generatedRichText = sharedGeneratedRichText;
          console.log(
            `Using shared message for user ${userId} (${participantUser.displayName})`
          );
        } else {
          // Generate a personalized message for this specific user
          const originalRichText = todoData.richText;
          const messageRichText = messageData.richText;

          const prompt = `You are generating a todo item for a user based on what another user needs from them.

## Context

**Original Todo Creator:**
- User ID: ${ownerUserId}
- Display Name: "${ownerUserData.displayName}"

**Original Todo (what ${ownerUserData.displayName} needs to do):**
Text: ${originalRichText.text}
Resources: ${JSON.stringify(originalRichText.resources, null, 2)}

**Message that triggered this (additional context):**
Text: ${messageRichText.text}
Resources: ${JSON.stringify(messageRichText.resources, null, 2)}

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
3. Use BOTH the original todo and the message context to understand what the creator wants
4. Describe what the original creator wants/needs based on their original todo AND the message
5. If the original todo mentions the target user "${participantUser.displayName}" (ID: ${userId}), replace that mention with "you" or "your" - DO NOT include them as a resource
6. Keep any other relevant resources from the original (tags, projects, links, etc.) but shift their indices
7. Stay literal to the original todo and message - don't add extra context

## Examples

Original: "Review [[0]]'s PR for [[1]]" (where [[0]] is the target user)
Generated: "[[0]] would like to review your PR for [[1]]"
- Resources: [creator user mention, project from original]
- Note: Target user mention replaced with "your"

Original: "Schedule meeting with [[0]] about [[1]]" (where [[0]] is the target user)
Generated: "[[0]] needs to schedule a meeting with you about [[1]]"
- Resources: [creator user mention, tag from original]
- Note: Target user mention replaced with "you"

Generate the RichText object now:`;

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

          const parsed = completion.choices[0].message.parsed;

          if (!parsed) {
            throw new Error("Not able to generate todo rich text");
          }

          generatedRichText = parsed;
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
          isGenerated: false,
          date: todoData.date,
          position: "a0", // Default position at the top
          conversationId: conversationId,
          createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
          updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        // Insert into Firestore
        await newTodoRef.set(newTodo);

        console.log(
          `Created todo ${newTodoRef.id} for user ${userId} from message ${messageId}`
        );
      })
    );
  }
);
