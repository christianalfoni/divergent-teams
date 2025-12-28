export type Resource =
  | { type: "tag"; tag: string }
  | { type: "user"; userId: string }
  | { type: "team"; teamId: string }
  | { type: "task"; taskId: string }
  | { type: "link"; url: string; display: string };

export type RichText = {
  text: string; // Contains [[0]], [[1]], etc.
  resources: Resource[];
};
