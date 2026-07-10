import { $getRoot } from "lexical";

import { AnchorNode } from "@/ui/plugins/anchor-plugin";

export function makeUniqueAnchorId(baseId: string, currentNodeKey?: string) {
  const used = new Set<string>();

  const root = $getRoot();
  root.getChildren().forEach((node) => {
    // @ts-ignore
    node.getChildren?.().forEach((child) => {
      if (child instanceof AnchorNode) {
        if (child.getKey() !== currentNodeKey) {
          used.add(child.getId());
        }
      }
    });
  });

  let id = baseId;
  let i = 0;

  while (used.has(id)) {
    i++;
    id = `${baseId}-${i}`;
  }

  return id;
}
