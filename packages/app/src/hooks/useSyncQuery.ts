import { onSnapshot, Query } from "firebase/firestore";
import { assignState, useEffect, useState } from "rask-ui";

export function useSyncQuery<T extends { id: string }>(
  collectionFn: () => Query | null,
  onUpdate?: (update: {
    type: "added" | "modified" | "removed";
    data: T;
  }) => void
) {
  const state = useState({
    isSubscribing: false,
    isLoading: false,
    data: [] as T[],
  });
  useEffect(() => {
    const collection = collectionFn();

    if (!collection) {
      assignState(state, {
        isLoading: false,
        isSubscribing: false,
        data: [],
      });
      return;
    }

    state.isSubscribing = true;
    state.isLoading = true;

    return onSnapshot(
      collection,
      (snapshot) => {
        state.isLoading = false;
        snapshot.docChanges().forEach((docChange) => {
          const data = docChange.doc.data() as T;
          const item = state.data.find((item) => item.id === docChange.doc.id);

          // Since we support optimistic data, an added can cause the item to already be there, where
          // we rather apply updates
          switch (docChange.type) {
            case "added":
            case "modified": {
              if (item) {
                assignState(item, data);
              } else {
                state.data.push({
                  ...data,
                  id: docChange.doc.id,
                });
              }
              break;
            }
            case "removed": {
              const index = state.data.findIndex((item) => item.id === data.id);
              state.data.splice(index, 1);
              break;
            }
          }

          onUpdate?.({ type: docChange.type, data });
        });
      },
      (error) => {
        console.error("Firestore snapshot listener error:", error);
        assignState(state, {
          isLoading: false,
          isSubscribing: false,
          data: [],
        });
      }
    );
  });

  return state;
}
