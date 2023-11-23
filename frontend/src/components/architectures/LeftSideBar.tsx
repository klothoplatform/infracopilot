import { Sidebar } from "flowbite-react";
import React, { type FC } from "react";
import { FallbackRenderer } from "../FallbackRenderer";
import { ErrorBoundary } from "react-error-boundary";
import { UIError } from "../../shared/errors";
import { trackError } from "../../pages/store/ErrorStore";

const LeftSideBar: FC = () => {
  return (
    <Sidebar aria-label="sidebar   ">
      <ErrorBoundary
        fallbackRender={FallbackRenderer}
        onError={(error, info) => {
          trackError(
            new UIError({
              errorId: "LeftSideBar:ErrorBoundary",
              message: "uncaught error in LeftSideBar",
              cause: error,
              data: info,
            }),
          );
        }}
      ></ErrorBoundary>
    </Sidebar>
  );
};

export default LeftSideBar;
