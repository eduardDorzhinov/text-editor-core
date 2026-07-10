import * as Y from "yjs";

export function serializeComments(doc: Y.Doc): number[] {
  const update = Y.encodeStateAsUpdate(doc);
  return Array.from(update);
}

export function restoreComments(doc: Y.Doc, serialized: number[]): boolean {
  try {
    if (!Array.isArray(serialized) || serialized.length === 0) {
      return false;
    }
    const update = new Uint8Array(serialized);
    Y.applyUpdate(doc, update);
    return true;
  } catch (e) {
    console.error("Failed to restore comments:", e);
    return false;
  }
}
