import type { Provider, ProviderAwareness } from "@lexical/yjs";
import * as Y from "yjs";

export class LocalProvider implements Provider {
  doc: Y.Doc;
  awareness: ProviderAwareness;

  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.awareness = {
      getLocalState: () => null,
      getStates: () => new Map(),
      off: () => {
        // noop
      },
      on: () => {
        // noop
      },
      setLocalState: () => {
        // noop
      },
    } as unknown as ProviderAwareness;
  }

  on(_type: string, _cb: (...args: any[]) => void): void {
    // noop — local mode, no remote events
  }

  off(_type: string, _cb: (...args: any[]) => void): void {
    // noop — local mode, no remote events
  }

  connect(): void {
    // noop — local mode
  }

  disconnect(): void {
    // noop — local mode
  }

  destroy(): void {
    // noop
  }
}
