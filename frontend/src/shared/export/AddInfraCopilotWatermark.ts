import { Options } from "html-to-image/src/types";
import { Rect } from "reactflow";
import { BoundingElements, isGroup } from "./ExportImage";

export function addInfraCopilotWatermark(
  exportSettings: Options,
  boundingElements: BoundingElements,
  nodeBounds: Rect,
  viewPort: HTMLElement
) {
  const layoutSmall = nodeBounds.width < 400;
  const watermarkContainer = document.createElement("div");
  const watermark = document.createElement("div");
  const heading = document.createElement(layoutSmall ? "h4" : "h3");
  heading.appendChild(watermark);
  watermarkContainer.appendChild(heading);

  watermarkContainer.classList.add("watermark_container");
  watermarkContainer.style.width = `${exportSettings.width}px`;
  watermarkContainer.style.height = `${exportSettings.height}px`;

  watermark.id = "infracopilot_watermark";
  watermark.textContent = "infracopilot.io";
  watermark.style.right =
    boundingElements.minXNode === boundingElements.bottomElement
      ? `${nodeBounds.x / 2}px`
      : "20px";
  watermark.style.bottom =
    isGroup(boundingElements.bottomElement) ||
    !boundingElements.bottomElement?.type // is edge
      ? `26px`
      : `32px`;
  watermark.style.webkitBackgroundClip = "text";
  watermark.classList.add("infracopilot_gradient");

  const { serializeToString } = XMLSerializer.prototype;
  const clearTextBackgroundClip = (element: HTMLElement) => {
    if (element.style?.webkitBackgroundClip === "text") {
      element.style.setProperty("-webkit-background-clip", "unset");
      element.style.setProperty("--webkit-background-clip-replace", "text");
    }
    if (element.style?.backgroundClip === "text") {
      element.style.setProperty("-background-clip", "unset");
      element.style.setProperty("--background-clip-replace", "text");
    }

    element.childNodes.forEach((child: any) => {
      clearTextBackgroundClip(child);
    });
  };
  XMLSerializer.prototype.serializeToString = function (node: any) {
    clearTextBackgroundClip(node);
    return serializeToString
      .call(this, node)
      .replaceAll("--background-clip-replace", "background-clip")
      .replaceAll(
        "--webkit-background-clip-replace",
        "-webkit-background-clip"
      );
  };

  viewPort.appendChild(watermarkContainer);
  return watermarkContainer;
}
