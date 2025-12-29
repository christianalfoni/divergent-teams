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

  logger.info("📝 Starting task count update", { orgId, taskId, totalDelta, completedDelta });

  try {
    // First, check if task exists
    const taskSnapshot = await taskRef.get();
    if (!taskSnapshot.exists) {
      logger.error("❌ Task does not exist!", { taskId, orgId });
      return;
    }

    const currentData = taskSnapshot.data();
    logger.info("📋 Current task data before update:", {
      taskId,
      hasTotalTodosCount: "totalTodosCount" in (currentData || {}),
      hasCompletedTodosCount: "completedTodosCount" in (currentData || {}),
      currentTotalTodosCount: currentData?.totalTodosCount,
      currentCompletedTodosCount: currentData?.completedTodosCount,
    });

    // Use set with merge to ensure fields are created if they don't exist
    await taskRef.set(
      {
        totalTodosCount: admin.firestore.FieldValue.increment(totalDelta),
        completedTodosCount: admin.firestore.FieldValue.increment(completedDelta),
      },
      { merge: true }
    );

    logger.info("✅ Count increment successful", { taskId });

    // After updating counts, get fresh data and set the completed flag
    const updatedTaskSnapshot = await taskRef.get();
    if (updatedTaskSnapshot.exists) {
      const taskData = updatedTaskSnapshot.data();
      const totalCount = taskData?.totalTodosCount || 0;
      const completedCount = taskData?.completedTodosCount || 0;

      logger.info("📊 Current task counts AFTER update", { taskId, totalCount, completedCount });

      // Task is completed when all todos are completed and there's at least one todo
      const isCompleted = totalCount > 0 && totalCount === completedCount;

      await taskRef.update({
        completed: isCompleted,
      });

      logger.info("✅ Task completion status updated", { taskId, isCompleted });
    } else {
      logger.warn("⚠️ Task does not exist", { taskId });
    }
  } catch (error) {
    logger.error("❌ Error updating task counts", { orgId, taskId, error });
    throw error;
  }
}

/**
 * onDocumentWritten trigger for todos
 * Updates task counts when todos are created, updated, or deleted
 */
export const onTodoChange = onDocumentWritten(
  {
    document: "organizations/{orgId}/todos/{todoId}",
    region: "us-central1",
  },
  async (event) => {
    logger.info("🚀 onTodoChange triggered!", {
      todoId: event.params.todoId,
      orgId: event.params.orgId,
    });

    // Guard clause for event data
    if (!event.data) {
      logger.warn("⚠️ No event data, exiting");
      return;
    }

    const orgId = event.params.orgId as string;
    const before = event.data.before;
    const after = event.data.after;

    const beforeData = before.exists ? (before.data() as Todo) : null;
    const afterData = after.exists ? (after.data() as Todo) : null;

    logger.info("📝 Todo data:", {
      beforeExists: !!beforeData,
      afterExists: !!afterData,
      beforeText: beforeData?.richText.text,
      afterText: afterData?.richText.text,
    });

    // Case 1: Todo was created
    if (!beforeData && afterData) {
      logger.info("✅ Case 1: Todo created");
      const taskIds = extractTaskResources(afterData.richText);

      logger.info("🎯 Extracted task IDs:", { taskIds, resourcesCount: afterData.richText.resources.length });

      for (const taskId of taskIds) {
        const completedDelta = afterData.completed ? 1 : 0;
        logger.info("📊 Updating task counts:", { taskId, totalDelta: 1, completedDelta });
        await updateTaskCounts(orgId, taskId, 1, completedDelta);
      }

      logger.info("✅ Todo creation processing complete");
      return;
    }

    // Case 2: Todo was deleted
    if (beforeData && !afterData) {
      logger.info("🗑️ Case 2: Todo deleted");
      const taskIds = extractTaskResources(beforeData.richText);

      logger.info("🎯 Extracted task IDs from deleted todo:", { taskIds });

      for (const taskId of taskIds) {
        const completedDelta = beforeData.completed ? -1 : 0;
        logger.info("📊 Updating task counts (delete):", { taskId, totalDelta: -1, completedDelta });
        await updateTaskCounts(orgId, taskId, -1, completedDelta);
      }

      logger.info("✅ Todo deletion processing complete");
      return;
    }

    // Case 3: Todo was updated
    if (beforeData && afterData) {
      logger.info("🔄 Case 3: Todo updated");
      const beforeTaskIds = extractTaskResources(beforeData.richText);
      const afterTaskIds = extractTaskResources(afterData.richText);

      logger.info("🎯 Task IDs comparison:", { beforeTaskIds, afterTaskIds });

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
