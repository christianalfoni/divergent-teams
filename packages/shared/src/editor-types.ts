export type Resource =
  | { type: "tag"; tag: string }
  | { type: "user"; userId: string; display: string }
  | { type: "project"; projectId: string; display: string }
  | { type: "issue"; issueId: string; display: string }
  | { type: "link"; url: string; display: string };

export type RichText = {
  text: string; // Contains [[0]], [[1]], etc.
  resources: Resource[];
};
