import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

function MonacoEditor({ files, activePath, updateFile, theme }) {
  const editorRef = useRef(null);

  // Debug logging
  console.log("MonacoEditor render - activePath:", activePath);
  console.log("MonacoEditor render - files keys:", Object.keys(files || {}));
  console.log("MonacoEditor render - files[activePath]:", files[activePath]);
  console.log(
    "MonacoEditor render - files[activePath] length:",
    files[activePath]?.length
  );

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;

    // Configure TypeScript/JavaScript settings for better IntelliSense
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
    });

    // Add React type definitions for better IntelliSense
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
      declare module 'react' {
        export = React;
        export as namespace React;
        namespace React {
          interface Component<P = {}, S = {}> {}
          function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
          function useEffect(effect: () => void | (() => void), deps?: any[]): void;
          function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
          function useMemo<T>(factory: () => T, deps: any[]): T;
          function useRef<T>(initialValue: T): { current: T };
          function useContext<T>(context: React.Context<T>): T;
          function useReducer<R extends React.Reducer<any, any>>(
            reducer: R,
            initialState: React.ReducerState<R>
          ): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];
          const Fragment: any;
          const createElement: any;
          const Component: any;
          interface HTMLAttributes<T> {
            className?: string;
            style?: any;
            onClick?: (event: any) => void;
            onChange?: (event: any) => void;
            onSubmit?: (event: any) => void;
            children?: any;
          }
          interface DetailedHTMLProps<E, T> extends HTMLAttributes<T> {}
          namespace JSX {
            interface Element {}
            interface IntrinsicElements {
              div: DetailedHTMLProps<any, HTMLDivElement>;
              span: DetailedHTMLProps<any, HTMLSpanElement>;
              button: DetailedHTMLProps<any, HTMLButtonElement>;
              input: DetailedHTMLProps<any, HTMLInputElement>;
              form: DetailedHTMLProps<any, HTMLFormElement>;
              h1: DetailedHTMLProps<any, HTMLHeadingElement>;
              h2: DetailedHTMLProps<any, HTMLHeadingElement>;
              h3: DetailedHTMLProps<any, HTMLHeadingElement>;
              p: DetailedHTMLProps<any, HTMLParagraphElement>;
              img: DetailedHTMLProps<any, HTMLImageElement>;
              a: DetailedHTMLProps<any, HTMLAnchorElement>;
              ul: DetailedHTMLProps<any, HTMLUListElement>;
              li: DetailedHTMLProps<any, HTMLLIElement>;
            }
          }
        }
      }
    `,
      "file:///node_modules/@types/react/index.d.ts"
    );

    // Add common DOM types
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      `
      interface Document {
        getElementById(id: string): HTMLElement | null;
        createElement(tagName: string): HTMLElement;
        querySelector(selector: string): HTMLElement | null;
        querySelectorAll(selector: string): NodeList;
      }
      interface Window {
        document: Document;
        console: Console;
        localStorage: Storage;
        fetch: any;
      }
      interface Console {
        log(...args: any[]): void;
        error(...args: any[]): void;
        warn(...args: any[]): void;
        info(...args: any[]): void;
      }
      interface Storage {
        getItem(key: string): string | null;
        setItem(key: string, value: string): void;
        removeItem(key: string): void;
        clear(): void;
      }
      declare const window: Window;
      declare const document: Document;
      declare const console: Console;
      declare const localStorage: Storage;
    `,
      "file:///node_modules/@types/dom/index.d.ts"
    );

    // Set up autocomplete for common React patterns
    monaco.languages.registerCompletionItemProvider("javascript", {
      provideCompletionItems: (model, position) => {
        const suggestions = [
          {
            label: "useState",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText:
              "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "React useState hook",
          },
          {
            label: "useEffect",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText:
              "useEffect(() => {\n  ${1:// effect logic}\n}, [${2:dependencies}]);",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "React useEffect hook",
          },
          {
            label: "component",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText:
              "function ${1:ComponentName}() {\n  return (\n    <div>\n      ${2:content}\n    </div>\n  );\n}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "React functional component",
          },
        ];
        return { suggestions };
      },
    });
  }

  function handleChange(value) {
    if (activePath && value !== undefined) {
      updateFile(activePath, value);
    }
  }

  const getLanguageFromPath = (path) => {
    if (!path) return "javascript";
    const ext = path.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "ts":
      case "tsx":
        return "typescript";
      case "js":
      case "jsx":
        return "javascript";
      case "json":
        return "json";
      case "css":
        return "css";
      case "html":
        return "html";
      case "md":
        return "markdown";
      default:
        return "javascript";
    }
  };

  if (!activePath) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#888",
          fontSize: "16px",
        }}
      >
        Select a file to start coding ✨
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "8px 12px",
          background: theme === "light" ? "#f5f5f5" : "#2d2d2d",
          color: theme === "light" ? "#333" : "#fff",
          fontSize: "12px",
          borderBottom: theme === "light" ? "1px solid #ddd" : "1px solid #444",
          fontFamily: "monospace",
        }}
      >
        {activePath}
      </div>
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={getLanguageFromPath(activePath)}
          value={files[activePath] || ""}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme={theme === "light" ? "vs" : "vs-dark"}
          options={{
            // IntelliSense and autocomplete settings
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: 'Consolas, "Courier New", monospace',
            wordWrap: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: "selection",
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: true,

            // Enhanced IntelliSense features
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            parameterHints: { enabled: true },
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true,
            },
            quickSuggestionsDelay: 100,
            suggestSelection: "first",
            wordBasedSuggestions: true,
            hover: { enabled: true, delay: 300 },

            // Code intelligence
            folding: true,
            foldingHighlight: true,
            showFoldingControls: "mouseover",
            matchBrackets: "always",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoSurround: "languageDefined",

            // Visual enhancements
            colorDecorators: true,
            contextmenu: true,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: true,

            // Error handling
            showUnused: true,
            showDeprecated: true,
          }}
        />
      </div>
    </div>
  );
}

export default MonacoEditor;
