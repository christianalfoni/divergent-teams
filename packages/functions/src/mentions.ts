/**
 * Mentions sync system
 * Keeps a mentions collection in sync with user changes
 * for autocomplete/mention functionality
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * onDocumentWritten trigger for users
 * Syncs user changes to the mentions collection
 */
export const onUserUpdate = onDocumentWritten(
  {
    document: "organizations/{orgId}/users/{userId}",
    region: "us-central1",
  },
  async (event) => {
    // Guard clause for event data
    if (!event.data) {
      return;
    }

    // Capture the Org ID and User ID from the path
    const orgId = event.params.orgId as string;
    const userId = event.params.userId as string;

    const newData = event.data.after.exists ? event.data.after.data() : null;

    // Reference the mention document inside the specific organization
    const mentionRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("mentions")
      .doc(userId);

    // If user was deleted, delete the mention
    if (!newData) {
      await mentionRef.delete();
      return;
    }

    // Create/update the mention with only displayName and userId
    await mentionRef.set(
      {
        type: "user",
        userId: userId,
        displayName: newData?.displayName || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);

/**
 * onDocumentWritten trigger for teams
 * Syncs team changes to the mentions collection
 */
export const onTeamUpdate = onDocumentWritten(
  {
    document: "organizations/{orgId}/teams/{teamId}",
    region: "us-central1",
  },
  async (event) => {
    // Guard clause for event data
    if (!event.data) {
      return;
    }

    // Capture the Org ID and Team ID from the path
    const orgId = event.params.orgId as string;
    const teamId = event.params.teamId as string;

    const newData = event.data.after.exists ? event.data.after.data() : null;

    // Reference the mention document inside the specific organization
    const mentionRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("mentions")
      .doc(teamId);

    // If team was deleted, delete the mention
    if (!newData) {
      await mentionRef.delete();
      return;
    }

    // Create/update the mention with team name and members
    await mentionRef.set(
      {
        type: "team",
        name: newData?.name || "",
        members: newData?.members || [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);

/**
 * onDocumentWritten trigger for tasks
 * Syncs task changes to the mentions collection
 */
export const onTaskUpdate = onDocumentWritten(
  {
    document: "organizations/{orgId}/tasks/{taskId}",
    region: "us-central1",
  },
  async (event) => {
    // Guard clause for event data
    if (!event.data) {
      return;
    }

    // Capture the Org ID, Team ID, and Task ID from the path
    const orgId = event.params.orgId as string;
    const taskId = event.params.taskId as string;

    const newData = event.data.after.exists ? event.data.after.data() : null;

    // Reference the mention document inside the specific organization
    const mentionRef = db
      .collection("organizations")
      .doc(orgId)
      .collection("mentions")
      .doc(taskId);

    // If task was deleted, delete the mention
    if (!newData) {
      await mentionRef.delete();
      return;
    }

    // Create/update the mention with task info
    await mentionRef.set(
      {
        type: "task",
        taskId: taskId,
        title: newData?.title,
        teamId: newData?.teamId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }
);
