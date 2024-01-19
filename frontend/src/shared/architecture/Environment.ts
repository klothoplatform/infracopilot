import { NodeType } from "../reactflow/NodeTypes";
import type { Edge, Node } from "reactflow";
import { ResourceTypeKB } from "../resources/ResourceTypeKB";
import { GraphEdge } from "./Architecture";
import { TopologyGraph } from "./TopologyGraph";
import { NodeId, TopologyNode } from "./TopologyNode";
import type TopologyEdge from "./TopologyEdge";
import yaml from "yaml";
import { customNodeMappings } from "../reactflow/NodeTypes";
import { customConfigMappings } from "../../pages/ArchitectureEditor/config/CustomConfigMappings";
import { ApplicationError } from "../errors";
import { isObject } from "../object-util";

export interface Environment {
  provider: string;
  architecture_id: string;
  id: string;
  current: number;
  tags: Map<string, string>;
}
