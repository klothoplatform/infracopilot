import type { Architecture } from "./architecture/Architecture";
import type { NodeId } from "./architecture/TopologyNode";

export enum RightSidebarMenu {
  Changes = "Changes",
  Details = "Details",
}

export enum RightSidebarDetailsTab {
  Config,
  AdditionalResources,
}

export type RightSidebarTabSelector = [
  RightSidebarMenu | undefined,
  RightSidebarDetailsTab,
];

export interface NavHistoryEntry {
  tab: RightSidebarDetailsTab;
  resourceId?: NodeId;
  index: number;
}

export interface NavHistory {
  entries: NavHistoryEntry[];
  currentIndex?: number;
  maxHistoryLength?: number;
}

export function getPreviousRelevantHistoryEntry(
  navHistory: NavHistory,
  rightSidebarSelector: RightSidebarTabSelector,
  selectedResource?: NodeId,
  architecture?: Architecture,
): NavHistoryEntry | undefined {
  const historyEntries = navHistory.entries;
  let currentIndex = navHistory.currentIndex ?? 0;

  let newIndex: number | undefined = undefined;
  for (
    let previousIndex = currentIndex - 1;
    previousIndex >= 0;
    previousIndex--
  ) {
    const entry = historyEntries[previousIndex];
    if (
      !entry.resourceId ||
      ![...(architecture?.resources.keys() ?? [])].find(
        (id) => id === entry.resourceId?.toString(),
      )
    ) {
      continue; // skip entries that whose resources are not in the current architecture
    }
    if (
      entry.resourceId?.equals(selectedResource) &&
      entry.tab === rightSidebarSelector[1]
    ) {
      continue; // skip entries that are the same as the current selection
    }
    newIndex = previousIndex;
    break;
  }

  return newIndex !== undefined ? historyEntries[newIndex] : undefined;
}

export function getNextRelevantHistoryEntry(
  navHistory: NavHistory,
  rightSidebarSelector: RightSidebarTabSelector,
  selectedResource?: NodeId,
  architecture?: Architecture,
): NavHistoryEntry | undefined {
  const historyEntries = navHistory.entries;
  let currentIndex = navHistory.currentIndex ?? 0;

  let newIndex: number | undefined = undefined;
  for (
    let nextIndex = currentIndex + 1;
    nextIndex < historyEntries.length;
    nextIndex++
  ) {
    const entry = historyEntries[nextIndex];
    if (
      !entry.resourceId ||
      ![...(architecture?.resources.keys() ?? [])].find(
        (id) => id === entry.resourceId?.toString(),
      )
    ) {
      continue;
    }
    if (
      entry.resourceId?.equals(selectedResource) &&
      entry.tab === rightSidebarSelector[1]
    ) {
      continue;
    }
    newIndex = nextIndex;
    break;
  }

  return newIndex !== undefined ? historyEntries[newIndex] : undefined;
}
