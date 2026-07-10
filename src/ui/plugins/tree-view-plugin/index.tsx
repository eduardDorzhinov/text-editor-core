import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TreeView } from "@lexical/react/LexicalTreeView";

import "./TreeView.scss";

export const TreeViewPlugin = () => {
  const [ editor ] = useLexicalComposerContext();
  return (
    <TreeView
      editor={editor}
      timeTravelButtonClassName="debug-timetravel-button"
      timeTravelPanelButtonClassName="debug-timetravel-panel-button"
      timeTravelPanelClassName="debug-timetravel-panel"
      timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
      treeTypeButtonClassName="debug-treetype-button"
      viewClassName="tree-view-output"
    />
  );
};
