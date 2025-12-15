import type { Timestamp } from "firebase/firestore";
import type { Resource, RichText } from "./components/SmartEditor";

export type Mention = {
  id: string;
  updatedAt: Timestamp;
} & {
  type: "user";
  userId: string;
  displayName: string;
};

export interface Conversation {
  id: string;
  createdAt: Timestamp;
  participantUserIds: string[];
}

export interface Message {
  id: string;
  userId: string;
  richText: {
    text: string;
    resources: Resource[];
  };
  createdAt: Timestamp;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
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

export interface Project {
  id: string;
  title: string;
}

export interface Todo {
  id: string;
  userId: string;
  richText: RichText;
  completed: boolean;
  date: Timestamp;
  position: string; // Fractional index for ordering
  createdAt: Timestamp;
  updatedAt: Timestamp;
  moveCount?: number; // Number of times todo has been moved/rescheduled
  completedAt?: Timestamp; // When the todo was marked complete
  completedWithTimeBox?: boolean; // Whether completed during a time-boxed session
  conversationId?: string;
}
