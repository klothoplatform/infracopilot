export enum RightSidebarTabs {
  Changes,
  Details,
}

export enum RightSidebarDetailsTabs {
  Config,
  AdditionalResources,
}

export type RightSidebarTabSelector = [
  RightSidebarTabs,
  RightSidebarDetailsTabs,
];
