import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getRoot, $isDecoratorNode, $isElementNode } from "lexical";

import { AnchorHeadingNode } from "@/ui/plugins/anchor-heading-plugin";

type AnchorEntry = {
  nodeKey: string,
  anchorId: string,
  type: string,
};

type BlockAnchorAPI = {
  getAnchorId: (nodeKey: string) => string,
  setAnchorId: (nodeKey: string, newId: string) => void,
  getAllAnchors: () => AnchorEntry[],
  version: number,
};

const BlockAnchorCtx = createContext<BlockAnchorAPI>({
  getAnchorId: () => "",
  setAnchorId: () => {
    // noop
  },
  getAllAnchors: () => [],
  version: 0,
});

function makeUnique(id: string, usedIds: Set<string>): string {
  if (!usedIds.has(id)) return id;
  let i = 1;
  while (usedIds.has(`${id}-${i}`)) i++;
  return `${id}-${i}`;
}

function generateBlockId(type: string, index: number): string {
  return `${type}-${index}`;
}

export function BlockAnchorProvider({ children }: { children: ReactNode }) {
  const [ editor ] = useLexicalComposerContext();
  const [ version, setVersion ] = useState(0);
  const anchorMapRef = useRef<Map<string, string>>(new Map());
  const nodeTypeMapRef = useRef<Map<string, string>>(new Map());

  const applyAnchors = useCallback(() => {
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const nodes = root.getChildren();
      const oldMap = anchorMapRef.current;
      const newMap = new Map<string, string>();
      const newTypeMap = new Map<string, string>();
      const usedIds = new Set<string>();

      // Pass 1: lock existing anchors for nodes that are still alive.
      // Nodes already in oldMap keep their ID — this guarantees stability.
      // Headings keep their persisted node ID only if it hasn't changed;
      // otherwise they're treated as "needing a new anchor" in pass 2.
      const needsId: { key: string, type: string }[] = [];

      for (const child of nodes) {
        const key = child.getKey();

        if ($isHeadingNode(child) && child instanceof AnchorHeadingNode) {
          const nodeId = child.getId();
          if (!nodeId) continue;

          const prevId = oldMap.get(key);
          // Heading ID unchanged — lock it
          if (prevId && prevId === nodeId) {
            usedIds.add(prevId);
            newMap.set(key, prevId);
            newTypeMap.set(key, child.getTag());
          } else if (prevId && prevId !== nodeId) {
            // Heading text changed → needs re-assignment in pass 2
            needsId.push({ key, type: child.getTag() });
          } else {
            // New heading
            needsId.push({ key, type: child.getTag() });
          }
          continue;
        }

        if ($isElementNode(child) || $isDecoratorNode(child)) {
          const type = child.getType();
          const prevId = oldMap.get(key);

          if (prevId) {
            usedIds.add(prevId);
            newMap.set(key, prevId);
            newTypeMap.set(key, type);
          } else {
            needsId.push({ key, type });
          }
        }
      }

      // Pass 2: assign IDs to new or changed nodes, guaranteed unique.
      const typeCounters: Record<string, number> = {};
      for (const child of nodes) {
        const type = child.getType();
        typeCounters[ type ] = (typeCounters[ type ] || 0) + 1;
      }

      for (const { key, type } of needsId) {
        let candidate: string;

        // For headings, use persisted node ID
        const nodeMapEntry = editor.getEditorState()._nodeMap.get(key);
        if (nodeMapEntry instanceof AnchorHeadingNode && nodeMapEntry.getId()) {
          candidate = nodeMapEntry.getId()!;
        } else {
          // Auto-generate, find first unused counter
          let counter = 1;
          while (usedIds.has(generateBlockId(type, counter))) counter++;
          candidate = generateBlockId(type, counter);
        }

        const anchorId = makeUnique(candidate, usedIds);
        usedIds.add(anchorId);
        newMap.set(key, anchorId);
        newTypeMap.set(key, type);
      }

      // Apply DOM ids
      for (const [ key, anchorId ] of newMap) {
        const el = editor.getElementByKey(key);
        if (el && el.id !== anchorId) el.id = anchorId;
      }

      anchorMapRef.current = newMap;
      nodeTypeMapRef.current = newTypeMap;
    });
    setVersion((v) => v + 1);
  }, [ editor ]);

  useEffect(() => {
    applyAnchors();
    return editor.registerUpdateListener(() => applyAnchors());
  }, [ editor, applyAnchors ]);

  const getAnchorId = useCallback((nodeKey: string): string => {
    return anchorMapRef.current.get(nodeKey) || "";
  }, []);

  const setAnchorId = useCallback((nodeKey: string, newId: string) => {
    const usedIds = new Set<string>();
    anchorMapRef.current.forEach((id, key) => {
      if (key !== nodeKey) usedIds.add(id);
    });
    const uniqueId = makeUnique(newId, usedIds);

    anchorMapRef.current.set(nodeKey, uniqueId);
    setVersion((v) => v + 1);

    editor.getEditorState().read(() => {
      const node = editor.getEditorState()._nodeMap.get(nodeKey);
      if (node instanceof AnchorHeadingNode) {
        editor.update(() => {
          const latest = node.getLatest();
          if (latest instanceof AnchorHeadingNode) {
            latest.setId(uniqueId);
          }
        });
      }

      const el = editor.getElementByKey(nodeKey);
      if (el) el.id = uniqueId;
    });
  }, [ editor ]);

  const getAllAnchors = useCallback((): AnchorEntry[] => {
    const result: AnchorEntry[] = [];
    anchorMapRef.current.forEach((anchorId, nodeKey) => {
      result.push({
        nodeKey,
        anchorId,
        type: nodeTypeMapRef.current.get(nodeKey) || "",
      });
    });
    return result;
  }, []);

  const api: BlockAnchorAPI = { getAnchorId, setAnchorId, getAllAnchors, version };

  return (
    <BlockAnchorCtx.Provider value={api}>
      {children}
    </BlockAnchorCtx.Provider>
  );
}

export const useBlockAnchor = (): BlockAnchorAPI => useContext(BlockAnchorCtx);
