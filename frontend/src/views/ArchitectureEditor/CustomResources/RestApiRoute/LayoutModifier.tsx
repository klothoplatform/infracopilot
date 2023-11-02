import type { LayoutModifier } from "../../config/CustomConfigMappings";
import {
  ElkMap,
  ElkSize,
  flattenHierarchy,
} from "../../../../shared/reactflow/AutoLayout";
import { NodeId } from "../../../../shared/architecture/TopologyNode";

export const restApiLayoutModifier: LayoutModifier = ({
  elkGraph,
  reactFlow: { nodes, edges },
}) => {
  const allNodes = flattenHierarchy(elkGraph);

  allNodes
    .filter(
      (node) => NodeId.fromTopologyId(node.id).qualifiedType === "aws:rest_api",
    )
    .forEach((restApi) => {
      restApi.layoutOptions = {
        ...restApi.layoutOptions,
        // hierarchyHandling: "INCLUDE_CHILDREN",
        // "elk.algorithm": "layered",

        // "nodePlacement.strategy": NodePlacementStrategy.SIMPLE,
        // "org.eclipse.elk.layered.layering.strategy":
        //   NodeLayeringStrategy.INTERACTIVE,
        // "org.eclipse.elk.partitioning.activate": "true",
        "elk.spacing.nodeNode": "4",
        "elk.direction": "DOWN",
        "elk.padding": ElkMap({
          top: 30,
          left: 40,
          bottom: 30,
          right: 40,
        }),
      };

      const childIds = restApi.children?.map((child) => child.id);

      // sort children by route path and method
      const childRFNodes = nodes.filter((node) => childIds?.includes(node.id));
      // const childPriorities = new Map(
      //   childRFNodes
      //     .sort((a, b) => {
      //       const aRoute = a.data.resourceMeta.path;
      //       const bRoute = b.data.resourceMeta.path;
      //       const aMethod = a.data.resourceMeta.method;
      //       const bMethod = b.data.resourceMeta.method;
      //       if (aRoute < bRoute) return -1;
      //       if (aRoute > bRoute) return 1;
      //       if (aMethod < bMethod) return -1;
      //       if (aMethod > bMethod) return 1;
      //       return 0;
      //     })
      //     .map((node, index) => [node.id, index]),
      // );

      // get longest path length
      const maxLength = Math.min(
        childRFNodes.reduce((max, node) => {
          const pathLength = node.data?.resourceMeta?.path.length;
          return pathLength > max ? pathLength : max;
        }, 0),
        80,
      );

      restApi.children?.forEach((child) => {
        child.labels = undefined;
        child.layoutOptions = {
          // "org.eclipse.elk.partitioning.partition": `${
          //   childPriorities.get(child.id) ?? 10000
          // }`,
          // "org.eclipse.elk.priority": `${
          //   childPriorities.get(child.id) ?? 10000
          // }`,
          "org.eclipse.elk.nodeSize.minimum": ElkSize(100 + maxLength * 7, 50),
          // "org.eclipse.elk.partitioning.activate": "true",
        };
      });
    });
};
