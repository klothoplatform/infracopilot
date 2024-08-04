import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Parent, Literal } from "hast";

/**
 * A remark plugin that replaces mention HTML tags (<msft-mention>) with a div element containing the mention type, id, and text.
 * Rendering is left to the consumer of the transformed AST.
 */
const remarkMention: Plugin = () => {
  return (tree) => {
    visit(tree, "", (node: Parent) => {
      if (!node.children) {
        return;
      }
      let children = [...node.children];
      for (let i = 0; i < children.length - 2; i++) {
        const openingTag = children[i] as Literal;
        const textNode = children[i + 1] as Literal;
        const closingTag = children[i + 2] as Literal;
        if (
          openingTag.type === "html" &&
          openingTag.value?.startsWith("<msft-mention") &&
          textNode.type === "text" &&
          closingTag.type === "html" &&
          closingTag.value === "</msft-mention>"
        ) {
          const html = openingTag.value + textNode.value + closingTag.value;
          const div = document.createElement("div");
          div.innerHTML = html;
          const mentionTag = div.firstChild as HTMLElement;
          const type = mentionTag.id.split("#", 2)[0];
          const id = mentionTag.id.split("#", 2)[1];
          const text = textNode.value;
          // replace the three nodes with a single Mention component
          children.splice(i, 3, {
            type: "element",
            tagName: "template",
            data: {
              hName: "div",
              hProperties: {
                className: `mention mention-${type}`,
                mentionId: id,
                mentionType: type,
              },
            },
            children: [
              {
                type: "text",
                value: text,
              },
            ],
          } as any);
        }
      }
      node.children = children;
    });
  };
};

export default remarkMention;
