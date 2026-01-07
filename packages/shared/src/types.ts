import type { Timestamp } from "firebase/firestore";
import type { Resource, RichText } from "./editor-types.js";

type BaseMention = {
  id: string;
  updatedAt: Timestamp;
};

export type UserMention = BaseMention & {
  type: "user";
  userId: string;
  displayName: string;
};

export type TeamMention = BaseMention & {
  type: "team";
  name: string;
  members: string[];
};

export type TaskMention = BaseMention & {
  type: "task";
  taskId: string;
  title: string;
  teamId: string;
};

export type Mention = UserMention | TeamMention | TaskMention;

export interface Conversation {
  id: string;
  reference: { type: "todo"; id: string };
  createdAt: Timestamp;
}

export interface Message {
  id: string;
  userId: string;
  richText: {
    text: string;
    resources: Resource[];
  };
  isFirstMessage: boolean;
  createdAt: Timestamp;
}

export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Team {
  id: string;
  name: string;
  createdBy: string;
  mission: RichText;
  members: string[];
}

export interface Todo {
  id: string;
  userId: string;
  richText: RichText;
  completed: boolean;
  isGenerated: boolean;
  date: Timestamp;
  position: string; // Fractional index for ordering
  createdAt: Timestamp;
  updatedAt: Timestamp;
  moveCount?: number; // Number of times todo has been moved/rescheduled
  completedAt?: Timestamp; // When the todo was marked complete
  completedWithTimeBox?: boolean; // Whether completed during a time-boxed session
  conversationId?: string;
}

export interface Task {
  id: string;
  teamId: string;
  title: string;
  details?: RichText;
  totalTodosCount: number; // Total todos referencing this task
  completedTodosCount: number; // Completed todos referencing this task
  completed: boolean; // Whether all todos are completed
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
