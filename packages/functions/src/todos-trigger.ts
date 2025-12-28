/**
 * Todos trigger system
 * Tracks task completion by maintaining counts when todos reference tasks
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type { RichText, Todo } from "@divergent-teams/shared";

const db = admin.firestore();

/**
 * Helper function to extract task IDs from RichText resources
 */
function extractTaskResources(richText: RichText): string[] {
  return richText.resources
    .filter((r): r is { type: "task"; taskId: string } => r.type === "task")
    .map((r) => r.taskId);
}

/**
 * Helper function to update task counts and completion status
 */
async function updateTaskCounts(
  orgId: string,
  taskId: string,
  totalDelta: number,
  completedDelta: number
): Promise<void> {
  const taskRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("tasks")
    .doc(taskId);

  try {
    // Atomically update counts
    await taskRef.update({
      totalTodosCount: admin.firestore.FieldValue.increment(totalDelta),
      completedTodosCount: admin.firestore.FieldValue.increment(completedDelta),
    });
  } catch (error) {
    logger.error("Error updating task counts", { orgId, taskId, error });
    throw error;
  }
}

/**
 * onDocumentWritten trigger for todos
 * Updates task counts when todos are created, updated, or deleted
 */
export const onTodoChange = onDocumentWritten(
  {
    document: "organizations/{orgId}/users/{userId}/todos/{todoId}",
    region: "us-central1",
  },
  async (event) => {
    // Guard clause for event data
    if (!event.data) {
      return;
    }

    const orgId = event.params.orgId as string;
    const before = event.data.before;
    const after = event.data.after;

    const beforeData = before.exists ? (before.data() as Todo) : null;
    const afterData = after.exists ? (after.data() as Todo) : null;

    // Case 1: Todo was created
    if (!beforeData && afterData) {
      const taskIds = extractTaskResources(afterData.richText);

      for (const taskId of taskIds) {
        const completedDelta = afterData.completed ? 1 : 0;
        await updateTaskCounts(orgId, taskId, 1, completedDelta);
      }

      return;
    }

    // Case 2: Todo was deleted
    if (beforeData && !afterData) {
      const taskIds = extractTaskResources(beforeData.richText);

      for (const taskId of taskIds) {
        const completedDelta = beforeData.completed ? -1 : 0;
        await updateTaskCounts(orgId, taskId, -1, completedDelta);
      }

      return;
    }

    // Case 3: Todo was updated
    if (beforeData && afterData) {
      const beforeTaskIds = extractTaskResources(beforeData.richText);
      const afterTaskIds = extractTaskResources(afterData.richText);

      // Detect completion status change
      const wasCompleted = beforeData.completed;
      const isCompleted = afterData.completed;
      const completionChanged = wasCompleted !== isCompleted;

      // Handle completion status change for existing task references
      if (completionChanged) {
        const completedDelta = isCompleted ? 1 : -1;

        // Update all task references that didn't change
        const unchangedTaskIds = afterTaskIds.filter((id) =>
          beforeTaskIds.includes(id)
        );

        for (const taskId of unchangedTaskIds) {
          await updateTaskCounts(orgId, taskId, 0, completedDelta);
        }
      }

      // Detect task reference changes
      const addedTaskIds = afterTaskIds.filter(
        (id) => !beforeTaskIds.includes(id)
      );
      const removedTaskIds = beforeTaskIds.filter(
        (id) => !afterTaskIds.includes(id)
      );

      // Handle added task references
      for (const taskId of addedTaskIds) {
        const completedDelta = isCompleted ? 1 : 0;
        await updateTaskCounts(orgId, taskId, 1, completedDelta);
      }

      // Handle removed task references
      for (const taskId of removedTaskIds) {
        const completedDelta = wasCompleted ? -1 : 0;
        await updateTaskCounts(orgId, taskId, -1, completedDelta);
      }

      return;
    }
  }
);
