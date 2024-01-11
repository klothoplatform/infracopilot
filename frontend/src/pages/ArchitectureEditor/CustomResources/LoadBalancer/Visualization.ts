import type { LayoutModifier } from "../../config/CustomConfigMappings";
import {
  ElkMap,
  ElkSize,
  flattenHierarchy,
} from "../../../../shared/reactflow/AutoLayout";
import { NodeId } from "../../../../shared/architecture/TopologyNode";
import type { Node } from "reactflow";
import { NodeType } from "../../../../shared/reactflow/NodeTypes";
import { type EnvironmentVersion } from "../../../../shared/architecture/EnvironmentVersion";

export const loadBalancerLayoutModifier: LayoutModifier = ({
  environmentVersion,
  elkGraph,
  reactFlow: { nodes, edges },
}) => {
  const allNodes = flattenHierarchy(elkGraph);

  allNodes
    .filter(
      (node) =>
        NodeId.fromTopologyId(node.id).qualifiedType === "aws:load_balancer" &&
        environmentVersion.resources.get(node.id)?.Type === "application",
    )
    .forEach((alb) => {
      alb.layoutOptions = {
        ...alb.layoutOptions,
        "elk.spacing.nodeNode": "4",
        "elk.direction": "DOWN",
        "elk.padding": ElkMap({
          top: 30,
          left: 40,
          bottom: 30,
          right: 40,
        }),
      };

      const childIds = alb.children?.map((child) => child.id);

      // sort children by route path and method
      const childRFNodes = nodes.filter((node) => childIds?.includes(node.id));

      // get longest route length
      const maxLength = Math.min(
        childRFNodes.reduce((max, node) => {
          const maxLineLength =
            Math.max(
              node.data?.vizMetadata?.methods?.join(" | ").length * 1.25 ?? [0],
              !node.data?.vizMetadata?.methods?.length &&
                !node.data?.vizMetadata?.pathPatterns?.length
                ? node.data?.vizMetadata?.nameTag ||
                    node.data?.resourceId.toString().length
                : 0,
              ...(node.data?.vizMetadata?.pathPatterns?.map(
                (p: string) => p.length,
              ) ?? [0]),
            ) + 1;
          return maxLineLength > max ? maxLineLength : max;
        }, 0),
        80,
      );

      alb.children?.forEach((child, i) => {
        // these are rough estimates
        const minWidth = 100;
        const maxWidth = 600;
        const paddingX = 16;
        const minHeight = 50;
        const lineSpacing = 32;
        const charWidth = 8.5;

        const vizMetadata = childRFNodes[i].data.vizMetadata;
        const lineCount = vizMetadata?.pathPatterns?.length ?? 0;

        const dividerHeight =
          vizMetadata?.pathPatterns?.length && vizMetadata.methods?.length
            ? lineSpacing * 2
            : 0;

        const width = Math.max(minWidth, maxLength * charWidth);
        const height = Math.max(
          minHeight,
          dividerHeight + lineSpacing / 2 + lineSpacing * lineCount,
        );

        child.labels = undefined;
        child.layoutOptions = {
          "org.eclipse.elk.nodeSize.minimum": ElkSize(
            Math.min(width + paddingX, maxWidth),
            Math.max(minHeight, height),
          ),
        };
      });
    });
};

export function LBNodeModifier(node: Node, environmentVersion: EnvironmentVersion) {
  // don't show nlbs as groups right now
  if (node.data?.resource?.Type === "network") {
    node.type = NodeType.Resource;
  }
}

export function AlbListenerRuleNodeModifier(
  node: Node,
  environmentVersion: EnvironmentVersion,
) {
  let vizMetadata = node.data.vizMetadata;
  const resource = environmentVersion.resources?.get(node.data.resourceId.toString());

  if (!resource) {
    return;
  }

  const pathPatterns = resource.Conditions?.map(
    (c: any) => c.PathPattern?.Values,
  )
    .flat()
    .filter((p: any) => p);
  const methods = resource.Conditions?.map(
    (c: any) => c.HttpRequestMethod?.Values,
  )
    .flat()
    .filter((m: any) => m);

  vizMetadata.methods = methods;
  vizMetadata.pathPatterns = pathPatterns;
  vizMetadata.nameTag =
    resource.Tags?.[
      Object.keys(resource.Tags ?? {}).find(
        (key) => key.toLowerCase() === "name",
      ) ?? ""
    ];
}
