import type { Timestamp } from "firebase/firestore";

export interface Conversation {
  id: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
}

export interface Message {
  id: string;
  content: string;
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
  description: string;
  completed: boolean;
  date: Timestamp;
  position: string; // Fractional index for ordering
  createdAt: Timestamp;
  updatedAt: Timestamp;
  moveCount?: number; // Number of times todo has been moved/rescheduled
  completedAt?: Timestamp; // When the todo was marked complete
  completedWithTimeBox?: boolean; // Whether completed during a time-boxed session
}
