import type { NavHistory } from "./sidebar-nav";
import {
  getNextRelevantHistoryEntry,
  getPreviousRelevantHistoryEntry,
  RightSidebarDetailsTab,
  RightSidebarMenu,
} from "./sidebar-nav";
import { NodeId } from "./architecture/TopologyNode";
import type { EnvironmentVersion } from "./architecture/EnvironmentVersion";

const resources = {
  resource1: { id: NodeId.parse("type1:namespace1:name1:provider1") },
  resource2: { id: NodeId.parse("type2:namespace2:name2:provider2") },
  resource3: { id: NodeId.parse("type3:namespace3:name3:provider3") },
  resource4: { id: NodeId.parse("type4:namespace4:name4:provider4") },
};

const selectedResource = resources.resource3.id;
const environmentVersion: EnvironmentVersion = {
  provider: "ProviderA",
  architecture_id: "ID1",
  id: "ID1",
  raw_state: {
    resources_yaml: "Resource YAML",
    topology_yaml: "Topology YAML",
  },
  version: 1,
  views: new Map(),
  resources: new Map(
    Object.values(resources).map((resource) => [
      resource.id.toString(),
      resource,
    ]),
  ),
  edges: [],
  config_errors: [],
};

describe("nav-history", () => {
  describe("getNextRelevantHistoryEntry", () => {
    test("returns the next relevant entry in the navigation history", () => {
      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource1.id,
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource2.id,
        index: 1,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2],
        currentIndex: 0,
      };

      const result = getNextRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBe(navHistoryEntry2);
    });

    test("returns undefined if there is no next relevant entry in the navigation history", () => {
      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource1.id,
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource2.id,
        index: 1,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2],
        currentIndex: 1,
      };

      const result = getNextRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBeUndefined();
    });

    test("returns undefined if the next relevant entry is not in the current architecture", () => {
      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource1.id,
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: NodeId.parse("deleted:resource:1"),
        index: 1,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2],
        currentIndex: 0,
      };

      const result = getNextRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBeUndefined();
    });

    test("skips entries that are identical to the current state", () => {
      const selectedResource = resources.resource3.id;

      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource3.id,
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource3.id,
        index: 1,
      };
      const navHistoryEntry3 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource4.id,
        index: 2,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2, navHistoryEntry3],
        currentIndex: 0,
      };

      const result = getNextRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBe(navHistoryEntry3);
    });
  });

  describe("getPreviousRelevantHistoryEntry", () => {
    test("returns the previous relevant entry in the navigation history", () => {
      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource1.id,
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource2.id,
        index: 1,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2],
        currentIndex: 1,
      };

      const result = getPreviousRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBe(navHistoryEntry1);
    });

    test("returns undefined if there is no previous relevant entry in the navigation history", () => {
      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource1.id,
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource2.id,
        index: 1,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2],
        currentIndex: 0,
      };

      const result = getPreviousRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBeUndefined();
    });

    test("returns undefined if the previous relevant entry is not in the current architecture", () => {
      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: NodeId.parse("deleted:resource:1"),
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource2.id,
        index: 1,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2],
        currentIndex: 1,
      };

      const result = getPreviousRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBeUndefined();
    });

    test("skips entries that are identical to the current state", () => {
      const selectedResource = resources.resource3.id;

      const navHistoryEntry1 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource1.id,
        index: 0,
      };
      const navHistoryEntry2 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource3.id,
        index: 1,
      };
      const navHistoryEntry3 = {
        tab: RightSidebarDetailsTab.Config,
        resourceId: resources.resource3.id,
        index: 2,
      };

      const navHistory: NavHistory = {
        entries: [navHistoryEntry1, navHistoryEntry2, navHistoryEntry3],
        currentIndex: 2,
      };

      const result = getPreviousRelevantHistoryEntry(
        navHistory,
        [RightSidebarMenu.Details, RightSidebarDetailsTab.Config],
        selectedResource,
        environmentVersion,
      );
      expect(result).toBe(navHistoryEntry1);
    });
  });
});
