import {
  type MouseEvent as ReactMouseEvent,
  Dispatch,
  useCallback,
  useEffect,
  useState,
} from "react";
import { IconType } from "react-icons";
import { BiCarousel } from "react-icons/bi";
import {
  BsChatLeftQuote,
  BsCode,
  BsListOl,
  BsListUl,
  BsTypeH1,
  BsTypeH2,
  BsTypeH3,
  BsTypeH4,
  BsTypeH5,
  BsTypeH6,
} from "react-icons/bs";
import {
  CiCirclePlus,
  CiHashtag,
  CiImageOn,
  CiRedo,
  CiTextAlignCenter,
  CiTextAlignJustify,
  CiTextAlignLeft,
  CiTextAlignRight,
  CiUndo,
  CiVideoOn,
  CiViewTable,
} from "react-icons/ci";
import {
  FiBold,
  FiCode,
  FiItalic,
  FiLink,
  FiMoreHorizontal,
  FiUnderline,
} from "react-icons/fi";
import { GoColumns } from "react-icons/go";
import { IoCloudDownloadOutline, IoEarthOutline } from "react-icons/io5";
import {
  MdFormatIndentDecrease,
  MdFormatIndentIncrease,
  MdHorizontalRule,
  MdOutlineAudiotrack,
  MdOutlineClear,
} from "react-icons/md";
import { PiCaretRight, PiFilePdfLight } from "react-icons/pi";
import {
  RxLetterCaseCapitalize,
  RxLetterCaseLowercase,
  RxLetterCaseUppercase,
  RxStrikethrough,
} from "react-icons/rx";
import {
  TbFlag,
  TbInfoCircle,
  TbSubscript,
  TbSuperscript,
} from "react-icons/tb";
import { TfiText } from "react-icons/tfi";

import {
  $isCodeNode,
  getCodeLanguageOptions as getCodeLanguageOptionsPrism,
  normalizeCodeLanguage as normalizeCodeLanguagePrism,
} from "@lexical/code";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  ListNode,
} from "@lexical/list";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { $isHeadingNode } from "@lexical/rich-text";
import {
  $getSelectionStyleValueForProperty,
  getStyleObjectFromCSS,
} from "@lexical/selection";
import { $isTableNode, $isTableSelection } from "@lexical/table";
import {
  $getNearestNodeOfType,
  $isEditorIsNestedEditor,
  mergeRegister,
} from "@lexical/utils";
import {
  $addUpdateTag,
  $findMatchingParent,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  BLUR_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_NORMAL,
  CommandPayloadType,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_MODIFIER_COMMAND,
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SELECTION_FOCUS_TAG,
  TextFormatType,
  UNDO_COMMAND,
} from "lexical";

import { isKeyboardInput } from "@/lib/utils/focusUtils";
import { getSelectedNode } from "@/lib/utils/getSelectedNode";
import { sanitizeUrl } from "@/lib/utils/url";
import {
  type InsertDialogComponent,
  getEditorExtensionInsertItems,
} from "@/model/editor-extensions";
import { useMainContext } from "@/model/providers/MainContext";
import { useSettings } from "@/model/providers/SettingsContext";
import {
  BLOCK_TYPE_TO_BLOCK_NAME,
  useToolbarState,
} from "@/model/providers/ToolbarContext";
import { DropDown, DropDownItem } from "@/ui/components/dropdown";
import { useModal } from "@/ui/components/modal";
import { Tooltip } from "@/ui/components/tooltip";
import { insertAnchor } from "@/ui/plugins/anchor-plugin";
import { InsertAudioDialog } from "@/ui/plugins/audio-plugin";
import { INSERT_AUTHOR_QUOTE_COMMAND } from "@/ui/plugins/author-quote-plugin";
import { $isBannerNode, INSERT_BANNER_COMMAND } from "@/ui/plugins/banner-plugin";
import { InsertCalloutDialog } from "@/ui/plugins/callout-plugin";
import { INSERT_COLLAPSIBLE_COMMAND } from "@/ui/plugins/collapsible-plugin";
import { InsertDownloadDialog } from "@/ui/plugins/download-plugin";
import { INSERT_HTML_COMMAND } from "@/ui/plugins/html-plugin";
import { $isImageNode, InsertImageDialog } from "@/ui/plugins/images";
import { InsertLayoutDialog } from "@/ui/plugins/layout";
import { $isCustomListNode } from "@/ui/plugins/list-plugin/CustomListNode";
import { InsertPdfDialog } from "@/ui/plugins/pdf-plugin";
import { InsertScormDialog } from "@/ui/plugins/scorm-plugin";
import { INSERT_SLIDER_COMMAND } from "@/ui/plugins/slider-plugin";
import { InsertTableDialog } from "@/ui/plugins/table";
import { InsertVideoDialog } from "@/ui/plugins/video-plugin";

import { HighlightDropdown } from "./HighlightDropdown";
import { useToolbarOverflow } from "./useToolbarOverflow";
import {
  clearFormatting,
  formatBulletList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  setBulletStyle,
} from "./utils";

import "./styles.scss";

/**
 * Возвращает background-color (подсветку) выделения для индикатора в тулбаре.
 *
 * $getSelectionStyleValueForProperty для СХЛОПНУТОЙ каретки отдаёт
 * закэшированный selection.style (Lexical хранит его, чтобы продолжить ввод
 * с тем же стилем), а не реальный стиль ноды под кареткой. Из-за этого
 * индикатор «залипал» на последнем цвете подсветки при переходе на текст без
 * неё. Для каретки читаем цвет напрямую из текстовой ноды; для выделения
 * оставляем штатное поведение (оно корректно агрегирует ноды).
 */
const $getHighlightBackgroundColor = (selection: Parameters<typeof $getSelectionStyleValueForProperty>[ 0 ]): string => {
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const node = selection.anchor.getNode();
    if ($isTextNode(node)) {
      return getStyleObjectFromCSS(node.getStyle())[ "background-color" ] ?? "";
    }
    return "";
  }
  return $getSelectionStyleValueForProperty(
    selection, "background-color", "",
  );
};

const CODE_LANGUAGE_OPTIONS_PRISM: [string, string][] =
  getCodeLanguageOptionsPrism().filter((option) =>
    [
      "c",
      "clike",
      "cpp",
      "css",
      "html",
      "java",
      "js",
      "javascript",
      "markdown",
      "objc",
      "objective-c",
      "plain",
      "powershell",
      "py",
      "python",
      "rust",
      "sql",
      "swift",
      "typescript",
      "xml",
    ].includes(option[ 0 ]));

// TODO change to enum
const IconByBlock: Record<keyof typeof BLOCK_TYPE_TO_BLOCK_NAME, IconType> = {
  [ "paragraph" ]: TfiText,
  [ "h1" ]: BsTypeH1,
  [ "h2" ]: BsTypeH2,
  [ "h3" ]: BsTypeH3,
  [ "h4" ]: BsTypeH4,
  [ "h5" ]: BsTypeH5,
  [ "h6" ]: BsTypeH6,
  [ "number" ]: BsListOl,
  [ "bullet" ]: BsListUl,
  [ "code" ]: BsCode,
};


const FORMAT_BLOCS = [
  {
    action: (editor: LexicalEditor) => formatParagraph(editor),
    Icon: TfiText,
    id: "paragrap",
    type: BLOCK_TYPE_TO_BLOCK_NAME.paragraph,
    hotkeyId: "paragraph",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatHeading(
      editor,
      blockType,
      "h1",
    ),
    Icon: BsTypeH1,
    id: "h1",
    type: BLOCK_TYPE_TO_BLOCK_NAME.h1,
    hotkeyId: "h1",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatHeading(
      editor, blockType, "h2",
    ),
    Icon: BsTypeH2,
    id: "h2",
    type: BLOCK_TYPE_TO_BLOCK_NAME.h2,
    hotkeyId: "h2",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatHeading(
      editor, blockType, "h3",
    ),
    Icon: BsTypeH3,
    id: "h3",
    type: BLOCK_TYPE_TO_BLOCK_NAME.h3,
    hotkeyId: "h3",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatHeading(
      editor, blockType, "h4",
    ),
    Icon: BsTypeH4,
    id: "h4",
    type: BLOCK_TYPE_TO_BLOCK_NAME.h4,
    hotkeyId: "h4",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatHeading(
      editor, blockType, "h5",
    ),
    Icon: BsTypeH5,
    id: "h5",
    type: BLOCK_TYPE_TO_BLOCK_NAME.h5,
    hotkeyId: "h5",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatHeading(
      editor, blockType, "h6",
    ),
    Icon: BsTypeH6,
    id: "h6",
    type: BLOCK_TYPE_TO_BLOCK_NAME.h6,
    hotkeyId: "h6",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatNumberedList(editor, blockType),
    Icon: BsListOl,
    id: "number",
    type: BLOCK_TYPE_TO_BLOCK_NAME.number,
    hotkeyId: "ol",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatBulletList(editor, blockType),
    Icon: BsListUl,
    id: "bullet",
    type: BLOCK_TYPE_TO_BLOCK_NAME.bullet,
    hotkeyId: "ul",
  },
  {
    action: (editor: LexicalEditor,
      blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME) => formatCode(editor, blockType),
    Icon: BsCode,
    id: "code",
    type: BLOCK_TYPE_TO_BLOCK_NAME.code,
    hotkeyId: "code-block",
  },
];

const BlockFormatDropDown = ({
  editor,
  blockType,
  disabled = false,
}: {
  blockType: keyof typeof BLOCK_TYPE_TO_BLOCK_NAME,
  editor: LexicalEditor,
  disabled?: boolean,
}) => {
  return (
    <DropDown
      escapeOverflow
      buttonAriaLabel="Formatting options for text style"
      buttonClassName="toolbar__dropdown-trigger toolbar__text-format-dropdown-trigger"
      ButtonIcon={IconByBlock[ blockType ]}
      buttonLabel={BLOCK_TYPE_TO_BLOCK_NAME[ blockType ]}
      disabled={disabled}
      hideMobileButtonLabel={false}
    >
      {
        FORMAT_BLOCS.map(({
          id,
          type,
          Icon,
          action,
          hotkeyId,
        }) => (
          <Tooltip
            key={id}
            hotkeyId={hotkeyId}
            placement="right"
          >
            <DropDownItem
              isActive={blockType === id}
              onClick={() => action(editor, blockType)}
            >
              <div className="toolbar__dropdown-item-wrap">
                <Icon />
                <span className="text">{type}</span>
              </div>
            </DropDownItem>
          </Tooltip>
        ))
      }
    </DropDown>
  );
};

// Наборы маркеров для ненумерованных списков. value === undefined —
// маркер по умолчанию (disc); прочие значения пишутся в
// CustomListNode.__bulletStyle → inline list-style-type (см. CustomListNode).
// Строки в кавычках ('—', '→', …) — это CSS-строковые маркеры, поэтому
// кавычки обязательны.
const BULLET_STYLE_OPTIONS: Array<{
  id: string,
  value: string | undefined,
  label: string,
  sample: string,
}> = [
  { id: "disc", value: undefined, label: "Точка", sample: "●" },
  { id: "circle", value: "circle", label: "Кружок", sample: "○" },
  { id: "square", value: "square", label: "Квадрат", sample: "▪" },
  { id: "dash", value: "'—'", label: "Тире", sample: "—" },
  // Значения храним «чистыми». Отступ между узкими глифами (стрелка,
  // звезда) и текстом добавляется на этапе рендера в resolveBulletStyle
  // (см. CustomListNode) — применяется и к уже сохранённым спискам.
  { id: "arrow", value: "'→'", label: "Стрелка", sample: "→" },
  { id: "star", value: "'★'", label: "Звезда", sample: "★" },
  { id: "check", value: "'✓'", label: "Галочка", sample: "✓" },
  { id: "none", value: "none", label: "Без маркера", sample: "∅" },
];

const BulletStyleDropDown = ({
  editor,
  bulletStyle,
  disabled = false,
}: {
  editor: LexicalEditor,
  bulletStyle: string,
  disabled?: boolean,
}) => {
  // "disc"/"" — маркер по умолчанию. Нормализуем к "" для сравнения.
  const current = bulletStyle === "disc" ?
    "" :
    bulletStyle;
  const active = BULLET_STYLE_OPTIONS.find((opt) => (opt.value ?? "") === current) ??
    BULLET_STYLE_OPTIONS[ 0 ];

  return (
    <DropDown
      escapeOverflow
      buttonAriaLabel="Маркер списка"
      buttonClassName="toolbar__dropdown-trigger toolbar__bullet-style-trigger"
      buttonLabel={active.sample}
      disabled={disabled}
      hideMobileButtonLabel={false}
    >
      {
        BULLET_STYLE_OPTIONS.map(({
          id,
          value,
          label,
          sample,
        }) => (
          <DropDownItem
            key={id}
            isActive={(value ?? "") === current}
            onClick={() => setBulletStyle(editor, value)}
          >
            <div className="toolbar__dropdown-item-wrap">
              <span className="toolbar__bullet-sample">{sample}</span>
              <span className="text">{label}</span>
            </div>
          </DropDownItem>
        ))
      }
    </DropDown>
  );
};

function Divider() {
  return <div className="divider" />;
}

const ELEMENT_FORMAT_OPTIONS: {
  [key in Exclude<ElementFormatType, "start" | "end" | "">]: {
    id: string,
    Icon: IconType,
    title: string,
    hotkeyId: string,
  };
} = {
  [ "left" ]: {
    id: "left",
    Icon: CiTextAlignLeft,
    title: "По левому краю",
    hotkeyId: "align-left",
  },
  [ "center" ]: {
    id: "center",
    Icon: CiTextAlignCenter,
    title: "По центру",
    hotkeyId: "align-center",
  },
  [ "right" ]: {
    id: "right",
    Icon: CiTextAlignRight,
    title: "По правому краю",
    hotkeyId: "align-right",
  },
  [ "justify" ]: {
    id: "justify",
    Icon: CiTextAlignJustify,
    title: "По ширине",
    hotkeyId: "align-justify",
  },
};

const ElementFormatDropdown = ({
  editor,
  value,
  disabled = false,
}: {
  editor: LexicalEditor,
  value: Exclude<ElementFormatType, "start" | "end" | "">,
  disabled: boolean,
}) => {
  // value пришёл cast'ом из toolbarState.elementFormat, который при вставке
  // HTML-контента извне может оказаться "start"/"end"/"" — таких ключей в
  // ELEMENT_FORMAT_OPTIONS нет, и без нормализации formatOption становится
  // undefined → "Cannot read properties of undefined (reading 'Icon')".
  const normalizedValue: keyof typeof ELEMENT_FORMAT_OPTIONS = (() => {
    if (value === "start" as unknown as typeof value) return "left";
    if (value === "end" as unknown as typeof value) return "right";
    if (ELEMENT_FORMAT_OPTIONS[ value ]) return value;
    return "left";
  })();
  const formatOption = ELEMENT_FORMAT_OPTIONS[ normalizedValue ];

  return (
    <DropDown
      escapeOverflow
      buttonAriaLabel="Выравнивание"
      buttonClassName="toolbar__dropdown-trigger toolbar__align-trigger"
      ButtonIcon={formatOption.Icon}
      disabled={disabled}
    >
      {
        (Object.values(ELEMENT_FORMAT_OPTIONS)).map(({
          Icon,
          id,
          title,
          hotkeyId,
        }) => (
          <Tooltip
            key={id}
            hotkeyId={hotkeyId}
            placement="right"
          >
            <DropDownItem
              onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, id as ElementFormatType)}
            >
              <div className="toolbar__dropdown-item-wrap">
                <Icon />
                <span className="text">{title}</span>
              </div>
            </DropDownItem>
          </Tooltip>
        ))
      }
    </DropDown>
  );
};

function $findTopLevelElement(node: LexicalNode) {
  let topLevelElement =
    node.getKey() === "root" ?
      node :
      $findMatchingParent(node, (e) => {
        const parent = e.getParent();
        return parent !== null && $isRootOrShadowRoot(parent);
      });

  if (topLevelElement === null) {
    topLevelElement = node.getTopLevelElementOrThrow();
  }
  return topLevelElement;
}

export const ToolbarPlugin = ({
  editor,
  activeEditor,
  setActiveEditor,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor,
  activeEditor: LexicalEditor,
  setActiveEditor: Dispatch<LexicalEditor>,
  setIsLinkEditMode: Dispatch<boolean>,
}) => {
  const [ selectedElementKey, setSelectedElementKey ] = useState<NodeKey | null>(null);
  const [ modal, showModal ] = useModal();
  const [ isEditable, setIsEditable ] = useState(() => editor.isEditable());
  const [ hasTextSelection, setHasTextSelection ] = useState(false);
  const { toolbarState, updateToolbarState } = useToolbarState();
  const { toolbarRef } = useMainContext();
  const { settings } = useSettings();

  const showVideoInsert = settings.videoUrl || settings.videoUpload || settings.videoRutube || settings.videoVk;
  const showAudioInsert = settings.audioUrl || settings.audioUpload;
  const showDownloadInsert = settings.downloadUrl || settings.downloadUpload;
  const showPdfInsert = settings.pdfUrl || settings.pdfUpload;
  const showScormInsert = settings.scormInsert;

  // Открывает модалку-диалог вставки — для пунктов «Вставка» из расширений.
  const openDialog = useCallback((title: string, Dialog: InsertDialogComponent) => {
    showModal(
      title,
      (onClose) => (
        <Dialog
          activeEditor={activeEditor}
          onClose={onClose}
        />
      ),
      false,
      true,
    );
  }, [ showModal, activeEditor ]);

  const dispatchToolbarCommand = <T extends LexicalCommand<unknown>> (
    command: T,
    payload: CommandPayloadType<T> | undefined = undefined,
    skipRefocus: boolean = false,
  ) => {
    activeEditor.update(() => {
      if (skipRefocus) {
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
      }

      // Re-assert on Type so that payload can have a default param
      activeEditor.dispatchCommand(command, payload as CommandPayloadType<T>);
    });
  };

  const dispatchFormatTextCommand = (payload: TextFormatType, skipRefocus: boolean = false) =>
    dispatchToolbarCommand(
      FORMAT_TEXT_COMMAND,
      payload,
      skipRefocus,
    );

  const $handleHeadingNode = useCallback((selectedElement: LexicalNode) => {
    let type = $isHeadingNode(selectedElement) ?
      selectedElement.getTag() :
      selectedElement.getType();

    // Подменная нода абзаца имеет getType() === "custom-paragraph", которого
    // нет в BLOCK_TYPE_TO_BLOCK_NAME. Без маппинга updateToolbarState не
    // вызывался, и blockType оставался от предыдущего блока — поэтому новая
    // строка после заголовка/списка детектилась как заголовок/список.
    if (type === "custom-paragraph") type = "paragraph";

    if (type in BLOCK_TYPE_TO_BLOCK_NAME) {
      updateToolbarState("blockType", type as keyof typeof BLOCK_TYPE_TO_BLOCK_NAME);
    } else {
      // Любой иной нераспознанный верхнеуровневый блок показываем как «Текст»,
      // чтобы значение не «залипало» от предыдущего выделения.
      updateToolbarState("blockType", "paragraph");
    }
  },
  [ updateToolbarState ]);

  const $handleCodeNode = useCallback((element: LexicalNode) => {
    if ($isCodeNode(element)) {
      const language = element.getLanguage();
      updateToolbarState("codeLanguage",
        language ?
          normalizeCodeLanguagePrism(language) || language:
          "");
      const theme = element.getTheme();
      updateToolbarState("codeTheme", theme || "");

    }
  },
  [ updateToolbarState ]);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    setHasTextSelection($isRangeSelection(selection) || $isTableSelection(selection));
    if ($isRangeSelection(selection)) {
      if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
        const rootElement = activeEditor.getRootElement();
        updateToolbarState("isImageCaption",
          !!rootElement?.parentElement?.classList.contains("image-caption-container"));
      } else {
        updateToolbarState("isImageCaption", false);
      }

      const anchorNode = selection.anchor.getNode();
      const element = $findTopLevelElement(anchorNode);
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(node);
      updateToolbarState("isLink", isLink);

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        updateToolbarState("rootType", "table");
      } else {
        updateToolbarState("rootType", "root");
      }

      // Внутри баннера запрещена вставка блочных нод — прячем «Вставку».
      updateToolbarState("isInBanner",
        $isBannerNode($findMatchingParent(node, $isBannerNode)));

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode,
            ListNode);
          const type = parentList ?
            parentList.getListType() :
            element.getListType();
          // @ts-ignore
          updateToolbarState("blockType", type);
          // Маркер текущего (ближайшего) bullet-списка — для BulletStyleDropDown.
          const nearest = parentList ?? element;
          updateToolbarState("bulletStyle",
            type === "bullet" && $isCustomListNode(nearest) ?
              (nearest.getBulletStyle() ?? "") :
              "");
        } else {
          $handleHeadingNode(element);
          $handleCodeNode(element);
        }
      }

      // updateToolbarState(
      //   'fontFamily',
      //   $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      // );
      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline());
      }

      // If matchingParent is a valid node, pass it's format type
      let elementFormat: ElementFormatType = parent?.getFormatType() || "left";
      if ($isElementNode(matchingParent)) {
        elementFormat = matchingParent.getFormatType();
      } else if ($isElementNode(node)) {
        elementFormat = node.getFormatType();
      }
      updateToolbarState("elementFormat", elementFormat);
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // Update text format
      updateToolbarState("isBold", selection.hasFormat("bold"));
      updateToolbarState("isItalic", selection.hasFormat("italic"));
      updateToolbarState("isUnderline", selection.hasFormat("underline"));
      updateToolbarState("isStrikethrough",
        selection.hasFormat("strikethrough"));
      updateToolbarState("isSubscript", selection.hasFormat("subscript"));
      updateToolbarState("isSuperscript", selection.hasFormat("superscript"));
      updateToolbarState("isHighlight", selection.hasFormat("highlight"));
      updateToolbarState("isCode", selection.hasFormat("code"));
      updateToolbarState("fontSize",
        $getSelectionStyleValueForProperty(
          selection, "font-size", "15px",
        ));
      // background-color у выделения — для индикатора и текущего цвета
      // в HighlightDropdown. Пустая строка == «нет подсветки».
      // Для схлопнутой каретки читаем цвет из ноды, а не из кэша selection.style.
      updateToolbarState("bgColor", $getHighlightBackgroundColor(selection));
      updateToolbarState("isLowercase", selection.hasFormat("lowercase"));
      updateToolbarState("isUppercase", selection.hasFormat("uppercase"));
      updateToolbarState("isCapitalize", selection.hasFormat("capitalize"));
    }
    if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      for (const selectedNode of nodes) {
        const parentList = $getNearestNodeOfType<ListNode>(selectedNode,
          ListNode);
        if (parentList) {
          const type = parentList.getListType();
          // @ts-ignore
          updateToolbarState("blockType", type);
        } else {
          const selectedElement = $findTopLevelElement(selectedNode);
          $handleHeadingNode(selectedElement);
          $handleCodeNode(selectedElement);
          // Update elementFormat for node selection (e.g., images)
          if ($isElementNode(selectedElement)) {
            updateToolbarState("elementFormat",
              selectedElement.getFormatType());
          } else if ($isImageNode(selectedElement)) {
            // Картинка — DecoratorNode, не ElementNode, но у неё есть
            // собственный format (выравнивание). Отражаем его в тулбаре,
            // чтобы активная кнопка выравнивания соответствовала картинке.
            updateToolbarState("elementFormat",
              selectedElement.getFormatType() || "left");
          }
        }
      }
    }
  }, [
    activeEditor,
    editor,
    updateToolbarState,
    $handleHeadingNode,
    $handleCodeNode,
  ]);

  useEffect(() => {
    return mergeRegister(editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
    editor.registerCommand(
      BLUR_COMMAND,
      () => {
        setHasTextSelection(false);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ));
  }, [
    editor,
    $updateToolbar,
    setActiveEditor,
  ]);

  useEffect(() => {
    activeEditor.getEditorState().read(() => {
      $updateToolbar();
    },
    { editor: activeEditor });
  }, [ activeEditor, $updateToolbar ]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          $updateToolbar();
        },
        { editor: activeEditor });
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateToolbarState("canUndo", payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateToolbarState("canRedo", payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [
    $updateToolbar,
    activeEditor,
    editor,
    updateToolbarState,
  ]);

  const insertLink = useCallback(() => {
    if (!toolbarState.isLink) {
      setIsLinkEditMode(true);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND,
        sanitizeUrl("https://"));
    } else {
      setIsLinkEditMode(false);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [
    activeEditor,
    setIsLinkEditMode,
    toolbarState.isLink,
  ]);

  // Хоткей Mod+K — вставка/снятие ссылки. Раньше был только задокументирован
  // в реестре хоткеев, но нигде не обрабатывался (Lexical не даёт Mod+K
  // из коробки). KEY_MODIFIER_COMMAND — идиоматичный способ ловить Ctrl/Cmd+
  // комбинации; регистрируем на activeEditor, чтобы работало и во вложенных
  // редакторах (таблицы).
  useEffect(() => {
    return activeEditor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (event) => {
        const isK = event.key === "k" || event.key === "K";
        if (isK && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
          event.preventDefault();
          insertLink();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    );
  }, [ activeEditor, insertLink ]);

  const onCodeLanguageSelect = useCallback((value: string) => {
    activeEditor.update(() => {
      $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
      if (selectedElementKey !== null) {
        const node = $getNodeByKey(selectedElementKey);
        if ($isCodeNode(node)) {
          node.setLanguage(value);
        }
      }
    });
  },
  [ activeEditor, selectedElementKey ]);

  const canViewerSeeInsertDropdown = !toolbarState.isImageCaption && !toolbarState.isInBanner;
  const canViewerSeeInsertCodeButton = !toolbarState.isImageCaption;

  // Хоткеи для вставок (Mod+Alt+...)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || !e.altKey || e.shiftKey) return;
      if (!isEditable || !canViewerSeeInsertDropdown) return;
      const code = e.code;

      const open = (title: string,
        Dialog: (props: { activeEditor: LexicalEditor, onClose: () => void }) => React.ReactElement) => {
        showModal(
          title,
          (onClose) => (
            <Dialog
              activeEditor={activeEditor}
              onClose={onClose}
            />
          ),
          false,
          true,
        );
      };

      switch (code) {
        case "KeyH":
          e.preventDefault();
          dispatchToolbarCommand(INSERT_HORIZONTAL_RULE_COMMAND);
          return;
        case "KeyI":
          e.preventDefault();
          open("Вставить изображение", InsertImageDialog);
          return;
        case "KeyT":
          e.preventDefault();
          open("Создать таблицу", InsertTableDialog);
          return;
        case "KeyY":
          if (!showVideoInsert) return;
          e.preventDefault();
          open("Вставить видео", InsertVideoDialog);
          return;
        case "KeyU":
          if (!showAudioInsert) return;
          e.preventDefault();
          open("Вставить аудио", InsertAudioDialog);
          return;
        case "KeyP":
          if (!showPdfInsert) return;
          e.preventDefault();
          open("Вставить PDF", InsertPdfDialog);
          return;
        case "KeyF":
          if (!showDownloadInsert) return;
          e.preventDefault();
          open("Вставить файл для скачивания", InsertDownloadDialog);
          return;
        case "KeyC":
          e.preventDefault();
          open("Разделить на колонки", InsertLayoutDialog);
          return;
        case "KeyK":
          e.preventDefault();
          dispatchToolbarCommand(INSERT_COLLAPSIBLE_COMMAND);
          return;
        case "KeyE":
          e.preventDefault();
          open("Вставить коллаут", InsertCalloutDialog);
          return;
        case "KeyQ":
          e.preventDefault();
          dispatchToolbarCommand(INSERT_AUTHOR_QUOTE_COMMAND);
          return;
        case "KeyJ":
          e.preventDefault();
          insertAnchor(editor);
          return;
        case "KeyG":
          e.preventDefault();
          activeEditor.dispatchCommand(INSERT_SLIDER_COMMAND, undefined);
          return;
        case "KeyB":
          e.preventDefault();
          dispatchToolbarCommand(INSERT_BANNER_COMMAND);
          return;
      }

      // Хоткеи вставок из расширений (Mod+Alt+<code>): ищем пункт по code
      // и гейту настроек, затем запускаем его действие.
      const extItem = getEditorExtensionInsertItems().find((it) => it.code === code && (it.isEnabled?.(settings) ?? true));
      if (extItem) {
        e.preventDefault();
        extItem.run({ editor: activeEditor, openDialog });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // dispatchToolbarCommand — стабильная функция-замыкание, не меняется по сути
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editor,
    activeEditor,
    isEditable,
    canViewerSeeInsertDropdown,
    showVideoInsert,
    showAudioInsert,
    showPdfInsert,
    showDownloadInsert,
    settings,
    openDialog,
    showModal,
  ]);

  // ——— Overflow: кнопки форматирования, которые не влезают, уходят в меню «⋯» ———
  // Всё инлайновое форматирование — в одной группе. Дескрипторы используются и
  // для кнопки в тулбаре, и для пункта в меню «⋯» (одна и та же логика).
  const fmtDisabled = !isEditable || !hasTextSelection;
  const overflowDescriptors: Record<string, {
    Icon: IconType,
    label: string,
    ariaLabel: string,
    hotkeyId?: string,
    active?: boolean,
    disabled: boolean,
    onClick: (e: ReactMouseEvent<HTMLButtonElement>) => void,
    present: boolean,
  }> = {
    bold: {
      Icon: FiBold,
      label: "Жирный",
      ariaLabel: "Сделать текст жирным",
      hotkeyId: "bold",
      active: toolbarState.isBold,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("bold", isKeyboardInput(e)),
      present: true,
    },
    italic: {
      Icon: FiItalic,
      label: "Курсив",
      ariaLabel: "Сделать текст курсивом",
      hotkeyId: "italic",
      active: toolbarState.isItalic,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("italic", isKeyboardInput(e)),
      present: true,
    },
    underline: {
      Icon: FiUnderline,
      label: "Подчёркнутый",
      ariaLabel: "Сделать текст подчеркнутым",
      hotkeyId: "underline",
      active: toolbarState.isUnderline,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("underline", isKeyboardInput(e)),
      present: true,
    },
    strikethrough: {
      Icon: RxStrikethrough,
      label: "Зачёркнутый",
      ariaLabel: "Зачёркнутый",
      hotkeyId: "strikethrough",
      active: toolbarState.isStrikethrough,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("strikethrough", isKeyboardInput(e)),
      present: true,
    },
    code: {
      Icon: FiCode,
      label: "Блок кода",
      ariaLabel: "Сделать текст блоком кода",
      hotkeyId: "code-inline",
      active: toolbarState.isCode,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("code", isKeyboardInput(e)),
      present: canViewerSeeInsertCodeButton,
    },
    link: {
      Icon: FiLink,
      label: "Ссылка",
      ariaLabel: "Сделать текст ссылкой",
      hotkeyId: "link",
      active: toolbarState.isLink,
      disabled: fmtDisabled,
      onClick: insertLink,
      present: true,
    },
    superscript: {
      Icon: TbSuperscript,
      label: "Надстрочный",
      ariaLabel: "Надстрочный",
      active: toolbarState.isSuperscript,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("superscript", isKeyboardInput(e)),
      present: true,
    },
    subscript: {
      Icon: TbSubscript,
      label: "Подстрочный",
      ariaLabel: "Подстрочный",
      active: toolbarState.isSubscript,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("subscript", isKeyboardInput(e)),
      present: true,
    },
    uppercase: {
      Icon: RxLetterCaseUppercase,
      label: "Заглавные",
      ariaLabel: "Заглавные",
      active: toolbarState.isUppercase,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("uppercase", isKeyboardInput(e)),
      present: true,
    },
    lowercase: {
      Icon: RxLetterCaseLowercase,
      label: "Строчные",
      ariaLabel: "Строчные",
      active: toolbarState.isLowercase,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("lowercase", isKeyboardInput(e)),
      present: true,
    },
    capitalize: {
      Icon: RxLetterCaseCapitalize,
      label: "С заглавной",
      ariaLabel: "С заглавной",
      active: toolbarState.isCapitalize,
      disabled: fmtDisabled,
      onClick: (e) => dispatchFormatTextCommand("capitalize", isKeyboardInput(e)),
      present: true,
    },
    clear: {
      Icon: MdOutlineClear,
      label: "Очистить форматирование",
      ariaLabel: "Очистить форматирование",
      hotkeyId: "clear-format",
      disabled: fmtDisabled,
      onClick: (e) => clearFormatting(activeEditor, isKeyboardInput(e)),
      present: true,
    },
  };

  // Порядок кнопок в тулбаре = порядок в DOM. Хук прячет ХВОСТОВЫЕ кнопки, так
  // что справа стоят наименее важные (регистр/над-подстрочные/очистка — они
  // уходят в «⋯» первыми), а B/I/U — слева, скрываются последними.
  const OVERFLOW_VISUAL_ORDER = [
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "code",
    "link",
    "superscript",
    "subscript",
    "uppercase",
    "lowercase",
    "capitalize",
    "clear",
  ].filter((id) => overflowDescriptors[ id ].present);

  // Сигнатура: пересчитывать замеры при смене состава/лейблов тулбара.
  const overflowSignature = [
    toolbarState.blockType,
    toolbarState.bulletStyle ?? "",
    canViewerSeeInsertCodeButton,
    canViewerSeeInsertDropdown,
    isEditable,
  ].join("|");

  const { hiddenCount, measuring: overflowMeasuring } = useToolbarOverflow(toolbarRef, overflowSignature);
  // Прячем hiddenCount последних кнопок (в визуальном порядке).
  const overflowMenuIds = overflowMeasuring ?
    [] :
    OVERFLOW_VISUAL_ORDER.slice(OVERFLOW_VISUAL_ORDER.length - hiddenCount);
  const hiddenIds = new Set(overflowMenuIds);

  // Рендер сворачиваемой кнопки: в фазе замера показываем все (чтобы снять
  // ширины), иначе скрываем те, что ушли в меню «⋯».
  const renderCollapsible = (id: string) => {
    const it = overflowDescriptors[ id ];
    if (!it.present) return null;
    if (!overflowMeasuring && hiddenIds.has(id)) return null;
    const Icon = it.Icon;
    return (
      <Tooltip
        hotkeyId={it.hotkeyId}
        label={it.label}
      >
        <button
          aria-label={it.ariaLabel}
          className={
            "toolbar-item spaced " + (it.active ?
              "active" :
              "")
          }
          data-tb-cid={id}
          disabled={it.disabled}
          type="button"
          onClick={it.onClick}
        >
          <Icon />
        </button>
      </Tooltip>
    );
  };

  return (
    <div
      ref={toolbarRef}
      className="toolbar"
      onMouseDown={
        (e) => {
        // Prevent toolbar clicks from stealing focus from the editor
        // so that BLUR_COMMAND doesn't fire and disable formatting buttons
          if ((e.target as HTMLElement).closest(".toolbar")) {
            e.preventDefault();
          }
        }
      }
    >
      <Tooltip
        hotkeyId="undo"
        label="Отменить"
      >
        <button
          aria-label="Отменить"
          className="toolbar-item spaced"
          disabled={!toolbarState.canUndo || !isEditable}
          type="button"
          onClick={
            (e) =>
              dispatchToolbarCommand(
                UNDO_COMMAND, undefined, isKeyboardInput(e),
              )
          }
        >
          <CiUndo />
        </button>
      </Tooltip>
      <Tooltip
        hotkeyId="redo"
        label="Вернуть"
      >
        <button
          aria-label="Вернуть"
          className="toolbar-item"
          disabled={!toolbarState.canRedo || !isEditable}
          type="button"
          onClick={
            (e) =>
              dispatchToolbarCommand(
                REDO_COMMAND, undefined, isKeyboardInput(e),
              )
          }
        >
          <CiRedo />
        </button>
      </Tooltip>
      <Divider />
      {
        toolbarState.blockType in BLOCK_TYPE_TO_BLOCK_NAME &&
        activeEditor === editor && (
          <>
            <BlockFormatDropDown
              blockType={toolbarState.blockType}
              disabled={!isEditable}
              editor={activeEditor}
            />
            <Divider />
            {
              toolbarState.blockType === "bullet" && (
                <>
                  <BulletStyleDropDown
                    bulletStyle={toolbarState.bulletStyle}
                    disabled={!isEditable}
                    editor={activeEditor}
                  />
                  <Divider />
                </>
              )
            }
          </>
        )
      }
      {
        toolbarState.blockType === "code" ?
          (
            <DropDown
              escapeOverflow
              buttonAriaLabel="Select language"
              buttonClassName="toolbar-item code-language"
              buttonLabel={
                (CODE_LANGUAGE_OPTIONS_PRISM.find((opt) =>
                  opt[ 0 ] ===
                  normalizeCodeLanguagePrism(toolbarState.codeLanguage)) || [ "", "" ])[ 1 ]
              }
              disabled={!isEditable}
            >
              {
                CODE_LANGUAGE_OPTIONS_PRISM.map(([ value, name ]) => {
                  return (
                    <DropDownItem
                      key={value}
                      isActive={value === toolbarState.codeLanguage}
                      onClick={() => onCodeLanguageSelect(value)}
                    >
                      <span className="text">{name}</span>
                    </DropDownItem>
                  );
                })
              }
            </DropDown>
          ) :
          (
            <>
              {/* Размер шрифта не редактируется: каждый тип текста имеет
                  свой фиксированный размер (заголовки h1→h6 по убыванию,
                  обычный текст и списки — самые мелкие). См. theme.scss /
                  preview.module.scss. */}
              {renderCollapsible("bold")}
              {renderCollapsible("italic")}
              {renderCollapsible("underline")}
              {renderCollapsible("strikethrough")}
              <HighlightDropdown
                currentColor={toolbarState.bgColor}
                disabled={!isEditable || !hasTextSelection}
                editor={activeEditor}
              />
              {renderCollapsible("code")}
              {renderCollapsible("link")}
              {renderCollapsible("superscript")}
              {renderCollapsible("subscript")}
              {renderCollapsible("uppercase")}
              {renderCollapsible("lowercase")}
              {renderCollapsible("capitalize")}
              {renderCollapsible("clear")}

              {/* «⋯» в конце группы форматирования: сюда пошагово уходят
                  скрытые кнопки форматирования (не смешиваясь с отступами). */}
              {
                !overflowMeasuring && overflowMenuIds.length > 0 && (
                  <DropDown
                    escapeOverflow
                    hideShowMore
                    buttonAriaLabel="Ещё форматирование"
                    buttonClassName="toolbar-item spaced toolbar__overflow-trigger"
                    ButtonIcon={FiMoreHorizontal}
                  >
                    {
                      overflowMenuIds.map((id) => {
                        const it = overflowDescriptors[ id ];
                        const Icon = it.Icon;
                        return (
                          <Tooltip
                            key={id}
                            hotkeyId={it.hotkeyId}
                            label={it.label}
                            placement="right"
                          >
                            <DropDownItem
                              isActive={it.active}
                              onClick={
                                (e) => {
                                  if (!it.disabled) it.onClick(e);
                                }
                              }
                            >
                              <div className="toolbar__dropdown-item-wrap">
                                <Icon />
                                <span className="text">{it.label}</span>
                              </div>
                            </DropDownItem>
                          </Tooltip>
                        );
                      })
                    }
                  </DropDown>
                )
              }
              <Divider />
              <ElementFormatDropdown
                disabled={!isEditable}
                editor={activeEditor}
                value={toolbarState.elementFormat as Exclude<ElementFormatType, "start" | "end" | "">}
              />
              <Tooltip
                hotkeyId="list-outdent"
                label="Уменьшить отступ"
              >
                <button
                  aria-label="Уменьшить отступ"
                  className="toolbar-item spaced"
                  disabled={!isEditable}
                  type="button"
                  onClick={() => activeEditor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
                >
                  <MdFormatIndentDecrease />
                </button>
              </Tooltip>
              <Tooltip
                hotkeyId="list-indent"
                label="Увеличить отступ"
              >
                <button
                  aria-label="Увеличить отступ"
                  className="toolbar-item spaced"
                  disabled={!isEditable}
                  type="button"
                  onClick={() => activeEditor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
                >
                  <MdFormatIndentIncrease />
                </button>
              </Tooltip>

              {
                canViewerSeeInsertDropdown && (
                  <>
                    <Divider />
                    <DropDown
                      escapeOverflow
                      buttonAriaLabel="Вставить дополнительный компонент"
                      buttonClassName="toolbar__dropdown-trigger"
                      ButtonIcon={CiCirclePlus}
                      buttonLabel="Вставка"
                      disabled={!isEditable}
                    >
                      <Tooltip
                        hotkeyId="insert-hr"
                        label="Разделитель"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={
                            () =>
                              dispatchToolbarCommand(INSERT_HORIZONTAL_RULE_COMMAND)
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <MdHorizontalRule />
                            <span className="text">Разделитель</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      {
                        showScormInsert && (
                          <DropDownItem
                            onClick={
                              () => {
                                showModal(
                                  "Вставить SCORM",
                                  (onClose) => (
                                    <InsertScormDialog
                                      activeEditor={activeEditor}
                                      onClose={onClose}
                                    />
                                  ),
                                  false,
                                  true,
                                );
                              }
                            }
                          >
                            <div className="toolbar__dropdown-item-wrap">
                              <IoEarthOutline />
                              <span className="text">Scorm</span>
                            </div>
                          </DropDownItem>
                        )
                      }

                      <Tooltip
                        hotkeyId="insert-image"
                        label="Изображение"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={
                            () => {
                              showModal(
                                "Вставить изображение",
                                (onClose) => (
                                  <InsertImageDialog
                                    activeEditor={activeEditor}
                                    onClose={onClose}
                                  />
                                ),
                                false,
                                true,
                              );
                            }
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <CiImageOn />
                            <span className="text">Изображение</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      <Tooltip
                        hotkeyId="insert-slider"
                        label="Карусель изображений"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={() => activeEditor.dispatchCommand(INSERT_SLIDER_COMMAND, undefined)}
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <BiCarousel />
                            <span className="text">Карусель изображений</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      {
                        // Пункты «Вставка» из расширений.
                        getEditorExtensionInsertItems()
                          .filter((item) => item.isEnabled?.(settings) ?? true)
                          .map((item) => {
                            const Icon = item.Icon;
                            return (
                              <Tooltip
                                key={item.id}
                                hotkeyId={item.hotkeyId}
                                label={item.label}
                                placement="right"
                              >
                                <DropDownItem
                                  onClick={() => item.run({ editor: activeEditor, openDialog })}
                                >
                                  <div className="toolbar__dropdown-item-wrap">
                                    <Icon />
                                    <span className="text">{item.text}</span>
                                  </div>
                                </DropDownItem>
                              </Tooltip>
                            );
                          })
                      }

                      <Tooltip
                        hotkeyId="insert-columns"
                        label="Колонки"
                        placement="right"
                      >
                        <DropDownItem
                          className="item"
                          onClick={
                            () => {
                              showModal(
                                "Разделить на колонки",
                                (onClose) => (
                                  <InsertLayoutDialog
                                    activeEditor={activeEditor}
                                    onClose={onClose}
                                  />
                                ),
                                false,
                                true,
                              );
                            }
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <GoColumns />
                            <span className="text">Колонки</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      <DropDownItem
                        className="item"
                        onClick={
                          () =>
                            dispatchToolbarCommand(INSERT_HTML_COMMAND, "")
                        }
                      >
                        <div className="toolbar__dropdown-item-wrap">
                          <FiCode />
                          <span className="text">HTML-код</span>
                        </div>
                      </DropDownItem>

                      {
                        showVideoInsert && (
                          <Tooltip
                            hotkeyId="insert-video"
                            label="Видео"
                            placement="right"
                          >
                            <DropDownItem
                              onClick={
                                () => {
                                  showModal(
                                    "Вставить видео",
                                    (onClose) => (
                                      <InsertVideoDialog
                                        activeEditor={activeEditor}
                                        onClose={onClose}
                                      />
                                    ),
                                    false,
                                    true,
                                  );
                                }
                              }
                            >
                              <div className="toolbar__dropdown-item-wrap">
                                <CiVideoOn />
                                <span className="text">Видео</span>
                              </div>
                            </DropDownItem>
                          </Tooltip>
                        )
                      }

                      {
                        showAudioInsert && (
                          <Tooltip
                            hotkeyId="insert-audio"
                            label="Аудио"
                            placement="right"
                          >
                            <DropDownItem
                              onClick={
                                () => {
                                  showModal(
                                    "Вставить аудио",
                                    (onClose) => (
                                      <InsertAudioDialog
                                        activeEditor={activeEditor}
                                        onClose={onClose}
                                      />
                                    ),
                                    false,
                                    true,
                                  );
                                }
                              }
                            >
                              <div className="toolbar__dropdown-item-wrap">
                                <MdOutlineAudiotrack />
                                <span className="text">Аудио</span>
                              </div>
                            </DropDownItem>
                          </Tooltip>
                        )
                      }

                      {
                        showDownloadInsert && (
                          <Tooltip
                            hotkeyId="insert-download"
                            label="Файл для скачивания"
                            placement="right"
                          >
                            <DropDownItem
                              onClick={
                                () => {
                                  showModal(
                                    "Вставить файл для скачивания",
                                    (onClose) => (
                                      <InsertDownloadDialog
                                        activeEditor={activeEditor}
                                        onClose={onClose}
                                      />
                                    ),
                                    false,
                                    true,
                                  );
                                }
                              }
                            >
                              <div className="toolbar__dropdown-item-wrap">
                                <IoCloudDownloadOutline />
                                <span className="text">Файл для скачивания</span>
                              </div>
                            </DropDownItem>
                          </Tooltip>
                        )
                      }

                      {
                        showPdfInsert && (
                          <Tooltip
                            hotkeyId="insert-pdf"
                            label="PDF"
                            placement="right"
                          >
                            <DropDownItem
                              onClick={
                                () => {
                                  showModal(
                                    "Вставить PDF",
                                    (onClose) => (
                                      <InsertPdfDialog
                                        activeEditor={activeEditor}
                                        onClose={onClose}
                                      />
                                    ),
                                    false,
                                    true,
                                  );
                                }
                              }
                            >
                              <div className="toolbar__dropdown-item-wrap">
                                <PiFilePdfLight />
                                <span className="text">PDF</span>
                              </div>
                            </DropDownItem>
                          </Tooltip>
                        )
                      }

                      <Tooltip
                        hotkeyId="insert-table"
                        label="Таблица"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={
                            () => {
                              showModal(
                                "Создать таблицу",
                                (onClose) => (
                                  <InsertTableDialog
                                    activeEditor={activeEditor}
                                    onClose={onClose}
                                  />
                                ),
                                false,
                                true,
                              );
                            }
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <CiViewTable />
                            <span className="text">Таблица</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      <Tooltip
                        hotkeyId="insert-collapsible"
                        label="Аккордеон"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={
                            () =>
                              dispatchToolbarCommand(INSERT_COLLAPSIBLE_COMMAND)
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <PiCaretRight />
                            <span className="text">Аккордеон</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      <Tooltip
                        hotkeyId="insert-callout"
                        label="Коллаут"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={
                            () => {
                              showModal(
                                "Вставить коллаут",
                                (onClose) => (
                                  <InsertCalloutDialog
                                    activeEditor={activeEditor}
                                    onClose={onClose}
                                  />
                                ),
                                false,
                                true,
                              );
                            }
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <TbInfoCircle />
                            <span className="text">Коллаут</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      <Tooltip
                        hotkeyId="insert-quote"
                        label="Цитата"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={
                            () =>
                              dispatchToolbarCommand(INSERT_AUTHOR_QUOTE_COMMAND)
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <BsChatLeftQuote />
                            <span className="text">Цитата</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      <Tooltip
                        hotkeyId="insert-banner"
                        label="Баннер"
                        placement="right"
                      >
                        <DropDownItem
                          onClick={
                            () =>
                              dispatchToolbarCommand(INSERT_BANNER_COMMAND)
                          }
                        >
                          <div className="toolbar__dropdown-item-wrap">
                            <TbFlag />
                            <span className="text">Баннер</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>

                      <Tooltip
                        hotkeyId="insert-anchor"
                        label="Якорь"
                        placement="right"
                      >
                        <DropDownItem onClick={() => insertAnchor(editor)}>
                          <div className="toolbar__dropdown-item-wrap">
                            <CiHashtag />
                            <span className="text">Якорь</span>
                          </div>
                        </DropDownItem>
                      </Tooltip>
                    </DropDown>
                  </>
                )
              }
            </>
          )
      }
      {modal}
    </div>
  );
};
