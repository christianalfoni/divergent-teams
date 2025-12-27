import { useAsync, useView } from "rask-ui";
import { CacheContext } from "../contexts/CacheContext";

export function useCache<T>(
  key: string,
  cb: () => Promise<T>,
  refreshCacheMinutes: number = 5
) {
  const cache = CacheContext.use();
  const [state, refresh] = useAsync(async () => {
    const cachedValue = cache.get<T>(key);

    if (cachedValue && isOlderThan(cachedValue.setAt, refreshCacheMinutes)) {
      return cachedValue.value;
    }

    const value = await cb();
    cache.set(key, value);
    return value;
  });

  return useView(state, {
    get cachedValue() {
      return state.value || cache.get<T>(key)?.value || null;
    },
    refresh,
  });

  function isOlderThan(date: Date, minutes: number) {
    const now = new Date();
    const millisecondsAgo = minutes * 60 * 1000;

    // Subtract the date from now to get the elapsed time
    return now.getTime() - date.getTime() >= millisecondsAgo;
  }
}
