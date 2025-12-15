import type { FieldValue, Timestamp } from "firebase/firestore";

export type WithFieldValue<T extends Record<string, any>, U extends keyof T> = {
  [K in keyof T]: K extends U ? T[K] | FieldValue : T[K];
};

type DateToTimestamp<V> = V extends Date ? Timestamp : V;

export type WithTimestamp<T extends Record<string, any>> = {
  [K in keyof T]: DateToTimestamp<T[K]>;
};
