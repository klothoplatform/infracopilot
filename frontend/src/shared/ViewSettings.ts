import { getEnumKeyByEnumValue } from "./object-util";

export enum ViewMode {
  Edit = "edit",
  Configure = "configure",
  View = "view",
}

export const ViewModePresentTense: { [key in ViewMode]: string } = {
  [ViewMode.Edit]: "editing",
  [ViewMode.Configure]: "configuring",
  [ViewMode.View]: "viewing",
};

export const ViewModeNouns: { [key in ViewMode]: string } = {
  [ViewMode.Edit]: "editor",
  [ViewMode.Configure]: "configuration",
  [ViewMode.View]: "viewer",
};

export function toViewMode(mode: string): keyof ViewMode | null {
  return getEnumKeyByEnumValue(ViewMode, mode) as keyof ViewMode | null;
}

export interface ViewSettings {
  mode: ViewMode;
}

export function canModifyTopology(viewSettings?: ViewSettings): boolean {
  return !viewSettings || viewSettings.mode === ViewMode.Edit;
}

export function canModifyConfiguration(viewSettings?: ViewSettings): boolean {
  return (
    !viewSettings?.mode ||
    viewSettings.mode === ViewMode.Edit ||
    viewSettings.mode === ViewMode.Configure
  );
}

export function isViewMode(
  viewSettings: ViewSettings,
  mode: ViewMode,
): boolean {
  return viewSettings.mode === mode;
}
