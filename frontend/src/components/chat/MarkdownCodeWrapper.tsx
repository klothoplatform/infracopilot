import type { ReactNode } from "react";
import React from "react";
import ReactMarkdown from "react-markdown";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus as darkTheme,
  vs as lightTheme,
} from "react-syntax-highlighter/dist/esm/styles/prism";

import { useThemeMode } from "flowbite-react";
import { twMerge } from "tailwind-merge";

interface MarkdownCodeWrapperProps {
  children: ReactNode;
}

export const MarkdownCodeWrapper: React.FC<MarkdownCodeWrapperProps> = ({
  children,
}) => {
  const { mode } = useThemeMode();

  const processText = (text: string): ReactNode[] => {
    const result: ReactNode[] = [];
    let lastIndex = 0;

    // Process inline code
    const inlineCodeRegex = /`([^`]+)`/g;
    let inlineMatch;
    while ((inlineMatch = inlineCodeRegex.exec(text)) !== null) {
      if (inlineMatch.index > lastIndex) {
        result.push(text.slice(lastIndex, inlineMatch.index));
      }
      result.push(
        <code
          className={"rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700"}
          key={result.length}
        >
          {inlineMatch[1]}
        </code>,
      );
      lastIndex = inlineCodeRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }

    return result;
  };

  const processMultilineCode = (text: string): ReactNode[] => {
    const result: ReactNode[] = [];
    const multilineCodeRegex = /```(\w*)\s*\n([^`]+)[\s\n]*```/g;
    let lastIndex = 0;
    let multilineMatch;

    while ((multilineMatch = multilineCodeRegex.exec(text)) !== null) {
      if (multilineMatch.index > lastIndex) {
        result.push(
          ...processText(text.slice(lastIndex, multilineMatch.index)),
        );
      }
      const [, language, code] = multilineMatch;
      result.push(
        <ReactMarkdown
          key={result.length}
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <SyntaxHighlighter
                  style={mode === "dark" ? darkTheme : lightTheme}
                  language={match[1]}
                  PreTag="div"
                  wrapLines={true}
                  wrapLongLines={true}
                  customStyle={{
                    width: "100%",
                    borderRadius: "0.5rem",
                    fontFamily: "monospace",
                    paddingBottom: "0",
                    lineHeight: "1",
                  }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              ) : (
                <div className="w-full rounded bg-gray-200 p-2 dark:bg-gray-700">
                  <code
                    {...props}
                    className={twMerge(
                      className,
                      "rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700 min-w-full w-full overflow-x-clip font-mono",
                    )}
                  >
                    {String(children).replace(/\n$/, "")}
                  </code>
                </div>
              );
            },
          }}
        >
          {`\`\`\`${language || ""}
${code}
\`\`\``}
        </ReactMarkdown>,
      );
      lastIndex = multilineCodeRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push(...processText(text.slice(lastIndex)));
    }

    return result;
  };

  const processNode = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      return processMultilineCode(node);
    }

    if (React.isValidElement(node)) {
      const childrenArray = React.Children.toArray(node.props.children);
      const processedChildren = childrenArray.map((child) =>
        processNode(child),
      );

      if (
        processedChildren.length === 1 &&
        Array.isArray(processedChildren[0])
      ) {
        return React.cloneElement(node, {}, ...processedChildren[0]);
      }

      return React.cloneElement(node, {}, ...processedChildren);
    }

    if (Array.isArray(node)) {
      return node.map(processNode);
    }

    return node;
  };

  return processNode(children);
};
