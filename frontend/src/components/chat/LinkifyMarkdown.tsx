import React, { useEffect, useRef } from "react";

interface MarkdownLinkWrapperProps {
  children: React.ReactNode;
}

// TODO: figure out why this component flickers on re-render
export const LinkifyMarkdown: React.FC<MarkdownLinkWrapperProps> = ({
  children,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const processLinks = () => {
      if (!wrapperRef.current) return;

      const textNodes = getTextNodes(wrapperRef.current);
      textNodes.forEach(processTextNode);
    };

    processLinks();
  }, [children]); // Re-run when children change

  const getTextNodes = (node: Node): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null);

    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode as Text);
    }

    return textNodes;
  };

  const processTextNode = (textNode: Text) => {
    const linkRegex = /\[([^\]]+)]\(([^)]+)\)/g;
    const urlRegex = /(?<!")(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const combinedRegex = new RegExp(
      `${linkRegex.source}|${urlRegex.source}`,
      "g",
    );

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(textNode.textContent || "")) !== null) {
      fragment.appendChild(
        document.createTextNode(
          textNode.textContent!.slice(lastIndex, match.index),
        ),
      );

      // if the current match is already an <a> tag, skip it
      if (textNode.parentElement?.tagName === "A") {
        lastIndex = match.index + 1;
        continue;
      }

      const link = document.createElement("a");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (match[0].startsWith("[")) {
        // Markdown link
        link.href = match[2];
        link.textContent = match[1];
      } else {
        // Raw URL
        link.href = match[0];
        link.textContent = match[0];
      }
      fragment.appendChild(link);

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < (textNode.textContent?.length || 0)) {
      fragment.appendChild(
        document.createTextNode(textNode.textContent!.slice(lastIndex)),
      );
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  };

  return (
    <div
      className={"whitespace-pre-wrap"}
      key={Math.random().toString()}
      ref={wrapperRef}
    >
      {children}
    </div>
  );
};
