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
