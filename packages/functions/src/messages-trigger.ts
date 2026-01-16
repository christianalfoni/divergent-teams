/**
 * Messages trigger
 * Handles creation of todos for mentioned users when messages are created
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { createOpenAIClient, openaiApiKey } from "./openai-client";
import type {
  Conversation,
  Message,
  Todo,
  User,
} from "@divergent-teams/shared";
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
 * Converts RichText to plain display text by resolving resource placeholders
 */
async function richTextToDisplayText(
  richText: { text: string; resources: any[] },
  db: admin.firestore.Firestore,
  orgId: string
): Promise<string> {
  let displayText = richText.text;

  // Process resources in reverse order to maintain correct indices during replacement
  for (let i = richText.resources.length - 1; i >= 0; i--) {
    const resource = richText.resources[i];
    const placeholder = `[[${i}]]`;
    let replacement = "";

    switch (resource.type) {
      case "user": {
        const userDoc = await db
          .collection("organizations")
          .doc(orgId)
          .collection("users")
          .doc(resource.userId)
          .get();
        const userData = userDoc.data() as User | undefined;
        replacement = userData?.displayName || "Unknown User";
        break;
      }
      case "team": {
        const teamDoc = await db
          .collection("organizations")
          .doc(orgId)
          .collection("teams")
          .doc(resource.teamId)
          .get();
        const teamData = teamDoc.data();
        replacement = teamData?.name || "Unknown Team";
        break;
      }
      case "tag":
        replacement = `#${resource.tag}`;
        break;
      case "task":
        replacement = `Task ${resource.taskId}`;
        break;
      case "link":
        replacement = resource.display;
        break;
    }

    displayText = displayText.replace(placeholder, replacement);
  }

  return displayText;
}

/**
 * onDocumentCreated trigger for messages
 * Creates todos for mentioned users in messages
 */
export const onMessageCreated = onDocumentCreated(
  {
    document:
      "organizations/{orgId}/conversations/{conversationId}/messages/{messageId}",
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

    console.log(
      `Processing message ${messageId} in conversation ${conversationId}`
    );

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
      console.error(
        `Referenced todo ${conversationData.reference.id} not found`
      );
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
      [...todoUserMentions, ...todoTeamMemberIds].forEach((userId) =>
        todoMentionedUsers.add(userId)
      );

      userMentions = [
        ...userMentions,
        ...todoUserMentions,
        ...todoTeamMemberIds,
      ];
      teamMentions = [...teamMentions, ...todoTeamMentions];
    }

    // Remove duplicates
    userMentions = [...new Set(userMentions)];
    teamMentions = [...new Set(teamMentions)];

    console.log(
      `Found ${userMentions.length} user mentions and ${teamMentions.length} team mentions`
    );

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

    [...directMessageMentions, ...messageTeamMemberIds].forEach((userId) =>
      messageMentionedUsers.add(userId)
    );

    // Combine user mentions and team members
    const allMentionedUserIds = [
      ...new Set([...userMentions, ...messageTeamMemberIds]),
    ];

    console.log(
      `Total ${allMentionedUserIds.length} users mentioned (after resolving teams)`
    );

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

        // Convert RichText to plain display text for better LLM comprehension
        const originalTodoText = await richTextToDisplayText(
          todoData.richText,
          db,
          orgId
        );
        const messageText = await richTextToDisplayText(
          messageData.richText,
          db,
          orgId
        );

        // Determine if this is a self-assigned task
        const isSelfAssigned = todoData.userId === ownerUserId;
        const todoOwnerName = isSelfAssigned
          ? ownerUserData.displayName
          : (await db.collection("organizations").doc(orgId).collection("users").doc(todoData.userId).get()).data()?.displayName || "Unknown";

        const prompt = `Generate a todo for ${participantUser.displayName}.

## Context

**Original Todo Creator:** ${ownerUserData.displayName}
**Original Todo Owner:** ${todoOwnerName}${isSelfAssigned ? " (self-assigned)" : ""}

**Original Todo:**
"${originalTodoText}"

**Related Message:**
"${messageText}"

**Target User:** ${participantUser.displayName}

## Your Task: Transform the Perspective

The original todo was created by ${ownerUserData.displayName}${isSelfAssigned ? " for themselves" : ` for ${todoOwnerName}`}. You need to transform it into a todo FOR ${participantUser.displayName}.

### Step 1: Understand the Context

${isSelfAssigned
  ? `This is a SELF-ASSIGNED task. ${ownerUserData.displayName} created this todo for themselves. When they mention ${participantUser.displayName}, they are asking for HELP or COLLABORATION, not delegating the entire task.`
  : `This is a DELEGATED task. ${ownerUserData.displayName} created this todo for ${todoOwnerName}. Mentions may indicate task transfer or collaboration.`
}

### Step 2: Identify the Action Structure

Analyze the original todo and message to understand:
- **Who owns the work?** (originally ${todoOwnerName})
- **What is the action?** (the verb)
- **What is the participant's role?** (helper, collaborator, or new owner)

### Step 3: Transform Based on the Scenario

${isSelfAssigned
  ? `**For Self-Assigned Tasks (asking for help):**
- The participant should HELP with the task, not take it over
- Rephrase as: "${ownerUserData.displayName} asked for your help with [action]"
- Or: "${ownerUserData.displayName} needs your help to [action]"
- Example: "Work on the feature" + "Can you help me?" → "${ownerUserData.displayName} asked for your help with working on the feature"`
  : `**For Delegated Tasks:**
- Determine if this is task transfer or collaboration
- If transfer: "${ownerUserData.displayName} wants you to [action]"
- If collaboration: "${ownerUserData.displayName} asked you to help with [action]"`
}

**If ${participantUser.displayName} is mentioned as the OBJECT (receiving action):**
- Rephrase as: "${ownerUserData.displayName} wants to [action] you" or "${ownerUserData.displayName} will [action] you"
- Example: "Schedule meeting with Tom" → "${ownerUserData.displayName} wants to schedule a meeting with you"

### Step 4: Generate RichText Output

- **ALWAYS include ${ownerUserData.displayName} as the first resource**: { type: "user", userId: "${ownerUserId}" }
- Reference them as [[0]] in the text
- Include any other resources (tags, users, teams, tasks, links) from the original todo
- Adjust their indices (they shift by +1 since the creator is now [[0]])
- Do NOT include ${participantUser.displayName} as a resource (they become "you")

### Examples:

**Example 1 - Self-Assigned Task (Help Request):**
Original: "Fix the bug in authentication" (John's own task)
Message: "Can you help me with this?"
Generated for Mary:
- Text: "[[0]] asked for your help with fixing the bug in authentication"
- Resources: [{ type: "user", userId: "john-id" }]

**Example 2 - Delegated Task:**
Original: "Update the documentation" (assigned to Bob)
Message: "Can you take this over?"
Generated for Alice:
- Text: "[[0]] wants you to update the documentation"
- Resources: [{ type: "user", userId: "creator-id" }]

**Example 3 - Participant as Object:**
Original: "Schedule meeting with Tom"
Generated for Tom:
- Text: "[[0]] wants to schedule a meeting with you"
- Resources: [{ type: "user", userId: "creator-id" }]

**Example 4 - With Additional Resources:**
Original: "Deploy #backend changes" (self-assigned)
Message: "Need your help deploying"
Generated for Sarah:
- Text: "[[0]] asked for your help with deploying [[1]] changes"
- Resources: [{ type: "user", userId: "creator-id" }, { type: "tag", tag: "backend" }]

## Important Notes
- Pay close attention to whether this is a self-assigned task (help request) or delegation
- Use the message to understand the nature of the request
- Focus on semantic meaning, not just word replacement
- The message provides context but shouldn't be duplicated (same conversation)
- ALWAYS make the creator [[0]] in resources`;

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
