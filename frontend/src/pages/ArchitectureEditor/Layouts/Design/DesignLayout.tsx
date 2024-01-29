import type { FC } from "react";
import React, {
  type ForwardedRef,
  forwardRef,
  type PropsWithChildren,
  useRef,
  useState,
} from "react";
import useApplicationStore from "../../../store/ApplicationStore";
import {
  ResizableContainer,
  ResizableSection,
} from "../../../../components/Resizable";
import { canModifyTopology } from "../../../../shared/EditorViewSettings";
import EditorSidebarLeft from "../../../../components/editor/EditorSidebarLeft";
import EditorPane from "./EditorPane";
import EditorSidebarRight from "../../../../components/editor/EditorSidebarRight";

export const DesignLayout: FC = function () {
  const { architecture, viewSettings } = useApplicationStore();
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const [resourceLayout, setResourceLayout] = useState<"list" | "grid">("list");

  const onResizeLeftSidebar = (newSize: number) => {
    setResourceLayout(newSize <= 280 ? "list" : "grid");
  };

  return (
    <ResizableContainer className="flex h-full w-full gap-0 overflow-hidden bg-gray-50 dark:bg-gray-800">
      {architecture?.id && canModifyTopology(viewSettings) && (
        <ResizableSection
          childRef={leftSidebarRef}
          onResize={onResizeLeftSidebar}
        >
          <div
            ref={leftSidebarRef}
            className="box-border flex h-full min-w-[280px] max-w-[29%] shrink-0 grow-0 basis-[280px]"
          >
            <EditorSidebarLeft resourceLayout={resourceLayout} />
          </div>
        </ResizableSection>
      )}
      <div className="grow-1 shrink-1 box-border flex h-full w-full min-w-[30%]">
        <MainContent>
          <EditorPane />
        </MainContent>
      </div>
      <EditorSidebarRight />
    </ResizableContainer>
  );
};
export const MainContent = forwardRef(
  ({ children }: PropsWithChildren, ref: ForwardedRef<HTMLDivElement>) => {
    return (
      <div
        className="relative h-full w-full overflow-hidden dark:bg-gray-900"
        ref={ref}
      >
        {children}
      </div>
    );
  },
);

MainContent.displayName = "MainContent";
