import { createContext } from "rask-ui";

export const JSONStorageContext = createContext((namespace: string) => {
  return {
    async get(key: string) {
      const item = localStorage.getItem(`${namespace}.${key}`);

      if (typeof item === "string") {
        return JSON.parse(item);
      }

      return null;
    },
    async set(key: string, value: unknown) {
      localStorage.setItem(`${namespace}.${key}`, JSON.stringify(value));
    },
  };
});
