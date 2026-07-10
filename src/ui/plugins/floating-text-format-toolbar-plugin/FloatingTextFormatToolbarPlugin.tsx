import {
  Dispatch,
  Fragment,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FiBold,
  FiCode,
  FiItalic,
  FiLink,
  FiUnderline,
} from "react-icons/fi";
import { GoComment } from "react-icons/go";
import { MdOutlineFormatClear } from "react-icons/md";
import {
  RxLetterCaseCapitalize,
  RxLetterCaseLowercase,
  RxLetterCaseUppercase,
  RxStrikethrough,
} from "react-icons/rx";
import { TbSubscript, TbSuperscript } from "react-icons/tb";

import { $isCodeHighlightNode } from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import clsx from "clsx";
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  getDOMSelection,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from "lexical";

import { isKeyboardInput } from "@/lib/utils/focusUtils";
import { getDOMRangeRect } from "@/lib/utils/getDOMRangeRect";
import { getSelectedNode } from "@/lib/utils/getSelectedNode";
import { setFloatingElemPosition } from "@/lib/utils/setFloatingElemPosition";
import { useSettings } from "@/model/providers/SettingsContext";
import { clearFormatting } from "@/ui/components/toolbar/utils";
import { Tooltip } from "@/ui/components/tooltip";
import { INSERT_INLINE_COMMAND } from "@/ui/plugins/comment-plugin";
import { useScopedPortal } from "@/vendor/shared";

import "./FloatingTextFormatToolbarPlugin.scss";

function TextFormatFloatingToolbar({
  editor,
  anchorElem,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isUppercase,
  isLowercase,
  isCapitalize,
  isCode,
  isStrikethrough,
  isSubscript,
  isSuperscript,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  isBold: boolean,
  isCode: boolean,
  isItalic: boolean,
  isLink: boolean,
  isUppercase: boolean,
  isLowercase: boolean,
  isCapitalize: boolean,
  isStrikethrough: boolean,
  isSubscript: boolean,
  isSuperscript: boolean,
  isUnderline: boolean,
  setIsLinkEditMode: Dispatch<boolean>,
}): ReactElement {
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null);

  const isEditable = editor.isEditable();
  const { settings: { commentMode }} = useSettings();

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
    } else {
      setIsLinkEditMode(false);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [
    editor,
    isLink,
    setIsLinkEditMode,
  ]);

  function mouseMoveListener(e: MouseEvent) {
    if (
      popupCharStylesEditorRef?.current &&
      (e.buttons === 1 || e.buttons === 3)
    ) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "none") {
        const x = e.clientX;
        const y = e.clientY;
        const elementUnderMouse = document.elementFromPoint(x, y);

        if (!popupCharStylesEditorRef.current.contains(elementUnderMouse)) {
          // Mouse is not over the target element => not a normal click, but probably a drag
          popupCharStylesEditorRef.current.style.pointerEvents = "none";
        }
      }
    }
  }
  function mouseUpListener(_e: MouseEvent) {
    if (popupCharStylesEditorRef?.current) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== "auto") {
        popupCharStylesEditorRef.current.style.pointerEvents = "auto";
      }
    }
  }

  useEffect(() => {
    if (popupCharStylesEditorRef?.current) {
      document.addEventListener("mousemove", mouseMoveListener);
      document.addEventListener("mouseup", mouseUpListener);

      return () => {
        document.removeEventListener("mousemove", mouseMoveListener);
        document.removeEventListener("mouseup", mouseUpListener);
      };
    }
  }, [ popupCharStylesEditorRef ]);

  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection();

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = getDOMSelection(editor._window);

    if (popupCharStylesEditorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);

      setFloatingElemPosition(
        rangeRect,
        popupCharStylesEditorElem,
        anchorElem,
        isLink,
      );
    }
  }, [
    editor,
    anchorElem,
    isLink,
  ]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;

    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar();
      });
    };

    window.addEventListener("resize", update);
    if (scrollerElem) {
      scrollerElem.addEventListener("scroll", update);
    }

    return () => {
      window.removeEventListener("resize", update);
      if (scrollerElem) {
        scrollerElem.removeEventListener("scroll", update);
      }
    };
  }, [
    editor,
    $updateTextFormatFloatingToolbar,
    anchorElem,
  ]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar();
    });
    return mergeRegister(editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        $updateTextFormatFloatingToolbar();
      });
    }),

    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        $updateTextFormatFloatingToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ));
  }, [ editor, $updateTextFormatFloatingToolbar ]);

  const items: Array<{
    ariaLabel: string,
    className: string,
    title: string,
    hotkeyId?: string,
    onClick: (e?: unknown) => void,
    Icon: typeof FiBold,
    showIsEditable: boolean,
  }> = [
    {
      ariaLabel: "Format text as bold",
      className: clsx("ftft_plugin__btn", isBold && "active"),
      title: "Жирный",
      hotkeyId: "bold",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"),
      Icon: FiBold,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format text as italics",
      className: clsx("ftft_plugin__btn", isItalic && "active"),
      title: "Курсив",
      hotkeyId: "italic",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"),
      Icon: FiItalic,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format text to underlined",
      className: clsx("ftft_plugin__btn", isUnderline && "active"),
      title: "Подчёркнутый",
      hotkeyId: "underline",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"),
      Icon: FiUnderline,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format text with a strikethrough",
      className: clsx("ftft_plugin__btn", isStrikethrough && "active"),
      title: "Зачёркнутый",
      hotkeyId: "strikethrough",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"),
      Icon: RxStrikethrough,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format Subscript",
      className: clsx("ftft_plugin__btn", isSubscript && "active"),
      title: "Подстрочный",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript"),
      Icon: TbSubscript,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format Superscript",
      className: clsx("ftft_plugin__btn", isSuperscript && "active"),
      title: "Надстрочный",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript"),
      Icon: TbSuperscript,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format text to uppercase",
      className: clsx("ftft_plugin__btn", isUppercase && "active"),
      title: "Заглавные",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "uppercase"),
      Icon: RxLetterCaseUppercase,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format text to lowercase",
      className: clsx("ftft_plugin__btn", isLowercase && "active"),
      title: "Строчные",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "lowercase"),
      Icon: RxLetterCaseLowercase,
      showIsEditable: false,
    },
    {
      ariaLabel: "Format text to capitalize",
      className: clsx("ftft_plugin__btn", isCapitalize && "active"),
      title: "С заглавной",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "capitalize"),
      Icon: RxLetterCaseCapitalize,
      showIsEditable: false,
    },
    {
      ariaLabel: "Insert code block",
      className: clsx("ftft_plugin__btn", isCode && "active"),
      title: "Инлайн-код",
      hotkeyId: "code-inline",
      onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"),
      Icon: FiCode,
      showIsEditable: false,
    },
    {
      ariaLabel: "Insert link",
      className: clsx("ftft_plugin__btn", isLink && "active"),
      title: "Ссылка",
      hotkeyId: "link",
      onClick: insertLink,
      Icon: FiLink,
      showIsEditable: false,
    },
    {
      ariaLabel: "Clear formating",
      className: "ftft_plugin__btn",
      title: "Убрать форматирование",
      hotkeyId: "clear-format",
      onClick: (e: unknown) => clearFormatting(editor, isKeyboardInput(e as MouseEvent)),
      Icon: MdOutlineFormatClear,
      showIsEditable: false,
    },
    ...(commentMode ?
      [{
        ariaLabel: "add comment",
        className: "ftft_plugin__btn",
        title: "Добавить комментарий",
        onClick: () => editor.dispatchCommand(INSERT_INLINE_COMMAND, undefined),
        Icon: GoComment,
        showIsEditable: true,
      }] :
      []),
  ];

  return (
    <div
      ref={popupCharStylesEditorRef}
      className="ftft_plugin_wrap"
    >
      {
        items.map(({
          ariaLabel,
          className,
          title,
          hotkeyId,
          onClick,
          Icon,
          showIsEditable,
        }) => (
          <Fragment key={title}>
            {
              (isEditable || showIsEditable) && (
                <Tooltip
                  hotkeyId={hotkeyId}
                  label={title}
                >
                  <button
                    aria-label={ariaLabel}
                    className={className}
                    type="button"
                    onClick={onClick}
                  >
                    <Icon />
                  </button>
                </Tooltip>
              )
            }
          </Fragment>
        ))
      }
    </div>
  );
}

function useFloatingTextFormatToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  setIsLinkEditMode: Dispatch<boolean>,
): ReactElement | null {
  const scopedPortal = useScopedPortal();
  const [ isText, setIsText ] = useState(false);
  const [ isLink, setIsLink ] = useState(false);
  const [ isBold, setIsBold ] = useState(false);
  const [ isItalic, setIsItalic ] = useState(false);
  const [ isUnderline, setIsUnderline ] = useState(false);
  const [ isUppercase, setIsUppercase ] = useState(false);
  const [ isLowercase, setIsLowercase ] = useState(false);
  const [ isCapitalize, setIsCapitalize ] = useState(false);
  const [ isStrikethrough, setIsStrikethrough ] = useState(false);
  const [ isSubscript, setIsSubscript ] = useState(false);
  const [ isSuperscript, setIsSuperscript ] = useState(false);
  const [ isCode, setIsCode ] = useState(false);

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not to pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return;
      }
      const selection = $getSelection();
      const nativeSelection = getDOMSelection(editor._window);
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        return;
      }

      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = getSelectedNode(selection);

      // Update text format
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsUppercase(selection.hasFormat("uppercase"));
      setIsLowercase(selection.hasFormat("lowercase"));
      setIsCapitalize(selection.hasFormat("capitalize"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsSubscript(selection.hasFormat("subscript"));
      setIsSuperscript(selection.hasFormat("superscript"));
      setIsCode(selection.hasFormat("code"));

      // Update links
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ""
      ) {
        setIsText($isTextNode(node) || $isParagraphNode(node));
      } else {
        setIsText(false);
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, "");
      if (!selection.isCollapsed() && rawTextContent === "") {
        setIsText(false);

      }
    });
  }, [ editor ]);

  useEffect(() => {
    document.addEventListener("selectionchange", updatePopup);
    return () => {
      document.removeEventListener("selectionchange", updatePopup);
    };
  }, [ updatePopup ]);

  useEffect(() => {
    return mergeRegister(editor.registerUpdateListener(() => {
      updatePopup();
    }),
    editor.registerRootListener(() => {
      if (editor.getRootElement() === null) {
        setIsText(false);
      }
    }));
  }, [ editor, updatePopup ]);

  if (!isText) {
    return null;
  }

  return scopedPortal(<TextFormatFloatingToolbar
    anchorElem={anchorElem}
    editor={editor}
    isBold={isBold}
    isCapitalize={isCapitalize}
    isCode={isCode}
    isItalic={isItalic}
    isLink={isLink}
    isLowercase={isLowercase}
    isStrikethrough={isStrikethrough}
    isSubscript={isSubscript}
    isSuperscript={isSuperscript}
    isUnderline={isUnderline}
    isUppercase={isUppercase}
    setIsLinkEditMode={setIsLinkEditMode}
  />,
  anchorElem);
}

export function FloatingTextFormatToolbarPlugin({
  anchorElem = document.body,
  setIsLinkEditMode,
}: {
  anchorElem?: HTMLElement,
  setIsLinkEditMode: Dispatch<boolean>,
}): ReactElement | null {
  const [ editor ] = useLexicalComposerContext();
  return useFloatingTextFormatToolbar(
    editor,
    anchorElem,
    setIsLinkEditMode,
  );
}
