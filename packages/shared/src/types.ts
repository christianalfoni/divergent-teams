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

export type Mention = UserMention;

export interface Conversation {
  id: string;
  reference: { type: "todo"; id: string };
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

export interface Team {
  id: string;
  name: string;
  mission: string;
  members: string[];
}

export interface Todo {
  id: string;
  userId: string;
  richText: RichText;
  completed: boolean;
  isAccepted: boolean;
  date: Timestamp;
  position: string; // Fractional index for ordering
  createdAt: Timestamp;
  updatedAt: Timestamp;
  moveCount?: number; // Number of times todo has been moved/rescheduled
  completedAt?: Timestamp; // When the todo was marked complete
  completedWithTimeBox?: boolean; // Whether completed during a time-boxed session
  conversationId?: string;
}
