import type { FC } from "react";
import React from "react";
import useApplicationStore from "../store/ApplicationStore";
import { useScreenSize } from "../../shared/hooks/useScreenSize";
import { UIError } from "../../shared/errors";
import { ArchitectureButtonAndModal } from "../../components/NewArchitectureButton";
import { CloneCurrentArchitectureButton } from "../../components/editor/CloneCurrentArchitectureButton";
import { ExportIacButton } from "../../components/editor/ExportIacButton";
import { ViewModeDropdown } from "../../components/ViewModeDropdown";
import { ShareButton } from "../../components/ShareButton";
import { EditableLabel } from "../../components/EditableLabel";
import { EnvironmentSection } from "../../components/editor/EnvironmentSection";
import {
  HeaderNavBar,
  HeaderNavBarRow1Right,
} from "../../components/HeaderNavBar";
import type { ViewSettings } from "../../shared/ViewSettings";
import { isViewMode, ViewMode } from "../../shared/ViewSettings";

export const EditorHeader: FC = () => {
  const {
    isAuthenticated,
    architecture,
    isEditorInitialized,
    user,
    viewSettings,
    auth0,
  } = useApplicationStore();

  const shouldHideCloneButton =
    auth0?.isLoading || architecture.owner === `user:${user?.sub}`;

  return (
    <HeaderNavBar>
      <div className="flex h-fit w-full flex-col justify-between gap-0.5">
        <div className="flex w-full justify-between">
          <div className="flex w-full flex-col justify-start gap-1 pr-4">
            <Row1aLeft
              isEditorInitialized={isEditorInitialized}
              architectureId={architecture.id}
              viewSettings={viewSettings}
            />
            <Row1bLeft
              hideNewArchitectureButton={!isAuthenticated}
              hideExportButton={!isEditorInitialized}
              hideCloneButton={shouldHideCloneButton}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Row1aRight hideEnvironmentsSection={!isEditorInitialized} />
          </div>
        </div>
      </div>
    </HeaderNavBar>
  );
};

const Row1aLeft: FC<{
  isEditorInitialized: boolean;
  architectureId: string;
  viewSettings: ViewSettings;
}> = ({ isEditorInitialized, architectureId, viewSettings }) => {
  const shouldDisableArchitectureName =
    !isEditorInitialized ||
    !architectureId ||
    isViewMode(viewSettings, ViewMode.View);

  return <ArchitectureName disabled={shouldDisableArchitectureName} />;
};

const Row1bLeft: FC<{
  hideNewArchitectureButton?: boolean;
  hideExportButton?: boolean;
  hideCloneButton?: boolean;
}> = ({ hideNewArchitectureButton, hideExportButton, hideCloneButton }) => {
  const { isSmallScreen } = useScreenSize();

  return (
    <div className="hidden sm:flex sm:gap-2">
      {!hideNewArchitectureButton && (
        <ArchitectureButtonAndModal small={isSmallScreen} />
      )}
      {!hideCloneButton && (
        <CloneCurrentArchitectureButton small={isSmallScreen} />
      )}
      {!hideExportButton && <ExportIacButton small={isSmallScreen} />}
    </div>
  );
};

const ArchitectureName: FC<{
  disabled?: boolean;
}> = ({ disabled }) => {
  const { architecture, renameArchitecture, addError } = useApplicationStore();
  const onSubmit = async (newValue: string) => {
    await renameArchitecture(newValue);
  };
  const onError = (e: any) => {
    let message;
    if (e instanceof UIError) {
      message = e.message;
    }
    addError(
      new UIError({
        message: message ? message : "Failed to rename architecture!",
        cause: e as Error,
        errorId: "ArchitectureEditor:RenameArchitecture",
      }),
    );
  };

  return (
    <div className="-ml-1 font-semibold">
      <EditableLabel
        initialValue={architecture.name}
        label={architecture.name}
        disabled={disabled}
        onSubmit={onSubmit}
        onError={onError}
        maxWidth={"300px"}
        maxEditWidth={"400px"}
      />
    </div>
  );
};

const Row1aRight: FC<{
  hideEnvironmentsSection?: boolean;
}> = ({ hideEnvironmentsSection }) => {
  const {
    architecture,
    isEditorInitialized,
    user,
    architectureAccess,
    isAuthenticated,
  } = useApplicationStore();
  const { isSmallScreen } = useScreenSize();

  return (
    <div className="flex h-fit items-center justify-end gap-2 py-1">
      {isEditorInitialized ? (
        <div className="flex justify-end gap-4">
          {!hideEnvironmentsSection && (
            <EnvironmentSection small={isSmallScreen} />
          )}
          <ViewModeDropdown />
          <ShareButton
            user={user}
            architecture={architecture}
            access={architectureAccess}
            small={isSmallScreen}
          />
          <HeaderNavBarRow1Right
            user={user}
            isAuthenticated={isAuthenticated}
          />
        </div>
      ) : null}
    </div>
  );
};
