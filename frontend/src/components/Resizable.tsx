import type { FC, PropsWithChildren } from "react";
import React, { createContext, useCallback, useContext, useRef } from "react";
import classNames from "classnames";

export type ResizableProps = {
  handleSide?: "left" | "right";
  handleStyle?: React.CSSProperties;
  childRef: React.RefObject<HTMLDivElement>;
  onResize?: (newSize: number) => void;
  disabled?: boolean;
};

type ResizableContextProps = {
  containerRef: React.RefObject<HTMLDivElement>;
};

export const ResizableContext = createContext<ResizableContextProps>({
  containerRef: { current: null },
});

export const ResizableContainer: FC<
  PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
> = ({ children, ...props }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <ResizableContext.Provider value={{ containerRef }}>
      <div {...props} ref={containerRef}>
        {children}
      </div>
    </ResizableContext.Provider>
  );
};

export const ResizableSection: FC<PropsWithChildren<ResizableProps>> =
  function ({
    handleStyle,
    handleSide,
    children,
    onResize,
    childRef,
    disabled,
  }) {
    const { containerRef } = useContext(ResizableContext);
    const isDragging = useRef(false);
    const handleRef = useRef<HTMLDivElement>(null);
    const width = useRef(childRef.current?.clientWidth ?? 0);

    const onMouseDown = (event: any) => {
      event.preventDefault();
      if (disabled) {
        return;
      }
      isDragging.current = true;
      console.debug("resizing");
      console.debug("current width", childRef.current?.offsetWidth);
      width.current = childRef.current?.clientWidth ?? 0;
      document.addEventListener("mouseup", onMouseUp, { once: true });
      document.addEventListener("mousemove", onMouseMove);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      console.debug("done resizing");
    };

    const onMouseMove = useCallback(
      (event: any) => {
        if (!isDragging?.current) {
          return;
        }

        const parent = containerRef.current as HTMLDivElement;
        const child = childRef.current as HTMLDivElement;
        const handle = handleRef.current as HTMLDivElement;

        const parentX = parent.getBoundingClientRect().x + window.scrollX;
        const xChange =
          event.pageX - parentX - (handle.offsetLeft + handle.offsetWidth);
        width.current =
          width.current + (handleSide !== "left" ? +xChange : -xChange);
        child.style.width = `${width.current}px`;
        child.style.flexGrow = "0";
        child.style.flexBasis = "auto";
        onResize?.(width.current);
      },
      [containerRef, childRef, handleSide, onResize],
    );

    const handleDiv = (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
        className={classNames(
          "shrink-0 grow-0 p-0  bg-gray-200 dark:bg-gray-700",
          {
            "px-[1px] cursor-col-resize hover:bg-primary-500 dark:active:bg-primary-500 dark:hover:bg-primary-500 active:bg-primary-500 active:px-[4px]":
              !disabled,
          },
        )}
        style={handleStyle}
        ref={handleRef}
        onMouseDown={onMouseDown}
      ></div>
    );

    return (
      <>
        {handleSide === "left" && handleDiv}
        {children}
        {handleSide !== "left" && handleDiv}
      </>
    );
  };
