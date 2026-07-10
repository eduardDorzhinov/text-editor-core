/**
 * Реестр всех нод редактора — единственный источник правды о том, какие
 * узлы понимает Lexical. Передаётся в LexicalComposer.
 *
 * Три встроенные ноды подменяются кастомными подклассами через конфиг
 * { replace, with, withKlass }:
 *   ParagraphNode → CustomParagraphNode (отступ первой строки, two-stage Tab)
 *   ListNode      → CustomListNode      (тип/старт списка, фикс highlight-bleed)
 *   TableNode     → CustomTableNode     (widthMode "full"/"fixed", equalColumns)
 *
 * ВАЖНО: у каждого подкласса должен быть УНИКАЛЬНЫЙ getType() (например
 * "custom-paragraph", не "paragraph"), иначе Lexical бросит "Type X does not
 * match registered node". И тогда в парсере (src/parser/parse-json.tsx)
 * нужен соответствующий case (обычно fall-through на базовый тип).
 *
 * Полный обзор нод см. docs/PLUGINS.md.
 */
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { MarkNode } from "@lexical/mark";
import { OverflowNode } from "@lexical/overflow";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import {
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { type LexicalNodeConfig,ParagraphNode } from "lexical";

import { AnchorHeadingNode } from "@/ui/plugins/anchor-heading-plugin";
import { AnchorNode } from "@/ui/plugins/anchor-plugin";
import { AudioNode } from "@/ui/plugins/audio-plugin";
import {
  AuthorQuoteAuthorNode,
  AuthorQuoteContentNode,
  AuthorQuoteNode,
} from "@/ui/plugins/author-quote-plugin";
import { AutocompleteNode } from "@/ui/plugins/autocomplete-plugin";
import { BannerNode } from "@/ui/plugins/banner-plugin";
import { CalloutContainerNode } from "@/ui/plugins/callout-plugin";
import { CollapsibleContainerNode } from "@/ui/plugins/collapsible-plugin/CollapsibleContainerNode";
import { CollapsibleContentNode } from "@/ui/plugins/collapsible-plugin/CollapsibleContentNode";
import { CollapsibleTitleNode } from "@/ui/plugins/collapsible-plugin/CollapsibleTitleNode";
import { DownloadNode } from "@/ui/plugins/download-plugin";
import { HtmlNode } from "@/ui/plugins/html-plugin";
import { ImageNode } from "@/ui/plugins/images/ImageNode";
import { LayoutContainerNode, LayoutItemNode } from "@/ui/plugins/layout";
import { CustomListNode } from "@/ui/plugins/list-plugin";
import { CustomParagraphNode } from "@/ui/plugins/paragraph-plugin";
import { PdfNode } from "@/ui/plugins/pdf-plugin";
import { ScormNode } from "@/ui/plugins/scorm-plugin";
import { SliderNode } from "@/ui/plugins/slider-plugin";
import { CustomTableNode } from "@/ui/plugins/table-plugin";
import { TOCNode } from "@/ui/plugins/toc-plugin";
import { VideoNode } from "@/ui/plugins/video-plugin";

export const LEXICAL_NODES: Array<LexicalNodeConfig> = [
  CustomParagraphNode,
  {
    replace: ParagraphNode,
    with: () => new CustomParagraphNode(),
    withKlass: CustomParagraphNode,
  },
  CustomListNode,
  {
    replace: ListNode,
    with: (node: ListNode) =>
      new CustomListNode(node.getListType(), node.getStart()),
    withKlass: CustomListNode,
  },
  ListItemNode,
  CodeNode,
  CustomTableNode,
  {
    replace: TableNode,
    with: () => new CustomTableNode(),
    withKlass: CustomTableNode,
  },
  TableCellNode,
  TableRowNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  OverflowNode,
  ImageNode,
  AutocompleteNode,
  HorizontalRuleNode,
  MarkNode,
  LayoutContainerNode,
  LayoutItemNode,
  VideoNode,
  PdfNode,
  ScormNode,
  CalloutContainerNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
  DownloadNode,
  HtmlNode,
  SliderNode,
  AudioNode,
  AnchorHeadingNode,
  AnchorNode,
  AuthorQuoteNode,
  AuthorQuoteContentNode,
  AuthorQuoteAuthorNode,
  BannerNode,
  TOCNode,
];
