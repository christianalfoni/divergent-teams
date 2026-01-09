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

    // Track mention sources for different generation strategies
    const todoMentionedUsers = new Set<string>();
    const messageMentionedUsers = new Set<string>();

    // If this is the first message, also extract mentions from the todo
    if (messageData.isFirstMessage) {
      console.log("First message - also extracting mentions from todo");

      const todoUserMentions = todoData.richText.resources
        .filter((resource: any) => resource.type === "user")
        .map((resource: any) => resource.userId);

      const todoTeamMentions = todoData.richText.resources
        .filter((resource: any) => resource.type === "team")
        .map((resource: any) => resource.teamId);

      // Fetch team members for todo team mentions
      const todoTeamMemberIds = await Promise.all(
        todoTeamMentions.map(async (teamId: string) => {
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

      // Track these as todo-sourced mentions
      [...todoUserMentions, ...todoTeamMemberIds].forEach(userId =>
        todoMentionedUsers.add(userId)
      );

      userMentions = [...userMentions, ...todoUserMentions, ...todoTeamMemberIds];
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

    // Fetch team members for message team mentions
    const messageTeamMemberIds = await Promise.all(
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

    // Track message-sourced mentions (users directly mentioned in message + team members from message teams)
    const directMessageMentions = messageData.richText.resources
      .filter((resource: any) => resource.type === "user")
      .map((resource: any) => resource.userId);

    [...directMessageMentions, ...messageTeamMemberIds].forEach(userId =>
      messageMentionedUsers.add(userId)
    );

    // Combine user mentions and team members
    const allMentionedUserIds = [...new Set([...userMentions, ...messageTeamMemberIds])];

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

      // Determine if this is primarily todo-based or message-based
      const todoSourcedCount = mentionedUsersExcludingOwner.filter(userId =>
        todoMentionedUsers.has(userId)
      ).length;
      const messageSourcedCount = mentionedUsersExcludingOwner.filter(userId =>
        messageMentionedUsers.has(userId)
      ).length;

      const isFromTodo = todoSourcedCount > messageSourcedCount;

      const prompt = `Generate a todo for users who were mentioned.

## Context

**Todo Creator:** ${ownerUserData.displayName} (ID: ${ownerUserId})

**Original Todo:**
Text: ${originalRichText.text}
Resources: ${JSON.stringify(originalRichText.resources, null, 2)}

**${isFromTodo ? 'First Message' : 'Message'} (trigger only):**
Text: ${messageRichText.text}
Resources: ${JSON.stringify(messageRichText.resources, null, 2)}

## Important
The generated todo will share the SAME CONVERSATION as the original todo. All messages are visible to everyone in the conversation. Don't duplicate message content in the generated todo.

The original todo describes WHAT needs to be done. The message is just the trigger.

## RichText Format
Text uses placeholders [[0]], [[1]] that reference resources array.
Resources: user mentions, tags, teams, tasks, links.

## Instructions
Create a todo with the correct perspective for the mentioned users.

The todo creator is [[0]]:
{
  "type": "user",
  "userId": "${ownerUserId}"
}

The mentioned users are the TARGET of the todo. Generate the todo FROM THEIR PERSPECTIVE.
Start with "[[0]] needs you to..." or "[[0]] would like you to..."

IMPORTANT: Do not include the target users' names in the generated todo - use "you" or "your" instead.

Include relevant resources from the original todo (tags, tasks, links, etc).
Don't add extra context - stay literal to the original todo.`;

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

          // Determine if this user is from todo or message
          const isFromTodo = todoMentionedUsers.has(userId);

          const prompt = `Generate a todo for ${participantUser.displayName}.

## Context

**Todo Creator:** ${ownerUserData.displayName} (ID: ${ownerUserId})

**Original Todo:**
Text: ${originalRichText.text}
Resources: ${JSON.stringify(originalRichText.resources, null, 2)}

**${isFromTodo ? 'First Message' : 'Message'} (trigger only):**
Text: ${messageRichText.text}
Resources: ${JSON.stringify(messageRichText.resources, null, 2)}

**Target User:** ${participantUser.displayName} (ID: ${userId})

## Important
The generated todo will share the SAME CONVERSATION as the original todo. All messages are visible to everyone in the conversation. Don't duplicate message content in the generated todo.

The original todo describes WHAT needs to be done. The message is just the trigger.

## RichText Format
Text uses placeholders [[0]], [[1]] that reference resources array.
Resources: user mentions, tags, teams, tasks, links.

## Instructions
Create a todo FROM THE PERSPECTIVE of ${participantUser.displayName}.

The todo creator is [[0]]:
{
  "type": "user",
  "userId": "${ownerUserId}",
  "display": "${ownerUserData.displayName}"
}

${participantUser.displayName} is the TARGET. Generate what THEY need to do.
Start with "[[0]] needs you to..." or "[[0]] would like you to..."

IMPORTANT: Replace any mention of "${participantUser.displayName}" with "you" or "your" - do NOT include them as a resource.

Include relevant resources from the original todo (tags, tasks, links, etc).
Don't add extra context - stay literal to the original todo.`;

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
