import { useState } from "react";
import { MdError } from "react-icons/md";
import { SiPrettier } from "react-icons/si";

import { $isCodeNode } from "@lexical/code";
import { $getNearestNodeFromDOMNode, LexicalEditor } from "lexical";
import { Options } from "prettier";

import "./index.scss";

interface Props {
  lang: string,
  editor: LexicalEditor,
  getCodeDOMNode: () => HTMLElement | null,
}

const PRETTIER_PARSER_MODULES = {
  css: [ () => import("prettier/parser-postcss") ],
  html: [ () => import("prettier/parser-html") ],
  js: [ () => import("prettier/parser-babel"), () => import("prettier/plugins/estree") ],
  markdown: [ () => import("prettier/parser-markdown") ],
  typescript: [ () => import("prettier/parser-typescript"), () => import("prettier/plugins/estree") ],
} as const;

type LanguagesType = keyof typeof PRETTIER_PARSER_MODULES;

async function loadPrettierParserByLang(lang: string) {
  const dynamicImports = PRETTIER_PARSER_MODULES[ lang as LanguagesType ];
  return await Promise.all(dynamicImports.map((dynamicImport) => dynamicImport()));
}

async function loadPrettierFormat() {
  const { format } = await import("prettier/standalone");
  return format;
}

const PRETTIER_OPTIONS_BY_LANG: Record<string, Options> = {
  css: { parser: "css" },
  html: { parser: "html" },
  js: { parser: "babel" },
  markdown: { parser: "markdown" },
  typescript: { parser: "typescript" },
};

const LANG_CAN_BE_PRETTIER = Object.keys(PRETTIER_OPTIONS_BY_LANG);

export function canBePrettier(lang: string): boolean {
  return LANG_CAN_BE_PRETTIER.includes(lang);
}

function getPrettierOptions(lang: string): Options {
  const options = PRETTIER_OPTIONS_BY_LANG[ lang ];
  if (!options) {
    throw new Error(`CodeActionMenuPlugin: Prettier does not support this language: ${lang}`);
  }

  return options;
}

export function PrettierButton({
  lang,
  editor,
  getCodeDOMNode,
}: Props) {
  const [ syntaxError, setSyntaxError ] = useState<string>("");
  const [ tipsVisible, setTipsVisible ] = useState<boolean>(false);

  async function handleClick(): Promise<void> {
    const codeDOMNode = getCodeDOMNode();
    if (!codeDOMNode) {
      return;
    }

    let content = "";
    editor.update(() => {
      const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
      if ($isCodeNode(codeNode)) {
        content = codeNode.getTextContent();
      }
    });
    if (content === "") {
      return;
    }

    try {
      const format = await loadPrettierFormat();
      const options = getPrettierOptions(lang);
      const prettierParsers = await loadPrettierParserByLang(lang);
      options.plugins = prettierParsers.map((parser) => parser.default || parser);
      const formattedCode = await format(content, options);

      editor.update(() => {
        const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
        if ($isCodeNode(codeNode)) {
          const selection = codeNode.select(0);
          selection.insertText(formattedCode);
          setSyntaxError("");
          setTipsVisible(false);
        }
      });
    } catch (error: unknown) {
      setError(error);
    }
  }

  function setError(error: unknown) {
    if (error instanceof Error) {
      setSyntaxError(error.message);
      setTipsVisible(true);
    } else {
      console.error("Unexpected error: ", error);
    }
  }

  function handleMouseEnter() {
    if (syntaxError !== "") {
      setTipsVisible(true);
    }
  }

  function handleMouseLeave() {
    if (syntaxError !== "") {
      setTipsVisible(false);
    }
  }

  return (
    <div className="prettier-wrapper">
      <button
        aria-label="prettier"
        className="menu-item"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {
          syntaxError ?
            (
              <MdError className="prettier-error" />
            ) :
            (
              <SiPrettier />
            )
        }
      </button>
      {
        tipsVisible ?
          (
            <pre className="code-error-tips">{syntaxError}</pre>
          ) :
          null
      }
    </div>
  );
}
