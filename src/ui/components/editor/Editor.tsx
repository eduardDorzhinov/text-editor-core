import { useEffect, useState } from "react";

import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { useCollaborationContext } from "@lexical/react/LexicalCollaborationContext";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { SelectionAlwaysOnDisplay } from "@lexical/react/LexicalSelectionAlwaysOnDisplay";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import clsx from "clsx";
import { $getRoot } from "lexical";

import { restoreComments } from "@/lib/utils/commentsPersistence";
import { YDS_COMMENT_KEY } from "@/model";
import { getEditorExtensionPlugins } from "@/model/editor-extensions";
import { useInitialData } from "@/model/providers/DataAdapterContext";
import { useSettings } from "@/model/providers/SettingsContext";
import { useSharedHistoryContext } from "@/model/providers/SharedHistoryContext";
import { LexicalContentEditable } from "@/ui/components/content-editable";
import { TableToolbar } from "@/ui/components/table-toolbar";
import { ToolbarPlugin } from "@/ui/components/toolbar";
import { ActionsPlugin } from "@/ui/plugins/actions-plugin";
import { AnchorHeadingPlugin } from "@/ui/plugins/anchor-heading-plugin";
import { AnchorGuardPlugin } from "@/ui/plugins/anchor-plugin";
import { AudioPlugin } from "@/ui/plugins/audio-plugin";
import { AuthorQuoteFloatingActions, AuthorQuotePlugin } from "@/ui/plugins/author-quote-plugin";
import { AutocompletePlugin } from "@/ui/plugins/autocomplete-plugin";
import { BannerPlugin, BannerToolbar } from "@/ui/plugins/banner-plugin";
import { CalloutPlugin } from "@/ui/plugins/callout-plugin";
import { CodeActionMenuPlugin } from "@/ui/plugins/code-action-menu-plugin";
import { CodeHighlightPrismPlugin } from "@/ui/plugins/code-highlight-prism";
import { CollapsiblePlugin } from "@/ui/plugins/collapsible-plugin";
import { CommentPlugin } from "@/ui/plugins/comment-plugin";
import DragDropPaste from "@/ui/plugins/dnd-paste";
import { DownloadPlugin } from "@/ui/plugins/download-plugin";
import { DraggableBlockPlugin } from "@/ui/plugins/draggable-block-plugin";
import { FloatingLinkEditorPlugin } from "@/ui/plugins/floating-link-editor-plugin";
import { FloatingTextFormatToolbarPlugin } from "@/ui/plugins/floating-text-format-toolbar-plugin";
import { HtmlPlugin } from "@/ui/plugins/html-plugin";
import ImagesPlugin from "@/ui/plugins/images";
import { ImageToolbar } from "@/ui/plugins/images/ImageToolbar";
import { KeyboardShortcutsPlugin } from "@/ui/plugins/keyboard-shortcuts-plugin";
import { ColumnToolbar, LayoutPlugin } from "@/ui/plugins/layout";
import { PLAYGROUND_TRANSFORMERS } from "@/ui/plugins/markdown-transformers";
import { MaxLengthPlugin } from "@/ui/plugins/max-length";
import { NormalizeFontPlugin } from "@/ui/plugins/normalize-font-plugin";
import { ParagraphIndentPlugin } from "@/ui/plugins/paragraph-plugin";
import { PdfPlugin } from "@/ui/plugins/pdf-plugin";
import { ScormPlugin } from "@/ui/plugins/scorm-plugin";
import { SliderPlugin } from "@/ui/plugins/slider-plugin";
import { SpeechToTextPlugin } from "@/ui/plugins/speech-to-text";
import { TabFocusPlugin } from "@/ui/plugins/tab-focus";
import { TableCellResizerPlugin } from "@/ui/plugins/table-cell-resizer";
import TableHoverActionsPlugin from "@/ui/plugins/table-hover-actions-plugin";
import { TOCPlugin } from "@/ui/plugins/toc-plugin";
import { VideoPlugin } from "@/ui/plugins/video-plugin";
import { Loader } from "@/vendor/ui-kit";

import styles from "./Editor.module.scss";

export const DEFAULT_SETTINGS = {
  disableBeforeInput: false,
  emptyEditor: true,
  hasLinkAttributes: false,
  hasNestedTables: false,
  isAutocomplete: false,
  isCharLimit: false,
  isCharLimitUtf8: false,
  isCodeHighlighted: true,
  isCollab: false,
  isMaxLength: false,
  isRichText: true,
  listStrictIndent: false,
  measureTypingPerf: false,
  selectionAlwaysOnDisplay: false,
  shouldAllowHighlightingWithBrackets: false,
  shouldPreserveNewLinesInMarkdown: false,
  showNestedEditorTreeView: false,
  showTableOfContents: false,
  tableCellBackgroundColor: true,
  tableCellMerge: true,
  tableHorizontalScroll: true,
  useCollabV2: false,
} as const;

const MainLexicalContent = () => {
  return (
    <LexicalContentEditable
      className="ContentEditable__root"
      placeholder="Введите текст.."
    />
  );
};

export const Editor = ()=> {
  const { historyState } = useSharedHistoryContext();
  const { yjsDocMap } = useCollaborationContext();
  const {
    settings: { commentMode },
  } = useSettings();

  const {
    isCodeHighlighted,
    isAutocomplete,
    isMaxLength,
    isRichText,
    tableCellMerge,
    tableCellBackgroundColor,
    tableHorizontalScroll,
    selectionAlwaysOnDisplay,
    listStrictIndent,
  } = DEFAULT_SETTINGS;

  const isEditable = useLexicalEditable();
  const placeholder = isRichText ?
    "Введите текст.." :
    "Enter some plain text...";
  const [ floatingAnchorElem, setFloatingAnchorElem ] = useState<HTMLDivElement | null>(null);

  const [ editor ] = useLexicalComposerContext();
  const [ activeEditor, setActiveEditor ] = useState(editor);
  const [ isLinkEditMode, setIsLinkEditMode ] = useState<boolean>(false);

  const initialData = useInitialData();
  const [ isInitialized, setIsInitialized ] = useState(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  useEffect(() => {
    if (isInitialized || !initialData) {
      setIsInitialized(true);
      return;
    }

    try {
      const commentsDoc = yjsDocMap.get(YDS_COMMENT_KEY);
      if (commentsDoc && initialData.comments) {
        restoreComments(commentsDoc, initialData.comments);
      }

      if (initialData.json) {
        try {
          const state = editor.parseEditorState(initialData.json as any);
          const isEmpty = state.read(() => $getRoot().getChildrenSize() === 0);
          if (!isEmpty) {
            editor.setEditorState(state);
          }
        } catch {
          // Saved state contains unknown nodes — start fresh
        }
      }
    } catch (e) {
      console.error("Failed to restore editor state:", e);
    } finally {
      setIsInitialized(true);
    }
  }, [
    editor,
    initialData,
    isInitialized,
    yjsDocMap,
  ]);

  return (
    <>
      {
        !isInitialized && (
          <div className={styles.loaderWrap}>
            <Loader />
          </div>
        )
      }

      <div className={clsx("editor-container plain-text", { "comment-disabled" : !commentMode })}>
        {
          isRichText && isEditable && (
            <>
              <ToolbarPlugin
                activeEditor={activeEditor}
                editor={editor}
                setActiveEditor={setActiveEditor}
                setIsLinkEditMode={setIsLinkEditMode}
              />
              <TableToolbar />
              <ImageToolbar />
              <ColumnToolbar />
            </>
          )
        }
        {isMaxLength && <MaxLengthPlugin maxLength={30} />}
        <DragDropPaste />
        {isInitialized && <AutoFocusPlugin />}
        {selectionAlwaysOnDisplay && <SelectionAlwaysOnDisplay />}
        <ClearEditorPlugin />
        <SpeechToTextPlugin />
        <AutoLinkPlugin matchers={[]} />
        {
          isRichText ?
            (
              <>
                <HistoryPlugin externalHistoryState={historyState} />
                <RichTextPlugin
                  contentEditable={
                    (
                      <div className="editor-scroller">
                        <div
                          ref={onRef}
                          className="editor"
                        >
                          <MainLexicalContent />
                        </div>
                      </div>
                    )
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <MarkdownShortcutPlugin transformers={PLAYGROUND_TRANSFORMERS} />
                {isCodeHighlighted && <CodeHighlightPrismPlugin />}
                <ListPlugin hasStrictIndent={listStrictIndent} />
                <TablePlugin
                  hasCellBackgroundColor={tableCellBackgroundColor}
                  hasCellMerge={tableCellMerge}
                  hasHorizontalScroll={tableHorizontalScroll}
                />
                <TableCellResizerPlugin />
                <ImagesPlugin />
                <LinkPlugin />
                <ClickableLinkPlugin disabled={isEditable} />
                <HorizontalRulePlugin />
                <TabFocusPlugin />
                <KeyboardShortcutsPlugin />
                <ParagraphIndentPlugin />
                <NormalizeFontPlugin />
                <TabIndentationPlugin maxIndent={7} />
                <LayoutPlugin />
                {
                  floatingAnchorElem && (
                    <FloatingLinkEditorPlugin
                      anchorElem={floatingAnchorElem}
                      isLinkEditMode={isLinkEditMode}
                      setIsLinkEditMode={setIsLinkEditMode}
                    />
                  )
                }
                {
                  floatingAnchorElem && (
                    <>
                      <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
                      <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
                      <TableHoverActionsPlugin anchorElem={floatingAnchorElem} />
                      <FloatingTextFormatToolbarPlugin
                        anchorElem={floatingAnchorElem}
                        setIsLinkEditMode={setIsLinkEditMode}
                      />
                    </>
                  )
                }
              </>
            ) :
            (
              <>
                <PlainTextPlugin
                  contentEditable={<LexicalContentEditable placeholder={placeholder} />}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin externalHistoryState={historyState} />
              </>
            )
        }
        {isAutocomplete && <AutocompletePlugin />}
        <ActionsPlugin />
        <VideoPlugin />
        <PdfPlugin />
        <ScormPlugin />
        <AuthorQuotePlugin />
        <AuthorQuoteFloatingActions />
        <BannerPlugin />
        <BannerToolbar />
        <TOCPlugin />
        <CalloutPlugin />
        <CollapsiblePlugin />
        <LayoutPlugin />
        <HtmlPlugin />
        <DownloadPlugin />
        <SliderPlugin />
        {
          // Плагины расширений (ноды/команды доменных вставок).
          getEditorExtensionPlugins().map((ExtPlugin, i) => (
            <ExtPlugin key={`ext-plugin-${i}`} />
          ))
        }
        <AudioPlugin />
        <AnchorHeadingPlugin />
        <AnchorGuardPlugin />
        <CommentPlugin />
      </div>
    </>
  );
};
