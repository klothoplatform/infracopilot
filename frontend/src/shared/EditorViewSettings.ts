import { getEnumKeyByEnumValue } from "./object-util";

export enum ViewMode {
  Edit = "edit",
  Configure = "configure",
  View = "view",
}

export enum EditorLayout {
  Design = "Design",
  Export = "Export",
  Deploy = "Deploy",
}

export function isDesignLayout(
  viewSettings: EditorViewSettings | undefined,
): boolean {
  return viewSettings?.layout === EditorLayout.Design;
}

export function isExportLayout(
  viewSettings: EditorViewSettings | undefined,
): boolean {
  return viewSettings?.layout === EditorLayout.Export;
}

export function toViewMode(mode: string): keyof ViewMode | null {
  return getEnumKeyByEnumValue(ViewMode, mode) as keyof ViewMode | null;
}

export interface EditorViewSettings {
  mode: ViewMode;
  layout: EditorLayout;
}

export function canModifyTopology(
  viewSettings: EditorViewSettings | undefined,
): boolean {
  return !viewSettings || viewSettings.mode === ViewMode.Edit;
}

export function canModifyConfiguration(
  viewSettings: EditorViewSettings,
): boolean {
  return (
    !viewSettings?.mode ||
    viewSettings.mode === ViewMode.Edit ||
    viewSettings.mode === ViewMode.Configure
  );
}

export function isViewMode(
  viewSettings: EditorViewSettings,
  mode: ViewMode,
): boolean {
  return viewSettings.mode === mode;
}
