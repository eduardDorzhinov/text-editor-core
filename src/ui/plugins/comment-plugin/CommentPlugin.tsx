import {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { BsSend } from "react-icons/bs";
import { RiDeleteBinLine } from "react-icons/ri";

import {
  $createMarkNode,
  $getMarkIDs,
  $isMarkNode,
  $unwrapMarkNode,
  $wrapSelectionInMarkNode,
  MarkNode,
} from "@lexical/mark";
import { useCollaborationContext } from "@lexical/react/LexicalCollaborationContext";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { createDOMRange, createRectsFromDOMRange } from "@lexical/selection";
import { mergeRegister, registerNestedElementResolver } from "@lexical/utils";
import type { Provider } from "@lexical/yjs";
import clsx from "clsx";
import {
  type LexicalCommand,
  type LexicalEditor,
  type NodeKey,
  type RangeSelection,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  CLEAR_EDITOR_COMMAND,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  getDOMSelection,
} from "lexical";
import type { Doc } from "yjs";
import * as Y from "yjs";

import { serializeComments } from "@/lib/utils/commentsPersistence";
import { YDS_COMMENT_KEY } from "@/model";
import { useCommentContext } from "@/model/providers/CommentContext";
import { useDataAdapter } from "@/model/providers/DataAdapterContext";
import { useMainContext } from "@/model/providers/MainContext";
import { useSettings } from "@/model/providers/SettingsContext";
import { Button } from "@/ui/components/button";
import { useModal } from "@/ui/components/modal";

import {
  Comment,
  Comments,
  CommentStore,
  createComment,
  createThread,
  Thread,
  useCommentStore,
} from "./comment-store";
import { LocalProvider } from "./local-provider";

import "./index.scss";

export const INSERT_INLINE_COMMAND: LexicalCommand<void> = createCommand("INSERT_INLINE_COMMAND");

// Комментарий ко ВСЕЙ ноде. Диспатчится кнопкой в тулбаре блока
// (DraggableBlockPlugin). Payload: blockId (block-anchor id, для навигации и
// персиста) + quote (короткое превью содержимого блока для сайдбара).
export const INSERT_BLOCK_COMMENT_COMMAND: LexicalCommand<{
  blockId: string,
  quote: string,
}> = createCommand("INSERT_BLOCK_COMMENT_COMMAND");

// Модалка ввода комментария к блоку. Отдельная от inline CommentInputBox —
// не привязана к выделению текста, просто textarea + кнопки.
const BlockCommentDialog: FC<{
  quote: string,
  onSubmit: (content: string) => void,
  onClose: () => void,
}> = ({
  quote,
  onSubmit,
  onClose,
}) => {
  const [ content, setContent ] = useState("");
  const canSubmit = content.trim().length !== 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(content.trim());
    onClose();
  };

  return (
    <div className="CommentPlugin_BlockCommentDialog">
      {
        quote && (
          <blockquote className="CommentPlugin_BlockCommentDialog_Quote">
            {quote}
          </blockquote>
        )
      }
      <textarea
        autoFocus
        className="CommentPlugin_BlockCommentDialog_Input"
        placeholder="Комментарий к блоку..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={
          (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }
        }
      />
      <div className="CommentPlugin_BlockCommentDialog_Buttons">
        <Button onClick={onClose}>Отмена</Button>
        <Button
          disabled={!canSubmit}
          onClick={submit}
        >Добавить
        </Button>
      </div>
    </div>
  );
};

const CommentInputBox: FC<{
  cancelAddComment: () => void,
  editor: LexicalEditor,
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: RangeSelection | null,
  ) => void,
}> = ({
  editor,
  cancelAddComment,
  submitAddComment,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<RangeSelection | null>(null);

  const [ content, setContent ] = useState("");
  const canSubmit = content.trim().length !== 0;

  const selectionState = useMemo(() => ({
    container: document.createElement("div"),
    elements: [] as HTMLSpanElement[],
  }), []);

  const author = useCollabAuthorName();

  const getScrollContainer = useCallback((): HTMLElement | null => {
    const root = editor.getRootElement();
    if (!root) return null;
    let el: HTMLElement | null = root;
    while (el) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") return el;
      el = el.parentElement;
    }
    return root;
  }, [ editor ]);

  const updateSelectionRects = useCallback((selectionRects: DOMRect[]) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    const { container, elements } = selectionState;
    const containerRect = scrollContainer.getBoundingClientRect();
    const scrollX = scrollContainer.scrollLeft;
    const scrollY = scrollContainer.scrollTop;

    const selectionRectsLength = selectionRects.length;
    const elementsLength = elements.length;

    for (let i = 0; i < selectionRectsLength; i++) {
      const rect = selectionRects[ i ];
      let elem = elements[ i ];

      if (!elem) {
        elem = document.createElement("span");
        elements[ i ] = elem;
        container.appendChild(elem);
      }

      const x = rect.left - containerRect.left + scrollX;
      const y = rect.top - containerRect.top + scrollY;

      elem.style.cssText = `
        position:absolute;
        transform: translate(${x}px, ${y}px);
        width:${rect.width}px;
        height:${rect.height}px;
        background-color: rgba(255, 212, 0, 0.3);
        pointer-events:none;
        z-index:5;
      `;
    }

    for (let i = elementsLength - 1; i >= selectionRectsLength; i--) {
      const elem = elements[ i ];
      if (elem.parentNode === container) container.removeChild(elem);
      elements.pop();
    }
  }, [ selectionState, getScrollContainer ]);

  const updateLocation = useCallback(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      selectionRef.current = selection.clone();

      const range = createDOMRange(
        editor,
        selection.anchor.getNode(),
        selection.anchor.offset,
        selection.focus.getNode(),
        selection.focus.offset,
      );
      if (!range) return;

      const selectionRects = createRectsFromDOMRange(editor, range);
      updateSelectionRects(selectionRects);

      const boxElem = boxRef.current;
      if (!boxElem || selectionRects.length === 0) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const boxRect = boxElem.getBoundingClientRect();
      const firstRect = selectionRects[ 0 ];

      const halfWidth = boxRect.width / 2;
      const VERTICAL_GAP = 10;
      const HORIZONTAL_PADDING = 10;

      // Начальные координаты относительно scroll-контейнера
      let x =
        firstRect.left - containerRect.left + scrollContainer.scrollLeft + firstRect.width / 2 - halfWidth;
      let y = firstRect.bottom - containerRect.top + scrollContainer.scrollTop + VERTICAL_GAP;

      // Край слева / справа по viewport
      const maxX = scrollContainer.scrollLeft + window.innerWidth - boxRect.width - HORIZONTAL_PADDING;
      x = Math.max(HORIZONTAL_PADDING + scrollContainer.scrollLeft, Math.min(x, maxX));

      // Если не помещается снизу — показываем сверху
      if (y + boxRect.height > scrollContainer.scrollTop + window.innerHeight - VERTICAL_GAP) {
        y = firstRect.top - containerRect.top + scrollContainer.scrollTop - boxRect.height - VERTICAL_GAP;
      }

      // Clamp сверху
      y = Math.max(scrollContainer.scrollTop + VERTICAL_GAP, y);

      boxElem.style.position = "absolute";
      boxElem.style.left = `${x}px`;
      boxElem.style.top = `${y}px`;
    });
  }, [
    editor,
    getScrollContainer,
    updateSelectionRects,
  ]);

  useLayoutEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    const container = selectionState.container;

    // Сначала убираем из DOM на всякий случай
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }

    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "0";
    container.style.pointerEvents = "none";
    container.style.zIndex = "5";

    const prevPosition = scrollContainer.style.position;
    if (!prevPosition || prevPosition === "static") scrollContainer.style.position = "relative";

    // Сначала вычисляем позицию overlay
    updateLocation();

    // После вычисления добавляем в DOM
    scrollContainer.appendChild(container);

    return () => {
      scrollContainer.removeChild(container);
      scrollContainer.style.position = prevPosition;
    };
  }, [
    editor,
    getScrollContainer,
    selectionState,
    updateLocation,
  ]);


  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateLocation();
        rafId = null;
      });
    };
    scrollContainer.addEventListener("scroll", onScroll);
    return () => {
      scrollContainer.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ getScrollContainer, updateLocation ]);

  useEffect(() => {
    window.addEventListener("resize", updateLocation);
    return () => window.removeEventListener("resize", updateLocation);
  }, [ updateLocation ]);

  const onEscape = (event: KeyboardEvent): boolean => {
    event.preventDefault();
    cancelAddComment();
    return true;
  };

  const submitComment = () => {
    if (!canSubmit) return;
    let quote = editor.getEditorState().read(() => {
      const selection = selectionRef.current;
      return selection ?
        selection.getTextContent() :
        "";
    });
    if (quote.length > 100) quote = quote.slice(0, 99) + "…";

    submitAddComment(
      createThread(quote, [ createComment(content, author) ]), true, undefined, selectionRef.current,
    );
    selectionRef.current = null;
  };

  return (
    <div
      ref={boxRef}
      className="CommentPlugin_CommentInputBox"
    >
      <textarea
        autoFocus
        className="CommentPlugin_CommentInputBox_Input"
        placeholder="Добавьте комментарий..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={
          (e) => {
            if (e.key === "Escape") onEscape(e as unknown as KeyboardEvent);
          }
        }
      />
      <div className="CommentPlugin_CommentInputBox_Buttons">
        <Button
          className="CommentPlugin_CommentInputBox_Button"
          onClick={cancelAddComment}
        >Отмена
        </Button>
        <Button
          className="CommentPlugin_CommentInputBox_Button CommentPlugin_CommentInputBox_Button_primary"
          disabled={!canSubmit}
          onClick={submitComment}
        >Добавить
        </Button>
      </div>
    </div>
  );
};


const CommentsComposer: FC<{
  submitAddComment: (
    commentOrThread: Comment,
    isInlineComment: boolean,
    thread?: Thread,
  ) => void,
  thread?: Thread,
}> = ({
  submitAddComment,
  thread,
}) => {
  const editorRef = useRef<LexicalEditor>(null);
  const author = useCollabAuthorName();

  const [ content, setContent ] = useState("");
  const canSubmit = content.trim().length;

  const submitComment = () => {
    if (!canSubmit) return;
    submitAddComment(
      createComment(content, author),
      false,
      thread,
    );
    const editor = editorRef.current;
    if (editor !== null) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
    }
    setContent("");
  };

  return (
    <div className="CommentPlugin_CommentsPanel_Input_wrap">
      <input
        autoFocus
        className="CommentPlugin_CommentsPanel_Input"
        placeholder="Ответить"
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <Button
        className="CommentPlugin_CommentsPanel_SendButton"
        disabled={!canSubmit}
        onClick={submitComment}
      >
        <BsSend />
      </Button>
    </div>
  );
};

const ShowDeleteCommentOrThreadDialog: FC<{
  commentOrThread: Comment | Thread,
  deleteCommentOrThread: (
    comment: Comment | Thread,
    thread?: Thread,
  ) => void,
  onClose: () => void,
  thread?: Thread,
}> = ({
  commentOrThread,
  deleteCommentOrThread,
  onClose,
  thread = undefined,
}) => {
  return (
    <>
      Вы уверены, что хотите удалить
      {" "}
      {
        !thread ?
          "обсуждение" :
          "комментарий"
      }
      ?
      <div className="Modal__content ShowDeleteCommentOrThreadDialog_Modal__content">
        <Button
          onClick={
            () => {
              deleteCommentOrThread(commentOrThread, thread);
              onClose();
            }
          }
        >
          Удалить
        </Button>
        {" "}
        <Button onClick={onClose}>
          Отмена
        </Button>
      </div>
    </>
  );
};

const CommentsPanelListComment: FC<{
  comment: Comment,
  deleteComment: (
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ) => void,
  rtf: Intl.RelativeTimeFormat,
  thread?: Thread,
}> = ({
  comment,
  deleteComment,
  thread,
  rtf,
}) => {
  const seconds = Math.round((performance.timeOrigin + performance.now() - comment.timeStamp) / 1000);
  const minutes = Math.round(seconds / 60);
  const [ modal, showModal ] = useModal();

  return (
    <li className="CommentPlugin_CommentsPanel_List_Comment">
      <div className="CommentPlugin_CommentsPanel_List_Details">
        <span className="CommentPlugin_CommentsPanel_List_Comment_Author">
          {comment.author}
        </span>
        <span className="CommentPlugin_CommentsPanel_List_Comment_Time">
          · {
            seconds < 10 ?
              "Сейчас" :
              rtf.format(-minutes, "minute")
          }
        </span>
      </div>
      <p
        className={
          comment.deleted ?
            "CommentPlugin_CommentsPanel_DeletedComment" :
            ""
        }
      >
        {comment.content}
      </p>
      {
        !comment.deleted && (
          <>
            <Button
              className="CommentPlugin_CommentsPanel_List_DeleteButton"
              onClick={
                () => {
                  showModal(
                    "Удалить комментарий",
                    (onClose) => (
                      <ShowDeleteCommentOrThreadDialog
                        commentOrThread={comment}
                        deleteCommentOrThread={deleteComment}
                        thread={thread}
                        onClose={onClose}
                      />
                    ),
                    false,
                    true,
                  );
                }
              }
            >
              <RiDeleteBinLine />
            </Button>
            {modal}
          </>
        )
      }
    </li>
  );
};

const CommentsPanelList: FC<{
  activeBlockId: string | null,
  activeIDs: Array<string>,
  comments: Comments,
  deleteCommentOrThread: (
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ) => void,
  listRef: { current: null | HTMLUListElement },
  markNodeMap: Map<string, Set<NodeKey>>,
  onSelectBlock: (blockId: string | null) => void,
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
  ) => void,
}> = ({
  activeBlockId,
  activeIDs,
  comments,
  deleteCommentOrThread,
  listRef,
  submitAddComment,
  markNodeMap,
  onSelectBlock,
}) => {
  const [ editor ] = useLexicalComposerContext();
  const [ counter, setCounter ] = useState(0);
  const [ modal, showModal ] = useModal();

  const rtf = useMemo(() =>
    new Intl.RelativeTimeFormat("ru", {
      localeMatcher: "best fit",
      numeric: "auto",
      style: "short",
    }),
  []);

  useEffect(() => {
    // Used to keep the time stamp up to date
    const id = setTimeout(() => {
      setCounter(counter + 1);
    }, 10000);

    return () => {
      clearTimeout(id);
    };
  }, [ counter ]);

  return (
    <ul
      ref={listRef}
      className="CommentPlugin_CommentsPanel_List"
    >
      {
        comments.map((commentOrThread) => {
          const id = commentOrThread.id;
          if (commentOrThread.type === "thread") {
            const blockId = commentOrThread.blockId;
            const handleClickThread = () => {
              // Комментарий ко всей ноде: делаем обсуждение активным (левый
              // бордер) и подсвечиваем сам блок ярче, скроллим к нему по id.
              // Подсветка держится, пока не кликнут в текст (см. updateListener).
              if (blockId) {
                onSelectBlock(blockId);
                document.getElementById(blockId)?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                return;
              }
              const markNodeKeys = markNodeMap.get(id);
              if (
                markNodeKeys !== undefined &&
                (activeIDs === null || activeIDs.indexOf(id) === -1)
              ) {
                const activeElement = document.activeElement;
                // Move selection to the start of the mark, so that we
                // update the UI with the selected thread.
                editor.update(() => {
                  const markNodeKey = Array.from(markNodeKeys)[ 0 ];
                  const markNode = $getNodeByKey<MarkNode>(markNodeKey);
                  if ($isMarkNode(markNode)) {
                    markNode.selectStart();
                  }
                },
                {
                  onUpdate() {
                    // Restore selection to the previous element
                    if (activeElement !== null) {
                      (activeElement as HTMLElement).focus();
                    }
                  },
                });
              }
            };

            return (
              <li
                key={id}
                className={
                  clsx("CommentPlugin_CommentsPanel_List_Thread", {
                    "interactive" : markNodeMap.has(id) || Boolean(blockId),
                    "active": activeIDs.indexOf(id) !== -1 ||
                      (blockId ?
                        blockId === activeBlockId :
                        false),
                  })
                }
                onClick={handleClickThread}
              >
                <div className="CommentPlugin_CommentsPanel_List_Thread_QuoteBox">
                  <blockquote className="CommentPlugin_CommentsPanel_List_Thread_Quote">
                    {
                      blockId && (
                        <span className="CommentPlugin_CommentsPanel_List_Thread_BlockBadge">
                          Блок
                        </span>
                      )
                    }
                    {"> "}
                    <span>{commentOrThread.quote}</span>
                  </blockquote>
                  <Button
                    className="CommentPlugin_CommentsPanel_List_DeleteButton"
                    onClick={
                      () => {
                        showModal(
                          "Удалить обсуждение",
                          (onClose) => (
                            <ShowDeleteCommentOrThreadDialog
                              commentOrThread={commentOrThread}
                              deleteCommentOrThread={deleteCommentOrThread}
                              onClose={onClose}
                            />
                          ),
                          false,
                          true,
                        );
                      }
                    }
                  >
                    <RiDeleteBinLine />
                  </Button>
                  {modal}
                </div>
                <ul className="CommentPlugin_CommentsPanel_List_Thread_Comments">
                  {
                    commentOrThread.comments.map((comment) => (
                      <CommentsPanelListComment
                        key={comment.id}
                        comment={comment}
                        deleteComment={deleteCommentOrThread}
                        rtf={rtf}
                        thread={commentOrThread}
                      />
                    ))
                  }
                </ul>
                <CommentsComposer
                  submitAddComment={submitAddComment}
                  thread={commentOrThread}
                />
              </li>
            );
          }
          return (
            <CommentsPanelListComment
              key={id}
              comment={commentOrThread}
              deleteComment={deleteCommentOrThread}
              rtf={rtf}
            />
          );
        })
      }
    </ul>
  );
};

const CommentsPanel: FC<{
  activeBlockId: string | null,
  activeIDs: Array<string>,
  comments: Comments,
  deleteCommentOrThread: (
    commentOrThread: Comment | Thread,
    thread?: Thread,
  ) => void,
  markNodeMap: Map<string, Set<NodeKey>>,
  onClose: () => void,
  onSelectBlock: (blockId: string | null) => void,
  submitAddComment: (
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
  ) => void,
}> = ({
  activeBlockId,
  activeIDs,
  deleteCommentOrThread,
  comments,
  submitAddComment,
  markNodeMap,
  onClose,
  onSelectBlock,
}) => {
  const listRef = useRef<HTMLUListElement>(null);
  const isEmpty = comments.length === 0;

  return (
    <div className="CommentPlugin_CommentsPanel">
      <div className="CommentPlugin_CommentsPanel_Header">
        <h2 className="CommentPlugin_CommentsPanel_Heading">Комментарии</h2>
        <button
          aria-label="Закрыть"
          className="CommentPlugin_CommentsPanel_CloseButton"
          type="button"
          onClick={onClose}
        >
          &times;
        </button>
      </div>
      {
        isEmpty ?
          (
            <div className="CommentPlugin_CommentsPanel_Empty">Комментариев пока нет</div>
          ) :
          (
            <CommentsPanelList
              activeBlockId={activeBlockId}
              activeIDs={activeIDs}
              comments={comments}
              deleteCommentOrThread={deleteCommentOrThread}
              listRef={listRef}
              markNodeMap={markNodeMap}
              submitAddComment={submitAddComment}
              onSelectBlock={onSelectBlock}
            />
          )
      }
    </div>
  );
};

function useCollabAuthorName(): string {
  const collabContext = useCollaborationContext();
  const { yjsDocMap, name } = collabContext;
  return yjsDocMap.has("comments") ?
    name :
    "Пользователь";
}

export const CommentPlugin: FC<{
  providerFactory?: (id: string, yjsDocMap: Map<string, Doc>) => Provider,
}> = ({
  providerFactory,
}) => {
  const {
    showCommentSidebar,
    setShowCommentSidebar,
    commentStore,
  } = useCommentContext();
  const { wrapRef, userName, fieldUid } = useMainContext();
  const { settings: { commentMode }} = useSettings();
  const dataAdapter = useDataAdapter();

  const [ editor ] = useLexicalComposerContext();
  const collabContext = useCollaborationContext();

  const { yjsDocMap } = collabContext;

  const comments = useCommentStore(commentStore as CommentStore);
  const markNodeMap = useMemo<Map<string, Set<NodeKey>>>(() => new Map(), []);

  const [ activeIDs, setActiveIDs ] = useState<Array<string>>([]);
  // id блока (block-anchor id) выбранного в сайдбаре блочного обсуждения —
  // аналог activeIDs для inline. Пока задан: обсуждение «активно» (левый
  // бордер), а сам блок подсвечен ярче (.edt-block-commented.selected).
  const [ activeBlockId, setActiveBlockId ] = useState<string | null>(null);
  const [ showCommentInput, setShowCommentInput ] = useState(false);
  const [ blockCommentTarget, setBlockCommentTarget ] = useState<{ blockId: string, quote: string } | null>(null);
  const [ blockModal, showBlockModal ] = useModal();
  const author = useCollabAuthorName();

  const triggerSave = useCallback(() => {
    const dataToSave: { json?: object, html?: string, comments?: number[] } = {};
    dataToSave.json = editor.getEditorState().toJSON();
    const commentsDoc = yjsDocMap.get(YDS_COMMENT_KEY);
    if (commentsDoc) {
      dataToSave.comments = serializeComments(commentsDoc);
    }
    dataAdapter.save(fieldUid, dataToSave);
  }, [
    dataAdapter,
    editor,
    fieldUid,
    yjsDocMap,
  ]);

  // Выбор блочного обсуждения в сайдбаре. Делает активным только блок:
  // снимаем inline-подсветку (activeIDs) и убираем каретку из текста, чтобы
  // одновременно не были подсвечены и блок, и строчный комментарий.
  const handleSelectBlock = useCallback((blockId: string | null) => {
    setActiveBlockId(blockId);
    if (blockId) {
      setActiveIDs([]);
      editor.update(() => {
        $setSelection(null);
      });
    }
  }, [ editor ]);

  const cancelAddComment = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      // Restore selection
      if (selection !== null) {
        selection.dirty = true;
      }
    });
    setShowCommentInput(false);
  }, [ editor ]);

  const deleteCommentOrThread = useCallback((comment: Comment | Thread, thread?: Thread) => {
    if (comment.type === "comment") {
      const deletionInfo = (commentStore as CommentStore).deleteCommentOrThread(comment,
        thread);
      if (!deletionInfo) {
        return;
      }
      const { markedComment, index } = deletionInfo;
      (commentStore as CommentStore).addComment(
        markedComment, thread, index,
      );
    } else {
      (commentStore as CommentStore).deleteCommentOrThread(comment);
      // Remove ids from associated marks
      const id = thread !== undefined ?
        thread.id :
        comment.id;
      const markNodeKeys = markNodeMap.get(id);
      if (markNodeKeys !== undefined) {
        // Defer to avoid React state update during render
        queueMicrotask(() => {
          editor.update(() => {
            for (const key of markNodeKeys) {
              const node: null | MarkNode = $getNodeByKey(key);
              if ($isMarkNode(node)) {
                node.deleteID(id);
                if (node.getIDs().length === 0) {
                  $unwrapMarkNode(node);
                }
              }
            }
          });
        });
      }
    }
    triggerSave();
  },
  [
    commentStore,
    editor,
    markNodeMap,
    triggerSave,
  ]);

  // Создать обсуждение, привязанное ко всему блоку (без MarkNode).
  const submitBlockComment = useCallback((
    blockId: string,
    quote: string,
    content: string,
  ) => {
    const thread = createThread(
      quote, [ createComment(content, author) ], undefined, blockId,
    );
    (commentStore as CommentStore).addComment(thread);
    triggerSave();
    setShowCommentSidebar(true);
  }, [
    author,
    commentStore,
    triggerSave,
    setShowCommentSidebar,
  ]);

  // Открываем модалку ввода, когда пришёл INSERT_BLOCK_COMMENT_COMMAND.
  useEffect(() => {
    if (!blockCommentTarget) return;
    const { blockId, quote } = blockCommentTarget;
    setBlockCommentTarget(null);
    showBlockModal(
      "Комментарий к блоку",
      (onClose) => (
        <BlockCommentDialog
          quote={quote}
          onClose={onClose}
          onSubmit={
            (content) => submitBlockComment(
              blockId, quote, content,
            )
          }
        />
      ),
      true,
    );
  }, [
    blockCommentTarget,
    showBlockModal,
    submitBlockComment,
  ]);

  const submitAddComment = useCallback((
    commentOrThread: Comment | Thread,
    isInlineComment: boolean,
    thread?: Thread,
    selection?: RangeSelection | null,
  ) => {
    (commentStore as CommentStore).addComment(commentOrThread, thread);
    if (isInlineComment) {
      editor.update(() => {
        if ($isRangeSelection(selection)) {
          const isBackward = selection.isBackward();
          const id = commentOrThread.id;

          // Wrap content in a MarkNode
          $wrapSelectionInMarkNode(
            selection, isBackward, id,
          );
        }
      });
      setShowCommentInput(false);
    }
    triggerSave();
  },
  [
    commentStore,
    editor,
    triggerSave,
  ]);

  useEffect(() => {
    if (!yjsDocMap.has(YDS_COMMENT_KEY)) {
      yjsDocMap.set(YDS_COMMENT_KEY, new Y.Doc());
    }

    const doc = yjsDocMap.get(YDS_COMMENT_KEY)!;

    let provider: Provider;
    if (providerFactory) {
      provider = providerFactory(YDS_COMMENT_KEY, yjsDocMap);
    } else {
      provider = new LocalProvider(doc);
    }

    return (commentStore as CommentStore).registerCollaboration(provider);
  }, [
    commentStore,
    providerFactory,
    userName,
    yjsDocMap,
  ]);

  useEffect(() => {
    const changedElems: Array<HTMLElement> = [];
    for (let i = 0; i < activeIDs.length; i++) {
      const id = activeIDs[ i ];
      const keys = markNodeMap.get(id);
      if (keys !== undefined) {
        for (const key of keys) {
          const elem = editor.getElementByKey(key);
          if (elem !== null) {
            elem.classList.add("selected");
            changedElems.push(elem);
            setShowCommentSidebar((prev) => prev || commentMode);
          }
        }
      }
    }
    return () => {
      for (let i = 0; i < changedElems.length; i++) {
        const changedElem = changedElems[ i ];
        changedElem.classList.remove("selected");
      }
    };
  }, [
    activeIDs,
    commentMode,
    editor,
    markNodeMap,
    setShowCommentSidebar,
  ]);

  // Постоянная жёлтая рамка у блоков, к которым есть комментарий — по аналогии
  // с подсветкой текста inline-комментариев (см. .edt-block-commented в теме).
  // Класс вешаем на DOM-элемент блока по его block-anchor id и переприменяем
  // после апдейтов редактора (реконсиляция могла заменить/пересоздать элемент).
  useEffect(() => {
    const CLASS = "edt-block-commented";
    const commentedBlockIds = new Set<string>();
    for (const c of comments) {
      if (c.type === "thread" && c.blockId) commentedBlockIds.add(c.blockId);
    }
    const apply = () => {
      document.querySelectorAll(`.${CLASS}`).forEach((el) => {
        if (!(el instanceof HTMLElement) || !commentedBlockIds.has(el.id)) {
          el.classList.remove(CLASS, "selected");
        }
      });
      commentedBlockIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add(CLASS);
        // .selected — более яркая рамка у активного блока (как у выделенного
        // inline-обсуждения), остальные комментированные блоки — базовая.
        el.classList.toggle("selected", id === activeBlockId);
      });
    };
    apply();
    // block-anchor выставляет id блока тоже на апдейте — переприменяем после
    // всех слушателей (микротаск), чтобы id уже стоял на новом элементе.
    const unregister = editor.registerUpdateListener(() => {
      queueMicrotask(apply);
    });
    return () => {
      unregister();
      document.querySelectorAll(`.${CLASS}`).forEach((el) =>
        el.classList.remove(CLASS, "selected"));
    };
  }, [
    comments,
    editor,
    activeBlockId,
  ]);

  useEffect(() => {
    const markNodeKeysToIDs: Map<NodeKey, Array<string>> = new Map();

    return mergeRegister(
      registerNestedElementResolver<MarkNode>(
        editor,
        MarkNode,
        (from: MarkNode) => {
          return $createMarkNode(from.getIDs());
        },
        (from: MarkNode, to: MarkNode) => {
          // Merge the IDs
          const ids = from.getIDs();
          ids.forEach((id) => {
            to.addID(id);
          });
        },
      ),
      editor.registerMutationListener(
        MarkNode,
        (mutations) => {
          editor.getEditorState().read(() => {
            for (const [ key, mutation ] of mutations) {
              const node: null | MarkNode = $getNodeByKey(key);
              let ids: NodeKey[] = [];

              if (mutation === "destroyed") {
                ids = markNodeKeysToIDs.get(key) || [];
              } else if ($isMarkNode(node)) {
                ids = node.getIDs();
              }

              for (let i = 0; i < ids.length; i++) {
                const id = ids[ i ];
                let markNodeKeys = markNodeMap.get(id);
                markNodeKeysToIDs.set(key, ids);

                if (mutation === "destroyed") {
                  if (markNodeKeys !== undefined) {
                    markNodeKeys.delete(key);
                    if (markNodeKeys.size === 0) {
                      markNodeMap.delete(id);
                    }
                  }
                } else {
                  if (markNodeKeys === undefined) {
                    markNodeKeys = new Set();
                    markNodeMap.set(id, markNodeKeys);
                  }
                  if (!markNodeKeys.has(key)) {
                    markNodeKeys.add(key);
                  }
                }
              }
            }
          });
        },
        { skipInitialization: false },
      ),
      editor.registerUpdateListener(({ editorState, tags }) => {
        editorState.read(() => {
          const selection = $getSelection();
          let hasActiveIds = false;

          if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();

            if ($isTextNode(anchorNode)) {
              const commentIDs = $getMarkIDs(anchorNode,
                selection.anchor.offset);
              if (commentIDs !== null) {
                setActiveIDs(commentIDs);
                hasActiveIds = true;
              }
            }
          }
          if (!hasActiveIds) {
            setActiveIDs((_activeIds) =>
              _activeIds.length === 0 ?
                _activeIds :
                []);
          }
          if (!tags.has(COLLABORATION_TAG) && $isRangeSelection(selection)) {
            setShowCommentInput(false);
          }
          // Клик/каретка в тексте деактивируют выбранный блочный комментарий
          // (аналогично тому, как activeIDs перебивают друг друга).
          if ($isRangeSelection(selection)) {
            setActiveBlockId((prev) => (prev === null ?
              prev :
              null));
          }
        });
      }),
      editor.registerCommand(
        INSERT_INLINE_COMMAND,
        () => {
          const domSelection = getDOMSelection(editor._window);
          if (domSelection !== null) {
            domSelection.removeAllRanges();
          }
          setShowCommentInput(true);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        INSERT_BLOCK_COMMENT_COMMAND,
        (payload) => {
          setBlockCommentTarget(payload);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  }, [ editor, markNodeMap ]);

  return (
    <>
      {
        showCommentInput &&
        createPortal(<CommentInputBox
          cancelAddComment={cancelAddComment}
          editor={editor}
          submitAddComment={submitAddComment}
        />,
        wrapRef?.current || document?.body)
      }
      {
        showCommentSidebar &&
        createPortal(<CommentsPanel
          activeBlockId={activeBlockId}
          activeIDs={activeIDs}
          comments={comments}
          deleteCommentOrThread={deleteCommentOrThread}
          markNodeMap={markNodeMap}
          submitAddComment={submitAddComment}
          onClose={() => setShowCommentSidebar(false)}
          onSelectBlock={handleSelectBlock}
        />,
        wrapRef?.current || document?.body)
      }
      {blockModal}
    </>
  );
};
