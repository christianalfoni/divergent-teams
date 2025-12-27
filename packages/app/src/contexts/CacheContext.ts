import { createContext, useState } from "rask-ui";

type CachedValue<T> = {
  setAt: Date;
  value: T;
};

export const CacheContext = createContext(() => {
  const cache = useState<Record<string, CachedValue<any>>>({});

  return {
    set<T>(key: string, value: T) {
      cache[key] = {
        setAt: new Date(),
        value,
      };
    },
    get<T>(key: string): CachedValue<T> | null {
      return cache[key] || null;
    },
  };
});
