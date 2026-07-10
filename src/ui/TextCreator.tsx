import {
  FC,
  RefObject,
  useMemo,
  useRef,
} from "react";

import { LexicalCollaboration } from "@lexical/react/LexicalCollaborationContext";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { defineExtension } from "lexical";

import { buildHTMLConfig } from "@/lib/buildHTMLConfig";
import { getEditorExtensionNodes } from "@/model/editor-extensions";
import { LEXICAL_NODES } from "@/model/lexical-nodes";
import { LEXICAL_THEME } from "@/model/lexical-theme";
import { CommentContextProvider } from "@/model/providers/CommentContext";
import { DataAdapterProvider } from "@/model/providers/DataAdapterContext";
import { FlashMessageContext } from "@/model/providers/FlashMessageContext";
import { MainContext } from "@/model/providers/MainContext";
import { SettingsContextProvider } from "@/model/providers/SettingsContext";
import { SharedHistoryContext } from "@/model/providers/SharedHistoryContext";
import { TableContext } from "@/model/providers/TableContext";
import { ToolbarContext } from "@/model/providers/ToolbarContext";
import { Editor } from "@/ui/components/editor";
import { Settings } from "@/ui/components/settings";
import { BlockAnchorProvider } from "@/ui/plugins/block-anchor-plugin";
import { Theme, useThemeSwitcher } from "@/vendor/shared";

import "./index.scss";
import "./theme.scss";

function onError(error: Error): void {
  console.error(error);
}

interface Props {
  fieldUid?: string,
  objUid?: string,
  localUsed?: boolean,
}

export const TextCreator: FC<Props> = ({
  fieldUid,
  objUid,
  localUsed,
}) => {
  const wrapEditorRef = useRef<HTMLDivElement | null>(null);

  // Extension-конфиг собираем на рендере (не на импорте модуля), чтобы
  // подхватить ноды расширений, зарегистрированных приложением-интегратором
  // до первого рендера. useMemo([]) — стабильная ссылка для композера.
  const app = useMemo(() => defineExtension({
    $initialEditorState: null,
    html: buildHTMLConfig(),
    name: "text-creator",
    namespace: "Playground",
    nodes: [ ...LEXICAL_NODES, ...getEditorExtensionNodes() ],
    theme: LEXICAL_THEME,
    onError,
  }), []);

  useThemeSwitcher({
    inheritTheme: "app",
    initialTheme: Theme.Light,
  });

  return (
    <div
      ref={wrapEditorRef}
      id="text-creator-root"
    >
      <LexicalCollaboration>
        <DataAdapterProvider
          fieldUid={fieldUid}
          localUsed={localUsed}
        >
          <MainContext
            fieldUid={fieldUid}
            localUsed={localUsed}
            objUid={objUid}
            // TODO get from back
            userName="Пользователь"
            wrapRef={wrapEditorRef as RefObject<HTMLDivElement>}
          >
            <SettingsContextProvider>
              <FlashMessageContext>
                <LexicalExtensionComposer
                  contentEditable={null}
                  extension={app}
                >
                  <BlockAnchorProvider>
                    <CommentContextProvider>
                      <SharedHistoryContext>
                        <TableContext>
                          <ToolbarContext>
                            <div className="editor-shell">
                              <Editor />
                            </div>
                            <Settings />
                          </ToolbarContext>
                        </TableContext>
                      </SharedHistoryContext>
                    </CommentContextProvider>
                  </BlockAnchorProvider>

                </LexicalExtensionComposer>
              </FlashMessageContext>
            </SettingsContextProvider>
          </MainContext>
        </DataAdapterProvider>
      </LexicalCollaboration>
    </div>
  );
};
